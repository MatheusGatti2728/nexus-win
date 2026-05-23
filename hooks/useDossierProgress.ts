"use client"
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- useDossierProgress
// Real pipeline hook --- CNPJ drives everything.
// NO mock scenario lookup. NO fake company names.
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
import { useState, useCallback, useRef, useEffect } from "react"
import type { PipelineResult, PipelineEventType } from "@/src/pipeline/orchestrator"
import type { PipelineStage } from "@/src/types"

export type { PipelineResult }

export interface ProgressState {
  stage:            PipelineStage
  elapsedMs:        number
  events:           Array<{ event: PipelineEventType; timestamp: string; source?: string }>
  result:           PipelineResult | null
  error:            string | null
  isComplete:       boolean
  // Convenience accessors
  company:          PipelineResult["intelligence"]["company_identity"] | null
  scoreData:        { score: number; tier: string; recommended_modules: string[]; rejected_modules: string[]; recommendation_count: number } | null
  recommendedModules: PipelineResult["engine_result"]["recommended"]
  rejectedModules:    PipelineResult["engine_result"]["rejected"]
  financialData:      PipelineResult["financial_estimations"]
  strategicDossier:   PipelineResult["strategic_dossier"] | null
  copilotContext:     PipelineResult["copilot_context"] | null
  debugInfo:          PipelineResult["debug"] | null
}

const INITIAL: ProgressState = {
  stage: "idle", elapsedMs: 0, events: [], result: null, error: null, isComplete: false,
  company: null, scoreData: null, recommendedModules: [], rejectedModules: [],
  financialData: [], strategicDossier: null, copilotContext: null, debugInfo: null,
}

export function useDossierProgress() {
  const [state, setState] = useState<ProgressState>(INITIAL)
  const t0 = useRef(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (state.stage === "idle" || state.isComplete || state.stage === "failed") {
      if (timer.current) { clearInterval(timer.current); timer.current = null }
      return
    }
    timer.current = setInterval(() => setState(p => ({ ...p, elapsedMs: Date.now() - t0.current })), 200)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [state.stage, state.isComplete])

  const generate = useCallback(async (
    cnpj:             string,
    segment:          string,
    tax_regime:       string,
    operation_flags:  string[] = [],
    extra?: { faturamento_estimado?: number; folha_estimada?: number; subsegment?: string }
  ): Promise<boolean> => {
    t0.current = Date.now()
    setState({ ...INITIAL, stage: "validating", elapsedMs: 0 })

    try {
      // Immediate UI: show that we started
      setState(p => ({
        ...p,
        stage: "fetching",
        events: [{ event: "pipeline_started", timestamp: new Date().toISOString(), source: "real" }],
        elapsedMs: Date.now() - t0.current,
      }))

      const res = await fetch("/api/dossiers/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ cnpj, segment, tax_regime, operation_flags, ...extra }),
        signal:  AbortSignal.timeout(58_000),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
        setState(p => ({ ...p, stage: "failed", error: err.error?.message ?? `HTTP ${res.status}`, isComplete: false }))
        return false
      }

      const data = await res.json() as {
        report_id:   string
        status:      string
        company_name: string
        result:      PipelineResult
      }

      const r = data.result

      // Map pipeline events for timeline
      const mappedEvents = r.events.map(e => ({
        event:     e.event as PipelineEventType,
        timestamp: e.timestamp,
        source:    e.source,
      }))

      setState({
        stage:    "complete",
        elapsedMs: Date.now() - t0.current,
        events:    mappedEvents,
        result:    r,
        error:     null,
        isComplete: true,
        // Convenience
        company:    r.intelligence.company_identity,
        scoreData: {
          score:               r.engine_result.final_score,
          tier:                r.engine_result.tier,
          recommended_modules: r.engine_result.recommended.map(m => m.slug),
          rejected_modules:    r.engine_result.rejected.map(m => m.slug),
          recommendation_count: r.engine_result.recommended.length,
        },
        recommendedModules: r.engine_result.recommended,
        rejectedModules:    r.engine_result.rejected,
        financialData:      r.financial_estimations.filter(f => f.should_show_to_client),
        strategicDossier:   r.strategic_dossier,
        copilotContext:     r.copilot_context,
        debugInfo:          r.debug,
      })

      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido"
      setState(p => ({ ...p, stage: "failed", error: msg, isComplete: false }))
      return false
    }
  }, [])

  const reset = useCallback(() => {
    if (timer.current) clearInterval(timer.current)
    t0.current = 0
    setState(INITIAL)
  }, [])

  return { ...state, generate, reset }
}
