// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Unified Pipeline Orchestrator
//
// THE single pipeline:
// CNPJ + consultant input
//   --- Brasil API (real)
//   --- Company Intelligence
//   --- Tax Matrix
//   --- Rule Engine
//   --- Financial Calculator
//   --- Dossier Engine
//   --- Copilot Context
//
// No mock. No scenario lookup. CNPJ drives everything.
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import { lookupCNPJ, type CNPJData } from "../enrichment/cnpj-lookup"
import { normalizeCompanyIdentity } from "../research/entity-normalizer"
import { buildCompanyPresence } from "../research/company-presence-engine"
import { runStrategicCalculator } from "../calculator/strategic-calculator"
import { buildPersuasionOutput } from "../sales/persuasion-engine"
import { buildUnifiedCopilot } from "../sales/unified-copilot-engine"
import { researchLegalIntelligence, buildLegalCopilotContext } from "../intelligence/legal-intelligence-engine"
import { searchLinkedInDecisionMakers, buildLinkedInOpeningLine } from "../intelligence/linkedin-decision-maker-engine"
import { buildEnrichedPerson } from "../intelligence/person-enrichment-engine"
import { buildTimingIntelligence } from "../intelligence/timing-intelligence-engine"
import { searchGoogleMaps, searchPublicPartners, getSectorContext } from "../intelligence/guaranteed-data-engine"
import { guaranteedEnrich } from "../enrichment/cnpj-lookup"
import { runWebEnrichment } from "../enrichment/web-enrichment-engine"
import { buildEnrichedDecisionMakers, selectPrimaryTarget } from "../intelligence/decision-maker-intelligence"
import { researchWebsite, researchNews, processLegalInput } from "../enrichment/research-engine"
import { extractSignalsFromCNAE } from "../enrichment/brasil-api"
import type { CompanyIntelligence, BrasilAPIData } from "../enrichment/types"
import type { ManualResearchInput } from "../enrichment/research-orchestrator"
import { lookupMatrix } from "../engine/tax-matrix"
import { runRuleEngine } from "../engine/rule-engine"
import type { CompanyContext } from "../engine/rule-engine"
import { buildStrategicDossier } from "../engine/dossier-engine"
import { buildCopilotContext } from "../copilot/context-builder"
import { buildWhyNow, buildContextualPitch } from "../copilot/why-now-engine"
import { generateContextualEmail, generateContextualWhatsApp, buildContextualObjections, buildMeetingPrepBriefing } from "../copilot/contextual-engines"
import { extractResearchSignals, detectContradictions } from "../enrichment/research-signals"
import { buildCompanyProfile } from "../intelligence/company-profile-engine"
import { buildDecisionMakers as buildIntelDecisionMakers } from "../intelligence/decision-maker-engine"
import { buildSalesStrategy, buildExecutiveBriefing } from "../intelligence/sales-strategy-engine"
import { computeModuleAdjustments, applyResearchScoreAdjustments, computeResearchConfidence } from "../enrichment/research-to-score"
import { buildResearchCopilotContext } from "../enrichment/research-to-copilot"
import type { Segment, TaxRegime, OperationFlag } from "../engine/tax-matrix"
import { SEGMENT_LABELS, REGIME_LABELS } from "../engine/tax-matrix"

// --------- Input ------------------------------------------------------------------------------------------------------------------------------------------------------------

export interface PipelineInput {
  cnpj:             string
  segment:          Segment
  tax_regime:       TaxRegime
  operation_flags?: OperationFlag[]
  subsegment?:      string
  manual_input?:    ManualEnrichmentInput
  // For mock mode fallback
  mock_company_name?: string
  faturamento_estimado?: number
  folha_estimada?:       number
  anos_operacao_override?: number
}

// --------- Events (for streaming UI) ------------------------------------------------------------------------------------------------

export type PipelineEventType =
  | "pipeline_started"
  | "cnpj_validated"
  | "enrichment_started"
  | "brasil_api_completed"
  | "website_search_completed"
  | "news_search_completed"
  | "company_intelligence_ready"
  | "tax_matrix_computed"
  | "score_pronto"
  | "financial_estimations_ready"
  | "dossier_building"
  | "copilot_building"
  | "pipeline_complete"
  | "pipeline_failed"

export interface PipelineEvent {
  event:     PipelineEventType
  timestamp: string
  payload?:  Record<string, unknown>
  source?:   "real" | "mock" | "fallback"
}

// --------- Output ---------------------------------------------------------------------------------------------------------------------------------------------------------

export interface FinancialEstimation {
  module_slug:                string
  module_name:                string
  probable_value:             number | null
  conservative_value:         number | null
  optimistic_value:           number | null
  confidence_level:           "low" | "medium" | "high"
  should_show_to_client:      boolean
  should_require_human_review: boolean
  warnings:                   string[]
  calculation_basis:          string
}

export interface PipelineResult {
  report_id:             string
  cnpj:                  string
  // Data origin
  company_name:          string
  company_name_source:   "brasil_api" | "manual_input" | "fallback"
  // Company intelligence
  intelligence:          CompanyIntelligence
  // Tax
  classified_modules:    ReturnType<typeof lookupMatrix>
  engine_result:         ReturnType<typeof runRuleEngine>
  financial_estimations: FinancialEstimation[]
  // Dossier
  strategic_dossier:     ReturnType<typeof buildStrategicDossier>
  // Copilot
  copilot_context:       ReturnType<typeof buildCopilotContext>
  why_now:               ReturnType<typeof buildWhyNow>
  pitch:                 ReturnType<typeof buildContextualPitch>
  research_signals:      ReturnType<typeof extractResearchSignals>
  research_confidence:   ReturnType<typeof computeResearchConfidence>
  research_copilot:      ReturnType<typeof buildResearchCopilotContext>
  score_adjustments:     ReturnType<typeof applyResearchScoreAdjustments>
  company_profile:       ReturnType<typeof buildCompanyProfile>
  intel_decision_makers: ReturnType<typeof buildIntelDecisionMakers>
  sales_strategy:        ReturnType<typeof buildSalesStrategy>
  executive_briefing:    ReturnType<typeof buildExecutiveBriefing>
  company_presence:      ReturnType<typeof buildCompanyPresence> | null
  financial_calculations: ReturnType<typeof runStrategicCalculator>
  persuasion:            ReturnType<typeof buildPersuasionOutput>
  unified_copilot:       ReturnType<typeof buildUnifiedCopilot>
  legal_intelligence:    ReturnType<typeof researchLegalIntelligence> | null
  enriched_makers:       ReturnType<typeof buildEnrichedDecisionMakers>
  entity_identity:       ReturnType<typeof normalizeCompanyIdentity>
  // Events
  events:                PipelineEvent[]
  // Debug
  debug:                 PipelineDebug
}

export interface PipelineDebug {
  cnpj_used:             string
  brasil_api_status:     string
  intelligence_confidence: string
  mock_fields:           string[]   // which fields fell back to mock/default
  real_fields:           string[]   // which fields came from real sources
  total_ms:              number
}

// --------- Financial calculator ---------------------------------------------------------------------------------------------------------------

function calculateFinancials(
  ctx:          CompanyContext,
  engineResult: ReturnType<typeof runRuleEngine>,
): FinancialEstimation[] {
  const fat   = ctx.faturamento_estimado ?? 0
  const folha = ctx.folha_estimada ?? 0

  return engineResult.recommended.map(m => {
    let probable = 0
    const hasData = fat > 0 || folha > 0

    if (hasData) {
      switch (m.slug) {
        case "sistema_s":                       probable = folha * 0.058 * 39 * 0.6; break
        case "verbas_indenizatorias":           probable = folha * 0.06 * 0.20 * Math.min(ctx.anos_operacao * 12, 200); break
        case "icms_st_pis_cofins":              probable = fat * 0.45 * 0.10 * 0.0925 * 84; break
        case "pis_cofins_taxa_cartao":          probable = fat * 0.72 * 0.018 * 0.0925 * 60; break
        case "ipi_credito_presumido_exportacao":probable = fat * 0.40 * 0.0537 * 60; break
        case "revisao_insumos_pis_cofins":      probable = fat * 0.30 * 0.0925 * 60; break
        case "icms_iss_acao_coletiva":          probable = fat * 0.05 * 0.0925 * 96; break
        case "bonificacoes_descontos":          probable = fat * 0.08 * 0.0925 * 60; break
        default:                                probable = fat > 0 ? fat * 0.03 * 60 : 0; break
      }
    }

    probable = Math.round(probable)

    return {
      module_slug:                  m.slug,
      module_name:                  m.name,
      probable_value:               probable > 0 ? probable : null,
      conservative_value:           probable > 0 ? Math.round(probable * 0.7) : null,
      optimistic_value:             probable > 0 ? Math.round(probable * 1.35) : null,
      confidence_level:             !hasData ? "low" : fat > 0 && folha > 0 ? "medium" : "low",
      should_show_to_client:        !m.needs_review && (probable > 10_000 || probable === 0),
      should_require_human_review:  m.needs_review,
      warnings:                     [
        ...(m.risk_level === "possível" ? ["Risco POSSÍVEL — mencionar proativamente"] : []),
        ...(!hasData ? ["Estimativa indisponível — faturamento/folha não informados"] : []),
      ],
      calculation_basis: hasData
        ? `${SEGMENT_LABELS[ctx.consultant.segment]} + ${REGIME_LABELS[ctx.consultant.tax_regime]}`
        : "Dados operacionais necessários para estimativa",
    }
  })
}

// --------- Main pipeline ------------------------------------------------------------------------------------------------------------------------------------

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const t0         = Date.now()
  const report_id  = `rpt_${Date.now()}_${Math.random().toString(36).slice(2,8)}`
  const events: PipelineEvent[] = []
  const mock_fields: string[] = []
  const real_fields: string[] = []
  const now = () => new Date().toISOString()

  function emit(event: PipelineEventType, payload?: Record<string, unknown>, source?: PipelineEvent["source"]) {
    events.push({ event, timestamp: now(), payload, source })
  }

  emit("pipeline_started", { cnpj: input.cnpj, segment: input.segment, regime: input.tax_regime })
  emit("cnpj_validated")

  // ------ STEP 1: Multi-source CNPJ lookup ------------------------------------------------------------------
  emit("enrichment_started")
  const cnpjLookup = await lookupCNPJ(input.cnpj)
  const brasilData: Partial<BrasilAPIData> = {
    razao_social:            cnpjLookup.merged.razao_social,
    nome_fantasia:           cnpjLookup.merged.nome_fantasia ?? undefined,
    cnpj:                    cnpjLookup.merged.cnpj,
    situacao_cadastral:      cnpjLookup.merged.situacao,
    data_abertura:           cnpjLookup.merged.data_abertura,
    idade_anos:              cnpjLookup.merged.idade_empresa,
    municipio:               cnpjLookup.merged.municipio,
    uf:                      cnpjLookup.merged.uf,
    cnae_fiscal_descricao:   cnpjLookup.merged.cnae_principal,
    cnae_fiscal:             cnpjLookup.merged.cnae_codigo,
    cnaes_secundarios:       cnpjLookup.merged.cnaes_secundarios?.map(d => ({ codigo: "", descricao: d })) ?? [],
    natureza_juridica:       cnpjLookup.merged.natureza_juridica,
    capital_social:          cnpjLookup.merged.capital_social_num,
    porte:                   cnpjLookup.merged.porte,
    qsa:                     cnpjLookup.merged.qsa?.map(q => ({ nome: q.nome, qual: q.qualificacao ?? "", qual_rf: "" })),
    email:                   cnpjLookup.merged.email,
    ddd_telefone_1:          cnpjLookup.merged.telefone,
  }
  const primarySource = cnpjLookup.primary_source
  const brasilResult  = cnpjLookup.attempts[0]  // for compat

  // CAMADA 2: Guaranteed enrichment - zero empty fields
  const guaranteed = guaranteedEnrich(cnpjLookup.merged, input.cnpj)
  // Fill brasilData gaps with inferred data
  if (!brasilData.municipio && guaranteed.municipio)                  brasilData.municipio               = guaranteed.municipio
  if (!brasilData.uf && guaranteed.uf)                                brasilData.uf                      = guaranteed.uf
  if (!brasilData.cnae_fiscal_descricao && guaranteed.cnae_principal) brasilData.cnae_fiscal_descricao   = guaranteed.cnae_principal
  if (!brasilData.porte && guaranteed.porte)                          brasilData.porte                   = guaranteed.porte
  if (!brasilData.natureza_juridica && guaranteed.natureza_juridica)  brasilData.natureza_juridica       = guaranteed.natureza_juridica
  const estimated_fields = guaranteed.estimated_fields

  emit("brasil_api_completed", {
    sources_tried:  cnpjLookup.debug.sources_tried,
    primary_source: primarySource,
    confidence:     cnpjLookup.confidence,
    has_qsa:        Boolean(cnpjLookup.merged.qsa?.length),
  }, cnpjLookup.debug.sources_succeeded.length > 0 ? "real" : "fallback")

  // Track data origin
  if (cnpjLookup.debug.sources_succeeded.length > 0) {
    if (brasilData.razao_social)          real_fields.push("razao_social")
    if (brasilData.cnae_fiscal_descricao) real_fields.push("cnae")
    if (brasilData.idade_anos)            real_fields.push("idade_anos")
    if (brasilData.municipio)             real_fields.push("municipio_uf")
    if (brasilData.qsa?.length)           real_fields.push("qsa_socios")
    if (brasilData.capital_social)        real_fields.push("capital_social")
  } else {
    mock_fields.push("razao_social", "cnae", "localizacao")
  }

  // ------ STEP 2: Website + News (parallel, best-effort) ---------------------------
  const [websiteResult, newsResult] = await Promise.allSettled([
    researchWebsite(
      brasilData.razao_social ?? input.mock_company_name ?? input.cnpj,
      brasilData.nome_fantasia,
      input.manual_input?.website_url,
    ),
    researchNews(brasilData.razao_social ?? input.cnpj),
  ])

  // researchWebsite returns WebsiteResult directly; wrap for compat
  const websiteRaw = websiteResult.status === "fulfilled" ? websiteResult.value : null
  const newsRaw    = newsResult.status    === "fulfilled" ? newsResult.value    : null
  const website = {
    status:     websiteRaw?.found ? "success" as const : "partial" as const,
    confidence: (websiteRaw?.confidence ?? "low") as "low"|"medium"|"high",
    findings:   websiteRaw?.evidence ?? [],
    warnings:   websiteRaw?.warnings ?? [],
    source:     "Site da Empresa",
    fetched_at: now(),
    data: {
      found:          websiteRaw?.found ?? false,
      url:            websiteRaw?.official_site,
      has_ecommerce:  websiteRaw?.extracted_signals?.ecommerce ?? false,
      has_export:     websiteRaw?.extracted_signals?.exportation ?? false,
      has_esg:        websiteRaw?.extracted_signals?.esg ?? false,
      description:    websiteRaw?.description ?? null,
      key_phrases:    [],
      warnings:       websiteRaw?.warnings ?? [],
    }
  }
  const news = {
    status:     (newsRaw?.items?.length ?? 0) > 0 ? "success" as const : "partial" as const,
    confidence: "medium" as const,
    findings:   [],
    warnings:   [],
    source:     "Google News",
    fetched_at: now(),
    data: {
      items:         newsRaw?.items ?? [],
      top_signals:   newsRaw?.signals ?? [],
      growth_signals: newsRaw?.growth_signal ?? false,
      risk_signals:   newsRaw?.risk_signal ?? false,
    }
  }

  emit("website_search_completed",  { status: website.status, found: website.data.found }, website.status === "success" ? "real" : "fallback")
  emit("news_search_completed",     { status: news.status, count: news.data.items?.length ?? 0 }, news.status === "success" ? "real" : "fallback")

  if (website.data.found) real_fields.push("website_data")
  else mock_fields.push("website_data")

  // ------ STEP 3: Build Company Intelligence ------------------------------------------------------------
  const cnaeSignals = extractSignalsFromCNAE(brasilData.cnae_fiscal ?? "", brasilData.cnae_fiscal_descricao ?? "")

  // Determine company name --- prefer Brasil API
  const company_name = brasilData.razao_social ?? input.mock_company_name ?? `Empresa CNPJ ${input.cnpj}`
  const company_name_source: PipelineResult["company_name_source"] =
    brasilData.razao_social ? "brasil_api" : input.mock_company_name ? "manual_input" : "fallback"

  // Determine age --- prefer Brasil API
  const anos_operacao = input.anos_operacao_override
    ?? brasilData.idade_anos
    ?? 0

  const intelligence: CompanyIntelligence = {
    cnpj:                input.cnpj.replace(/\D/g,""),
    company_identity:    brasilData,
    operational_summary: buildOperationalSummary(brasilData, website.data, news.data),
    business_model_hypothesis: buildHypothesis(brasilData, { found: website.data.found, has_export: website.data.has_export, key_phrases: website.data.key_phrases }, cnaeSignals),
    decision_makers: (brasilData.qsa ?? []).map(q => ({
      name:       q.nome,
      title:      q.qual || "Sócio/Administrador",
      confidence: "high" as const,
      source:     "receita_federal" as const,
      is_target:  true,
    })),
    public_signals: buildPublicSignals(brasilData, { found: website.data.found, has_ecommerce: website.data.has_ecommerce, has_export: website.data.has_export }, news.data as { items: Array<{ title:string; sentiment:string; tags:string[] }> }),
    legal_signals:  [],
    tax_maturity_signals: anos_operacao >= 15 ? [{ signal: `${anos_operacao} anos de operação — histórico retroativo expressivo`, implication: "Período retroativo amplo para revisões.", source: "Receita Federal" }] : [],
    likely_operations: cnaeSignals,
    commercial_hooks: buildHooks(brasilData, { found: website.data.found, has_export: website.data.has_export }, news.data as { items: Array<{title:string; tags:string[]}> }, input),
    risks_and_unknowns: [
      ...brasilResult.warnings,
      ...(website.data.warnings ?? []),
      ...(news.warnings ?? []),
    ].slice(0, 5),
    recommended_validation_questions: buildQuestions(brasilData, input),
    enrichment_sources: [
      { source: "BrasilAPI / Receita Federal", status: brasilResult.status, confidence: brasilResult.confidence },
      { source: "Site da Empresa", status: website.status, confidence: website.confidence as "low"|"medium"|"high" },
      { source: "Google News", status: news.status, confidence: news.confidence },
    ],
    enrichment_confidence: brasilResult.status === "success" ? "high" : "low",
    enriched_at: now(),
  }

  emit("company_intelligence_ready", {
    company_name,
    source:     company_name_source,
    confidence: intelligence.enrichment_confidence,
    decision_makers: intelligence.decision_makers.length,
  }, company_name_source === "brasil_api" ? "real" : "fallback")

  // ------ STEP 4: Company Context for engines ---------------------------------------------------------
  const ctx: CompanyContext = {
    cnpj:                  input.cnpj,
    razao_social:          company_name,
    anos_operacao,
    porte:                 (brasilData.porte?.toLowerCase() === "grande" ? "grande"
      : brasilData.porte?.toLowerCase().includes("médio") ? "medio"
      : brasilData.porte?.toLowerCase().includes("peque") ? "pequeno" : "medio") as "micro"|"pequeno"|"medio"|"grande",
    uf:                    brasilData.uf ?? input.manual_input?.notes?.slice(0,2) ?? "BR",
    faturamento_estimado:  input.faturamento_estimado,
    folha_estimada:        input.folha_estimada,
    consultant: {
      segment:          input.segment,
      tax_regime:       input.tax_regime,
      subsegment:       input.subsegment,
      operation_flags:  input.operation_flags ?? [],
    },
  }

  // ------ STEP 5: Tax Matrix + Rule Engine ------------------------------------------------------------------
  const classified_modules = lookupMatrix(ctx.consultant, "consultant_override")
  emit("tax_matrix_computed", { segment: input.segment, regime: input.tax_regime, core_count: classified_modules.core.length })

  const engine_result = runRuleEngine(ctx)

  // --- Size multiplier: adjust score by company porte ---------------------------------------------------------------------------
  // A score of 80 for a micro company has very different impact than for a large one
  // This shifts the priority score to reflect actual opportunity magnitude
  const capitalSocial = brasilData.capital_social_num ?? brasilData.capital_social ?? 0
  const porteStr = (brasilData.porte ?? "").toUpperCase()
  const sizeMultiplier =
    porteStr === "GRANDE"  ? 1.15
    : porteStr === "MEDIO" ? 1.05
    : capitalSocial > 5_000_000 ? 1.10
    : capitalSocial > 500_000   ? 1.00
    : capitalSocial > 50_000    ? 0.90
    : 0.80  // micro/MEI — still worth pursuing, but lower multiplier

  const adjustedScore = Math.min(100, Math.round(engine_result.final_score * sizeMultiplier))
  const adjustedTier  = adjustedScore >= 90 ? "S" : adjustedScore >= 75 ? "A" : adjustedScore >= 55 ? "B" : adjustedScore >= 35 ? "C" : "D"

  // Mutate engine_result to reflect size-adjusted score
  const engine_result_adjusted = {
    ...engine_result,
    final_score: adjustedScore,
    tier:        adjustedTier,
    size_multiplier: sizeMultiplier,
    size_note: porteStr
      ? `Porte ${porteStr} — multiplicador ${sizeMultiplier}x aplicado ao score base ${engine_result.final_score}`
      : capitalSocial > 0
      ? `Capital R$ ${capitalSocial.toLocaleString("pt-BR")} — multiplicador ${sizeMultiplier}x aplicado`
      : "Porte nao identificado — score base mantido",
  }

  emit("score_pronto", {
    score: engine_result_adjusted.final_score,
    tier:  engine_result_adjusted.tier,
    recommended: engine_result.recommended.length,
    rejected:    engine_result.rejected.length,
  }, "real")

  // ------ STEP 6: Financial Calculator ---------------------------------------------------------------------------
  const financial_estimations = calculateFinancials(ctx, engine_result_adjusted)
  emit("financial_estimations_ready", {
    count:    financial_estimations.filter(f => f.probable_value !== null).length,
    has_data: Boolean(input.faturamento_estimado || input.folha_estimada),
  })

  // ------ STEP 7: Strategic Dossier ---------------------------------------------------------------------------------------
  emit("dossier_building")
  const strategic_dossier = buildStrategicDossier(ctx, engine_result_adjusted)

  // ------ STEP 8: Copilot Context ---------------------------------------------------------------------------------------------
  emit("copilot_building")
  // ------ Research-to-Intelligence Bridge ------------------------------------------------------------------
  // Adapt CompanyIntelligence --- CompanyResearch shape for signal extraction
  const researchAdapter = {
    cnpj:         ctx.cnpj,
    razao_social: brasilData.razao_social ?? ctx.razao_social,
    cnpj_result: {
      merged: {
        razao_social:      brasilData.razao_social ?? undefined,
        cnae_principal:    brasilData.cnae_fiscal_descricao ?? undefined,
        cnae_codigo:       brasilData.cnae_fiscal ?? undefined,
        municipio:         brasilData.municipio ?? undefined,
        uf:                brasilData.uf ?? undefined,
        data_abertura:     brasilData.data_abertura ?? undefined,
        idade_empresa:     brasilData.idade_anos ?? undefined,
        qsa:               brasilData.qsa?.map((q: {nome:string;qual:string}) => ({ nome: q.nome, qualificacao: q.qual })),
        capital_social:    brasilData.capital_social ? `R$ ${brasilData.capital_social.toLocaleString("pt-BR")}` : undefined,
        porte:             brasilData.porte ?? undefined,
      },
      confidence:     (cnpjLookup.confidence ?? "low") as "low"|"medium"|"high",
      primary_source: primarySource,
      debug:          { sources_tried: cnpjLookup.debug.sources_tried, sources_succeeded: cnpjLookup.debug.sources_succeeded, total_ms: cnpjLookup.debug.total_ms, cnpj_searched: ctx.cnpj },
      attempts:       cnpjLookup.attempts,
    },
    website: {
      found:             Boolean(website.data.found),
      confidence:        website.confidence,
      official_site:     website.data.url ?? undefined,
      extracted_signals: {
        exportation: Boolean(website.data.has_export),
        ecommerce:   Boolean(website.data.has_ecommerce),
        esg:         Boolean(website.data.has_esg),
        certifications: [],
      },
      description:  website.data.description ?? undefined,
      evidence:     website.findings ?? [],
      warnings:     website.warnings ?? [],
    },
    news: {
      items: (news.data.items ?? []).map((i: {title:string;tags?:string[];source?:string;sentiment?:string}) => ({
        title:    i.title,
        tags:     i.tags ?? [],
        source:   i.source ?? "Google News",
        sentiment: (i.sentiment ?? "neutral") as "positive"|"neutral"|"negative",
        commercial_relevance: "",
        confidence: "medium" as const,
        url: null,
      })),
      commercial_hooks: [],
      signals:          news.data.top_signals ?? [],
      growth_signal:    Boolean(news.data.growth_signals),
      risk_signal:      Boolean(news.data.risk_signals),
    },
    decision_makers: {
      decision_makers: (brasilData.qsa ?? []).map((q: {nome:string;qual:string}) => ({
        name:       q.nome,
        role:       q.qual || "Sócio/Administrador",
        source:     "receita_federal" as const,
        confidence: "high" as const,
        is_target:  true,
      })),
      coverage:      brasilData.qsa?.length ? "good" as const : "none" as const,
      missing_roles: brasilData.qsa?.length ? [] : ["CFO / Financeiro"],
      manual_fields_available: [],
    },
    legal: {
      legal_signals:      [],
      has_tax_litigation: false,
      maturity_level:     "none" as const,
      recurring_themes:   [],
      known_lawyers:      [],
      approach_note:      "Sem histórico jurídico identificado.",
    },
    missing_information:          intelligence.risks_and_unknowns ?? [],
    commercial_hooks:             intelligence.commercial_hooks ?? [],
    recommended_questions:        intelligence.recommended_validation_questions ?? [],
    confidence_score:             60,
    public_signals:               intelligence.public_signals ?? [],
    business_description:         intelligence.operational_summary ?? "",
    operational_summary:          intelligence.operational_summary ?? "",
    likely_business_model:        intelligence.business_model_hypothesis ?? "",
    approach_angles:              [],
    tax_maturity_signals:         intelligence.tax_maturity_signals ?? [],
    debug:                        { cnpj_sources_attempted: cnpjLookup.debug.sources_tried, company_name_used_for_search: brasilData.razao_social ?? ctx.razao_social, website_candidates_tried: 4, news_queries: [brasilData.razao_social ?? ctx.razao_social], failed_sources: cnpjLookup.attempts.filter((a:{status:string}) => a.status === "failed").map((a:{source:string}) => a.source), total_ms: 0 },
    enriched_at:                  new Date().toISOString(),
  } as import("../enrichment/research-orchestrator").CompanyResearch

  const research_signals     = extractResearchSignals(researchAdapter)
  const contradictions       = detectContradictions(research_signals)
  const module_adjustments   = computeModuleAdjustments(research_signals)
  const score_adjustments    = applyResearchScoreAdjustments(engine_result.final_score, research_signals, contradictions)
  const research_confidence  = computeResearchConfidence(researchAdapter)
  const copilot_context      = buildCopilotContext({ ctx, intelligence, engineResult: engine_result })
  const research_copilot     = buildResearchCopilotContext(researchAdapter, research_signals)
  const why_now  = buildWhyNow(copilot_context, intelligence)
  const pitch    = buildContextualPitch(copilot_context)

  // ------ Operational Intelligence ------------------------------------------------------------------------------------------
  const company_profile = buildCompanyProfile({
    cnpjData:       researchAdapter.cnpj_result.merged,
    website:        researchAdapter.website as import("../enrichment/research-engine").WebsiteResult,
    news:           { items: researchAdapter.news.items, commercial_hooks: [], signals: researchAdapter.news.signals, growth_signal: researchAdapter.news.growth_signal, risk_signal: researchAdapter.news.risk_signal, fetched_at: new Date().toISOString() },
    segment:        input.segment,
    regime:         input.tax_regime,
    legalMaturity:  researchAdapter.legal.maturity_level as import("../intelligence/company-profile-engine").TaxMaturity,
    anos_operacao:  ctx.anos_operacao,
  })

  const intel_decision_makers = buildIntelDecisionMakers({
    qsa:         researchAdapter.cnpj_result.merged.qsa,
    segment:     input.segment,
    tax_maturity: company_profile.tax_maturity,
    manual_name: input.manual_input?.decision_maker_name,
    manual_role: input.manual_input?.decision_maker_role,
    manual_url:  input.manual_input?.linkedin_url,
    extra_paste: input.manual_input?.extra_names,
  })

  const modulesList = engine_result.recommended.map(m => ({ name: m.name, slug: m.slug, score: m.score, risk: m.risk_level }))

  const sales_strategy = buildSalesStrategy(company_profile, intel_decision_makers, modulesList)

  const executive_briefing = buildExecutiveBriefing(
    company_profile,
    intel_decision_makers,
    modulesList,
    [
      { objection: "Já temos contador/advogado tributário.", response: "Nossa atuação é complementar — focada em teses de jurisprudência recente que geralmente estão fora do escopo do trabalho contábil cotidiano." },
      { objection: "Manda por e-mail.", response: `Claro. Antes de escrever — me deixa entender uma coisa: ${company_profile.razao_social.split(" ")[0]} já realizou revisão tributária estratégica nos últimos 3 anos? Depende disso o que faz mais sentido enviar.` },
      { objection: "Não tenho tempo agora.", response: "Entendo. Posso enviar um resumo de 1 página — você avalia quando tiver 5 minutos. Qual e-mail?" },
    ]
  )

  emit("pipeline_complete", {
    total_ms:   Date.now() - t0,
    real_count: real_fields.length,
    mock_count: mock_fields.length,
  }, "real")

  // ------ Persuasion Engine ------------------------------------------------------------------------------------------------------------
  const newsForPersuasion = ((news.data as {items?:Array<{title:string;tags:string[]}>}).items ?? []).map(i=>({
    title: i.title, tags: Array.isArray(i.tags) ? i.tags as string[] : [], commercial_hook: "",
  }))
  const persuasion = buildPersuasionOutput(
    company_profile,
    intel_decision_makers,
    engine_result.recommended.map(m=>({ name: m.name, slug: m.slug, score: m.score })),
    newsForPersuasion,
    { hasLitigation: researchAdapter.legal.has_tax_litigation, recurringThemes: researchAdapter.legal.recurring_themes },
  )

  // ------ Remaining pipeline stages -------------------------------------------------------
  let company_presence = null
  try {
    const identity = normalizeCompanyIdentity(
      brasilData.razao_social ?? company_name,
      brasilData.nome_fantasia,
      brasilData.municipio,
      brasilData.cnae_fiscal_descricao,
    )
    company_presence = await buildCompanyPresence(identity, brasilData.municipio, input.manual_input?.website_url)
  } catch { /* non-blocking */ }

  const financial_calculations = runStrategicCalculator({
    folha_mensal:      input.folha_estimada,
    faturamento_mensal: input.faturamento_estimado,
    regime:            input.tax_regime,
    segment:           input.segment,
  })

  const enriched_makers = buildEnrichedDecisionMakers({
    qsa:           researchAdapter.cnpj_result.merged.qsa ?? [],
    company_name:  company_name,
    segment:       input.segment,
    legal_maturity: "none" as const,
    manual_name:   input.manual_input?.decision_maker_name,
    manual_role:   input.manual_input?.decision_maker_role,
    extra_paste:   input.manual_input?.extra_names,
  })

  const entity_identity = normalizeCompanyIdentity(
    brasilData.razao_social ?? company_name,
    brasilData.nome_fantasia,
    brasilData.municipio,
    brasilData.cnae_fiscal_descricao,
  )

  const newsSignalsForCopilot = ((news.data as {items?:Array<{title:string;tags?:string[]}>}).items ?? []).map(i => ({
    title: i.title, tags: i.tags ?? [], commercial_hook: "",
  }))

  const unified_copilot = buildUnifiedCopilot(
    company_profile,
    intel_decision_makers,
    engine_result.recommended.map(m => ({ name: m.name, slug: m.slug, score: m.score })),
    newsSignalsForCopilot,
    input.segment,
    null,
    enriched_makers,
  )

  // ------ Run all enrichment engines in PARALLEL to stay within 30s limit ------
  const [
    legalResult,
    linkedinResult,
    timingResult,
    webEnrichResult,
    partnersResult,
  ] = await Promise.allSettled([
    // Legal intelligence
    researchLegalIntelligence({
      cnpj:         ctx.cnpj,
      razao_social: company_name,
      uf:           brasilData.uf ?? "SP",
      nome_fantasia: brasilData.nome_fantasia,
      manual_text:  input.manual_input?.court_snippet,
      // Pass PF partner names for small company legal searches
      qsa_names: (cnpjLookup.merged.qsa ?? [])
        .map((q: any) => q.nome_socio ?? q.name ?? "")
        .filter((n: string) => {
          // Only PF names (no LTDA, SA, etc.)
          const PJ = ["LTDA","SA","EIRELI","HOLDING","PARTICIPACOES","FUNDO"]
          return n.length > 4 && !PJ.some(p => n.toUpperCase().includes(p))
        }),
    }),
    // Person discovery --- exhaustive multi-source search
    searchLinkedInDecisionMakers(
      company_name,
      brasilData.nome_fantasia,
      brasilData.uf ?? "SP",
      input.cnpj,
    ),
    // Timing intelligence
    buildTimingIntelligence(
      company_name,
      brasilData.nome_fantasia,
      input.cnpj,
      brasilData.uf ?? "SP",
      undefined,  // web_enrichment added after parallel block
      {
        data_abertura:  brasilData.data_abertura,
        capital_social: brasilData.capital_social_num ?? brasilData.capital_social,
        porte:          brasilData.porte,
      }
    ),
    // Web enrichment
    runWebEnrichment(
      company_name,
      brasilData.nome_fantasia,
      input.cnpj,
      brasilData.uf ?? "SP",
      input.manual_input?.website_url ?? null,
    ),
    // Public partners
    searchPublicPartners(company_name, input.cnpj),
  ])

  // Extract results
  const legal_intelligence = legalResult.status === "fulfilled" ? legalResult.value : null
  const linkedin_decision_makers = linkedinResult.status === "fulfilled" ? linkedinResult.value : []
  const timing_intelligence = timingResult.status === "fulfilled" ? timingResult.value : null
  let web_enrichment = webEnrichResult.status === "fulfilled" ? webEnrichResult.value : null
  const public_partners = partnersResult.status === "fulfilled" ? partnersResult.value : []

  // Merge CNPJ contacts into web_enrichment
  if (web_enrichment) {
    const cnpjPhone = cnpjLookup.merged.telefone
    const cnpjEmail = cnpjLookup.merged.email
    if (cnpjPhone || cnpjEmail) {
      if (!web_enrichment.contacts) web_enrichment.contacts = []
      if (cnpjPhone && !web_enrichment.contacts.some((c: any) => c.value === cnpjPhone)) {
        web_enrichment.contacts.unshift({
          value: cnpjPhone, type: "telefone", label: "Cadastro Receita Federal",
          source: "Receita Federal", confidence: "high",
          has_whatsapp: cnpjPhone.replace(/\D/g,"").length === 11 && cnpjPhone.replace(/\D/g,"")[2] === "9",
        })
      }
      if (cnpjEmail && !web_enrichment.contacts.some((c: any) => c.value === cnpjEmail)) {
        web_enrichment.contacts.unshift({
          value: cnpjEmail, type: "email", label: "Email cadastral (RF)",
          source: "Receita Federal", confidence: "high",
        })
      }
    }
    // Backfill from web_enrichment
    if (web_enrichment.municipio && !brasilData.municipio) brasilData.municipio = web_enrichment.municipio
    if (web_enrichment.uf && !brasilData.uf) brasilData.uf = web_enrichment.uf
  }

  // Enrich LinkedIn makers with relational intelligence
  const enriched_linkedin_makers = linkedin_decision_makers.map((lm: any) =>
    buildEnrichedPerson(
      lm.name, lm.role ?? lm.role_raw ?? "Decisor",
      lm.source ?? "LinkedIn", lm.confidence ?? "medium",
      company_name, web_enrichment?.website, lm.linkedin_url ?? undefined, [], [],
    )
  )

  // Google Maps fallback for municipio
  if (!brasilData.municipio || brasilData.municipio.trim() === "") {
    try {
      const maps = await searchGoogleMaps(company_name, input.cnpj, brasilData.uf)
      if (maps.found) {
        if (maps.city && !brasilData.municipio) brasilData.municipio = maps.city
        if (maps.state && !brasilData.uf) brasilData.uf = maps.state
      }
    } catch { /* non-blocking */ }
  }

  // Sector context
  const sector_context = getSectorContext(brasilData.cnae_fiscal_descricao, input.segment)
  const estimated_fields_final = guaranteed.estimated_fields

    return {
    report_id,
    cnpj: input.cnpj,
    company_name,
    company_name_source,
    intelligence,
    classified_modules,
    engine_result: engine_result_adjusted,
    financial_estimations,
    strategic_dossier,
    copilot_context,
    why_now,
    pitch,
    research_signals,
    research_confidence,
    research_copilot,
    score_adjustments,
    company_profile,
    intel_decision_makers,
    sales_strategy,
    executive_briefing,
    company_presence,
    financial_calculations,
    persuasion,
    unified_copilot,
    legal_intelligence,
    enriched_makers,
    entity_identity,
    linkedin_decision_makers,
    enriched_linkedin_makers,
    public_partners,
    timing_intelligence,
    sector_context,
    web_enrichment,
    estimated_fields: guaranteed.estimated_fields,
    events,
    debug: {
      cnpj_used:               input.cnpj,
      brasil_api_status:       cnpjLookup.debug.sources_succeeded.length > 0 ? "success" : "failed",
      intelligence_confidence: intelligence.enrichment_confidence,
      mock_fields,
      real_fields,
      total_ms: Date.now() - t0,
    },
  }
}

// --------- Helpers ------------------------------------------------------------------------------------------------------------------------------------------------------

function buildOperationalSummary(brasil: Partial<BrasilAPIData>, website: { found:boolean; description:string|null }, news: { items: Array<{title:string}> }): string {
  const parts: string[] = []
  if (brasil.razao_social) {
    const loc  = brasil.municipio && brasil.uf ? ` sediada em ${brasil.municipio}/${brasil.uf}` : ""
    const age  = brasil.idade_anos ? `, ${brasil.idade_anos} anos de operação` : ""
    const cnae = brasil.cnae_fiscal_descricao ? `, CNAE: ${brasil.cnae_fiscal_descricao}` : ""
    parts.push(`${brasil.razao_social}${loc}${age}${cnae}.`)
  }
  if (website.found && website.description) parts.push(`Site: "${website.description.slice(0,100)}".`)
  if (news.items.length > 0) parts.push(`Notícia recente: "${news.items[0].title.slice(0,80)}".`)
  return parts.join(" ") || "Dados públicos insuficientes — enriquecer manualmente."
}

function buildHypothesis(brasil: Partial<BrasilAPIData>, website: { found:boolean; has_export:boolean; key_phrases:string[] }, cnaeSignals: string[]): string {
  const hyps: string[] = []
  if (cnaeSignals.length > 0) hyps.push(`Baseado no CNAE: ${cnaeSignals.join("; ")}.`)
  if (website.found && website.has_export) hyps.push("Sinais de operação com comércio exterior no site.")
  if (website.found && website.key_phrases.length > 0) hyps.push(`Palavras-chave: ${website.key_phrases.slice(0,3).join(", ")}.`)
  const prefix = "HIPÓTESE (sujeita a confirmação): "
  return hyps.length > 0 ? prefix + hyps.join(" ") : prefix + "Perfil operacional não pôde ser inferido com dados disponíveis."
}

function buildPublicSignals(brasil: Partial<BrasilAPIData>, website: { found:boolean; has_ecommerce:boolean; has_export:boolean }, news: { items: Array<{title:string; sentiment:string; tags:string[]}>}) {
  const signals = []
  if (brasil.idade_anos && brasil.idade_anos >= 10) signals.push({ signal: `${brasil.idade_anos} anos de operação`, type: "fact" as const, source: "Receita Federal", confidence: "high" as const, commercial_hook: "Período retroativo expressivo para revisão." })
  if (brasil.qsa?.length) signals.push({ signal: `${brasil.qsa.length} sócio(s) identificado(s)`, type: "fact" as const, source: "Receita Federal", confidence: "high" as const })
  if (website.has_ecommerce) signals.push({ signal: "E-commerce identificado no site", type: "signal" as const, source: "Site", confidence: "medium" as const, commercial_hook: "E-commerce → DIFAL relevante." })
  if (website.has_export) signals.push({ signal: "Operação exportadora sinalizada", type: "signal" as const, source: "Site", confidence: "medium" as const, commercial_hook: "Exportação → IPI Crédito Presumido (5,37%)." })
  for (const item of news.items.filter(i => i.sentiment === "positive").slice(0,2)) {
    signals.push({ signal: `Notícia: "${item.title.slice(0,80)}"`, type: "signal" as const, source: "Google News", confidence: "medium" as const, commercial_hook: "Empresa em crescimento — timing favorável." })
  }
  return signals
}

function buildHooks(brasil: Partial<BrasilAPIData>, website: { found:boolean; has_export:boolean }, news: { items: Array<{title:string; tags:string[]}>}, input: PipelineInput): string[] {
  const nome  = (brasil.razao_social ?? "a empresa").split(" ")[0]
  const hooks: string[] = []
  if (brasil.idade_anos && brasil.idade_anos >= 10) hooks.push(`"${nome} tem ${brasil.idade_anos} anos de operação — período retroativo expressivo para revisão tributária estratégica."`)
  if (website.has_export) hooks.push(`"Com operação exportadora, há crédito de IPI fixado em lei (5,37%) que muitas indústrias não aproveitam sistematicamente."`)
  for (const item of news.items.filter(i => i.tags.includes("expansão")).slice(0,1)) hooks.push(`"Identificamos que ${nome} está em expansão — empresas nesse momento têm janela estratégica para revisão tributária."`)
  if (hooks.length === 0) hooks.push(`"Analisamos o perfil público de ${brasil.razao_social ?? "vocês"} e identificamos comportamentos fiscais específicos do setor que merecem atenção."`)
  return hooks
}

function buildQuestions(brasil: Partial<BrasilAPIData>, input: PipelineInput): string[] {
  const q = ["Confirmar o regime tributário atual?", "Qual o faturamento mensal aproximado?", "Há revisão tributária estratégica nos últimos 3 anos?"]
  if (!brasil.qsa?.length) q.push("Quem são os sócios/responsável financeiro?")
  if ((input.operation_flags ?? []).includes("icms_st")) q.push("Qual o percentual de compras com ICMS-ST?")
  if ((input.operation_flags ?? []).includes("exportacao")) q.push("Qual o percentual do faturamento em exportação?")
  return q.slice(0, 6)
}
