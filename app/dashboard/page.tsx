"use client"

import { useState, useCallback } from "react"
import { useDossierProgress } from "@/hooks/useDossierProgress"
import { validateCNPJ, normalizeCNPJ, formatCNPJ, formatElapsed } from "@/lib/ui/utils"
import type { Segment, TaxRegime, OperationFlag } from "@/src/engine/tax-matrix"
import { SEGMENT_LABELS, REGIME_LABELS, FLAG_LABELS } from "@/src/engine/tax-matrix"
import { UnifiedCopilotPanel } from "@/components/sales/UnifiedCopilotPanel"
import { OpportunityIntelligenceBlock } from "@/components/financial/OpportunityIntelligenceBlock"
import { AxiomLogo } from "@/components/AxiomLogo"

// ---- Types ------------------------------------------------------------------

interface NexusFormData {
  cnpj: string
  segment: Segment | ""
  tax_regime: TaxRegime | ""
  operation_flags: OperationFlag[]
}

// ---- Utilities --------------------------------------------------------------

function fmtBRL(n: any): string {
  if (!n || n <= 0) return "--"
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `R$ ${Math.round(n / 1_000)}k`
  return `R$ ${n}`
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button className="copy-btn" onClick={() => {
      try { navigator.clipboard.writeText(text) } catch {}
      setOk(true); setTimeout(() => setOk(false), 1400)
    }}>{ok ? "copiado" : "copiar"}</button>
  )
}

function Row({ label, value, isReal }: { label: string; value?: string | null; isReal?: boolean }) {
  const empty = !value || value.trim() === "" || value === "A confirmar" || value === "nao identificado"
  return (
    <div style={{ display:"flex", alignItems:"baseline", padding:"8px 0", borderBottom:"1px solid var(--rule)" }}>
      <span style={{
        width:156, flexShrink:0, fontSize:12, color:"var(--ink-4)",
        fontFamily:"'Inter',sans-serif", lineHeight:1.6, letterSpacing:"0",
      }}>
        {label}
      </span>
      <span style={{
        flex:1, fontSize:12,
        color: empty ? "var(--ink-4)" : "var(--ink-1)",
        lineHeight:1.6,
        fontFamily: isReal ? "'JetBrains Mono',monospace" : "'Space Grotesk',sans-serif",
        letterSpacing: isReal ? "0.01em" : "-0.015em",
        fontWeight: empty ? 400 : isReal ? 400 : 500,
      }}>
        {empty ? "—" : value}
      </span>
      {!empty && isReal && (
        <span style={{
          fontSize:11, color:"var(--green)", fontFamily:"'JetBrains Mono',monospace",
          flexShrink:0, letterSpacing:"0.07em", opacity:0.6,
        }}>RF</span>
      )}
    </div>
  )
}

// ---- Sidebar form -----------------------------------------------------------

function InputForm({ onGenerate, isLoading }: { onGenerate: (d: NexusFormData) => void; isLoading: boolean }) {
  const [cnpj, setCnpj] = useState("")
  const [seg,  setSeg]  = useState<Segment | "">("")
  const [reg,  setReg]  = useState<TaxRegime | "">("")
  const [flags, setFlags] = useState<OperationFlag[]>([])
  const [err,  setErr]  = useState("")

  const allFlags: OperationFlag[] =
    seg === "servicos"  ? ["folha_relevante","operacao_iss","ecommerce"]
    : seg === "comercio"  ? ["venda_cartao","icms_st","ecommerce","venda_interestadual","folha_relevante"]
    : seg === "industria" ? ["exportacao","operacao_industrial","icms_st","folha_relevante"]
    : (Object.keys(FLAG_LABELS) as OperationFlag[])

  const toggle = (f: OperationFlag) =>
    setFlags(p => p.includes(f) ? p.filter(x => x !== f) : [...p, f])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const c = normalizeCNPJ(cnpj)
    if (!validateCNPJ(c)) { setErr("CNPJ inválido"); return }
    if (!seg) { setErr("Selecione o segmento"); return }
    if (!reg) { setErr("Selecione o regime"); return }
    setErr("")
    onGenerate({ cnpj: c, segment: seg, tax_regime: reg, operation_flags: flags })
  }

  const segLabels: Record<string,string> = {
    servicos:"Serviços", comercio:"Comércio", industria:"Indústria"
  }
  const ready = !isLoading && !!cnpj && !!seg && !!reg

  // Shared label style for dark sidebar
  const sideLabel: React.CSSProperties = {
    display:"block", fontSize:11, fontWeight:600, color:"var(--side-text-3)",
    letterSpacing:"0.07em", textTransform:"uppercase" as const,
    marginBottom:8, fontFamily:"'Inter',sans-serif",
  }

  return (
    <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", flex:1, minHeight:0 }}>

      {/* CNPJ */}
      <div style={{ padding:"20px 20px 16px", borderBottom:"1px solid var(--side-border)" }}>
        <label style={sideLabel}>CNPJ</label>
        <input
          style={{
            width:"100%", background:"rgba(255,255,255,0.05)",
            border:"1px solid var(--side-border)",
            color:"var(--side-text-1)", fontFamily:"'JetBrains Mono',monospace",
            fontSize:13, padding:"9px 12px", outline:"none",
            borderRadius:"var(--r-md)", letterSpacing:"0.04em",
            transition:"border-color 120ms",
          }}
          value={cnpj} maxLength={18} disabled={isLoading}
          onChange={e => { setCnpj(formatCNPJ(e.target.value)); setErr("") }}
          onFocus={e => (e.target as HTMLInputElement).style.borderColor = "rgba(99,102,241,0.6)"}
          onBlur={e => (e.target as HTMLInputElement).style.borderColor = "var(--side-border)"}
          placeholder="00.000.000/0000-00"
        />
      </div>

      {/* Segmento */}
      <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--side-border)" }}>
        <label style={sideLabel}>Segmento</label>
        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
          {(["servicos","comercio","industria"] as Segment[]).map(s => {
            const active = seg === s
            return (
              <button key={s} type="button" onClick={() => { setSeg(s); setFlags([]) }} style={{
                display:"flex", alignItems:"center", gap:10, width:"100%",
                padding:"9px 10px", border:"none", cursor:"pointer",
                background: active ? "rgba(99,102,241,0.15)" : "transparent",
                borderRadius:"var(--r-md)", textAlign:"left" as const,
                transition:"background 100ms",
              }}>
                <div style={{
                  width:7, height:7, borderRadius:"50%", flexShrink:0,
                  background: active ? "var(--v-hi)" : "var(--side-text-3)",
                  transition:"background 100ms",
                }} />
                <span style={{
                  fontSize:13, fontWeight: active ? 500 : 400,
                  color: active ? "var(--side-text-1)" : "var(--side-text-2)",
                  fontFamily:"'Inter',sans-serif", letterSpacing:"-0.01em",
                }}>
                  {segLabels[s]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Regime */}
      <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--side-border)" }}>
        <label style={sideLabel}>Regime tributário</label>
        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
          {(["lucro_real","lucro_presumido","simples_nacional"] as TaxRegime[]).map(r => {
            const active = reg === r
            return (
              <button key={r} type="button" onClick={() => setReg(r)} style={{
                display:"flex", alignItems:"center", gap:10, width:"100%",
                padding:"9px 10px", border:"none", cursor:"pointer",
                background: active ? "rgba(99,102,241,0.15)" : "transparent",
                borderRadius:"var(--r-md)", textAlign:"left" as const,
                transition:"background 100ms",
              }}>
                <div style={{
                  width:7, height:7, borderRadius:"50%", flexShrink:0,
                  background: active ? "var(--v-hi)" : "var(--side-text-3)",
                  transition:"background 100ms",
                }} />
                <span style={{
                  fontSize:13, fontWeight: active ? 500 : 400,
                  color: active ? "var(--side-text-1)" : "var(--side-text-2)",
                  fontFamily:"'Inter',sans-serif", letterSpacing:"-0.01em",
                }}>
                  {REGIME_LABELS[r]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Sinais */}
      {seg && allFlags.length > 0 && (
        <div style={{ padding:"16px 20px", borderBottom:"1px solid var(--side-border)" }}>
          <label style={sideLabel}>Sinais operacionais</label>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {allFlags.map(f => {
              const active = flags.includes(f)
              return (
                <label key={f} style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
                  <div onClick={() => toggle(f)} style={{
                    width:15, height:15, flexShrink:0, borderRadius:3,
                    background: active ? "var(--v)" : "transparent",
                    border: `1px solid ${active ? "var(--v)" : "var(--side-text-3)"}`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    transition:"all 120ms", cursor:"pointer",
                  }}>
                    {active && <span style={{ color:"#fff", fontSize:10, fontWeight:700, lineHeight:1 }}>✓</span>}
                  </div>
                  <span style={{
                    fontSize:12, color: active ? "var(--side-text-1)" : "var(--side-text-2)",
                    fontFamily:"'Inter',sans-serif", letterSpacing:"-0.01em",
                    transition:"color 100ms",
                  }}>
                    {FLAG_LABELS[f]}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ flex:1 }} />

      {err && (
        <p style={{ fontSize:12, color:"#F87171", fontFamily:"'Inter',sans-serif", padding:"8px 20px" }}>
          {err}
        </p>
      )}

      {/* Submit */}
      <div style={{ padding:"16px 20px", borderTop:"1px solid var(--side-border)" }}>
        <button type="submit" disabled={!ready} style={{
          width:"100%", padding:"11px 0",
          background: ready ? "var(--v)" : "rgba(255,255,255,0.06)",
          border: `1px solid ${ready ? "var(--v)" : "var(--side-border)"}`,
          color: ready ? "#fff" : "var(--side-text-3)",
          fontSize:13, fontWeight:600, letterSpacing:"-0.01em",
          cursor: ready ? "pointer" : "not-allowed",
          borderRadius:"var(--r-md)", fontFamily:"'Space Grotesk',sans-serif",
          transition:"all 160ms",
        }}>
          {isLoading ? "Analisando..." : "Analisar empresa →"}
        </button>
      </div>

    </form>
  )
}

function PipelineStrip({ events, elapsed }: { events: Array<{ event: string }>; elapsed: number }) {
  const recv = new Set(events.map(e => e.event))
  const idx = STEPS.reduce((a, s, i) => recv.has(s.event) ? i : a, -1)
  const pct = Math.round(((idx + 1) / STEPS.length) * 100)
  const activeLabel = idx < STEPS.length - 1 ? STEPS[idx + 1]?.label : "Concluido"

  return (
    <div style={{ borderTop:"1px solid var(--side-border)", padding:"12px 16px", flexShrink:0 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"var(--side-text-3)", letterSpacing:"0.05em" }}>
          {activeLabel}
        </span>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"var(--v-hi)", letterSpacing:"0.04em" }}>
          {pct}%
        </span>
      </div>
      <div style={{ height:1, background:"rgba(255,255,255,0.06)", position:"relative", marginBottom:10, borderRadius:99 }}>
        <div style={{ position:"absolute", inset:0, width:`${pct}%`, background:"var(--v)", transition:"width 400ms var(--ease)", borderRadius:99 }} />
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        {STEPS.map((step, i) => {
          const done = i <= idx
          const active = i === idx + 1
          return (
            <div key={step.event} style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{
                width:3, height:3, borderRadius:"50%", flexShrink:0,
                background: done ? "var(--green)" : active ? "var(--v)" : "var(--rule-mid)",
                transition:"background 300ms",
              }} />
              <span style={{ fontSize:12, color: done ? "var(--ink-3)" : active ? "var(--ink-2)" : "var(--ink-4)", transition:"color 300ms", letterSpacing:"-0.01em" }}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---- Score panel ------------------------------------------------------------

function ScorePanel({ score, tier, isReal }: { score: number; tier: string; isReal: boolean }) {
  const isHigh = score >= 70
  const color = score >= 80 ? "var(--green)" : score >= 60 ? "var(--v)" : score >= 40 ? "var(--yellow)" : "var(--red)"
  const labels: Record<string,string> = { S:"Elite", A:"Alta", B:"Média", C:"Baixa", D:"Mín" }
  return (
    <div style={{ borderTop:"1px solid var(--side-border)", padding:"12px 16px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
        <span style={{ fontSize:11, fontWeight:500, color:"var(--side-text-2)", letterSpacing:"0.07em", textTransform:"uppercase", fontFamily:"'Inter',sans-serif" }}>
          Score
        </span>
        <div style={{ display:"flex", alignItems:"baseline", gap:5 }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:22, fontWeight:400, color, lineHeight:1 }}>{score}</span>
          <span style={{ fontSize:11, fontWeight:500, color, fontFamily:"'Inter',sans-serif" }}>{labels[tier] ?? tier}</span>
        </div>
      </div>
      <div style={{ height:1.5, background:"var(--lift)", borderRadius:99, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${score}%`, background:color, borderRadius:99, transition:"width 700ms var(--ease)" }} />
      </div>
    </div>
  )
}


// ---- Area Oportunidades -----------------------------------------------------

function AreaOportunidades({ result }: { result: any }) {
  const mods     = result.engine_result?.recommended ?? []
  const fin      = result.financial_calculations ?? []
  const adj      = result.score_adjustments
  const regime   = result.engine_result?.tax_regime ?? "lucro_real"
  const score    = result.engine_result?.final_score ?? 0
  const legal    = result.legal_intelligence
  const timing   = result.timing_intelligence
  const profile  = result.company_profile

  // Total potential across all modules
  const totalPotential = fin.reduce((sum: number, f: any) => {
    const v = f?.retroativo_5y?.provavel ?? 0
    return sum + (typeof v === "number" ? v : 0)
  }, 0)

  const fmtBRL = (n: number) => {
    if (!n || n <= 0) return null
    if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `R$ ${Math.round(n / 1_000)}k`
    return `R$ ${n}`
  }

  const scoreColor = score >= 80 ? "var(--success)" : score >= 60 ? "var(--v)" : score >= 40 ? "var(--yellow)" : "var(--red)"

  if (mods.length === 0) {
    return (
      <div className="ax-empty">
        <p style={{ fontSize:13, color:"var(--ink-3)", marginBottom:6 }}>Nenhuma tese identificada para este perfil.</p>
        <p style={{ fontSize:11, color:"var(--ink-4)" }}>Simples Nacional restringe PIS/COFINS nao-cumulativo. Verifique regime e segmento.</p>
      </div>
    )
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {/* ── Dossier header ── */}
      <div style={{
        padding:"28px 48px 24px", borderBottom:"1px solid var(--border)",
        background:"var(--white)", flexShrink:0,
      }}>
        {/* Title row */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
          <div>
            <p style={{ fontSize:12, color:"var(--ink-4)", letterSpacing:"0.07em", textTransform:"uppercase", fontFamily:"'JetBrains Mono',monospace", marginBottom:6 }}>
              Teses identificadas — {result.company_name?.split(" ").slice(0,3).join(" ")}
            </p>
            <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:21, fontWeight:600, color:"var(--ink-1)", letterSpacing:"-0.035em", lineHeight:1.05 }}>
              {mods.length} {mods.length === 1 ? "oportunidade tributária" : "oportunidades tributárias"} mapeadas
            </h2>
            {totalPotential > 0 && (
              <p style={{ fontSize:13, color:"var(--ink-3)", marginTop:6, letterSpacing:"-0.01em" }}>
                Potencial combinado estimado:{" "}
                <span style={{ fontFamily:\"'Inter',sans-serif\", fontSize:14, fontWeight:500, color:"var(--ink-1)" }}>
                  {fmtBRL(totalPotential)}
                </span>
                <span style={{ fontSize:12, color:"var(--ink-4)", marginLeft:6 }}>retroativo 60 meses</span>
              </p>
            )}
          </div>

          {/* Score */}
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <p style={{ fontSize:11, color:"var(--ink-4)", letterSpacing:"0.06em", textTransform:"uppercase", fontFamily:"'JetBrains Mono',monospace", marginBottom:4 }}>
              Score de priorização
            </p>
            <div style={{ display:"flex", alignItems:"baseline", gap:6, justifyContent:"flex-end" }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:32, fontWeight:400, color:scoreColor, lineHeight:1, letterSpacing:"-0.02em" }}>
                {adj?.adjusted_score ?? score}
              </span>
              <span style={{ fontSize:11, color:scoreColor }}>
                {score >= 80 ? "Elite" : score >= 60 ? "Alta" : score >= 40 ? "Media" : "Baixa"}
              </span>
            </div>
            <div style={{ width:80, height:2, background:"var(--border)", marginTop:6, marginLeft:"auto" }}>
              <div style={{ height:"100%", width:`${Math.min(adj?.adjusted_score ?? score, 100)}%`, background:scoreColor, transition:"width 600ms var(--ease)" }} />
            </div>
          </div>
        </div>

        {/* Context signals */}
        <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
          {/* Legal maturity signal */}
          {legal?.maturity_level && legal.maturity_level !== "none" && (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:4, height:4, borderRadius:"50%", background:
                legal.maturity_level === "high" ? "var(--success)"  "var(--yellow)"
                legal.maturity_level === "medium" ? "var(--v)" : "var(--warning)"
              }} />
              <span style={{ fontSize:11, color:"var(--ink-3)" }}>
                Maturidade tributária{" "}
                <span style={{ color:"var(--ink-2)", fontWeight:500 }}>
                  {legal.maturity_level === "high" ? "alta" : legal.maturity_level === "medium" ? "média" : "inicial"}
                </span>
                {" — "}{legal.approach_shift?.slice(0, 60)}
              </span>
            </div>
          )}
          {/* Timing signal */}
          {timing?.temperature && timing.temperature !== "fria" && (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:4, height:4, borderRadius:"50%",
                background: timing.temperature === "quente" ? "var(--error)" : "var(--warning)"
              }} />
              <span style={{ fontSize:11, color:"var(--ink-3)" }}>
                Momento {timing.temperature}
                {timing.events?.[0]?.title && ` — ${timing.events[0].title.slice(0,50)}`}
              </span>
            </div>
          )}
          {/* Regime */}
          {regime && (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:4, height:4, borderRadius:"50%", background:"var(--ink-4)" }} />
              <span style={{ fontSize:11, color:"var(--ink-3)" }}>
                {regime === "lucro_real" ? "Lucro Real" : regime === "lucro_presumido" ? "Lucro Presumido" : "Simples Nacional"}
              </span>
            </div>
          )}
          {/* Score explanation */}
          {adj?.explanation && (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:4, height:4, borderRadius:"50%", background:"var(--ink-4)" }} />
              <span style={{ fontSize:11, color:"var(--ink-3)", fontStyle:"italic" }}>
                {adj.explanation.slice(0, 80)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Module index (priority overview) ── */}
      {mods.length > 1 && (
        <div style={{
          padding:"12px 48px", borderBottom:"1px solid var(--border)",
          background:"var(--canvas)", flexShrink:0,
          display:"flex", alignItems:"center", gap:6, overflowX:"auto",
        }}>
          <span style={{ fontSize:11, color:"var(--ink-4)", letterSpacing:"0.06em", textTransform:"uppercase", fontFamily:"'JetBrains Mono',monospace", marginRight:8, flexShrink:0 }}>
            Teses
          </span>
          {mods.map((m: any, i: number) => {
            const calcForMod = fin.find((f: any) => f.module_slug === m.slug)
            const hasValue = calcForMod?.retroativo_5y?.provavel > 0
            return (
              <div key={m.slug} style={{
                display:"flex", alignItems:"center", gap:6, padding:"4px 12px",
                background:"var(--white)", borderBottom:`2px solid ${m.priority === "core" ? "var(--v)" : "transparent"}`,
                flexShrink:0,
              }}>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color: m.priority === "core" ? "var(--v)" : "var(--ink-3)", fontWeight: m.priority === "core" ? 600 : 400 }}>
                  {String(i+1).padStart(2,"0")}
                </span>
                <span style={{ fontSize:11, color:"var(--ink-2)", letterSpacing:"-0.01em" }}>{m.name}</span>
                {hasValue && (
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:"var(--ink-1)", fontWeight:500 }}>
                    {fmtBRL(calcForMod.retroativo_5y.provavel)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Teses list ── */}
      <div style={{ flex:1, overflowY:"auto" }}>
        {mods.map((m: any, i: number) => {
          const calc = fin.find((f: any) => f.module_slug === m.slug)
          return (
            <OpportunityIntelligenceBlock
              key={m.slug}
              module={m}
              financialCalc={calc ?? null}
              regime={regime}
              companyName={result.company_name}
              whyItFits={
                result.strategic_dossier?.contextualized_modules?.find((cm: any) => cm.module_slug === m.slug)?.why_it_fits_this_company
                ?? m.why_it_fits_this_company
              }
            />
          )
        })}
      </div>
    </div>
  )
}


// ---- Area Playbook ----------------------------------------------------------

// ------ EmailComposer --- Live AI email generation ---------------------------------------------------------------------------------------------------
// Uses Anthropic API to generate personalized emails from AXIOM intelligence context

type EmailMoment = "objecao_email" | "pos_ligacao" | "follow_up" | "reativacao"
type EmailTone   = "executivo" | "tecnico" | "relacional"

function EmailComposer({ result }: { result: any }) {
  const [moment,   setMoment]   = useState<EmailMoment>("objecao_email")
  const [tone,     setTone]     = useState<EmailTone>("executivo")
  const [extraCtx, setExtraCtx] = useState("")
  const [loading,  setLoading]  = useState(false)
  const [email,    setEmail]    = useState<{ subject: string; body: string } | null>(null)
  const [copied,   setCopied]   = useState<"subject"|"body"|"all"|null>(null)
  const [error,    setError]    = useState("")

  // Extract context from result
  const company    = result.company_name ?? ""
  const maker      = result.enriched_linkedin_makers?.[0] ?? result.enriched_makers?.[0]
  const makerName  = maker?.name ?? ""
  const makerRole  = maker?.role ?? ""
  const topMod     = result.engine_result?.recommended?.[0]
  const modName    = topMod?.name ?? ""
  const modTrigger = topMod?.curiosity_trigger ?? topMod?.how_to_use_in_call ?? ""
  const whyNow     = result.why_now?.headline ?? ""
  const timing     = result.timing_intelligence?.events?.[0]?.title ?? ""
  const legal      = result.legal_intelligence?.maturity_level ?? "none"
  const legalShift = result.legal_intelligence?.approach_shift ?? ""
  const retroativo = result.financial_calculations?.[0]?.retroativo_5y?.provavel
  const fmtRetro   = retroativo > 0
    ? (retroativo >= 1000000
      ? `R$ ${(retroativo/1000000).toFixed(1)}M`
      : `R$ ${Math.round(retroativo/1000)}k`)
    : ""

  const momentLabels: Record<EmailMoment, string> = {
    objecao_email: "Me manda um e-mail",
    pos_ligacao:   "Pós-ligação",
    follow_up:     "Follow-up (sem resposta)",
    reativacao:    "Reativação (sumiu)",
  }
  const toneLabels: Record<EmailTone, string> = {
    executivo: "Executivo",
    tecnico:   "Técnico",
    relacional:"Relacional",
  }

  const generateEmail = async () => {
    setLoading(true)
    setError("")
    setEmail(null)

    const contextBlock = [
      `Empresa: ${company}`,
      makerName  ? `Decisor: ${makerName}${makerRole ? ` (${makerRole})` : ""}` : "",
      modName    ? `Tese principal: ${modName}` : "",
      modTrigger ? `Gancho identificado: ${modTrigger}` : "",
      whyNow     ? `Por que agora: ${whyNow}` : "",
      timing     ? `Evento recente: ${timing}` : "",
      fmtRetro   ? `Potencial estimado: ${fmtRetro} retroativo` : "",
      legal !== "none" ? `Maturidade tributária: ${legal === "high" ? "alta — empresa já judicializa teses" : legal === "medium" ? "média — já discute teses" : "inicial"}` : "",
      legalShift ? `Contexto jurídico: ${legalShift}` : "",
      extraCtx   ? `Contexto adicional da ligação: ${extraCtx}` : "",
    ].filter(Boolean).join("\n")

    const momentInstructions: Record<EmailMoment, string> = {
      objecao_email: "O decisor pediu para mandar um e-mail durante a ligação. Escreva um e-mail CURTO (máximo 5 linhas de corpo) que: (1) referencia o que foi conversado, (2) deixa um gancho específico sobre a tese identificada, (3) tem um CTA simples. Não seja genérico. Não pitch completo — apenas o suficiente para garantir a próxima conversa.",
      pos_ligacao:   "Ligação acabou de terminar. Escreva um e-mail de follow-up que: (1) agradece o tempo sem ser bajulador, (2) resume o ponto mais relevante discutido, (3) propõe próximo passo concreto (call/reunião com data).",
      follow_up:     "Enviou e-mail há 5-7 dias, sem resposta. Escreva um follow-up que: (1) é muito curto (2-3 linhas), (2) não pressiona, (3) usa um novo ângulo ou informação relevante, (4) é fácil de responder.",
      reativacao:    "Contato sumiu há 30+ dias. Escreva um e-mail de reativação que: (1) não menciona que sumiu, (2) usa um gatilho novo (timing, mercado, prazo prescricional), (3) abre conversa sem pressão.",
    }

    const toneInstructions: Record<EmailTone, string> = {
      executivo:  "Tom executivo: direto, conciso, foco em impacto financeiro e tempo do decisor. Sem juridiquês. Máximo 100 palavras no corpo.",
      tecnico:    "Tom técnico: usa terminologia tributária precisa, referencia a tese com fundamento jurídico. Para CFO/Controller que entende do assunto.",
      relacional: "Tom relacional: mais caloroso, usa o nome do decisor, contexto da empresa específico. Para primeiro contato ou quando o relacionamento é novo.",
    }

    const prompt = `Você é um especialista em vendas consultivas para assessorias tributárias. Gere um e-mail personalizado.

CONTEXTO DA EMPRESA:
${contextBlock}

INSTRUÇÃO:
${momentInstructions[moment]}

TOM:
${toneInstructions[tone]}

REGRAS ABSOLUTAS:
- Use o nome do decisor quando disponível (${makerName || "não identificado"})
- Mencione a empresa pelo nome (${company})
- NÃO use "Espero que esteja bem" ou frases genéricas
- NÃO prometa resultado sem análise
- NÃO use "identificamos oportunidades" — seja específico
- O assunto deve ser intrigante, não genérico
- Use quebras de linha para respirar

Responda APENAS com JSON válido neste formato exato (sem markdown):
{"subject": "assunto aqui", "body": "corpo do email aqui com quebras de linha usando \n"}`

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      })

      const data = await response.json()
      const text = data.content?.map((c: any) => c.text || "").join("") ?? ""
      const clean = text.replace(/```json|```/g, "").trim()
      const parsed = JSON.parse(clean)

      if (parsed.subject && parsed.body) {
        setEmail({ subject: parsed.subject, body: parsed.body })
      } else {
        setError("Formato inesperado na resposta. Tente novamente.")
      }
    } catch (err) {
      setError("Erro ao gerar e-mail. Verifique a conexão e tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const copyText = (type: "subject" | "body" | "all") => {
    const text = type === "subject" ? email!.subject
      : type === "body" ? email!.body
      : `Assunto: ${email!.subject}\n\n${email!.body}`
    try { navigator.clipboard.writeText(text) } catch {}
    setCopied(type)
    setTimeout(() => setCopied(null), 1800)
  }

  return (
    <div style={{ marginTop:32, paddingTop:32, borderTop:"1px solid var(--border)" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <p className="t-label" style={{ marginBottom:4 }}>Compositor de e-mail</p>
          <p style={{ fontSize:12, color:"var(--ink-3)" }}>
            Gera e-mail personalizado em tempo real com base na inteligência da empresa
          </p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--success)" }} />
          <span style={{ fontSize:11, color:"var(--ink-4)", fontFamily:"'JetBrains Mono',monospace" }}>IA ao vivo</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap" as const }}>

        {/* Moment selector */}
        <div style={{ flex:1, minWidth:200 }}>
          <p style={{ fontSize:12, color:"var(--ink-4)", letterSpacing:"0.05em", textTransform:"uppercase" as const, marginBottom:6, fontFamily:"'Inter',sans-serif" }}>Momento</p>
          <div style={{ display:"flex", flexDirection:"column" as const, gap:3 }}>
            {(Object.keys(momentLabels) as EmailMoment[]).map(m => (
              <button key={m} onClick={() => setMoment(m)} style={{
                textAlign:"left" as const, padding:"7px 12px", fontSize:11,
                border:"none",
                background: moment===m ? "rgba(109,94,243,0.08)" : "transparent",
                color: moment===m ? "var(--v)" : "var(--ink-3)",
                cursor:"pointer", transition:"all 80ms",
                borderLeft: `2px solid ${moment===m ? "var(--v)" : "transparent"}`,
                fontWeight: moment===m ? 500 : 400,
              }}>
                {momentLabels[m]}
              </button>
            ))}
          </div>
        </div>

        {/* Tone selector */}
        <div style={{ flex:1, minWidth:140 }}>
          <p style={{ fontSize:12, color:"var(--ink-4)", letterSpacing:"0.05em", textTransform:"uppercase" as const, marginBottom:6, fontFamily:"'Inter',sans-serif" }}>Tom</p>
          <div style={{ display:"flex", flexDirection:"column" as const, gap:3 }}>
            {(Object.keys(toneLabels) as EmailTone[]).map(t => (
              <button key={t} onClick={() => setTone(t)} style={{
                textAlign:"left" as const, padding:"7px 12px", fontSize:11,
                border:"none",
                background: tone===t ? "rgba(109,94,243,0.06)" : "transparent",
                color: tone===t ? "var(--v)" : "var(--ink-3)",
                cursor:"pointer", transition:"all 80ms",
                borderLeft: `2px solid ${tone===t ? "var(--v)" : "transparent"}`,
                fontWeight: tone===t ? 500 : 400,
              }}>
                {toneLabels[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Context field + generate button */}
        <div style={{ flex:2, minWidth:240, display:"flex", flexDirection:"column" as const, gap:8 }}>
          <div>
            <p style={{ fontSize:12, color:"var(--ink-4)", letterSpacing:"0.05em", textTransform:"uppercase" as const, marginBottom:6, fontFamily:"'Inter',sans-serif" }}>
              Contexto da ligação (opcional)
            </p>
            <textarea
              value={extraCtx}
              onChange={e => setExtraCtx(e.target.value)}
              placeholder="Ex: decisor mencionou que já tem assessoria tributária, perguntou sobre prazo..."
              style={{
                width:"100%", background:"var(--canvas)", border:"1px solid var(--border-mid)",
                color:"var(--ink-1)", fontFamily:"'Inter',sans-serif", fontSize:11,
                padding:"10px 12px", outline:"none", resize:"vertical" as const,
                lineHeight:1.6, minHeight:72, borderRadius:"var(--r-md)",
                transition:"border-color 100ms",
              }}
              onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = "rgba(124,58,237,0.35)"}
              onBlur={e => (e.target as HTMLTextAreaElement).style.borderColor = "var(--border-mid)"}
            />
          </div>

          <button
            onClick={generateEmail}
            disabled={loading}
            style={{
              padding:"10px 0", width:"100%",
              background: loading ? "transparent" : "rgba(124,58,237,0.08)",
              border: `1px solid ${loading ? "var(--border)" : "rgba(124,58,237,0.25)"}`,
              color: loading ? "var(--ink-4)" : "var(--v)",
              fontSize:11, fontWeight:500, cursor: loading ? "not-allowed" : "pointer",
              transition:"all 120ms", borderRadius:"var(--r-md)", fontFamily:"'Inter',sans-serif",
            }}
          >
            {loading ? "Gerando..." : "Gerar e-mail"}
          </button>

          {error && (
            <p style={{ fontSize:12, color:"var(--error)", fontFamily:"'JetBrains Mono',monospace" }}>{error}</p>
          )}
        </div>
      </div>

      {/* Context preview */}
      <div style={{ padding:"8px 12px", background:"var(--canvas)", marginBottom:16, display:"flex", gap:12, flexWrap:"wrap" as const }}>
        <p style={{ fontSize:11, color:"var(--ink-4)", fontFamily:"'JetBrains Mono',monospace" }}>Contexto usado:</p>
        {[
          makerName && `Decisor: ${makerName}`,
          modName && `Tese: ${modName}`,
          fmtRetro && `Potencial: ${fmtRetro}`,
          timing && `Timing: ${timing.slice(0,30)}`,
          whyNow && `Por que agora: ${whyNow.slice(0,40)}`,
        ].filter(Boolean).map((item, i) => (
          <span key={i} style={{ fontSize:11, color:"var(--ink-3)", fontFamily:"'JetBrains Mono',monospace" }}>
            · {item}
          </span>
        ))}
        {!makerName && !modName && (
          <span style={{ fontSize:11, color:"var(--ink-4)", fontStyle:"italic" }}>
            Analise um CNPJ primeiro para maximizar a personalização
          </span>
        )}
      </div>

      {/* Generated email */}
      {loading && (
        <div style={{ padding:"32px", textAlign:"center" as const }}>
          {[120,80,40].map((w,i) => (
            <div key={i} className="shimmer" style={{ height:1, width:w, background:"rgba(15,23,42,0.10)", borderRadius:99, margin:"8px auto" }} />
          ))}
          <p style={{ fontSize:11, color:"var(--ink-4)", fontFamily:"'JetBrains Mono',monospace", marginTop:12 }}>
            gerando e-mail personalizado...
          </p>
        </div>
      )}

      {email && !loading && (
        <div style={{ display:"flex", flexDirection:"column" as const, gap:0 }}>

          {/* Copy all button */}
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
            <button onClick={() => copyText("all")} style={{
              padding:"6px 16px", fontSize:11, fontWeight:500,
              background: copied==="all" ? "rgba(16,185,129,0.08)" : "rgba(124,58,237,0.06)",
              border: `1px solid ${copied==="all" ? "rgba(16,185,129,0.2)" : "rgba(124,58,237,0.2)"}`,
              color: copied==="all" ? "var(--success)" : "var(--v)",
              cursor:"pointer", borderRadius:"var(--r-md)", fontFamily:"'Inter',sans-serif",
              transition:"all 120ms",
            }}>
              {copied==="all" ? "✓ Copiado" : "Copiar e-mail completo"}
            </button>
          </div>

          {/* Subject */}
          <div style={{ padding:"14px 0", borderBottom:"1px solid var(--border)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
              <p style={{ fontSize:11, color:"var(--ink-4)", letterSpacing:"0.06em", textTransform:"uppercase" as const, fontFamily:"'JetBrains Mono',monospace" }}>
                Assunto
              </p>
              <button onClick={() => copyText("subject")} style={{
                fontSize:11, color: copied==="subject" ? "var(--success)" : "var(--ink-4)",
                background:"none", border:"none", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace",
                transition:"color 120ms",
              }}>
                {copied==="subject" ? "copiado" : "copiar"}
              </button>
            </div>
            <p style={{ fontSize:14, fontWeight:500, color:"var(--ink-1)", letterSpacing:"-0.01em" }}>
              {email.subject}
            </p>
          </div>

          {/* Body */}
          <div style={{ padding:"14px 0" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <p style={{ fontSize:11, color:"var(--ink-4)", letterSpacing:"0.06em", textTransform:"uppercase" as const, fontFamily:"'JetBrains Mono',monospace" }}>
                Corpo
              </p>
              <button onClick={() => copyText("body")} style={{
                fontSize:11, color: copied==="body" ? "var(--success)" : "var(--ink-4)",
                background:"none", border:"none", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace",
                transition:"color 120ms",
              }}>
                {copied==="body" ? "copiado" : "copiar"}
              </button>
            </div>
            <pre style={{
              fontFamily:"'Inter',sans-serif", fontSize:13, color:"var(--ink-1)",
              lineHeight:1.9, whiteSpace:"pre-wrap" as const, margin:0,
            }}>
              {email.body}
            </pre>
          </div>

          {/* Regenerate */}
          <div style={{ paddingTop:12, borderTop:"1px solid var(--border)", display:"flex", justifyContent:"flex-end" }}>
            <button onClick={generateEmail} style={{
              fontSize:12, color:"var(--ink-3)", background:"none", border:"none",
              cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.04em",
            }}>
              gerar nova versão →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


function AreaPlaybook({ result }: { result: any }) {
  const copilot  = result.unified_copilot
  const legal    = result.legal_intelligence
  const timing   = result.timing_intelligence
  const makers   = result.enriched_linkedin_makers ?? result.enriched_makers ?? []
  const mods     = result.engine_result?.recommended ?? []
  const topMaker = makers[0]
  const topMod   = mods[0]

  if (!copilot) {
    return (
      <div className="ax-empty">
        <p style={{ fontSize:13, color:"var(--ink-3)" }}>Playbook nao disponivel.</p>
        <p style={{ fontSize:11, color:"var(--ink-4)", marginTop:4 }}>Execute a analise completa para gerar o copiloto.</p>
      </div>
    )
  }

  const scoreColor = (result.engine_result?.final_score ?? 0) >= 70 ? "var(--success)"
    : (result.engine_result?.final_score ?? 0) >= 50 ? "var(--v)"
    : "var(--warning)"

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {/* ── War room header ── */}
      <div style={{ padding:"24px 48px 20px", borderBottom:"1px solid var(--border)", background:"var(--white)", flexShrink:0 }}>

        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <p style={{ fontSize:12, color:"var(--ink-4)", letterSpacing:"0.07em", textTransform:"uppercase", fontFamily:"'JetBrains Mono',monospace", marginBottom:5 }}>
              Playbook operacional
            </p>
            <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:19, fontWeight:600, color:"var(--ink-1)", letterSpacing:"-0.035em" }}>
              {result.company_name?.split(" ").slice(0,4).join(" ")}
            </h2>
          </div>

          {/* Readiness indicators */}
          <div style={{ display:"flex", gap:20, flexShrink:0 }}>
            {topMaker && (
              <div style={{ textAlign:"right" }}>
                <p style={{ fontSize:11, color:"var(--ink-4)", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:3, fontFamily:"'JetBrains Mono',monospace" }}>Decisor</p>
                <p style={{ fontSize:12, fontWeight:500, color:"var(--ink-1)" }}>{topMaker.name?.split(" ").slice(0,2).join(" ")}</p>
                <p style={{ fontSize:12, color:"var(--ink-3)" }}>{topMaker.role}</p>
              </div>
            )}
            {topMod && (
              <div style={{ textAlign:"right" }}>
                <p style={{ fontSize:11, color:"var(--ink-4)", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:3, fontFamily:"'JetBrains Mono',monospace" }}>Tese principal</p>
                <p style={{ fontSize:12, fontWeight:500, color:"var(--v)" }}>{topMod.name}</p>
                <p style={{ fontSize:12, color:"var(--ink-3)" }}>Score {topMod.score}</p>
              </div>
            )}
          </div>
        </div>

        {/* Intelligence signals — situational awareness row */}
        <div style={{ display:"flex", gap:0, borderTop:"1px solid var(--border)", paddingTop:14 }}>
          {[
            {
              label: "Maturidade juridica",
              value: legal?.maturity_level === "high" ? "Alta — abordagem diferenciada"
                : legal?.maturity_level === "medium" ? "Media — ja discute teses"
                : legal?.maturity_level === "low" ? "Inicial"
                : "Sem historico identificado",
              dot: legal?.maturity_level === "none" ? "var(--ink-4)"
                : legal?.maturity_level === "high" ? "var(--success)"
                : legal?.maturity_level === "medium" ? "var(--v)" : "var(--warning)",
            },
            {
              label: "Momento",
              value: timing?.temperature === "quente" ? "Quente — agir agora"
                : timing?.temperature === "morna" ? "Morno — relevante"
                : "Neutro",
              dot: timing?.temperature === "quente" ? "var(--error)"
                : timing?.temperature === "morna" ? "var(--warning)"
                : "var(--ink-4)",
            },
            {
              label: "Oportunidades mapeadas",
              value: `${mods.length} tese${mods.length !== 1 ? "s" : ""}`,
              dot: mods.length >= 3 ? "var(--success)" : mods.length >= 1 ? "var(--v)" : "var(--ink-4)",
            },
            {
              label: "Abordagem recomendada",
              value: legal?.approach_shift?.slice(0, 55) || copilot.behavioral?.pre_call_mentality?.tone_guidance?.slice(0, 55) || "—",
              dot: "var(--ink-4)",
            },
          ].map((sig, i) => (
            <div key={i} style={{ flex:1, paddingRight:20, borderRight: i < 3 ? "1px solid var(--border)" : "none", paddingLeft: i > 0 ? 20 : 0 }}>
              <p style={{ fontSize:11, color:"var(--ink-4)", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:4, fontFamily:"'JetBrains Mono',monospace" }}>
                {sig.label}
              </p>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:4, height:4, borderRadius:"50%", background:sig.dot, flexShrink:0 }} />
                <p style={{ fontSize:11, color:"var(--ink-2)", lineHeight:1.4 }}>{sig.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Copilot panel + dossier extras ── */}
      <div style={{ flex:1, overflowY:"auto" }}>
        <div style={{ padding:"32px 48px", maxWidth:860 }}>
          <UnifiedCopilotPanel copilot={copilot} />

          {/* why_now — timing de mercado */}
          {result.why_now?.headline && (
            <div style={{ marginTop:32, paddingTop:32, borderTop:"1px solid var(--border)" }}>
              <p className="t-label" style={{ marginBottom:18 }}>Por que agora</p>
              <div style={{ padding:"16px 0", borderBottom:"1px solid var(--border)", marginBottom:16 }}>
                <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:15, fontWeight:500, color:"var(--ink-1)", letterSpacing:"-0.02em", lineHeight:1.5 }}>
                  {result.why_now.headline}
                </p>
              </div>
              {result.why_now.reasons?.filter((r: any) => r.strength === "high" || r.strength === "medium").map((r: any, i: number) => (
                <div key={i} style={{ display:"flex", gap:12, padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
                  <div style={{ width:4, height:4, borderRadius:"50%", background: r.strength === "high" ? "var(--error)" : "var(--warning)", flexShrink:0, marginTop:6 }} />
                  <div>
                    <p style={{ fontSize:12, color:"var(--ink-1)", lineHeight:1.6 }}>{r.reason}</p>
                    <p style={{ fontSize:12, color:"var(--ink-4)", fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>{r.type} · {r.source}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* strategic_dossier.meeting_questions */}
          {result.strategic_dossier?.meeting_questions?.length > 0 && (
            <div style={{ marginTop:32, paddingTop:32, borderTop:"1px solid var(--border)" }}>
              <p className="t-label" style={{ marginBottom:18 }}>Perguntas estratégicas para a reunião</p>
              {result.strategic_dossier.meeting_questions.map((q: string, i: number) => (
                <div key={i} style={{ display:"flex", gap:14, padding:"10px 0", borderBottom:"1px solid var(--border)", alignItems:"flex-start" }}>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"var(--v)", flexShrink:0, paddingTop:3, minWidth:20 }}>
                    {String(i+1).padStart(2,"0")}
                  </span>
                  <p style={{ fontSize:13, color:"var(--ink-1)", flex:1, lineHeight:1.65 }}>{q}</p>
                </div>
              ))}
            </div>
          )}

          {/* strategic_dossier.next_steps */}
          {result.strategic_dossier?.next_steps?.length > 0 && (
            <div style={{ marginTop:32, paddingTop:32, borderTop:"1px solid var(--border)" }}>
              <p className="t-label" style={{ marginBottom:18 }}>Próximos passos recomendados</p>
              {result.strategic_dossier.next_steps.map((step: string, i: number) => (
                <div key={i} style={{ display:"flex", gap:12, padding:"8px 0", borderBottom:"1px solid var(--border)", alignItems:"center" }}>
                  <div style={{ width:18, height:18, border:"1px solid var(--border-mid)", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"var(--ink-4)" }}>{i+1}</span>
                  </div>
                  <p style={{ fontSize:12, color:"var(--ink-2)", lineHeight:1.5 }}>{step}</p>
                </div>
              ))}
            </div>
          )}
          {/* Live email composer */}
          <EmailComposer result={result} />

        </div>
      </div>
    </div>
  )
}


function AreaDecisores({ result }: { result: any }) {
  const makers  = result.enriched_makers ?? result.intel_decision_makers ?? []
  const liMakers = result.linkedin_decision_makers ?? []
  const legal   = result.legal_intelligence

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Context bar */}
      {legal && (
        <div style={{ padding:"12px 48px", borderBottom:"1px solid var(--border)", background:"var(--bg-overlay)", flexShrink:0, display:"flex", alignItems:"center", gap:20 }}>
          <span className="t-label" style={{ color:"var(--ink-4)" }}>Contexto juridico</span>
          <span className={`badge ${legal.maturity_level==="none"?"badge-ghost":legal.maturity_level==="low"?"badge-ghost":"badge-amber"}`}>
            {legal.maturity_level?.toUpperCase()}
          </span>
          <p style={{ fontSize:11, color:"var(--ink-3)", flex:1 }}>{legal.approach_shift?.slice(0,120)}...</p>
        </div>
      )}

      <div style={{ flex:1, overflowY:"auto" }}>
        <div className="content-pad" style={{ maxWidth:800 }}>

          {/* LinkedIn Decision Makers */}
          {liMakers.length > 0 ? (
            <div style={{ marginBottom:36 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:15, fontWeight:700, color:"var(--ink-1)" }}>
                  Decisores identificados
                </p>
                <span className="badge badge-green">{liMakers.length} encontrados</span>
                <span style={{ fontSize:12, color:"var(--ink-4)" }}>via LinkedIn / Google</span>
              </div>
              {liMakers.map((lm: any, i: number) => (
                <div key={i} style={{
                  padding:"16px 0", borderBottom:"1px solid var(--border)",
                  background: lm.is_primary_target ? "var(--v-wash)" : "var(--bg-0)",
                  marginBottom:10,
                }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
                    <div style={{
                      width:46, height:46, borderRadius:"50%", flexShrink:0,
                      background: lm.is_primary_target ? "var(--v)" : "var(--bg-overlay)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      
                    }}>
                      <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:17, color: lm.is_primary_target ? "var(--bg-1)" : "var(--ink-3)" }}>
                        {lm.name[0]}
                      </span>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                        <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:14, fontWeight:700, color:"var(--ink-1)" }}>{lm.name}</p>
                        {lm.is_primary_target && <span className="badge badge-amber">alvo primario</span>}
                        <span className={`badge ${lm.confidence==="high"?"badge-green":lm.confidence==="medium"?"badge-amber":"badge-ghost"}`}>
                          {lm.confidence}
                        </span>
                      </div>
                      <p style={{ fontSize:13, color:"var(--v)", fontWeight:600, marginBottom:8 }}>{lm.role}</p>
                      {lm.linkedin_url ? (
                        <a href={lm.linkedin_url} target="_blank" rel="noopener noreferrer" style={{
                          display:"inline-flex", alignItems:"center", gap:6, padding:"4px 10px",
                          color:"#2563EB", fontSize:11, textDecoration:"none",
                          fontFamily:"'JetBrains Mono',monospace",
                        }}>
                          in Ver perfil →
                        </a>
                      ) : (
                        <p style={{ fontSize:12, color:"var(--ink-4)", fontStyle:"italic" }}>
                          Buscar no LinkedIn: "{lm.name} {result.company_name}"
                        </p>
                      )}
                    </div>
                  </div>
                  {lm.company_context && (
                    <div style={{ marginTop:14, padding:"10px 14px", borderLeft:"2px solid var(--border)", background:"rgba(0,0,0,0.1)" }}>
                      <p style={{ fontSize:11, color:"var(--ink-3)", lineHeight:1.5, fontStyle:"italic" }}>
                        "{lm.company_context.slice(0,180)}"
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding:"20px 24px", background:"var(--canvas)", marginBottom:28 }}>
              <p style={{ fontSize:13, color:"var(--ink-3)", marginBottom:6 }}>Nenhum decisor identificado via LinkedIn nesta busca.</p>
              <p style={{ fontSize:11, color:"var(--ink-4)" }}>Consulte os socios abaixo (Receita Federal) e busque manualmente no LinkedIn.</p>
            </div>
          )}

          {/* QSA Receita Federal */}
          {makers.length > 0 && (
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                <p className="t-label">QSA — Receita Federal</p>
                <span className="badge badge-ghost">{makers.length} socios</span>
              </div>
              {makers.map((m: any, i: number) => (
                <div key={i} style={{ padding:"16px 0", borderBottom:"1px solid var(--border)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:"var(--canvas)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:13, color:"var(--ink-3)" }}>{m.name[0]}</span>
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:13, fontWeight:600, color:"var(--ink-1)" }}>{m.name}</p>
                      <p style={{ fontSize:11, color:"var(--ink-3)" }}>{m.role ?? m.probable_role}</p>
                    </div>
                    {m.is_primary_target && <span className="badge badge-amber">alvo</span>}
                  </div>
                  {m.opening_line && (
                    <div style={{ padding:"10px 14px", borderLeft:"2px solid var(--accent-dim)", background:"var(--v-wash)" }}>
                      <p className="t-label" style={{ marginBottom:4, fontSize:11 }}>Abertura sugerida</p>
                      <p style={{ fontSize:12, color:"var(--ink-1)", lineHeight:1.7, fontStyle:"italic" }}>"{m.opening_line}"</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --------- AREA 3: Juridico ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Legal history --- writs of mandamus, litigation profile, law firms

function AreaJuridico({ result }: { result: any }) {
  const legal = result.legal_intelligence
  const msFindings = legal?.findings?.filter((f: any) => f.type === "mandado_segurança") ?? []
  const otherFindings = legal?.findings?.filter((f: any) => f.type !== "mandado_segurança") ?? []

  return (
    <div style={{ flex:1, overflowY:"auto" }}>
      <div className="content-pad" style={{ maxWidth:800 }}>

        {!legal ? (
          <div style={{ padding:"40px 0" }}>
            <p style={{ fontSize:13, color:"var(--ink-3)" }}>Pesquisa juridica nao disponivel.</p>
          </div>
        ) : (
          <>
            {/* Summary bar */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, marginBottom:28 }}>
              {([
                ["TRF Competente", legal.trf_competente],
                ["Maturidade",     legal.maturity_level?.toUpperCase()],
                ["Perfil",         legal.litigation_profile?.replace(/_/g," ")],
                ["Mandados MS",    msFindings.length > 0 ? `${msFindings.length} identificado(s)` : "Nenhum identificado"],
              ] as [string, string][]).map(([l,v]) => (
                <div key={l} style={{ padding:"14px 16px", background:"var(--canvas)" }}>
                  <p className="t-label" style={{ marginBottom:6 }}>{l}</p>
                  <p className="t-mono" style={{ fontSize:11, color:"var(--ink-2)" }}>{v ?? "--"}</p>
                </div>
              ))}
            </div>

            <div style={{ padding:"14px 20px", borderLeft:"2px solid var(--border)", background:"var(--bg-overlay)", marginBottom:28 }}>
              <p style={{ fontSize:13, color:"var(--ink-2)", lineHeight:1.7 }}>{legal.maturity_label}</p>
              {legal.approach_shift && (
                <p style={{ fontSize:12, color:"var(--v)", marginTop:8, lineHeight:1.6 }}>→ {legal.approach_shift}</p>
              )}
            </div>

            {/* Mandados de Segurança */}
            <div style={{ marginBottom:32 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:14, fontWeight:700, color:"var(--ink-1)" }}>
                  Mandados de Segurança Tributarios
                </p>
                {msFindings.length > 0 && (
                  <span className="badge badge-amber">{msFindings.length} MS</span>
                )}
              </div>

              {msFindings.length === 0 ? (
                <div style={{ padding:"20px 24px", background:"var(--canvas)" }}>
                  <p style={{ fontSize:13, color:"var(--ink-3)", marginBottom:6 }}>
                    Nenhum mandado de segurança tributario identificado nas fontes publicas consultadas.
                  </p>
                  <p style={{ fontSize:12, color:"var(--ink-4)" }}>
                    Fontes consultadas: Google News (proxy judicial), {legal.trf_competente}. Para busca manual: pesquise o CNPJ ou razao social no JusBrasil ou Escavador.
                  </p>
                </div>
              ) : msFindings.map((f: any, i: number) => (
                <div key={i} style={{ padding:"20px 0", borderBottom:"1px solid var(--border)", marginBottom:0 }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
                    <div>
                      <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:13, fontWeight:700, color:"var(--v-hi)", marginBottom:4 }}>
                        Mandado de Segurança Tributario
                      </p>
                      {f.process_number ? (
                        <p style={{ fontFamily:\"'Inter',sans-serif\", fontSize:13, color:"var(--ink-1)", fontWeight:500 }}>
                          Proc. {f.process_number}
                        </p>
                      ) : (
                        <p style={{ fontSize:12, color:"var(--ink-4)", fontStyle:"italic" }}>Numero do processo nao identificado</p>
                      )}
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <span className="badge badge-ghost">{f.court ?? f.trf_ref}</span>
                      {f.filing_year && <p style={{ fontSize:12, color:"var(--ink-4)", marginTop:4 }}>{f.filing_year}</p>}
                    </div>
                  </div>
                  {f.subject_matter && (
                    <div style={{ padding:"10px 14px", background:"rgba(0,0,0,0.15)", marginBottom:12 }}>
                      <p style={{ fontSize:11, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", color:"var(--v-border)", marginBottom:4 }}>
                        Materia discutida
                      </p>
                      <p style={{ fontSize:13, color:"var(--ink-1)", fontWeight:500 }}>{f.subject_matter}</p>
                    </div>
                  )}
                  <p style={{ fontSize:11, color:"var(--ink-3)", lineHeight:1.5, fontStyle:"italic" }}>"{f.description?.slice(0,200)}"</p>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:10 }}>
                    <p style={{ fontSize:11, color:"var(--ink-4)" }}>Fonte: {f.source}</p>
                    <span className={`badge ${f.confidence==="high"?"badge-green":f.confidence==="medium"?"badge-amber":"badge-ghost"}`}>
                      {f.confidence}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Other findings */}
            {otherFindings.length > 0 && (
              <div style={{ marginBottom:28 }}>
                <p className="t-label" style={{ marginBottom:18 }}>Outros achados juridicos</p>
                {otherFindings.map((f: any, i: number) => (
                  <div key={i} style={{ padding:"14px 16px", background:"var(--canvas)", marginBottom:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                      <p style={{ fontSize:12, fontWeight:600, color:"var(--ink-1)" }}>{f.theme}</p>
                      <span className="badge badge-ghost">{f.type?.replace(/_/g," ")}</span>
                    </div>
                    <p style={{ fontSize:11, color:"var(--ink-3)", lineHeight:1.5 }}>{f.description}</p>
                    <p style={{ fontSize:12, color:"var(--v)", marginTop:6 }}>{f.commercial_signal}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Law firms */}
            {legal.law_firms && legal.law_firms.length > 0 && (
              <div>
                <p className="t-label" style={{ marginBottom:18 }}>Escritorios identificados</p>
                {legal.law_firms.map((firm: any, i: number) => (
                  <div key={i} style={{ padding:"14px 16px", background:"var(--canvas)", marginBottom:8 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:"var(--ink-1)", marginBottom:4 }}>{firm.name}</p>
                    <p style={{ fontSize:11, color:"var(--v)" }}>{firm.specialty}</p>
                    {firm.lawyers.length > 0 && (
                      <p style={{ fontSize:11, color:"var(--ink-3)", marginTop:4 }}>Advogados: {firm.lawyers.join(", ")}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function AreaBriefing({ result }: { result: any }) {
  const b = result.executive_briefing
  if (!b) return <p style={{ fontSize: 13, color: "var(--ink-3)", padding: "80px 48px" }}>Briefing nao disponivel.</p>

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ padding: "56px 64px", maxWidth: 840 }}>
        <div style={{ marginBottom: 40, paddingBottom: 32, borderBottom: "1px solid var(--border)" }}>
          <p className="t-label" style={{ marginBottom: 8 }}>Executive Briefing</p>
          <h1 className="t-display" style={{ fontSize: 32, color: "var(--ink-1)", lineHeight: 1 }}>
            {result.company_name}
          </h1>
        </div>

        <div style={{ marginBottom: 32 }}>
          <p className="t-label" style={{ marginBottom: 12 }}>Empresa</p>
          <p style={{ fontSize: 15, color: "var(--ink-1)", lineHeight: 1.8 }}>{b.empresa_resumo}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
          <div>
            <p className="t-label" style={{ marginBottom: 12 }}>Sinais-chave</p>
            {b.sinais_chave && b.sinais_chave.map((s: string, i: number) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--v-border)", fontSize: 10, marginTop: 3 }}>--</span>
                <p style={{ fontSize: 12, color: "var(--ink-2)", lineHeight: 1.5 }}>{s}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="t-label" style={{ marginBottom: 12 }}>Decisores</p>
            {b.decisores && b.decisores.length > 0 ? b.decisores.map((d: string, i: number) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--v-border)", fontSize: 10, marginTop: 3 }}>--</span>
                <p style={{ fontSize: 12, color: "var(--ink-2)" }}>{d}</p>
              </div>
            )) : <p style={{ fontSize: 12, color: "var(--ink-4)" }}>A identificar</p>}
          </div>
        </div>

        <div style={{ marginBottom: 32 }}>
          <p className="t-label" style={{ marginBottom: 12 }}>Top oportunidades</p>
          {b.top_oportunidades && b.top_oportunidades.map((op: any, i: number) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
              <span className="t-mono" style={{ fontSize: 11, color: "var(--v-border)", width: 24, flexShrink: 0 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-1)" }}>{op.nome}</p>
                <p style={{ fontSize: 11, color: "var(--ink-3)" }}>{op.motivo}</p>
              </div>
              <span className={`badge ${op.urgencia === "Alta" ? "badge-red" : op.urgencia === "Media" ? "badge-amber" : "badge-ghost"}`}>
                {op.urgencia}
              </span>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 32, borderLeft: "2px solid var(--accent)", padding: "16px 20px", background: "var(--v-wash)" }}>
          <p className="t-label" style={{ marginBottom: 10 }}>Abertura recomendada</p>
          <p style={{ fontSize: 14, color: "var(--ink-1)", lineHeight: 1.8, fontStyle: "italic" }}>"{b.abertura}"</p>
        </div>

        <div style={{ padding: 24, background: "var(--v-wash)", borderLeft: "2px solid var(--accent)" }}>
          <p className="t-label" style={{ marginBottom: 10 }}>Conclusao estrategica</p>
          <p style={{ fontSize: 13, color: "var(--ink-1)", lineHeight: 1.8 }}>{b.estrategia}</p>
        </div>
      </div>
    </div>
  )
}

// ---- Area Diagnostico -------------------------------------------------------

function AreaDiagnostico({ result, debugInfo, events }: { result: any; debugInfo: any; events: any[] }) {
  type DiagSub = "pipeline" | "juridico" | "decisores"
  const [section, setSection] = useState<DiagSub>("pipeline")

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div className="content-pad" style={{ maxWidth: 880 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
          <p className="t-label">Diagnostico tecnico</p>
          <div style={{ display: "flex", gap: 4 }}>
            {(["pipeline", "juridico", "decisores"] as DiagSub[]).map(s => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={"btn-ghost" + (section === s ? " active" : "")}
                style={{ fontSize: 10, padding: "4px 12px" }}
              >
                {s === "pipeline" ? "Pipeline" : s === "juridico" ? "Juridico" : "Decisores"}
              </button>
            ))}
          </div>
        </div>

        {section === "pipeline" && (
          <div>
            {debugInfo && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                {([
                  ["CNPJ", debugInfo.cnpj_used],
                  ["Brasil API", debugInfo.brasil_api_status],
                  ["Confianca", debugInfo.intelligence_confidence],
                  ["Total", `${debugInfo.total_ms}ms`],
                ] as [string, string][]).map(([l, v]) => (
                  <div key={l} style={{ padding: 16, background: "var(--bg-0)", border: "1px solid var(--border)" }}>
                    <p className="t-label" style={{ marginBottom: 6 }}>{l}</p>
                    <p className="t-mono" style={{ fontSize: 12, color: "var(--ink-2)" }}>{v}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="t-label" style={{ marginBottom: 10 }}>Events</p>
            {events.map((e: any, i: number) => (
              <p key={i} className="t-mono" style={{ fontSize: 9, color: "var(--ink-4)", marginBottom: 2 }}>
                {e.event}
              </p>
            ))}
          </div>
        )}

        {section === "juridico" && (
          <div>
            {result.legal_intelligence ? (
              <div>
                {/* Header metrics */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                  {([
                    ["TRF Competente", result.legal_intelligence.trf_competente],
                    ["Maturidade", result.legal_intelligence.maturity_level?.toUpperCase()],
                    ["Perfil", result.legal_intelligence.litigation_profile],
                  ] as [string, string][]).map(([l, v]) => (
                    <div key={l} style={{ padding: 14, background: "var(--bg-0)", border: "1px solid var(--border)" }}>
                      <p className="t-label" style={{ marginBottom: 6 }}>{l}</p>
                      <p className="t-mono" style={{ fontSize: 11, color: "var(--ink-2)" }}>{v ?? "--"}</p>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 24, lineHeight: 1.7 }}>{result.legal_intelligence.maturity_label}</p>

                {/* Mandados de Segurança */}
                {result.legal_intelligence.findings && result.legal_intelligence.findings.filter((f: any) => f.type === "mandado_segurança").length > 0 ? (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <p className="t-label">Mandados de Segurança identificados</p>
                      <span className="badge badge-amber">
                        {result.legal_intelligence.findings.filter((f: any) => f.type === "mandado_segurança").length} MS
                      </span>
                    </div>
                    {result.legal_intelligence.findings
                      .filter((f: any) => f.type === "mandado_segurança")
                      .map((f: any, i: number) => (
                        <div key={i} style={{ padding: "18px 20px", border: "1px solid var(--accent-dim)", background: "var(--v-wash)", marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                            <div>
                              <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 700, color: "var(--v-hi)", marginBottom: 4 }}>
                                Mandado de Segurança Tributario
                              </p>
                              {f.process_number && (
                                <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--ink-1)" }}>
                                  Proc. {f.process_number}
                                </p>
                              )}
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span className="badge badge-ghost">{f.court ?? f.trf_ref}</span>
                              {f.filing_year && (
                                <p style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 4 }}>{f.filing_year}</p>
                              )}
                            </div>
                          </div>
                          {f.subject_matter && (
                            <div style={{ padding: "8px 12px", background: "rgba(0,0,0,0.15)", marginBottom: 10 }}>
                              <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--v-border)", marginBottom: 4 }}>
                                Materia discutida
                              </p>
                              <p style={{ fontSize: 12, color: "var(--ink-1)" }}>{f.subject_matter}</p>
                            </div>
                          )}
                          <p style={{ fontSize: 11, color: "var(--ink-3)", lineHeight: 1.5, fontStyle: "italic" }}>"{f.description?.slice(0, 200)}"</p>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                            <p style={{ fontSize: 9, color: "var(--ink-4)" }}>Fonte: {f.source}</p>
                            <span className={`badge ${f.confidence === "high" ? "badge-green" : f.confidence === "medium" ? "badge-amber" : "badge-ghost"}`}>
                              {f.confidence}
                            </span>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                ) : (
                  <div style={{ padding: "16px 20px", border: "1px solid var(--border)", background: "var(--bg-0)", marginBottom: 20 }}>
                    <p style={{ fontSize: 12, color: "var(--ink-3)" }}>
                      Nenhum mandado de segurança identificado nas fontes publicas consultadas.
                    </p>
                    <p style={{ fontSize: 10, color: "var(--ink-4)", marginTop: 6 }}>
                      Fontes consultadas: Google News (proxy judicial), {result.legal_intelligence.trf_competente}
                    </p>
                  </div>
                )}

                {/* Other findings */}
                {result.legal_intelligence.findings && result.legal_intelligence.findings.filter((f: any) => f.type !== "mandado_segurança").length > 0 && (
                  <div>
                    <p className="t-label" style={{ marginBottom: 12 }}>Outros achados juridicos</p>
                    {result.legal_intelligence.findings
                      .filter((f: any) => f.type !== "mandado_segurança")
                      .map((f: any, i: number) => (
                        <div key={i} style={{ padding: "14px 16px", border: "1px solid var(--border)", background: "var(--bg-0)", marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-1)" }}>{f.theme}</p>
                            <span className="badge badge-ghost">{f.type}</span>
                          </div>
                          <p style={{ fontSize: 11, color: "var(--ink-3)", lineHeight: 1.5 }}>{f.description}</p>
                        </div>
                      ))
                    }
                  </div>
                )}

                {/* Law firms */}
                {result.legal_intelligence.law_firms && result.legal_intelligence.law_firms.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <p className="t-label" style={{ marginBottom: 12 }}>Escritorios identificados</p>
                    {result.legal_intelligence.law_firms.map((firm: any, i: number) => (
                      <div key={i} style={{ padding: "14px 16px", border: "1px solid var(--border)", background: "var(--bg-0)", marginBottom: 8 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-1)", marginBottom: 4 }}>{firm.name}</p>
                        <p style={{ fontSize: 11, color: "var(--v)" }}>{firm.specialty}</p>
                        {firm.lawyers.length > 0 && (
                          <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>
                            Advogados: {firm.lawyers.join(", ")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: "20px", border: "1px solid var(--border)", background: "var(--bg-0)" }}>
                <p style={{ fontSize: 13, color: "var(--ink-3)" }}>Pesquisa juridica nao disponivel.</p>
              </div>
            )}
          </div>
        )}

        {section === "decisores" && (
          <div>
            {result.enriched_makers && result.enriched_makers.length > 0 ? (
              result.enriched_makers.map((m: any, i: number) => (
                <div key={i} style={{ padding: 16, background: "var(--bg-0)", border: "1px solid var(--border)", marginBottom: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-1)", marginBottom: 4 }}>{m.name}</p>
                  <p style={{ fontSize: 11, color: "var(--ink-3)" }}>{m.role} -- {m.seniority} -- {m.decision_power}</p>
                </div>
              ))
            ) : (
              <p style={{ fontSize: 13, color: "var(--ink-3)" }}>Nenhum decisor identificado.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Areas config -----------------------------------------------------------

// Navigation follows the consultant's prospecting mindset:
// 1. WHO is the company?  2. WHO do I talk to?  3. WHAT have they done legally?
// 4. WHAT opportunities fit?  5. HOW do I approach them?

// --------- Navigation architecture ---------------------------------------------------------------------------------------------------
// Flow mirrors consultant's mental model before a prospecting call:
// 1. CONTEXTO  --- company intel + operations + signals + presence
// 2. PESSOAS   --- who to call: LinkedIn + QSA + opening lines
// 3. HISTORICO --- legal history: mandados de seguran--a + processes
// 4. OPORTUNIDADES --- what fits this company
// 5. PLAYBOOK  --- how to approach: mindset + scripts + WhatsApp

type Area = "contexto" | "pessoas" | "historico" | "oportunidades" | "playbook"

const AREAS: Array<{ key: Area; label: string; desc: string; step: string; hint: string }> = [
  { key: "contexto",      label: "Contexto",      desc: "Quem e a empresa",    step: "01", hint: "Cadastro, operação, sinais, presença digital" },
  { key: "pessoas",       label: "Pessoas",        desc: "Com quem falar",      step: "02", hint: "LinkedIn, QSA, abertura por cargo" },
  { key: "historico",     label: "Historico",      desc: "Postura juridica",    step: "03", hint: "Mandados de segurança, processos, maturidade" },
  { key: "oportunidades", label: "Oportunidades",  desc: "O que cabe",          step: "04", hint: "Módulos tributários, calculadoras, por que cabe" },
  { key: "playbook",      label: "Playbook",       desc: "Como abordar",        step: "05", hint: "Antes de ligar, roteiro, WhatsApp, objeções" },
]

// --------- Step indicator ---------------------------------------------------------------------------------------------------------------------------------

function StepNav({ area, setArea, result }: { area: Area; setArea: (a: Area) => void; result: any }) {
  const msCount   = result?.legal_intelligence?.findings?.filter((f: any) => f.type === "mandado_segurança")?.length ?? 0
  const liCount   = (result?.enriched_linkedin_makers?.length ?? 0) + (result?.enriched_makers?.length ?? 0)
  const modsCount = result?.engine_result?.recommended?.length ?? 0

  const badges: Partial<Record<Area, string>> = {
    pessoas:       liCount   > 0 ? String(liCount)   : undefined,
    historico:     msCount   > 0 ? String(msCount)   : undefined,
    oportunidades: modsCount > 0 ? String(modsCount) : undefined,
  }

  return (
    <div className="ax-step-rail">
      {AREAS.map((a) => {
        const active = area === a.key
        const badge  = badges[a.key]
        return (
          <button
            key={a.key}
            onClick={() => setArea(a.key)}
            className={active ? "ax-step active" : "ax-step"}
          >
            <span className="step-num">{a.step}</span>
            <span className="step-label">
              {a.label}
              {badge && <span className="step-badge" style={{ marginLeft:6 }}>{badge}</span>}
            </span>
            <span className="step-sub">{a.desc}</span>
          </button>
        )
      })}
    </div>
  )
}


// --------- Area Contexto (merged: Empresa + Operacao + Sinais + Pesquisa + Inteligencia) ------------------------------------

function TimingPanel({ timing }: { timing: any }) {
  const [open, setOpen] = useState(false)
  const tempColor: Record<string,string> = { quente:"var(--error)", morna:"var(--warning)", fria:"var(--ink-3)", monitorar:"var(--ink-4)" }
  const tempBg:    Record<string,string> = { quente:"var(--error-faint)", morna:"var(--warning-faint)", fria:"var(--bg-0)", monitorar:"var(--bg-0)" }
  const color  = tempColor[timing.temperature] ?? "var(--ink-3)"
  const bg     = tempBg[timing.temperature]    ?? "var(--bg-0)"
  return (
    <div style={{ marginTop:32, borderTop:"1px solid var(--border)" }}>
      <button onClick={() => setOpen(!open)} style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"16px 20px", background:"none", border:"none", cursor:"pointer", textAlign:"left" as const }}>
        <div style={{ width:10, height:10, borderRadius:"50%", background:color, flexShrink:0 }} />
        <div style={{ flex:1 }}>
          <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:13, fontWeight:700, color, marginBottom:3 }}>{timing.temperature_label}</p>
          <p style={{ fontSize:11, color:"var(--ink-3)" }}>{timing.temperature_reason}</p>
        </div>
        {timing.events?.length > 0 && <span style={{ fontSize:11, fontWeight:700, padding:"0", color }}>{timing.events.length} sinais</span>}
        <span style={{ color:"var(--ink-4)", fontSize:12 }}>{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div style={{ borderTop:`1px solid ${color}`, padding:"20px" }}>
          {timing.opening_hook && (
            <div style={{ padding:"12px 16px", borderLeft:`3px solid ${color}`, background:"rgba(0,0,0,0.1)", marginBottom:16 }}>
              <p style={{ fontSize:11, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase" as const, color:"var(--ink-4)", marginBottom:6 }}>Gancho de abertura</p>
              <p style={{ fontSize:13, color:"var(--ink-1)", lineHeight:1.8, fontStyle:"italic" }}>"{timing.opening_hook}"</p>
            </div>
          )}
          <div style={{ padding:"10px 14px", background:"var(--canvas)", marginBottom:16 }}>
            <p style={{ fontSize:11, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase" as const, color:"var(--ink-4)", marginBottom:6 }}>Quando abordar</p>
            <p style={{ fontSize:12, color:"var(--ink-2)", lineHeight:1.6 }}>{timing.timing_advice}</p>
          </div>
          {timing.events?.map((ev: any, i: number) => {
            const ec = ev.temperature === "quente" ? "var(--error)" : ev.temperature === "morna" ? "var(--warning)" : "var(--ink-3)"
            return (
              <div key={i} style={{ padding:"12px 14px", background:"var(--canvas)", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:ec, fontWeight:500 }}>{ev.type.replace(/_/g," ")}</span>
                  <span style={{ fontSize:11, color:"var(--ink-4)" }}>{ev.days_ago < 999 ? ev.days_ago + "d atras" : ""}</span>
                </div>
                <p style={{ fontSize:12, fontWeight:500, color:"var(--ink-1)", marginBottom:6 }}>{ev.title?.slice(0,140)}</p>
                <p style={{ fontSize:11, color:"var(--ink-3)", lineHeight:1.5, marginBottom:8 }}>{ev.why_relevant}</p>
                <div style={{ padding:"6px 10px", borderLeft:`2px solid ${ec}`, background:"rgba(0,0,0,0.1)" }}>
                  <p style={{ fontSize:11, color:"var(--ink-1)", fontStyle:"italic" }}>"{ev.opening_hook}"</p>
                </div>
              </div>
            )
          })}
          {(!timing.events || timing.events.length === 0) && timing.monitor_signals?.map((s: string, i: number) => (
            <div key={i} style={{ display:"flex", gap:8, padding:"5px 0", borderBottom:"1px solid var(--border)" }}>
              <span style={{ color:"var(--ink-4)", fontSize:10 }}>—</span>
              <p style={{ fontSize:11, color:"var(--ink-3)" }}>{s}</p>
            </div>
          ))}
          {(!timing.events || timing.events.length === 0) && (result?.sector_context) && (
            <div style={{ marginTop:16, padding:"14px 18px", background:"var(--bg-overlay)" }}>
              <p style={{ fontSize:11, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase" as const, color:"var(--ink-4)", marginBottom:10 }}>
                Contexto do setor — {result.sector_context.sector}
              </p>
              <p style={{ fontSize:12, color:"var(--ink-1)", lineHeight:1.7, marginBottom:12, fontStyle:"italic" }}>
                "{result.sector_context.opportunity_hook}"
              </p>
              {result.sector_context.regulatory_alert && (
                <div style={{ padding:"8px 12px", borderLeft:"2px solid var(--warning)", background:"var(--warning-faint)", marginBottom:10 }}>
                  <p style={{ fontSize:12, fontWeight:600, color:"#D97706", marginBottom:3 }}>Alerta regulatorio</p>
                  <p style={{ fontSize:11, color:"var(--ink-2)", lineHeight:1.5 }}>{result.sector_context.regulatory_alert}</p>
                </div>
              )}
              <div>
                {result.sector_context.recent_trends?.map((t: string, i: number) => (
                  <div key={i} style={{ display:"flex", gap:8, padding:"4px 0", borderBottom:"1px solid var(--border)" }}>
                    <span style={{ color:"var(--v-border)", fontSize:12, paddingTop:2, flexShrink:0 }}>—</span>
                    <p style={{ fontSize:11, color:"var(--ink-3)", lineHeight:1.5 }}>{t}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize:11, color:"var(--ink-4)", marginTop:10 }}>Contexto de setor — nao especifico desta empresa</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


function ContactsBlock({ we }: { we: any }) {
  const [copied, setCopied] = useState<string|null>(null)
  const allContacts: any[] = we?.contacts?.length ? we.contacts : [
    we?.telefone && { value: we.telefone, type: "telefone", label: "Comercial", source: "RF", has_whatsapp: false },
    we?.email    && { value: we.email,    type: "email",    label: "Email",     source: "RF" },
    we?.website  && { value: we.website,  type: "site",     label: "Site",      source: "Web" },
    we?.linkedin_url && { value: we.linkedin_url, type: "linkedin", label: "LinkedIn", source: "Google" },
  ].filter(Boolean) as any[]

  const ICONS: Record<string,string> = { telefone:"T", email:"@", site:"W", linkedin:"in", instagram:"IG", facebook:"FB" }
  const COLORS: Record<string,string> = { telefone:"var(--success)", email:"var(--ink-2)", site:"var(--v)", linkedin:"#60A5FA", instagram:"#F472B6", facebook:"#818CF8" }

  if (allContacts.length === 0) {
    return (
      <div style={{ marginBottom:32 }}>
        <p className="t-label" style={{ marginBottom:14 }}>Contatos</p>
        <p style={{ fontSize:12, color:"var(--ink-3)" }}>Nenhum contato publico encontrado.</p>
      </div>
    )
  }

  return (
    <div style={{ marginBottom:32 }}>
      <p className="t-label" style={{ marginBottom:14 }}>Contatos identificados</p>
      <div style={{ display:"flex", flexDirection:"column" }}>
        {allContacts.map((c: any, i: number) => {
          const isLink = ["site","linkedin","instagram","facebook"].includes(c.type)
          const color = COLORS[c.type] ?? "var(--ink-2)"
          const icon = ICONS[c.type] ?? "?"
          const waUrl = "https://wa.me/55" + c.value.replace(/\D/g, "")
          return (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"7px 0", borderBottom:"1px solid var(--border)" }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color, width:18, flexShrink:0 }}>{icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                {isLink ? (
                  <a href={c.value.startsWith("http") ? c.value : "https://" + c.value} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color, textDecoration:"none", fontFamily:"'JetBrains Mono',monospace" }}>
                    {c.value.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                ) : (
                  <span style={{ fontSize:12, color:"var(--ink-1)", fontFamily:"'JetBrains Mono',monospace" }}>{c.value}</span>
                )}
                <span style={{ fontSize:11, color:"var(--ink-4)", marginLeft:8 }}>{c.label}</span>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                {!isLink && (
                  <button onClick={() => { try { navigator.clipboard.writeText(c.value) } catch {} setCopied(c.value); setTimeout(() => setCopied(null), 1400) }} style={{ fontSize:11, color: copied===c.value ? "var(--success)" : "var(--ink-4)", background:"none", border:"none", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace" }}>
                    {copied===c.value ? "ok" : "copiar"}
                  </button>
                )}
                {c.type === "telefone" && (
                  <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:"var(--success)", textDecoration:"none", fontFamily:"'JetBrains Mono',monospace" }}>WA</a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AreaContexto({ result }: { result: any }) {
  type Sub = "resumo" | "operacao" | "sinais" | "pesquisa"
  const [sub, setSub] = useState<Sub>("resumo")

  const d = result.intelligence?.company_identity ?? {}
  const prof = result.company_profile
  const presence = result.company_presence
  const signals = result.research_signals ?? []

  const SUBS: Array<{ key: Sub; label: string }> = [
    { key: "resumo",   label: "Resumo" },
    { key: "operacao", label: "Operacao" },
    { key: "sinais",   label: "Sinais" },
    { key: "pesquisa", label: "Presenca digital" },
  ]

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div className="ax-subtabs">
        {SUBS.map(s => (
          <button key={s.key} onClick={() => setSub(s.key)} className={`ax-subtab${sub===s.key?" active":""}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:"auto" }}>

        {/* RESUMO */}
        {sub === "resumo" && (
          <div style={{ padding:"44px 52px", maxWidth:800 }}>
            {/* Company header */}
            <div style={{ marginBottom:32 }}>
              <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:28, fontWeight:800, color:"var(--ink-1)", marginBottom:8 }}>
                {result.company_name}
              </h1>
              {prof?.operational_narrative && (
                <p style={{ fontSize:14, color:"var(--ink-2)", lineHeight:1.8, maxWidth:600 }}>
                  {prof.operational_narrative}
                </p>
              )}
            </div>

            {/* Key metrics strip */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:32 }}>
              {[
                ["Segmento", d.cnae_fiscal_descricao?.slice(0,40) ?? "A confirmar"],
                ["Cidade", prof?.localizacao ?? d.municipio ?? "--"],
                ["Capital", d.capital_social ? `R$ ${Number(d.capital_social).toLocaleString("pt-BR")}` : "--"],
                ["Abertura", d.data_abertura ?? "--"],
              ].map(([l,v]) => (
                <div key={l} style={{ padding:"14px 16px", background:"var(--canvas)" }}>
                  <p style={{ fontSize:11, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--ink-4)", marginBottom:6 }}>{l}</p>
                  <p style={{ fontSize:12, color:"var(--ink-1)", lineHeight:1.4 }}>{v}</p>
                </div>
              ))}
            </div>

            {/* Cadastral data */}
            <div style={{ marginBottom:28 }}>
              {result.estimated_fields && result.estimated_fields.length > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", marginBottom:8 }}>
                <div style={{ width:4, height:4, borderRadius:"50%", background:"var(--warning)", flexShrink:0 }} />
                <p style={{ fontSize:12, color:"#D97706", fontFamily:"'JetBrains Mono',monospace" }}>
                  {result.estimated_fields.length} campo(s) estimado(s) por inferencia — dados confirmados quando disponivel
                </p>
              </div>
            )}
            <Row label="Razao Social"      value={d.razao_social}           isReal={!!d.razao_social} />
              <Row label="CNAE Principal"    value={d.cnae_fiscal_descricao}  isReal={!!d.cnae_fiscal_descricao} />
              <Row label="Natureza Juridica" value={d.natureza_juridica} />
              <Row label="Situacao"          value={d.situacao_cadastral}     isReal={!!d.situacao_cadastral} />
              <Row label="Porte"             value={d.porte} />
            </div>

            {/* CONTATOS IDENTIFICADOS */}
            <ContactsBlock we={result.web_enrichment} />

            {/* QSA */}
            {d.qsa && d.qsa.length > 0 && (
              <div>
                <p className="t-label" style={{ marginBottom:18 }}>Quadro Societario (QSA)</p>
                {d.qsa.map((q: any, i: number) => (
                  <div key={i} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:"1px solid var(--border)" }}>
                    <div style={{ width:28, height:28, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:13, color:"var(--v)" }}>{q.nome[0]}</span>
                    </div>
                    <div>
                      <p style={{ fontSize:13, fontWeight:600, color:"var(--ink-1)" }}>{q.nome}</p>
                      <p style={{ fontSize:11, color:"var(--ink-3)" }}>{q.qual}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Executive briefing strip */}
            {result.executive_briefing && (
              <div style={{ marginTop:36, padding:"20px 24px", borderLeft:"2px solid var(--accent)", background:"var(--v-wash)" }}>
                <p className="t-label" style={{ marginBottom:10, color:"var(--v-border)" }}>Leitura estrategica</p>
                <p style={{ fontSize:13, color:"var(--ink-1)", lineHeight:1.8 }}>{result.executive_briefing.estrategia}</p>
              </div>
            )}

            {/* Vagas abertas — direct signal from web enrichment */}
            {result.web_enrichment?.vagas_abertas?.length > 0 && (
              <div style={{ marginTop:32 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                  <p className="t-label">Vagas abertas identificadas</p>
                  <span className="badge badge-amber">{result.web_enrichment.vagas_abertas.length} vagas</span>
                  <span style={{ fontSize:11, color:"var(--ink-4)", fontFamily:"'JetBrains Mono',monospace" }}>sinal de crescimento</span>
                </div>
                {result.web_enrichment.vagas_abertas.slice(0, 4).map((v: any, i: number) => (
                  <div key={i} style={{ padding:"12px 16px", background:"var(--canvas)", marginBottom:6 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:11, fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase", padding:"1px 6px", color:"var(--ink-3)", fontFamily:"'JetBrains Mono',monospace" }}>{v.area}</span>
                      <span style={{ fontSize:11, color:"var(--ink-4)", fontFamily:"'JetBrains Mono',monospace" }}>{v.nivel}</span>
                      <span style={{ fontSize:11, color:"var(--ink-4)", marginLeft:"auto", fontFamily:"'JetBrains Mono',monospace" }}>{v.fonte}</span>
                    </div>
                    <p style={{ fontSize:12, fontWeight:500, color:"var(--ink-1)", marginBottom:4 }}>{v.titulo}</p>
                    <p style={{ fontSize:11, color:"var(--v-hi)", fontStyle:"italic" }}>→ {v.signal}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Timing Intelligence */}
            {result.timing_intelligence && (
              <TimingPanel timing={result.timing_intelligence} />
            )}
          </div>
        )}

        {/* OPERACAO */}
        {sub === "operacao" && prof && (
          <div style={{ padding:"44px 52px", maxWidth:760 }}>
            <div style={{ borderLeft:"2px solid var(--accent)", padding:"16px 20px", background:"var(--v-wash)", marginBottom:24 }}>
              <p className="t-label" style={{ marginBottom:8 }}>Narrativa operacional</p>
              <p style={{ fontSize:14, color:"var(--ink-1)", lineHeight:1.8 }}>{prof.operational_narrative ?? prof.operational_summary}</p>
            </div>
            {prof.tax_exposure_narrative && (
              <div style={{ background:"var(--canvas)", padding:20, marginBottom:20 }}>
                <p className="t-label" style={{ marginBottom:8 }}>Exposicao tributaria</p>
                <p style={{ fontSize:13, color:"var(--ink-2)", lineHeight:1.7 }}>{prof.tax_exposure_narrative}</p>
              </div>
            )}
            {prof.operational_signals?.length > 0 && prof.operational_signals.map((s: any, i: number) => (
              <div key={i} style={{ padding:"16px 0", borderBottom:"1px solid var(--border)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:"var(--ink-1)" }}>{s.label ?? s.title}</span>
                  <span className={`badge ${s.confidence==="high"?"badge-green":s.confidence==="medium"?"badge-amber":"badge-ghost"}`}>{s.confidence}</span>
                </div>
                <p style={{ fontSize:11, color:"var(--ink-3)", fontStyle:"italic", marginBottom:6 }}>"{s.evidence}"</p>
                <p style={{ fontSize:12, color:"var(--v)" }}>→ {s.tax_impact}</p>
              </div>
            ))}
          </div>
        )}

        {/* SINAIS */}
        {sub === "sinais" && (
          <div style={{ padding:"44px 52px", maxWidth:800 }}>
            {signals.filter((s: any) => s.is_confirmed || s.confidence === "high" || (s.evidence && s.evidence.length > 10)).length === 0 ? (
              <div style={{ padding:"48px 0", textAlign:"center" as const }}>
                <p style={{ fontSize:13, color:"var(--ink-3)", marginBottom:8 }}>Nenhum sinal operacional confirmado.</p>
                <p style={{ fontSize:11, color:"var(--ink-4)", maxWidth:400, margin:"0 auto", lineHeight:1.7, marginBottom: result.research_copilot?.opening_lines?.length ? 24 : 0 }}>
                  Sinais aparecem apenas com evidencia concreta.
                </p>
                {result.research_copilot?.opening_lines?.filter((l: any) => l.type === "signal" || l.type === "hook").slice(0, 4).map((line: any, i: number) => (
                  <div key={i} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:"1px solid var(--border)", textAlign:"left" as const, maxWidth:560, margin:"0 auto" }}>
                    <div style={{ width:4, height:4, borderRadius:"50%", background:"var(--v)", flexShrink:0, marginTop:6 }} />
                    <div>
                      <p style={{ fontSize:12, color:"var(--ink-1)", lineHeight:1.6 }}>{line.text}</p>
                      {line.module_hint && (
                        <p style={{ fontSize:11, color:"var(--v)", fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>{line.module_hint}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {signals
                  .filter((s: any) => s.is_confirmed || s.confidence === "high" || (s.evidence && s.evidence.length > 10))
                  .map((s: any, i: number) => {
                    const isConfirmed = s.is_confirmed || s.confidence === "high"
                    const rawLabel = s.signal_type ?? s.type ?? "sinal_operacional"
                    const label = rawLabel.replace(/_/g," ").split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
                    return (
                      <div key={i} style={{ padding:"22px 0", borderBottom:"1px solid var(--border)" }}>
                        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{ width:5, height:5, borderRadius:"50%", flexShrink:0, marginTop:5, background: isConfirmed ? "var(--success)" : "var(--warning)" }} />
                            <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:15, fontWeight:600, color:"var(--ink-1)", letterSpacing:"-0.025em" }}>{label}</p>
                          </div>
                          <span className={`badge ${isConfirmed?"badge-green":"badge-amber"}`}>{isConfirmed?"confirmado":"sinal"}</span>
                        </div>
                        <div style={{ marginLeft:15, paddingLeft:16, borderLeft:"1px solid var(--border)", display:"flex", flexDirection:"column" as const, gap:12 }}>
                          <div>
                            <p style={{ fontSize:11, fontWeight:500, letterSpacing:"0.07em", textTransform:"uppercase" as const, color:"var(--ink-4)", marginBottom:4, fontFamily:"'JetBrains Mono',monospace" }}>Evidencia</p>
                            <p style={{ fontSize:12, color:"var(--ink-2)", lineHeight:1.65 }}>{s.evidence ?? "Dado estrutural"}</p>
                            <p style={{ fontSize:11, color:"var(--ink-4)", marginTop:4, fontFamily:"'JetBrains Mono',monospace" }}>Fonte: {s.source ?? "Sistema"}</p>
                          </div>
                          <div>
                            <p style={{ fontSize:11, fontWeight:500, letterSpacing:"0.07em", textTransform:"uppercase" as const, color:"var(--ink-4)", marginBottom:4, fontFamily:"'JetBrains Mono',monospace" }}>Impacto comercial</p>
                            <p style={{ fontSize:12, color:"var(--ink-1)", lineHeight:1.7 }}>{s.interpretation ?? s.commercial_impact ?? s.commercial_hook ?? ""}</p>
                          </div>
                          {s.module_hint && (
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <p style={{ fontSize:11, color:"var(--ink-4)", fontFamily:"'JetBrains Mono',monospace" }}>Modulo:</p>
                              <span style={{ fontSize:11, fontWeight:600, padding:"1px 6px", color:"var(--v-hi)", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.06em" }}>
                                {String(s.module_hint).replace(/_/g," ")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}
        {sub === "pesquisa" && (
          <div style={{ padding:"44px 52px", maxWidth:860 }}>
            {presence ? (
              <div>
                {/* Header metrics */}
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:32 }}>
                  <div>
                    <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:22, fontWeight:700, color:"var(--ink-1)", letterSpacing:"-0.035em", marginBottom:4 }}>
                      {result.entity_identity?.canonical_name ?? result.company_name}
                    </p>
                    {presence.website?.found && presence.website?.url && (
                      <a href={presence.website.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"var(--v-hi)", textDecoration:"none", letterSpacing:"-0.01em" }}>
                        {presence.website.url.replace(/^https?:\/\//, "").replace(/\/$/, "")} →
                      </a>
                    )}
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:32, fontWeight:400, color:"var(--ink-1)", letterSpacing:"-0.03em", lineHeight:1 }}>
                      {presence.digital_presence_score ?? 0}
                    </p>
                    <p style={{ fontSize:11, color:"var(--ink-4)", fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>score / 100</p>
                  </div>
                </div>

                {/* Website signals */}
                {presence.website?.found && (
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" as const, marginBottom:28 }}>
                    {presence.website.signals?.ecommerce && <span className="badge badge-blue">E-commerce</span>}
                    {presence.website.signals?.exportation && <span className="badge badge-green">Exportacao</span>}
                    {presence.website.signals?.industry && <span className="badge badge-ghost">Industrial</span>}
                    {presence.website.signals?.b2b && <span className="badge badge-ghost">B2B</span>}
                    {presence.website.signals?.esg && <span className="badge badge-green">ESG</span>}
                  </div>
                )}

                {/* News feed — editorial */}
                {presence.news_signals && presence.news_signals.length > 0 ? (
                  <div>
                    <p className="t-label" style={{ marginBottom:20 }}>Monitoramento de mercado</p>
                    <div style={{ display:"flex", flexDirection:"column" as const, gap:0 }}>
                      {presence.news_signals.map((n: any, i: number) => (
                        <div key={i} className="ax-finding">
                          <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
                            {/* Sentiment dot */}
                            <div style={{
                              width:6, height:6, borderRadius:"50%", flexShrink:0, marginTop:6,
                              background: n.sentiment === "positive" ? "var(--success)" : n.sentiment === "negative" ? "var(--error)" : "var(--ink-4)",
                            }} />
                            <div style={{ flex:1, minWidth:0 }}>
                              {/* Title + source + date */}
                              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:8 }}>
                                <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:14, fontWeight:500, color:"var(--ink-1)", lineHeight:1.4, letterSpacing:"-0.02em" }}>
                                  {n.title}
                                </p>
                                {n.url && (
                                  <a href={n.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:"var(--v-hi)", fontFamily:"'JetBrains Mono',monospace", textDecoration:"none", flexShrink:0, marginTop:2 }}>
                                    ver →
                                  </a>
                                )}
                              </div>
                              {/* Source + tags */}
                              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                                {n.source && <span style={{ fontSize:11, color:"var(--ink-4)", fontFamily:"'JetBrains Mono',monospace" }}>{n.source}</span>}
                                {n.date && <span style={{ fontSize:11, color:"var(--ink-4)", fontFamily:"'JetBrains Mono',monospace" }}>{n.date}</span>}
                                {(n.tags ?? []).slice(0,3).map((t: string, ti: number) => (
                                  <span key={ti} className="badge badge-ghost" style={{ fontSize:11 }}>{t}</span>
                                ))}
                              </div>
                              {/* Commercial interpretation — THE key addition */}
                              {n.commercial_hook && (
                                <div style={{ padding:"10px 14px", borderLeft:"1px solid var(--accent)", background:"var(--v-wash)" }}>
                                  <p style={{ fontSize:11, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase" as const, color:"var(--v-hi)", marginBottom:4, fontFamily:"'JetBrains Mono',monospace" }}>
                                    Como explorar comercialmente
                                  </p>
                                  <p style={{ fontSize:12, color:"var(--ink-1)", lineHeight:1.65 }}>
                                    {n.commercial_hook}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding:"40px 0", textAlign:"center" as const }}>
                    <p style={{ fontSize:13, color:"var(--ink-3)", marginBottom:8 }}>Nenhuma noticia recente identificada.</p>
                    <p style={{ fontSize:11, color:"var(--ink-4)" }}>O monitoramento e realizado via Google News — resultados dependem da cobertura midia da empresa.</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding:"40px 0", textAlign:"center" as const }}>
                <p style={{ fontSize:13, color:"var(--ink-3)" }}>Pesquisa de presenca digital nao disponivel.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// --------- Area Pessoas (LinkedIn + QSA + aberturas) ------------------------------------------------

function AreaPessoas({ result }: { result: any }) {
  // Use enriched makers (person intelligence) when available,
  // fall back to raw linkedin makers, then QSA
  const enrichedLinkedin: any[] = result.enriched_linkedin_makers ?? []
  const rawLinkedin:      any[] = result.linkedin_decision_makers ?? []
  const qsa:              any[] = result.enriched_makers ?? result.intel_decision_makers ?? []
  const legal                   = result.legal_intelligence
  const website                 = result.web_enrichment?.website

  // Merge: use enriched if available, supplement with QSA enriched
  // Filter out PJ s--cios --- they're not decision makers
  const PJ_SIGNALS = ["LTDA","SA","EIRELI","HOLDING","PARTICIPACOES","FUNDO","CAPITAL","INVESTIMENTOS","EXTERIOR"]
  const qsaPF = qsa.filter((m: any) => {
    const nm = (m.name ?? "").toUpperCase()
    return !PJ_SIGNALS.some(sig => nm.includes(sig))
  })

  const enrichedQSA = qsaPF.map((m: any) => ({
    name:               m.name,
    role:               m.role ?? m.probable_role ?? "Socio",
    seniority:          m.seniority ?? "c_suite",
    area:               m.area ?? "gestao",
    profiles:           m.person_profile ?? ["executivo"],
    decision_power:     m.decision_power ?? "decisor_final",
    technical_level:    m.technical_level ?? "baixo",
    influence_score:    m.influence_score ?? 7,
    channels:           [],
    linkedin_url:       m.linkedin_url,
    email_probable:     m.email,
    best_approach:      m.best_approach ?? "executiva",
    approach_rationale: m.approach_rationale ?? "Socio identificado no QSA da Receita Federal.",
    avoid:              m.avoid ?? [],
    pain_points:        m.pain_points ?? [],
    trust_builders:     m.trust_builders ?? [],
    source:             "Receita Federal (QSA)",
    confidence:         "high",
    is_primary_target:  true,
    signals:            m.person_signals ?? [],
  }))

  // Primary list: enriched linkedin + enriched QSA (deduped by name)
  const allMakers = [...enrichedLinkedin, ...enrichedQSA].filter((m, i, arr) =>
    arr.findIndex(x => x.name.toLowerCase() === m.name.toLowerCase()) === i
  )

  const [selected, setSelected] = useState<number | null>(allMakers.length > 0 ? 0 : null)

  const seniorityLabel: Record<string, string> = {
    c_suite: "C-Suite", vp: "VP / Head", diretor: "Diretor",
    gerente: "Gerente", coordenador: "Coordenador", analista: "Analista", indefinido: "Indefinido",
  }
  const powerLabel: Record<string, string> = {
    decisor_final: "Decisor final", influenciador: "Influenciador",
    gatekeeper: "Gatekeeper", champion: "Champion", executor: "Executor",
  }
  const approachLabel: Record<string, string> = {
    analitica: "Abordagem analitica", executiva: "Abordagem executiva",
    tecnica: "Abordagem tecnica", relacional: "Abordagem relacional", cautelosa: "Abordagem cautelosa",
  }
  const powerColor: Record<string, string> = {
    decisor_final: "var(--success)", influenciador: "var(--v-hi)",
    gatekeeper: "var(--warning)", champion: "var(--success)", executor: "var(--ink-3)",
  }

  const getInfluenceBar = (score: number) => {
    const color = score >= 8 ? "var(--success)" : score >= 6 ? "var(--v-hi)" : "var(--ink-3)"
    return (
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ flex:1, height:2, background:"var(--border)", borderRadius:99 }}>
          <div style={{ height:"100%", width:`${score*10}%`, background:color, borderRadius:99, transition:"width 400ms var(--ease)" }} />
        </div>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color, minWidth:16, textAlign:"right" as const }}>{score}</span>
      </div>
    )
  }

  const person = selected !== null ? allMakers[selected] : null

  return (
    <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

      {/* Left panel — person list */}
      <div style={{ width:220, flexShrink:0, borderRight:"1px solid var(--border)", overflowY:"auto", background:"var(--canvas)" }}>
        {/* Legal context */}
        {legal && legal.maturity_level !== "none" && (
          <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--border)", background:"rgba(109,94,243,0.04)" }}>
            <p style={{ fontSize:11, fontWeight:500, letterSpacing:"0.07em", textTransform:"uppercase" as const, color:"var(--v)", marginBottom:4, fontFamily:"'Inter',sans-serif" }}>
              Contexto juridico
            </p>
            <p style={{ fontSize:12, color:"var(--ink-3)", lineHeight:1.5 }}>{legal.approach_shift ?? legal.maturity_label}</p>
          </div>
        )}

        {/* People list */}
        <div style={{ padding:"8px 0" }}>
          {allMakers.length === 0 ? (
            <div style={{ padding:"24px 16px", textAlign:"center" as const }}>
              <p style={{ fontSize:11, color:"var(--ink-3)" }}>Nenhum decisor encontrado.</p>
            </div>
          ) : allMakers.map((m: any, i: number) => {
            const isSelected = selected === i
            const color = powerColor[m.decision_power] ?? "var(--ink-3)"
            return (
              <button key={i} onClick={() => setSelected(i)} style={{
                display:"flex", alignItems:"center", gap:10, width:"100%",
                padding:"10px 16px", border:"none", background: isSelected ? "rgba(109,94,243,0.07)" : "transparent",
                cursor:"pointer", textAlign:"left" as const, borderLeft:`2px solid ${isSelected?"var(--v)":"transparent"}`,
                transition:"all 100ms",
              }}>
                <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0, background: isSelected ? "rgba(109,94,243,0.15)" : "rgba(15,23,42,0.03)",  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:600, fontSize:12, color: isSelected ? "var(--v-hi)" : "var(--ink-3)" }}>
                    {m.name.split(" ").map((w: string) => w[0]).slice(0,2).join("")}
                  </span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:11, fontWeight:500, color: isSelected ? "var(--ink-1)" : "var(--ink-2)", letterSpacing:"-0.01em", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {m.name}
                  </p>
                  <p style={{ fontSize:11, color:"var(--ink-3)", marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {m.role}
                  </p>
                </div>
                <div style={{ width:6, height:6, borderRadius:"50%", background:color, flexShrink:0 }} />
              </button>
            )
          })}
        </div>

        {/* Sources footer */}
        <div style={{ padding:"12px 16px", paddingTop:0, marginTop:"auto" }}>
          <p style={{ fontSize:11, color:"var(--ink-4)", lineHeight:1.6, fontFamily:"'JetBrains Mono',monospace" }}>
            Pesquisado em: LinkedIn · Escavador · Econodata · OAB/CRC · Noticias · RF
          </p>
        </div>
      </div>

      {/* Right panel — person detail */}
      <div style={{ flex:1, overflowY:"auto" }}>
        {!person ? (
          <div className="ax-empty">
            <p style={{ fontSize:13, color:"var(--ink-3)" }}>Selecione um decisor para ver a inteligencia relacional.</p>
          </div>
        ) : (
          <div style={{ padding:"40px 52px", maxWidth:760 }}>

            {/* Person header */}
            <div style={{ marginBottom:32 }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:8 }}>
                <div>
                  <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:22, fontWeight:600, color:"var(--ink-1)", letterSpacing:"-0.03em", marginBottom:4 }}>
                    {person.name}
                  </h2>
                  <p style={{ fontSize:13, color:"var(--ink-2)", letterSpacing:"-0.01em" }}>{person.role}</p>
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  {person.is_primary_target && <span style={{ fontSize:11, color:"var(--v)", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.04em" }}>primario</span>}
                  <span className={`badge ${person.confidence==="high"?"badge-green":person.confidence==="medium"?"badge-amber":"badge-ghost"}`}>{person.confidence}</span>
                </div>
              </div>

              {/* Metadata row */}
              <div style={{ display:"flex", gap:16, flexWrap:"wrap" as const }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:4, height:4, borderRadius:"50%", background: powerColor[person.decision_power] ?? "var(--ink-3)" }} />
                  <span style={{ fontSize:11, color:"var(--ink-3)" }}>{powerLabel[person.decision_power]}</span>
                </div>
                <span style={{ fontSize:11, color:"var(--ink-3)" }}>{seniorityLabel[person.seniority]}</span>
                <span style={{ fontSize:11, color:"var(--ink-3)" }}>Nivel tecnico: {person.technical_level}</span>
                <span style={{ fontSize:11, color:"var(--ink-4)", fontFamily:"'JetBrains Mono',monospace" }}>Fonte: {person.source}</span>
              </div>
            </div>

            {/* Influence score */}
            <div style={{ marginBottom:28, padding:"14px 18px", background:"rgba(15,23,42,0.01)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <p style={{ fontSize:12, fontWeight:500, letterSpacing:"0.04em", textTransform:"uppercase" as const, color:"var(--ink-3)", fontFamily:"'Inter',sans-serif" }}>
                  Influencia na decisao
                </p>
              </div>
              {getInfluenceBar(person.influence_score)}
            </div>

            {/* Channels */}
            {(person.channels?.length > 0 || person.linkedin_url || person.email_probable) ? (
              <div style={{ marginBottom:28 }}>
                <p style={{ fontSize:12, fontWeight:500, letterSpacing:"0.04em", textTransform:"uppercase" as const, color:"var(--ink-3)", marginBottom:12, fontFamily:"'Inter',sans-serif" }}>
                  Canais encontrados
                </p>
                <div style={{ display:"flex", flexDirection:"column" as const, gap:3 }}>
                  {(person.channels ?? []).map((c: any, i: number) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:"rgba(15,23,42,0.01)" }}>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"var(--ink-4)", width:20, flexShrink:0 }}>
                        {c.type === "linkedin" ? "in" : c.type === "email" ? "@" : c.type === "telefone" ? "T" : c.type.slice(0,2).toUpperCase()}
                      </span>
                      {c.type === "linkedin" ? (
                        <a href={c.value} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:"#93C5FD", textDecoration:"none", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" as const }}>
                          {c.value.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, "")} →
                        </a>
                      ) : (
                        <span style={{ fontSize:11, color:"var(--ink-2)", flex:1, fontFamily: c.type==="email"?"'JetBrains Mono',monospace":"'Inter',sans-serif" }}>{c.value}</span>
                      )}
                      <span style={{ fontSize:11, color:"var(--ink-4)", flexShrink:0 }}>
                        {c.confidence === "low" ? "inferido" : c.source?.slice(0,20)}
                      </span>
                    </div>
                  ))}
                  {person.email_probable && !person.channels?.some((c: any) => c.type === "email") && (
                    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:"rgba(15,23,42,0.01)", opacity:0.6 }}>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"var(--ink-4)", width:20 }}>@</span>
                      <span style={{ fontSize:11, color:"var(--ink-2)", flex:1, fontFamily:"'JetBrains Mono',monospace" }}>{person.email_probable}</span>
                      <span style={{ fontSize:11, color:"var(--ink-4)" }}>padrao inferido</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ marginBottom:28, padding:"14px 18px" }}>
                <p style={{ fontSize:11, color:"var(--ink-3)" }}>Nenhuma informacao de contato publica validada encontrada para este decisor.</p>
              </div>
            )}

            {/* Relational intelligence — the main value */}
            <div style={{ marginBottom:28 }}>
              <p style={{ fontSize:12, fontWeight:500, letterSpacing:"0.04em", textTransform:"uppercase" as const, color:"var(--ink-3)", marginBottom:16, fontFamily:"'Inter',sans-serif" }}>
                Inteligencia relacional
              </p>

              {/* Approach */}
              <div style={{ padding:"0 0 12px 14px", borderLeft:"2px solid var(--accent-dim)", marginBottom:16 }}>
                <p style={{ fontSize:11, fontWeight:500, letterSpacing:"0.07em", textTransform:"uppercase" as const, color:"var(--v)", marginBottom:6, fontFamily:"'Inter',sans-serif" }}>
                  {approachLabel[person.best_approach] ?? "Abordagem"}
                </p>
                <p style={{ fontSize:12, color:"var(--ink-1)", lineHeight:1.7 }}>{person.approach_rationale}</p>
              </div>

              {/* Pain points */}
              {person.pain_points?.length > 0 && (
                <div style={{ marginBottom:12 }}>
                  <p style={{ fontSize:11, fontWeight:500, letterSpacing:"0.06em", textTransform:"uppercase" as const, color:"var(--ink-3)", marginBottom:8, fontFamily:"'Inter',sans-serif" }}>
                    Possiveis dores
                  </p>
                  {person.pain_points.map((p: string, i: number) => (
                    <div key={i} style={{ display:"flex", gap:10, padding:"5px 0", borderBottom:"1px solid var(--border)" }}>
                      <span style={{ color:"var(--ink-4)", fontSize:12, paddingTop:1, flexShrink:0 }}>—</span>
                      <p style={{ fontSize:11, color:"var(--ink-2)", lineHeight:1.5 }}>{p}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Trust builders */}
              {person.trust_builders?.length > 0 && (
                <div style={{ marginBottom:12 }}>
                  <p style={{ fontSize:11, fontWeight:500, letterSpacing:"0.06em", textTransform:"uppercase" as const, color:"var(--ink-3)", marginBottom:8, fontFamily:"'Inter',sans-serif" }}>
                    O que constroi credibilidade
                  </p>
                  {person.trust_builders.map((t: string, i: number) => (
                    <div key={i} style={{ display:"flex", gap:10, padding:"5px 0", borderBottom:"1px solid var(--border)" }}>
                      <span style={{ color:"var(--success)", fontSize:12, paddingTop:1, flexShrink:0 }}>+</span>
                      <p style={{ fontSize:11, color:"var(--ink-2)", lineHeight:1.5 }}>{t}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Avoid */}
              {person.avoid?.length > 0 && (
                <div style={{ marginBottom:12 }}>
                  <p style={{ fontSize:11, fontWeight:500, letterSpacing:"0.06em", textTransform:"uppercase" as const, color:"var(--ink-3)", marginBottom:8, fontFamily:"'Inter',sans-serif" }}>
                    Evitar
                  </p>
                  {person.avoid.map((a: string, i: number) => (
                    <div key={i} style={{ display:"flex", gap:10, padding:"5px 0", borderBottom:"1px solid var(--border)" }}>
                      <span style={{ color:"#DC2626", fontSize:12, paddingTop:1, flexShrink:0 }}>×</span>
                      <p style={{ fontSize:11, color:"var(--ink-2)", lineHeight:1.5 }}>{a}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Person signals */}
            {person.signals?.length > 0 && (
              <div>
                <p style={{ fontSize:12, fontWeight:500, letterSpacing:"0.04em", textTransform:"uppercase" as const, color:"var(--ink-3)", marginBottom:12, fontFamily:"'Inter',sans-serif" }}>
                  Sinais recentes
                </p>
                {person.signals.map((s: any, i: number) => (
                  <div key={i} style={{ padding:"12px 14px", marginBottom:6 }}>
                    <p style={{ fontSize:12, fontWeight:500, color:"var(--ink-1)", marginBottom:4 }}>{s.title}</p>
                    <p style={{ fontSize:12, color:"var(--ink-3)" }}>{s.evidence}</p>
                    {s.relevance && <p style={{ fontSize:12, color:"var(--v-hi)", marginTop:4 }}>{s.relevance}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AreaHistorico({ result }: { result: any }) {
  const legal = result.legal_intelligence
  const msFindings  = legal?.findings?.filter((f: any) => f.type === "mandado_seguranca") ?? []
  const otherFindings = legal?.findings?.filter((f: any) => f.type !== "mandado_seguranca" && f.type !== "execucao_fiscal") ?? []
  const execFindings  = legal?.findings?.filter((f: any) => f.type === "execucao_fiscal") ?? []
  const firms = legal?.law_firms ?? []

  const maturityColor = !legal || legal.maturity_level === "none" ? "var(--ink-3)"
    : legal.maturity_level === "low" ? "var(--warning)"
    : legal.maturity_level === "medium" ? "var(--v)"
    : "var(--success)"

  const confidenceDot: Record<string,string> = { high:"var(--success)", medium:"var(--warning)", low:"var(--ink-3)" }

  if (!legal) {
    return (
      <div className="ax-empty">
        <p style={{ fontSize:13, color:"var(--ink-3)" }}>Pesquisa juridica nao disponivel.</p>
      </div>
    )
  }

  return (
    <div style={{ flex:1, overflowY:"auto" }}>
      <div style={{ padding:"44px 52px", maxWidth:860 }}>

        {/* Maturity header */}
        <div style={{ marginBottom:32 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:maturityColor }} />
                <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:18, fontWeight:600, color:"var(--ink-1)", letterSpacing:"-0.025em" }}>
                  {legal.litigation_profile === "proativo" ? "Perfil proativo" : legal.litigation_profile === "reativo" ? "Perfil reativo" : legal.litigation_profile === "estruturado" ? "Perfil estruturado" : "Sem historico identificado"}
                </p>
              </div>
              <p style={{ fontSize:12, color:"var(--ink-2)", lineHeight:1.65, maxWidth:580 }}>{legal.approach_shift}</p>
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:"var(--ink-3)", marginBottom:2 }}>{legal.trf_competente}</p>
              <span className={`badge ${legal.maturity_level==="high"?"badge-green":legal.maturity_level==="medium"?"badge-accent":legal.maturity_level==="low"?"badge-amber":"badge-ghost"}`}>
                {legal.maturity_level === "none" ? "sem historico" : legal.maturity_level}
              </span>
            </div>
          </div>

          {/* Sources searched */}
          <div style={{ padding:"10px 14px", background:"transparent" }}>
            <p style={{ fontSize:11, fontWeight:500, letterSpacing:"0.06em", textTransform:"uppercase" as const, color:"var(--ink-3)", marginBottom:4, fontFamily:"'Inter',sans-serif" }}>
              Fontes consultadas — {legal.search_confidence === "deep" ? "pesquisa profunda" : legal.search_confidence === "moderate" ? "pesquisa moderada" : "pesquisa inicial"}
            </p>
            <p style={{ fontSize:12, color:"var(--ink-3)", lineHeight:1.6 }}>
              {legal.sources_searched?.slice(0, 5).join(" · ") || "Google, JusBrasil, Escavador, TRF"}
            </p>
            <p style={{ fontSize:12, color:"var(--ink-3)", marginTop:4, fontStyle:"italic" }}>{legal.caveat}</p>
          </div>
        </div>

        {/* Mandados de Seguranca */}
        {msFindings.length > 0 ? (
          <div style={{ marginBottom:28 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
              <p className="t-label">Mandados de Seguranca</p>
              <span className="badge badge-accent">{msFindings.length}</span>
            </div>
            {msFindings.map((f: any, i: number) => (
              <div key={i} style={{ padding:"20px 0", marginBottom:10, background:"var(--white)" }}>
                {/* Header */}
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:confidenceDot[f.confidence] }} />
                      <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:14, fontWeight:600, color:"var(--ink-1)", letterSpacing:"-0.02em" }}>
                        Mandado de Seguranca
                      </p>
                      <span className={`badge ${f.confidence==="high"?"badge-green":f.confidence==="medium"?"badge-amber":"badge-ghost"}`}>{f.confidence}</span>
                    </div>
                    {f.process_number && (
                      <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"var(--ink-2)", letterSpacing:"0.02em" }}>
                        {f.process_number}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <p style={{ fontSize:12, color:"var(--ink-3)", fontFamily:"'JetBrains Mono',monospace" }}>{f.court}</p>
                    {f.filing_year && <p style={{ fontSize:11, color:"var(--ink-4)", fontFamily:"'JetBrains Mono',monospace" }}>{f.filing_year}</p>}
                  </div>
                </div>

                {/* Subject */}
                <div style={{ paddingTop:10, borderRadius:"var(--r)", marginBottom:12 }}>
                  <p style={{ fontSize:11, fontWeight:500, letterSpacing:"0.06em", textTransform:"uppercase" as const, color:"var(--ink-3)", marginBottom:3, fontFamily:"'Inter',sans-serif" }}>Materia</p>
                  <p style={{ fontSize:13, fontWeight:500, color:"var(--ink-1)" }}>{f.subject_matter}</p>
                  {f.stj_ref && <p style={{ fontSize:12, color:"var(--v)", marginTop:2 }}>{f.stj_ref}</p>}
                </div>

                {/* Lawyer */}
                {(f.lawyer_name || f.law_firm) && (
                  <div style={{ display:"flex", gap:16, marginBottom:10 }}>
                    {f.law_firm && (
                      <div>
                        <p style={{ fontSize:11, color:"var(--ink-3)", marginBottom:2, fontFamily:"'Inter',sans-serif", letterSpacing:"0.04em", textTransform:"uppercase" as const }}>Escritorio</p>
                        <p style={{ fontSize:11, color:"var(--ink-2)" }}>{f.law_firm}</p>
                      </div>
                    )}
                    {f.lawyer_name && (
                      <div>
                        <p style={{ fontSize:11, color:"var(--ink-3)", marginBottom:2, fontFamily:"'Inter',sans-serif", letterSpacing:"0.04em", textTransform:"uppercase" as const }}>Advogado</p>
                        <p style={{ fontSize:11, color:"var(--ink-2)" }}>{f.lawyer_name}{f.lawyer_oab ? ` — ${f.lawyer_oab}` : ""}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Commercial signal */}
                <div style={{ borderLeft:"2px solid var(--accent)", paddingLeft:12 }}>
                  <p style={{ fontSize:11, color:"var(--ink-2)", lineHeight:1.6 }}>{f.commercial_signal}</p>
                </div>

                <p style={{ fontSize:11, color:"var(--ink-4)", marginTop:8, fontFamily:"'JetBrains Mono',monospace" }}>Fonte: {f.source}</p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginBottom:28, padding:"20px 0" }}>
            <p style={{ fontSize:12, color:"var(--ink-3)", marginBottom:6 }}>Nenhum mandado de seguranca tributario localizado.</p>
            <p style={{ fontSize:12, color:"var(--ink-4)", lineHeight:1.6 }}>{legal.caveat}</p>
          </div>
        )}

        {/* Execucao Fiscal */}
        {execFindings.length > 0 && (
          <div style={{ marginBottom:28 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <p className="t-label">Execucoes Fiscais</p>
              <span className="badge badge-red">{execFindings.length}</span>
            </div>
            {execFindings.map((f: any, i: number) => (
              <div key={i} style={{ padding:"16px 20px", borderBottom:"1px solid var(--border)", marginBottom:0, marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <p style={{ fontSize:13, fontWeight:500, color:"var(--ink-1)" }}>{f.subject_matter}</p>
                  <span className="badge badge-red">{f.confidence}</span>
                </div>
                {f.process_number && <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:"var(--ink-3)", marginBottom:6 }}>{f.process_number}</p>}
                <p style={{ fontSize:11, color:"var(--ink-2)", lineHeight:1.5, borderLeft:"2px solid rgba(239,68,68,0.3)", paddingLeft:10 }}>{f.commercial_signal}</p>
                <p style={{ fontSize:11, color:"var(--ink-4)", marginTop:6, fontFamily:"'JetBrains Mono',monospace" }}>Fonte: {f.source}</p>
              </div>
            ))}
          </div>
        )}

        {/* Other findings */}
        {otherFindings.length > 0 && (
          <div style={{ marginBottom:24 }}>
            <p className="t-label" style={{ marginBottom:18 }}>Outros achados juridicos</p>
            {otherFindings.map((f: any, i: number) => (
              <div key={i} style={{ padding:"12px 0", marginBottom:6, background:"var(--white)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background:confidenceDot[f.confidence] }} />
                  <p style={{ fontSize:12, fontWeight:500, color:"var(--ink-1)" }}>{f.subject_matter}</p>
                  <span className="badge badge-ghost">{f.type?.replace(/_/g," ")}</span>
                </div>
                <p style={{ fontSize:11, color:"var(--ink-3)", lineHeight:1.5 }}>{f.evidence?.slice(0, 180)}</p>
                <p style={{ fontSize:11, color:"var(--ink-4)", marginTop:4, fontFamily:"'JetBrains Mono',monospace" }}>Fonte: {f.source}</p>
              </div>
            ))}
          </div>
        )}

        {/* Law firms */}
        {firms.length > 0 && (
          <div>
            <p className="t-label" style={{ marginBottom:14 }}>Escritorios identificados</p>
            {firms.map((f: any, i: number) => (
              <div key={i} style={{ padding:"10px 0", marginBottom:6, display:"flex", alignItems:"center", gap:16 }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:12, fontWeight:500, color:"var(--ink-1)", marginBottom:2 }}>{f.name}</p>
                  <p style={{ fontSize:12, color:"var(--v)" }}>{f.specialty}</p>
                </div>
                {f.lawyers?.length > 0 && (
                  <p style={{ fontSize:12, color:"var(--ink-3)" }}>{f.lawyers.join(" · ")}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [area, setArea] = useState<Area>("contexto")
  const p = useDossierProgress()
  const isGenerating = p.stage !== "idle" && !p.isComplete && p.stage !== "failed"
  const hasResult = p.result !== null
  const sourceIsReal = p.debugInfo?.brasil_api_status === "success"

  const handleGenerate = useCallback(async (data: NexusFormData) => {
    p.reset()
    setArea("contexto")
    await p.generate(data.cnpj, data.segment, data.tax_regime, data.operation_flags)
  }, [p])

  const timing = p.result?.timing_intelligence

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", background:"var(--white)" }}>

      {/* Sidebar — instrument panel */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        borderRight: "1px solid var(--side-border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--side-bg)",
      }}>

        {/* Wordmark — compact institutional */}
        <div style={{
          height: 44,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: "1px solid var(--rule)",
          flexShrink: 0,
          gap: 8,
        }}>
          <AxiomLogo size={18} />
          <div>
            <span style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--ink-1)",
              letterSpacing: "-0.04em",
              lineHeight: 1,
              display: "block",
            }}>AXIOM</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 7,
              color: "var(--v)",
              letterSpacing: "0.04em",
              lineHeight: 1,
              display: "block",
              marginTop: 2,
            }}>INTEL</span>
          </div>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          <InputForm onGenerate={handleGenerate} isLoading={isGenerating} />
        </div>

        {/* Pipeline / Score */}
        {isGenerating && (
          <PipelineStrip events={p.events} elapsed={p.elapsedMs} />
        )}
        {hasResult && p.result && (
          <ScorePanel
            score={p.result.engine_result?.final_score ?? 0}
            tier={p.result.engine_result?.tier ?? "C"}
            isReal={sourceIsReal}
          />
        )}
      </aside>

      {/* Main canvas */}
      <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"var(--canvas)" }}>

        {/* Branding header — always visible */}
        <div style={{
          height: 56,
          flexShrink: 0,
          borderBottom: "1px solid var(--rule)",
          background: "var(--white)",
          display: "flex",
          alignItems: "center",
          padding: "0 52px",
          justifyContent: "space-between",
          gap: 24,
        }}>
          {/* Left: company name when active, tagline when idle */}
          {hasResult && p.result ? (
            <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0, flex:1 }}>
              <div style={{ width:5, height:5, borderRadius:"50%", flexShrink:0,
                background: sourceIsReal ? "var(--success)" : "var(--warning)", opacity:0.8 }} />
              <div style={{ minWidth:0 }}>
                <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:14.5, fontWeight:700,
                  color:"var(--ink-1)", letterSpacing:"-0.04em",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {p.result.company_name}
                </h2>
                <p style={{ fontSize:11, color:"var(--ink-4)", letterSpacing:"0.04em", marginTop:2, fontFamily:"'JetBrains Mono',monospace" }}>
                  {formatCNPJ(p.result.cnpj ?? "")}
                  {sourceIsReal && <span style={{ marginLeft:8, color:"var(--success)", fontFamily:"'JetBrains Mono',monospace", fontSize:11, letterSpacing:"0.04em" }}>Receita Federal</span>}
                </p>
              </div>
              {timing?.temperature === "quente" && (
                <div style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 10px",
                  background:"rgba(239,68,68,0.05)", borderRadius:99, flexShrink:0 }}>
                  <div style={{ width:4, height:4, borderRadius:"50%", background:"#EF4444", opacity:0.8 }} />
                  <span style={{ fontSize:11, color:"#DC2626", fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.05em" }}>MOMENTO QUENTE</span>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
              <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:12, fontWeight:600,
                color:"var(--ink-1)", letterSpacing:"-0.03em" }}>
                Intelligence. Precision. Execution.
              </p>
              <p style={{ fontSize:12, color:"var(--ink-3)", letterSpacing:"-0.005em", fontFamily:"'Inter',sans-serif" }}>
                Inteligencia comercial tributaria para assessorias de alta performance
              </p>
            </div>
          )}

          {/* Right: elapsed or tagline accent */}
          <div style={{ display:"flex", alignItems:"center", gap:16, flexShrink:0 }}>
            {hasResult && p.elapsedMs > 0 && (
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11,
                color:"var(--ink-4)", letterSpacing:"0.04em" }}>
                {formatElapsed(p.elapsedMs)}
              </span>
            )}
            {!hasResult && (
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11,
                color:"var(--ink-4)", letterSpacing:"0.07em" }}>
                AXIOM v1
              </span>
            )}
          </div>
        </div>

        {/* Step nav — only when result */}
        {hasResult && <StepNav area={area} setArea={setArea} result={p.result} />}

        {/* Content */}
        <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>

          {/* Idle */}
          {p.stage === "idle" && (
            <div style={{ flex:1, display:"flex", overflow:"hidden", background:"var(--white)" }}>
              {/* Left: mark + pipeline */}
              <div style={{ flex:1, display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"center", padding:"48px 40px", borderRight:"1px solid var(--rule)" }}>
                <AxiomLogo size={44} />
                <div style={{ marginTop:20, textAlign:"center" as const, marginBottom:36 }}>
                  <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:26, fontWeight:800, color:"var(--ink-1)", letterSpacing:"-0.055em", lineHeight:1, marginBottom:10 }}>AXIOM</h1>
                  <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"var(--ink-4)", letterSpacing:"0.14em", textTransform:"uppercase" as const }}>Strategic Intelligence</p>
                </div>
                {[
                  { step:"01", label:"Contexto",      desc:"Empresa, operação e decisores" },
                  { step:"02", label:"Pessoas",       desc:"CFO · Diretor · Contador" },
                  { step:"03", label:"Histórico",     desc:"Processos e maturidade" },
                  { step:"04", label:"Oportunidades", desc:"Teses e potencial retroativo" },
                  { step:"05", label:"Playbook",      desc:"War room e e-mail ao vivo" },
                ].map(a => (
                  <div key={a.step} style={{ display:"flex", alignItems:"center", gap:12, width:"100%", maxWidth:280, marginBottom:10 }}>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"var(--ink-4)", letterSpacing:"0.06em", width:18, flexShrink:0 }}>{a.step}</span>
                    <div style={{ flex:1, height:1, background:"var(--rule)" }} />
                    <div style={{ textAlign:"right" as const }}>
                      <div style={{ fontSize:13, fontWeight:600, color:"var(--ink-2)", letterSpacing:"-0.015em" }}>{a.label}</div>
                      <div style={{ fontSize:11, color:"var(--ink-4)", letterSpacing:"-0.003em" }}>{a.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right: feature cards */}
              <div style={{ width:300, flexShrink:0, overflowY:"auto" as const, padding:"32px 28px" }}>
                <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"var(--ink-4)", letterSpacing:"0.1em", textTransform:"uppercase" as const, marginBottom:20 }}>Inteligência incluída</p>
                {[
                  { icon:"◈", title:"Person Discovery",   desc:"17 queries em LinkedIn, Escavador, OAB, CRC e Econodata para encontrar decisores pelo nome." },
                  { icon:"◉", title:"Legal Intelligence",  desc:"Jurisprudência, JusBrasil, QSA e PGFN. Maturidade jurídica antes da ligação." },
                  { icon:"◌", title:"Timing Intelligence", desc:"Empresa nova, capital subvalorizado, expansão. Temperatura da abordagem." },
                  { icon:"◎", title:"Motor tributário",   desc:"Teses por CNAE e regime. Sistema S, PIS/COFINS, ICMS. Score com porte." },
                  { icon:"◐", title:"War room",           desc:"Antes, durante e pós-ligação. Condução, resistências, fechamento, WhatsApp." },
                  { icon:"◑", title:"E-mail ao vivo",     desc:"4 momentos × 3 tons gerados por IA com o contexto real da empresa." },
                ].map((f, i) => (
                  <div key={i} style={{ paddingTop:14, paddingBottom:14, borderBottom: i < 5 ? "1px solid var(--rule)" : "none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:11, color:"var(--v)" }}>{f.icon}</span>
                      <span style={{ fontSize:14, fontWeight:600, color:"var(--ink-1)", letterSpacing:"-0.02em" }}>{f.title}</span>
                    </div>
                    <p style={{ fontSize:12, color:"var(--ink-3)", lineHeight:1.7, paddingLeft:20 }}>{f.desc}</p>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* Loading */}
          {isGenerating && !hasResult && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}>
              {[100, 72, 44].map((w, i) => (
                <div key={i} className="shimmer" style={{ height:1, width:w, background:"var(--rule-hi)", borderRadius:99 }} />
              ))}
              <p style={{ fontSize:11, color:"var(--ink-4)", letterSpacing:"0.08em", marginTop:8, fontFamily:"'JetBrains Mono',monospace" }}>processando</p>
            </div>
          )}

          {/* Error */}
          {p.error && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}>
              <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"#DC2626", letterSpacing:"0.1em", textTransform:"uppercase" }}>Falha</p>
              <p style={{ fontSize:11, color:"var(--ink-3)" }}>{p.error}</p>
              <button onClick={p.reset} style={{ fontSize:11, color:"var(--ink-3)", background:"none", border:"none", cursor:"pointer", textDecoration:"underline", fontFamily:"'JetBrains Mono',monospace", marginTop:8 }}>
                Tentar novamente
              </button>
            </div>
          )}

          {/* Result */}
          {hasResult && p.result && (
            <div className="fade-up" style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
              {area === "contexto"      && <AreaContexto result={p.result} />}
              {area === "pessoas"       && <AreaPessoas result={p.result} />}
              {area === "historico"     && <AreaHistorico result={p.result} />}
              {area === "oportunidades" && <AreaOportunidades result={p.result} />}
              {area === "playbook"      && <AreaPlaybook result={p.result} />}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
