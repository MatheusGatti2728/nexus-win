// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Copilot Context Builder
//
// Unifies CompanyIntelligence + RuleEngineResult into a single
// context object used by all copilot engines.
//
// RULES:
// - facts and hypotheses are ALWAYS separated
// - hypothesis NEVER becomes assertion
// - every contextual mention carries source_label
// - low confidence --- cautious language
// - no enrichment --- fall back to segment/regime
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { CompanyIntelligence } from "../enrichment/types"
import type { RuleEngineResult }    from "../engine/rule-engine"
import type { CompanyContext }      from "../engine/rule-engine"
import { SEGMENT_LABELS, REGIME_LABELS } from "../engine/tax-matrix"

// --------- Context output ---------------------------------------------------------------------------------------------------------------------------------

export interface CopilotContext {
  // Company
  company_name:         string
  company_cnpj:         string
  segment_label:        string
  regime_label:         string
  anos_operacao:        number
  porte:                string
  municipio_uf:         string

  // Enrichment-derived (only when confidence --- medium)
  company_facts:        ContextItem[]
  company_hypotheses:   ContextItem[]   // clearly labeled as hypotheses
  operational_signals:  ContextItem[]
  commercial_hooks:     string[]        // ready-to-use hooks from intelligence
  decision_makers:      DecisionMakerRef[]

  // Tax
  tax_opportunities:    TaxOpportunity[]
  risk_notes:           string[]
  missing_information:  string[]
  recommended_questions: string[]

  // Meta
  confidence_level:     "low" | "medium" | "high"
  has_enrichment:       boolean
  enrichment_summary:   string   // 1-line summary of enrichment quality
}

export interface ContextItem {
  text:         string
  source_label: string
  type:         "fact" | "hypothesis" | "signal"
  confidence:   "low" | "medium" | "high"
}

export interface DecisionMakerRef {
  name:       string
  title:      string
  is_target:  boolean
  source:     string
  confidence: "low" | "medium" | "high"
}

export interface TaxOpportunity {
  slug:      string
  name:      string
  priority:  "core" | "secondary"
  score:     number
  risk:      string
  pitch:     string
}

// --------- Builder ------------------------------------------------------------------------------------------------------------------------------------------------------

export interface BuildContextInput {
  ctx:           CompanyContext
  intelligence?: CompanyIntelligence | null
  engineResult?: RuleEngineResult    | null
}

export function buildCopilotContext(input: BuildContextInput): CopilotContext {
  const { ctx, intelligence, engineResult } = input
  const flags    = ctx.consultant.operation_flags ?? []
  const seg      = SEGMENT_LABELS[ctx.consultant.segment]
  const regime   = REGIME_LABELS[ctx.consultant.tax_regime]
  const hasEnr   = Boolean(intelligence && intelligence.enrichment_confidence !== "low")

  // ------ Company facts from Receita Federal (always high confidence) ------
  const company_facts: ContextItem[] = []

  if (intelligence?.company_identity?.razao_social) {
    company_facts.push({ text: `Razão social: ${intelligence.company_identity.razao_social}`, source_label: "Receita Federal", type: "fact", confidence: "high" })
  }
  if (intelligence?.company_identity?.cnae_fiscal_descricao) {
    company_facts.push({ text: `CNAE: ${intelligence.company_identity.cnae_fiscal_descricao}`, source_label: "Receita Federal", type: "fact", confidence: "high" })
  }
  if (intelligence?.company_identity?.idade_anos && intelligence.company_identity.idade_anos > 0) {
    company_facts.push({ text: `${intelligence.company_identity.idade_anos} anos de operação`, source_label: "Receita Federal", type: "fact", confidence: "high" })
  }
  if (intelligence?.company_identity?.municipio && intelligence?.company_identity?.uf) {
    company_facts.push({ text: `Localização: ${intelligence.company_identity.municipio}/${intelligence.company_identity.uf}`, source_label: "Receita Federal", type: "fact", confidence: "high" })
  }
  if (intelligence?.company_identity?.qsa && intelligence.company_identity.qsa.length > 0) {
    const qsa = intelligence.company_identity.qsa
    company_facts.push({ text: `${qsa.length} sócio(s) identificado(s): ${qsa.map(q => q.nome).join(", ")}`, source_label: "Receita Federal", type: "fact", confidence: "high" })
  }
  if (intelligence?.company_identity?.capital_social) {
    company_facts.push({ text: `Capital social: R$ ${intelligence.company_identity.capital_social.toLocaleString("pt-BR")}`, source_label: "Receita Federal", type: "fact", confidence: "high" })
  }

  // ------ Hypotheses (always labeled) ------------------------------------------------------------------------------------------
  const company_hypotheses: ContextItem[] = []

  if (intelligence?.business_model_hypothesis && !intelligence.business_model_hypothesis.includes("não pôde ser inferido")) {
    // Strip the "HIP--TESE:" prefix --- we handle it in context
    const raw = intelligence.business_model_hypothesis.replace(/^HIPÓTESE \(sujeita a confirmação\): /, "")
    company_hypotheses.push({ text: raw, source_label: "Análise inferida", type: "hypothesis", confidence: "medium" })
  }

  // From website signals
  if (intelligence?.public_signals) {
    for (const s of intelligence.public_signals.filter(s => s.type === "signal" || s.type === "hypothesis")) {
      company_hypotheses.push({ text: s.signal, source_label: s.source, type: s.type as "hypothesis" | "signal", confidence: s.confidence })
    }
  }

  // ------ Operational signals ---------------------------------------------------------------------------------------------------------------------
  const operational_signals: ContextItem[] = []

  for (const s of (intelligence?.public_signals ?? []).filter(s => s.type === "fact")) {
    operational_signals.push({ text: s.signal, source_label: s.source, type: "fact", confidence: s.confidence })
  }

  // Flag-based signals (always present, even without enrichment)
  if (flags.includes("venda_cartao"))   operational_signals.push({ text: "Alto volume de vendas em cartão", source_label: "Informado pelo consultor", type: "fact", confidence: "high" })
  if (flags.includes("icms_st"))        operational_signals.push({ text: "Operação com substituição tributária", source_label: "Informado pelo consultor", type: "fact", confidence: "high" })
  if (flags.includes("exportacao"))     operational_signals.push({ text: "Operação exportadora ativa", source_label: "Informado pelo consultor", type: "fact", confidence: "high" })
  if (flags.includes("folha_relevante"))operational_signals.push({ text: "Folha de pagamento relevante", source_label: "Informado pelo consultor", type: "fact", confidence: "high" })
  if (flags.includes("operacao_iss"))   operational_signals.push({ text: "Prestação de serviços com ISS", source_label: "Informado pelo consultor", type: "fact", confidence: "high" })

  // ------ Commercial hooks ------------------------------------------------------------------------------------------------------------------------------
  const commercial_hooks = intelligence?.commercial_hooks ?? []

  // Fallback hooks from segment/regime if no enrichment
  if (commercial_hooks.length === 0) {
    if (ctx.consultant.segment === "comercio" && flags.includes("venda_cartao")) {
      commercial_hooks.push(`"${ctx.razao_social} tem alto volume em cartão — o comportamento fiscal ligado às taxas de adquirentes ainda é uma área pouco revisada nesse perfil."`)
    } else if (ctx.consultant.segment === "industria" && flags.includes("exportacao")) {
      commercial_hooks.push(`"Com operação exportadora confirmada, há crédito de IPI com alíquota fixada em lei (5,37%) que muitas indústrias não aproveitam sistematicamente."`)
    } else {
      commercial_hooks.push(`"Temos trabalhado com empresas de ${seg.toLowerCase()} no ${regime} e identificamos comportamentos fiscais recorrentes que raramente passam pela revisão estratégica cotidiana."`)
    }
  }

  // ------ Decision makers ---------------------------------------------------------------------------------------------------------------------------------
  const decision_makers: DecisionMakerRef[] = (intelligence?.decision_makers ?? []).map(dm => ({
    name:       dm.name,
    title:      dm.title,
    is_target:  dm.is_target,
    source:     dm.source,
    confidence: dm.confidence,
  }))

  // ------ Tax opportunities ---------------------------------------------------------------------------------------------------------------------------
  const tax_opportunities: TaxOpportunity[] = (engineResult?.recommended ?? []).map(m => ({
    slug:     m.slug,
    name:     m.name,
    priority: m.tier as "core" | "secondary",
    score:    m.score,
    risk:     m.risk_level,
    pitch:    m.first_pitch,
  }))

  // ------ Missing information ---------------------------------------------------------------------------------------------------------------------
  const missing_information: string[] = []
  if (!intelligence)                    missing_information.push("Dados externos não enriquecidos — clique em Buscar dados na aba Inteligência")
  if (!ctx.faturamento_estimado)        missing_information.push("Faturamento mensal estimado")
  if (!ctx.folha_estimada && ["sistema_s","verbas_indenizatorias"].some(s => tax_opportunities.some(t => t.slug === s)))
    missing_information.push("Folha de pagamento mensal")
  if (decision_makers.length === 0)     missing_information.push("Decisores identificados (LinkedIn/site)")

  // ------ Confidence ------------------------------------------------------------------------------------------------------------------------------------------------
  const confidence_level =
    intelligence?.enrichment_confidence === "high" ? "high"
    : intelligence?.enrichment_confidence === "medium" ? "medium"
    : "low"

  const enrichment_summary =
    !intelligence ? "Sem enriquecimento externo — análise baseada em segmento/regime informados"
    : confidence_level === "high" ? "Enriquecimento completo (Receita Federal + site + notícias)"
    : confidence_level === "medium" ? "Enriquecimento parcial — alguns dados ausentes"
    : "Enriquecimento básico — confirmar dados na ligação"

  return {
    company_name:         intelligence?.company_identity?.razao_social ?? ctx.razao_social,
    company_cnpj:         ctx.cnpj,
    segment_label:        seg,
    regime_label:         regime,
    anos_operacao:        intelligence?.company_identity?.idade_anos ?? ctx.anos_operacao,
    porte:                intelligence?.company_identity?.porte ?? ctx.porte,
    municipio_uf:         intelligence?.company_identity?.municipio && intelligence?.company_identity?.uf ? `${intelligence.company_identity.municipio}/${intelligence.company_identity.uf}` : ctx.uf,
    company_facts,
    company_hypotheses,
    operational_signals,
    commercial_hooks,
    decision_makers,
    tax_opportunities,
    risk_notes:           engineResult?.recommended.filter(m => m.risk_level !== "remoto").map(m => `${m.name}: risco ${m.risk_level}`) ?? [],
    missing_information,
    recommended_questions: intelligence?.recommended_validation_questions ?? [],
    confidence_level,
    has_enrichment:       Boolean(intelligence),
    enrichment_summary,
  }
}

// --------- Language guard: cautious language for low confidence ---------------

export function cautious(text: string, confidence: "low" | "medium" | "high"): string {
  if (confidence === "high") return text
  if (confidence === "medium") return `Provavelmente, ${text.charAt(0).toLowerCase()}${text.slice(1)}`
  return `A confirmar: ${text.charAt(0).toLowerCase()}${text.slice(1)}`
}
