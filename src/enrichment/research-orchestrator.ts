// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Research Orchestrator
//
// Runs full company research pipeline and produces
// a unified CompanyResearch object for dossi-- + copilot.
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import { lookupCNPJ }                                     from "./cnpj-lookup"
import { researchWebsite, researchNews, buildDecisionMakers, processLegalInput } from "./research-engine"
import type { MultiSourceResult }                          from "./cnpj-lookup"
import type { WebsiteResult, NewsResult, DecisionMakersResult, LegalResult } from "./research-engine"

// --------- Manual enrichment input ------------------------------------------------------------------------------------------------------

export interface ManualResearchInput {
  website_url?:           string
  linkedin_company_url?:  string
  decision_maker_name?:   string
  decision_maker_role?:   string
  linkedin_url?:          string
  extra_names?:           string   // multi-line paste from LinkedIn
  news_url?:              string
  court_snippet?:           string   // paste from tribunal search
  notes?:                 string
}

// --------- Full research output ---------------------------------------------------------------------------------------------------------------

export interface CompanyResearch {
  cnpj:              string
  // Identity
  razao_social:      string
  nome_fantasia?:    string
  data_source:       "multi_source" | "fallback"
  confidence:        "low" | "medium" | "high"
  // Components
  cnpj_result:       MultiSourceResult
  website:           WebsiteResult
  news:              NewsResult
  decision_makers:   DecisionMakersResult
  legal:             LegalResult
  // Synthesized intelligence
  business_description:    string
  operational_summary:     string
  likely_business_model:   string
  public_signals:          Array<{ signal: string; type: "fact"|"hypothesis"|"signal"; source: string; confidence: "low"|"medium"|"high"; commercial_hook?: string }>
  commercial_hooks:        string[]
  approach_angles:         string[]
  tax_maturity_signals:    Array<{ signal: string; implication: string; source: string }>
  missing_information:     string[]
  recommended_questions:   string[]
  confidence_score:        number   // 0-100
  // Debug
  debug: {
    cnpj_sources_attempted:         string[]
    company_name_used_for_search:   string
    website_candidates_tried:       number
    news_queries:                   string[]
    failed_sources:                 string[]
    total_ms:                       number
  }
  enriched_at: string
}

// --------- Signal synthesis ---------------------------------------------------------------------------------------------------------------------------

function buildPublicSignals(
  cnpjData: MultiSourceResult["merged"],
  website:  WebsiteResult,
  news:     NewsResult,
) {
  type Signal = CompanyResearch["public_signals"][number]
  const signals: Signal[] = []

  if (cnpjData.idade_empresa && cnpjData.idade_empresa >= 10) {
    signals.push({ signal: `${cnpjData.idade_empresa} anos de operação`, type: "fact", source: cnpjData.qsa?.length ? "Receita Federal" : "Dados cadastrais", confidence: "high", commercial_hook: "Período retroativo expressivo para revisão tributária." })
  }

  if (cnpjData.qsa?.length) {
    signals.push({ signal: `${cnpjData.qsa.length} sócio(s) identificado(s) na Receita Federal`, type: "fact", source: "Receita Federal", confidence: "high" })
  }

  if (website.extracted_signals.ecommerce) {
    signals.push({ signal: "Canal de vendas digital identificado (e-commerce)", type: "signal", source: "Site da empresa", confidence: "medium", commercial_hook: "E-commerce → operações interestaduais → DIFAL relevante." })
  }

  if (website.extracted_signals.exportation) {
    signals.push({ signal: "Operação exportadora sinalizada no site", type: "signal", source: "Site da empresa", confidence: "medium", commercial_hook: "Exportação → IPI Crédito Presumido (5,37% fixado em lei)." })
  }

  if (website.extracted_signals.certifications?.length) {
    signals.push({ signal: `Certificações: ${website.extracted_signals.certifications.join(", ")}`, type: "signal", source: "Site da empresa", confidence: "medium" })
  }

  for (const item of news.items.filter(i => i.confidence === "medium").slice(0, 3)) {
    signals.push({ signal: `Notícia: "${item.title.slice(0, 80)}"`, type: "signal", source: "Google News", confidence: "medium", commercial_hook: item.commercial_relevance })
  }

  return signals
}

function buildCommercialHooks(
  cnpjData: MultiSourceResult["merged"],
  website:  WebsiteResult,
  news:     NewsResult,
): string[] {
  const nome  = (cnpjData.razao_social ?? "a empresa").split(" ")[0]
  const hooks: string[] = []

  if (cnpjData.idade_empresa && cnpjData.idade_empresa >= 10) {
    hooks.push(`"${nome} tem ${cnpjData.idade_empresa} anos de operação — isso cria um período retroativo relevante para revisão tributária que ainda não prescreve."`)
  }

  if (website.found && website.extracted_signals.exportation) {
    hooks.push(`"Com operação exportadora identificada em ${nome}, há crédito de IPI fixado em lei (5,37%) que muitas indústrias não aproveitam sistematicamente."`)
  }

  // News-based hooks (only real news)
  hooks.push(...news.commercial_hooks.slice(0, 2))

  if (cnpjData.cnae_principal && hooks.length === 0) {
    hooks.push(`"Identificamos que ${nome} atua em ${cnpjData.cnae_principal.toLowerCase()} — temos trabalhado com empresas do mesmo perfil em revisões específicas para esse setor."`)
  }

  // Fallback: always have at least one hook
  if (hooks.length === 0) {
    hooks.push(`"Analisamos o perfil público de ${cnpjData.razao_social ?? nome} e identificamos comportamentos fiscais específicos do setor que merecem atenção."`)
  }

  return hooks.slice(0, 4)
}

function buildApproachAngles(
  cnpjData: MultiSourceResult["merged"],
  legal:    LegalResult,
  news:     NewsResult,
): string[] {
  const angles: string[] = []

  if (legal.maturity_level === "none") {
    angles.push("Primeira revisão tributária — posicionar como descoberta, não como crítica ao trabalho atual")
  } else if (legal.maturity_level === "high") {
    angles.push("Alta maturidade litigiosa — posicionar como parceiro complementar com visão diferente")
  }

  if (news.growth_signal) {
    angles.push("Empresa em crescimento — abordar pela eficiência tributária para o próximo ciclo")
  }

  if (cnpjData.idade_empresa && cnpjData.idade_empresa >= 15) {
    angles.push(`Com ${cnpjData.idade_empresa} anos, o histórico retroativo é o principal argumento — evitar falar em 'recuperação', falar em 'revisão de períodos anteriores'`)
  }

  return angles.length > 0 ? angles : ["Abordagem consultiva — demonstrar conhecimento do setor antes de falar em oportunidade"]
}

function computeConfidenceScore(
  cnpjResult:   MultiSourceResult,
  website:      WebsiteResult,
  news:         NewsResult,
  decisionMakers: DecisionMakersResult,
): number {
  let score = 0
  // CNPJ data (max 50)
  if (cnpjResult.merged.razao_social)    score += 15
  if (cnpjResult.merged.cnae_principal)  score += 10
  if (cnpjResult.merged.qsa?.length)     score += 15
  if (cnpjResult.merged.data_abertura)   score += 10
  // Website (max 20)
  if (website.found) score += 20
  // News (max 15)
  if (news.items.length >= 3) score += 15
  else if (news.items.length >= 1) score += 8
  // Decision makers (max 15)
  if (decisionMakers.coverage === "good") score += 15
  else if (decisionMakers.coverage === "partial") score += 8

  return Math.min(100, score)
}

function buildValidationQuestions(
  cnpjData: MultiSourceResult["merged"],
  website:  WebsiteResult,
  legal:    LegalResult,
): string[] {
  const q = ["Confirmar o regime tributário atual (LR / LP / Simples)?", "Qual o faturamento mensal aproximado?", "A empresa realizou revisão tributária estratégica nos últimos 3 anos?"]

  if (!cnpjData.qsa?.length) q.push("Quem é o responsável pela área financeira/fiscal?")
  if (website.extracted_signals.exportation) q.push("Qual o percentual do faturamento destinado à exportação?")
  if (website.extracted_signals.ecommerce)   q.push("Qual o volume de vendas online e para quais estados?")
  if (legal.has_tax_litigation)               q.push("Há escritório jurídico tributário de referência?")
  if (cnpjData.idade_empresa && cnpjData.idade_empresa >= 10) q.push(`Com ${cnpjData.idade_empresa} anos de operação, houve revisão previdenciária histórica?`)

  return q.slice(0, 7)
}

// --------- Main orchestrator ------------------------------------------------------------------------------------------------------------------------

export interface RunResearchOptions {
  manual?:         ManualResearchInput
  fetch_website?:  boolean
  fetch_news?:     boolean
}

export async function runCompanyResearch(
  cnpj:    string,
  options: RunResearchOptions = {},
): Promise<CompanyResearch> {
  const t0         = Date.now()
  const enriched_at = new Date().toISOString()
  const { manual, fetch_website = true, fetch_news = true } = options

  // ------ Step 1: Multi-source CNPJ lookup ------------------------------------------------------------------
  const cnpjResult = await lookupCNPJ(cnpj)
  const data       = cnpjResult.merged
  const razao      = data.razao_social ?? `Empresa CNPJ ${cnpj}`
  const fantasia   = data.nome_fantasia ?? undefined

  // ------ Step 2: Website + News (parallel) ---------------------------------------------------------------
  const [websiteRes, newsRes] = await Promise.allSettled([
    fetch_website ? researchWebsite(razao, fantasia, manual?.website_url) : Promise.resolve<WebsiteResult>({ found: false, confidence: "low", evidence: [], extracted_signals: {}, warnings: ["Website search skipped"], fetched_at: new Date().toISOString() }),
    fetch_news    ? researchNews(razao)                                    : Promise.resolve<NewsResult>({ items: [], commercial_hooks: [], signals: [], growth_signal: false, risk_signal: false, fetched_at: new Date().toISOString() }),
  ])

  const website = websiteRes.status === "fulfilled" ? websiteRes.value : { found: false, confidence: "low" as const, evidence: [], extracted_signals: {}, warnings: ["Website search failed"], fetched_at: new Date().toISOString() }
  const news    = newsRes.status    === "fulfilled" ? newsRes.value    : { items: [], commercial_hooks: [], signals: [], growth_signal: false, risk_signal: false, fetched_at: new Date().toISOString() }

  // ------ Step 3: Decision makers + Legal ---------------------------------------------------------------------
  const decisionMakers = buildDecisionMakers(data.qsa, manual ? {
    decision_maker_name: manual.decision_maker_name,
    decision_maker_role: manual.decision_maker_role,
    linkedin_url:        manual.linkedin_url,
    extra_names:         manual.extra_names,
  } : undefined)

  const legal = processLegalInput(manual?.court_snippet)

  // ------ Step 4: Synthesize ---------------------------------------------------------------------------------------------------------------
  const publicSignals   = buildPublicSignals(data, website, news)
  const commercialHooks = buildCommercialHooks(data, website, news)
  const approachAngles  = buildApproachAngles(data, legal, news)
  const confidenceScore = computeConfidenceScore(cnpjResult, website, news, decisionMakers)

  const taxMaturitySignals: CompanyResearch["tax_maturity_signals"] = []
  if (data.idade_empresa && data.idade_empresa >= 15) {
    taxMaturitySignals.push({ signal: `${data.idade_empresa} anos — período retroativo próximo do máximo`, implication: "Quanto mais tempo sem revisão, mais crédito pode ter prescrito.", source: "Receita Federal" })
  }
  if (legal.has_tax_litigation) {
    taxMaturitySignals.push({ signal: "Histórico tributário litigioso identificado", implication: "Empresa com maturidade jurídica — abordagem técnica é preferida.", source: "Input manual" })
  }

  const missing: string[] = []
  if (!data.razao_social)                  missing.push("Razão social (CNPJ não retornou dados)")
  if (!data.qsa?.length)                   missing.push("Sócios/QSA — verificar no Receita Federal manualmente")
  if (!website.found)                      missing.push("Site oficial — informar URL manualmente")
  if (decisionMakers.missing_roles.length) missing.push(`Decisores: ${decisionMakers.missing_roles.join(", ")}`)

  const businessDesc = data.cnae_principal
    ? `Empresa atuante em ${data.cnae_principal.toLowerCase()}${data.municipio && data.uf ? `, sediada em ${data.municipio}/${data.uf}` : ""}.`
    : "Atividade principal não identificada."

  const opSummary = [
    data.razao_social,
    data.municipio && data.uf ? `${data.municipio}/${data.uf}` : null,
    data.idade_empresa ? `${data.idade_empresa} anos` : null,
    data.cnae_principal,
  ].filter(Boolean).join(" · ")

  const hypothesisLines: string[] = []
  if (website.found && website.extracted_signals.ecommerce) hypothesisLines.push("Operação de e-commerce provável")
  if (website.found && website.extracted_signals.exportation) hypothesisLines.push("Operação exportadora provável")

  return {
    cnpj:              cnpj.replace(/\D/g, ""),
    razao_social:      razao,
    nome_fantasia:     fantasia,
    data_source:       cnpjResult.debug.sources_succeeded.length > 0 ? "multi_source" : "fallback",
    confidence:        cnpjResult.confidence,
    cnpj_result:       cnpjResult,
    website,
    news,
    decision_makers:   decisionMakers,
    legal,
    business_description:    businessDesc,
    operational_summary:     opSummary,
    likely_business_model:   hypothesisLines.length > 0 ? `HIPÓTESE: ${hypothesisLines.join("; ")}.` : "Modelo de negócios a confirmar na ligação.",
    public_signals:          publicSignals,
    commercial_hooks:        commercialHooks,
    approach_angles:         approachAngles,
    tax_maturity_signals:    taxMaturitySignals,
    missing_information:     missing,
    recommended_questions:   buildValidationQuestions(data, website, legal),
    confidence_score:        confidenceScore,
    debug: {
      cnpj_sources_attempted:       cnpjResult.debug.sources_tried,
      company_name_used_for_search: razao,
      website_candidates_tried:     4,
      news_queries:                 [razao.split(" ").slice(0,3).join(" ")],
      failed_sources:               cnpjResult.attempts.filter(a => a.status === "failed").map(a => a.source),
      total_ms:                     Date.now() - t0,
    },
    enriched_at,
  }
}
