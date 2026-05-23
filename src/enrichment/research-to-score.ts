// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Research --- Tax Matrix / Score / Confidence
//
// Translates ResearchSignals into:
// 1. Module flag adjustments (which modules get promoted)
// 2. Score adjustments (how much each signal changes the score)
// 3. Overall research confidence score (0-100)
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { ResearchSignal, SignalType } from "./research-signals"
import type { CompanyResearch }            from "./research-orchestrator"
import type { ModuleSlug }                 from "../engine/tax-matrix"

// --------- 1. Research --- Tax Matrix ------------------------------------------------------------------------------------------------

export interface ModuleFlagAdjustment {
  module_slug:    ModuleSlug
  action:         "promote_to_secondary" | "boost_score" | "add_note" | "caution"
  reason:         string          // human-readable — shown in UI
  signal_source:  string
  confidence:     "low" | "medium" | "high"
  delta_score?:   number          // how much to add to module score
}

const SIGNAL_TO_MODULE: Partial<Record<SignalType, ModuleFlagAdjustment[]>> = {
  exportacao: [
    { module_slug: "ipi_credito_presumido_exportacao", action: "boost_score", reason: "Exportação detectada — crédito de IPI (5,37%) direto", signal_source: "", confidence: "medium", delta_score: 12 },
  ],
  ecommerce: [
    { module_slug: "difal_pis_cofins", action: "promote_to_secondary", reason: "E-commerce detectado — DIFAL em operações interestaduais relevante", signal_source: "", confidence: "medium", delta_score: 8 },
  ],
  expansao: [
    { module_slug: "sistema_s",              action: "boost_score", reason: "Expansão recente indica crescimento de folha — Sistema S mais relevante", signal_source: "", confidence: "medium", delta_score: 6 },
    { module_slug: "verbas_indenizatorias",  action: "boost_score", reason: "Crescimento de folha aumenta retroativo de verbas indenizatórias", signal_source: "", confidence: "medium", delta_score: 4 },
  ],
  contratacao: [
    { module_slug: "sistema_s",             action: "boost_score", reason: "Contratações ativas — folha em crescimento, Sistema S mais relevante", signal_source: "", confidence: "medium", delta_score: 5 },
    { module_slug: "verbas_indenizatorias", action: "boost_score", reason: "Novas contratações aumentam potencial de revisão previdenciária", signal_source: "", confidence: "medium", delta_score: 3 },
  ],
  tema_69_detectado: [
    { module_slug: "icms_grossup", action: "promote_to_secondary", reason: "Tema 69 detectado em histórico jurídico — Gross-Up como passo seguinte possível", signal_source: "", confidence: "medium", delta_score: 5 },
  ],
  sistema_s_detectado: [
    { module_slug: "sistema_s", action: "caution", reason: "Sistema S já foi objeto de análise jurídica — verificar se Tema 1079 já foi aproveitado antes de propor", signal_source: "", confidence: "medium" },
  ],
  varejo: [
    { module_slug: "icms_st_pis_cofins",    action: "boost_score", reason: "CNAE varejista confirma probabilidade de ICMS-ST", signal_source: "", confidence: "medium", delta_score: 8 },
    { module_slug: "pis_cofins_taxa_cartao",action: "boost_score", reason: "Varejo tipicamente tem alto volume de vendas em cartão", signal_source: "", confidence: "low",    delta_score: 4 },
  ],
  industria: [
    { module_slug: "ipi_credito_presumido_exportacao", action: "boost_score", reason: "CNAE industrial confirma aplicabilidade de IPI", signal_source: "", confidence: "medium", delta_score: 8 },
    { module_slug: "revisao_insumos_pis_cofins",       action: "boost_score", reason: "Operação industrial expande conceito de insumos para PIS/COFINS", signal_source: "", confidence: "medium", delta_score: 7 },
    { module_slug: "ipi_atacadista",                   action: "boost_score", reason: "Indústria frequentemente adquire de atacadistas não contribuintes", signal_source: "", confidence: "low",    delta_score: 4 },
  ],
  servico: [
    { module_slug: "icms_iss_acao_coletiva", action: "boost_score", reason: "Prestação de serviços confirma incidência de ISS — Tema 69 aplicável", signal_source: "", confidence: "medium", delta_score: 8 },
    { module_slug: "sistema_s",              action: "boost_score", reason: "Serviços com folha relevante ampliam impacto do Sistema S", signal_source: "", confidence: "low",    delta_score: 3 },
  ],
  alto_cartao: [
    { module_slug: "pis_cofins_taxa_cartao", action: "boost_score", reason: "Alto volume de cartão confirmado — tese de exclusão PIS/COFINS relevante", signal_source: "", confidence: "high",   delta_score: 12 },
  ],
  icms_st_probable: [
    { module_slug: "icms_st_pis_cofins",    action: "boost_score", reason: "ICMS-ST provável pelo perfil — Tema 1.125 STJ relevante", signal_source: "", confidence: "medium", delta_score: 8 },
  ],
  folha_relevante: [
    { module_slug: "sistema_s",             action: "boost_score", reason: "Folha relevante confirma impacto do Sistema S", signal_source: "", confidence: "high",   delta_score: 10 },
    { module_slug: "verbas_indenizatorias", action: "boost_score", reason: "Folha alta aumenta base para revisão de verbas indenizatórias", signal_source: "", confidence: "high",   delta_score: 8 },
  ],
  esg: [
    { module_slug: "revisao_insumos_pis_cofins", action: "add_note", reason: "ESG indica estrutura operacional madura — perfil receptivo a revisão detalhada", signal_source: "", confidence: "low" },
  ],
}

export function computeModuleAdjustments(signals: ResearchSignal[]): ModuleFlagAdjustment[] {
  const adjustments: ModuleFlagAdjustment[] = []
  for (const signal of signals) {
    const rules = SIGNAL_TO_MODULE[signal.signal_type]
    if (!rules) continue
    for (const rule of rules) {
      // Apply confidence ceiling from signal
      const effectiveConf = signal.confidence === "low" && rule.confidence === "medium" ? "low" : rule.confidence
      const effectiveDelta = signal.confidence === "low" ? Math.round((rule.delta_score ?? 0) * 0.5) : (rule.delta_score ?? 0)
      adjustments.push({ ...rule, signal_source: signal.evidence, confidence: effectiveConf as "low"|"medium"|"high", delta_score: effectiveDelta })
    }
  }
  return adjustments
}

// --------- 2. Research --- Score ---------------------------------------------------------------------------------------------------------------

export interface ScoreAdjustment {
  reason:     string
  delta:      number      // can be negative
  confidence: "low" | "medium" | "high"
  source:     string
}

export function applyResearchScoreAdjustments(
  baseScore:  number,
  signals:    ResearchSignal[],
  contradictions: string[],
): { adjusted_score: number; adjustments: ScoreAdjustment[]; explanation: string } {
  const adjustments: ScoreAdjustment[] = []
  let delta = 0

  // Positive adjustments
  for (const signal of signals) {
    if (signal.signal_type === "exportacao" && signal.confidence !== "low") {
      adjustments.push({ reason: "Exportação detectada (IPI direto)", delta: signal.confidence === "high" ? 5 : 3, confidence: signal.confidence, source: signal.source })
    }
    if (signal.signal_type === "ecommerce") {
      adjustments.push({ reason: "E-commerce detectado (DIFAL)", delta: 3, confidence: "medium", source: signal.source })
    }
    if (signal.signal_type === "expansao") {
      adjustments.push({ reason: "Expansão recente (folha crescente)", delta: 3, confidence: "medium", source: signal.source })
    }
    if (signal.signal_type === "decisor_identificado" && signal.confidence === "high") {
      adjustments.push({ reason: "Decisor identificado (abordagem direta)", delta: 2, confidence: "high", source: signal.source })
    }
    if (signal.signal_type === "maturidade_juridica") {
      adjustments.push({ reason: "Maturidade jurídica — maior receptividade técnica", delta: 2, confidence: "medium", source: signal.source })
    }
  }

  // Negative: contradictions reduce confidence and cap positive gains
  if (contradictions.length >= 2) {
    adjustments.push({ reason: "Sinais contraditórios — redução de confiança", delta: -5, confidence: "low", source: "análise automática" })
    // Cap: contradictions prevent positive delta from being applied fully
    delta = Math.min(0, delta)
  } else if (contradictions.length === 1) {
    adjustments.push({ reason: "Sinal contraditório detectado", delta: -2, confidence: "low", source: "análise automática" })
    delta = Math.min(2, delta)   // limit upside when contradictory
  }

  // Low confidence signals: never more than +2 total
  const lowOnly = signals.every(s => s.confidence === "low")
  if (lowOnly && signals.length > 0) {
    adjustments.push({ reason: "Todos os sinais de baixa confiança — ajuste conservador", delta: -3, confidence: "low", source: "análise automática" })
  }

  delta = adjustments.reduce((s, a) => s + a.delta, 0)
  // Cap: research can add at most +10 or remove at most -10
  delta = Math.max(-10, Math.min(10, delta))

  const adjusted = Math.max(0, Math.min(98, baseScore + delta))
  const positiveAdj = adjustments.filter(a => a.delta > 0).map(a => a.reason).slice(0, 3)
  const negativeAdj = adjustments.filter(a => a.delta < 0).map(a => a.reason).slice(0, 2)

  const explanation = [
    `Score base: ${baseScore}`,
    positiveAdj.length > 0 ? `Elevado por: ${positiveAdj.join("; ")}` : null,
    negativeAdj.length > 0 ? `Reduzido por: ${negativeAdj.join("; ")}` : null,
    `Score final: ${adjusted}`,
  ].filter(Boolean).join(". ")

  return { adjusted_score: adjusted, adjustments, explanation }
}

// --------- 3. Research Confidence ---------------------------------------------------------------------------------------------------------

export interface ResearchConfidence {
  score:  number   // 0-100
  tier:   "low" | "medium" | "high"
  breakdown: Array<{ source: string; weight: number; contribution: number; note: string }>
  missing: string[]
  recommendation: string
}

export function computeResearchConfidence(research: CompanyResearch): ResearchConfidence {
  const breakdown: ResearchConfidence["breakdown"] = []
  let total = 0

  // CNPJ sources (max 40)
  const cnpjSuccess = research.cnpj_result.debug.sources_succeeded.length
  const cnpjConf    = research.cnpj_result.confidence
  const cnpjScore   = cnpjConf === "high" ? 40 : cnpjConf === "medium" ? 25 : 10
  breakdown.push({ source: `Dados cadastrais (${research.cnpj_result.primary_source})`, weight: 40, contribution: cnpjScore, note: cnpjConf === "high" ? "QSA confirmado" : "Dados parciais" })
  total += cnpjScore

  // Website (max 20)
  const siteScore = research.website.found ? (research.website.confidence === "high" ? 20 : 13) : 0
  breakdown.push({ source: "Site oficial", weight: 20, contribution: siteScore, note: research.website.found ? `Encontrado: ${research.website.official_site}` : "Não encontrado" })
  total += siteScore

  // News (max 15)
  const newsScore = research.news.items.length >= 3 ? 15 : research.news.items.length >= 1 ? 8 : 0
  breakdown.push({ source: "Notícias públicas", weight: 15, contribution: newsScore, note: `${research.news.items.length} notícias` })
  total += newsScore

  // Decision makers (max 15)
  const dmScore = research.decision_makers.coverage === "good" ? 15 : research.decision_makers.coverage === "partial" ? 8 : 0
  breakdown.push({ source: "Decisores", weight: 15, contribution: dmScore, note: `${research.decision_makers.decision_makers.length} identificados` })
  total += dmScore

  // Legal (max 10)
  const legalScore = research.legal.has_tax_litigation ? 10 : 0
  breakdown.push({ source: "Histórico jurídico", weight: 10, contribution: legalScore, note: research.legal.has_tax_litigation ? `${research.legal.recurring_themes.length} tema(s)` : "Nenhum" })
  total += legalScore

  const tier: "low" | "medium" | "high" = total >= 70 ? "high" : total >= 40 ? "medium" : "low"

  const missing: string[] = []
  if (siteScore === 0)  missing.push("Site oficial — informe a URL manualmente")
  if (dmScore === 0)    missing.push("Decisores — cole nomes e cargos do LinkedIn")
  if (legalScore === 0) missing.push("Histórico jurídico — verifique JusBrasil/TJSP se relevante")
  if (newsScore === 0)  missing.push("Presença midiática baixa — empresa provavelmente não tem cobertura pública")

  const recommendation = tier === "high"
    ? "Pesquisa completa — dossiê e copiloto com alta contextualização"
    : tier === "medium"
    ? "Pesquisa parcial — enriquecer site e decisores para melhor personalização"
    : "Pesquisa básica — use os campos manuais para elevar a qualidade"

  return { score: total, tier, breakdown, missing, recommendation }
}
