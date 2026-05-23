// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Company Intelligence Orchestrator
//
// Combines all enrichment sources into a single intelligence output.
// RULES:
// - fact vs hypothesis must always be explicit
// - low confidence = warning, not assertion
// - failed source = degrade gracefully, never break
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type {
  CompanyIntelligence, SourceResult, BrasilAPIData,
  WebsiteData, NewsData, CourtData, LinkedInData,
  PublicSignal, TaxMaturitySignal, ManualEnrichmentInput, ConfidenceLevel,
} from "./types"
import { fetchBrasilAPI, extractSignalsFromCNAE } from "./brasil-api"
import { enrichFromWebsite, enrichFromNews, enrichFromCourts, enrichFromLinkedIn } from "./sources"

// --------- Confidence aggregation ---------------------------------------------------------------------------------------------------------

function aggregateConfidence(sources: Array<{ confidence: ConfidenceLevel; status: string }>): ConfidenceLevel {
  const succeeded = sources.filter(s => s.status === "success")
  if (succeeded.length === 0) return "low"
  const highs = succeeded.filter(s => s.confidence === "high").length
  const meds  = succeeded.filter(s => s.confidence === "medium").length
  if (highs >= 2) return "high"
  if (highs >= 1 || meds >= 2) return "medium"
  return "low"
}

// --------- Operational summary (facts only) ---------------------------------------------------------------------------

function buildOperationalSummary(
  brasil:  Partial<BrasilAPIData>,
  website: WebsiteData,
  news:    NewsData,
): string {
  const parts: string[] = []

  if (brasil.razao_social) {
    const loc  = brasil.municipio && brasil.uf ? ` sediada em ${brasil.municipio}/${brasil.uf}` : ""
    const age  = brasil.idade_anos ? `, com ${brasil.idade_anos} anos de operação` : ""
    const cnae = brasil.cnae_fiscal_descricao ? `, CNAE principal: ${brasil.cnae_fiscal_descricao}` : ""
    parts.push(`${brasil.razao_social}${loc}${age}${cnae}.`)
  }

  if (website.found && website.description) {
    parts.push(`Apresentação pública: "${website.description.slice(0, 120)}".`)
  }

  if (news.items.length > 0) {
    const recent = news.items[0]
    parts.push(`Presença midiática recente: "${recent.title.slice(0, 100)}".`)
  }

  return parts.length > 0 ? parts.join(" ") : "Dados públicos insuficientes para resumo operacional."
}

// --------- Business model hypothesis (clearly labeled) ------------------------------------------

function buildBusinessModelHypothesis(
  brasil:  Partial<BrasilAPIData>,
  website: WebsiteData,
  cnaeSignals: string[],
): string {
  const hyps: string[] = []

  if (cnaeSignals.length > 0) {
    hyps.push(`Com base no CNAE (${brasil.cnae_fiscal_descricao ?? "não informado"}): ${cnaeSignals.join("; ")}.`)
  }

  if (website.found) {
    if (website.has_ecommerce) hyps.push("Há sinais de canal de vendas digital (e-commerce).")
    if (website.has_export)    hyps.push("Há sinais de operação com comércio exterior.")
    if (website.key_phrases.length > 0) {
      hyps.push(`Palavras-chave do site: ${website.key_phrases.slice(0, 3).join(", ")}.`)
    }
  }

  const prefix = "HIPÓTESE (sujeita a confirmação): "
  return hyps.length > 0
    ? prefix + hyps.join(" ")
    : prefix + "Modelo de negócios não pôde ser inferido com dados disponíveis."
}

// --------- Public signals ---------------------------------------------------------------------------------------------------------------------------------

function buildPublicSignals(
  brasil:  Partial<BrasilAPIData>,
  website: WebsiteData,
  news:    NewsData,
): PublicSignal[] {
  const signals: PublicSignal[] = []

  if (brasil.idade_anos && brasil.idade_anos >= 10) {
    signals.push({ signal: `${brasil.idade_anos} anos de operação — histórico retroativo expressivo`, type: "fact", source: "Receita Federal", confidence: "high", commercial_hook: "Quanto mais antiga a empresa, maior o período disponível para revisão." })
  }

  if (brasil.qsa && brasil.qsa.length > 0) {
    signals.push({ signal: `${brasil.qsa.length} sócio(s) identificado(s)`, type: "fact", source: "Receita Federal", confidence: "high" })
  }

  if (website.has_ecommerce) {
    signals.push({ signal: "Canal de vendas digital identificado (e-commerce)", type: "signal", source: "Site da Empresa", confidence: "medium", commercial_hook: "E-commerce gera operações interestaduais — DIFAL relevante." })
  }

  if (website.has_export) {
    signals.push({ signal: "Operação de comércio exterior sinalizada", type: "signal", source: "Site da Empresa", confidence: "medium", commercial_hook: "Exportação ativa é o gatilho para IPI Crédito Presumido (Lei 9.363/96)." })
  }

  for (const item of news.items.filter(i => i.sentiment === "positive").slice(0, 2)) {
    signals.push({ signal: `Notícia positiva: "${item.title.slice(0, 80)}"`, type: "signal", source: "Google News", confidence: "medium", commercial_hook: "Empresa em crescimento pode estar revisando estrutura tributária." })
  }

  return signals
}

// --------- Tax maturity signals ---------------------------------------------------------------------------------------------------------------

function buildTaxMaturitySignals(
  court:  CourtData,
  brasil: Partial<BrasilAPIData>,
): TaxMaturitySignal[] {
  const signals: TaxMaturitySignal[] = []

  if (court.has_tax_litigation) {
    signals.push({
      signal:      "Histórico de litígio tributário identificado",
      implication: "Empresa com maior maturidade jurídica — abordagem técnica é mais receptiva.",
      source:      "Tribunais (input manual)",
    })
  }

  for (const theme of court.recurring_themes) {
    signals.push({
      signal:      `Tema recorrente em litígios: ${theme}`,
      implication: `Empresa já discutiu ${theme} judicialmente — cuidado com abordagem sobre esse tema.`,
      source:      "Tribunais (input manual)",
    })
  }

  if (brasil.idade_anos && brasil.idade_anos >= 15) {
    signals.push({
      signal:      "Empresa com operação longa — provável histórico tributário acumulado",
      implication: "Maior probabilidade de revisões não realizadas em períodos anteriores.",
      source:      "Receita Federal",
    })
  }

  return signals
}

// --------- Commercial hooks ---------------------------------------------------------------------------------------------------------------------------

function buildCommercialHooks(
  brasil:   Partial<BrasilAPIData>,
  website:  WebsiteData,
  news:     NewsData,
  signals:  PublicSignal[],
): string[] {
  const hooks: string[] = []

  // From age
  if (brasil.idade_anos && brasil.idade_anos >= 10) {
    hooks.push(`"${brasil.razao_social} tem ${brasil.idade_anos} anos de operação — isso cria um período retroativo relevante para revisão tributária estratégica."`)
  }

  // From CNAE
  if (brasil.cnae_fiscal_descricao) {
    hooks.push(`"Identificamos que ${brasil.nome_fantasia ?? brasil.razao_social} atua em ${brasil.cnae_fiscal_descricao?.toLowerCase()} — temos trabalhado com empresas do mesmo perfil em revisões específicas para esse setor."`)
  }

  // From website signals
  if (website.has_export) {
    hooks.push(`"Percebemos que ${brasil.nome_fantasia ?? brasil.razao_social} tem operação com comércio exterior — e há um crédito de IPI com alíquota fixada em lei (5,37%) que muitas empresas do mesmo perfil não aproveitam sistematicamente."`)
  }

  if (website.has_ecommerce) {
    hooks.push(`"Com a operação de e-commerce identificada em ${brasil.nome_fantasia ?? brasil.razao_social}, há implicações tributárias interestaduais (DIFAL) que raramente são revisadas."`)
  }

  // From news
  for (const item of news.items.filter(i => i.tags.includes("expansão")).slice(0, 1)) {
    hooks.push(`"Vi que ${brasil.nome_fantasia ?? brasil.razao_social} está em expansão — empresas nesse momento costumam ter mais oportunidade para estruturar o planejamento tributário prospectivamente."`)
  }

  // Fallback
  if (hooks.length === 0) {
    hooks.push(`"Analisamos o perfil público de ${brasil.razao_social} e identificamos alguns comportamentos fiscais específicos do setor que merecem atenção."`)
  }

  return hooks.slice(0, 4)
}

// --------- Validation questions ---------------------------------------------------------------------------------------------------------------

function buildValidationQuestions(
  brasil:  Partial<BrasilAPIData>,
  website: WebsiteData,
  news:    NewsData,
  court:   CourtData,
): string[] {
  const questions: string[] = [
    "Confirmar o regime tributário atual (LR/LP/SN)?",
    "Qual o faturamento mensal aproximado?",
    "Há revisão tributária estratégica realizada nos últimos 3 anos?",
  ]

  if (!brasil.qsa || brasil.qsa.length === 0) {
    questions.push("Quem são os sócios/administradores responsáveis pela área financeira?")
  }

  if (website.has_export) {
    questions.push("Qual o percentual do faturamento destinado à exportação?")
  }

  if (website.has_ecommerce) {
    questions.push("Qual o volume de vendas online e para quais estados?")
  }

  if (court.has_tax_litigation) {
    questions.push("Há escritório jurídico tributário de referência? Quais temas já foram discutidos?")
  }

  if (brasil.idade_anos && brasil.idade_anos >= 10) {
    questions.push(`Com ${brasil.idade_anos} anos, houve alguma revisão previdenciária histórica?`)
  }

  return questions.slice(0, 8)
}

// --------- Likely operations ------------------------------------------------------------------------------------------------------------------------

function buildLikelyOperations(
  brasil:  Partial<BrasilAPIData>,
  website: WebsiteData,
  cnaeSignals: string[],
): string[] {
  const ops = [...cnaeSignals]

  if (website.has_ecommerce)    ops.push("E-commerce / venda digital")
  if (website.has_export)       ops.push("Comércio exterior (exportação/importação)")
  if (website.has_esg)          ops.push("Programa de sustentabilidade / ESG")
  if (website.certifications.length > 0) ops.push(`Certificações: ${website.certifications.join(", ")}`)

  if (brasil.cnaes_secundarios && brasil.cnaes_secundarios.length > 0) {
    const secondary = brasil.cnaes_secundarios.slice(0, 2).map(c => c.descricao)
    ops.push(...secondary.map(d => `Atividade secundária: ${d}`))
  }

  return [...new Set(ops)].slice(0, 6)
}

// --------- Main orchestrator ------------------------------------------------------------------------------------------------------------------------

export interface EnrichmentOptions {
  fetch_website?: boolean
  fetch_news?:    boolean
  manual_input?:  ManualEnrichmentInput
  court_snippet?:   string
}

export async function enrichCompany(
  cnpj:    string,
  razao_social_hint: string = "",
  options: EnrichmentOptions = {},
): Promise<CompanyIntelligence> {
  const { fetch_website = true, fetch_news = true, manual_input, court_snippet } = options

  // Run all sources in parallel --- none can break the pipeline
  const [brasilResult, websiteResult, newsResult, courtResult, linkedinResult] = await Promise.allSettled([
    fetchBrasilAPI(cnpj),
    fetch_website
      ? enrichFromWebsite(razao_social_hint, cnpj, manual_input?.website_url)
      : Promise.resolve({ source: "Site", status: "skipped" as const, confidence: "low" as const, data: { found: false, url: null, title: null, description: null, products_services: [], segments_served: [], has_ecommerce: false, has_export: false, has_esg: false, certifications: [], locations: [], about_summary: null, key_phrases: [] }, findings: [], warnings: [], fetched_at: new Date().toISOString() }),
    fetch_news
      ? enrichFromNews(razao_social_hint || cnpj, cnpj)
      : Promise.resolve({ source: "Notícias", status: "skipped" as const, confidence: "low" as const, data: { items: [], top_signals: [], growth_signals: false, risk_signals: false }, findings: [], warnings: [], fetched_at: new Date().toISOString() }),
    enrichFromCourts(cnpj, court_snippet),
    enrichFromLinkedIn(razao_social_hint || cnpj, manual_input),
  ])

  // Extract results safely
  const brasil  = (brasilResult.status   === "fulfilled" ? brasilResult.value   : { status: "failed" as const, confidence: "low" as const, data: {}, findings: [], warnings: [], source: "BrasilAPI", fetched_at: new Date().toISOString() }) as SourceResult<Partial<BrasilAPIData>>
  const website = (websiteResult.status  === "fulfilled" ? websiteResult.value  : { status: "failed" as const, confidence: "low" as const, data: { found: false } as unknown as WebsiteData, findings: [], warnings: [], source: "Site", fetched_at: new Date().toISOString() }) as SourceResult<WebsiteData>
  const news    = (newsResult.status     === "fulfilled" ? newsResult.value     : { status: "failed" as const, confidence: "low" as const, data: { items: [], top_signals: [], growth_signals: false, risk_signals: false }, findings: [], warnings: [], source: "Notícias", fetched_at: new Date().toISOString() }) as SourceResult<NewsData>
  const court   = (courtResult.status    === "fulfilled" ? courtResult.value    : { status: "failed" as const, confidence: "low" as const, data: { cases: [], has_tax_litigation: false, recurring_themes: [], known_lawyers: [], maturity_level: "none" as const }, findings: [], warnings: [], source: "Tribunais", fetched_at: new Date().toISOString() }) as SourceResult<CourtData>
  const linkedin = (linkedinResult.status=== "fulfilled" ? linkedinResult.value : { status: "failed" as const, confidence: "low" as const, data: { decision_makers: [] }, findings: [], warnings: [], source: "LinkedIn", fetched_at: new Date().toISOString() }) as SourceResult<LinkedInData>

  const brasilData  = brasil.data  as Partial<BrasilAPIData>
  const websiteData = website.data as WebsiteData
  const newsData    = news.data    as NewsData
  const courtData   = court.data   as CourtData
  const linkedinData = linkedin.data as LinkedInData

  // Enrich razao_social from Brasil API if we only had a hint
  const razao_social = brasilData.razao_social ?? razao_social_hint

  const cnaeSignals   = extractSignalsFromCNAE(brasilData.cnae_fiscal ?? "", brasilData.cnae_fiscal_descricao ?? "")
  const publicSignals = buildPublicSignals(brasilData, websiteData, newsData)
  const taxSignals    = buildTaxMaturitySignals(courtData, brasilData)

  const allSources = [brasil, website, news, court, linkedin].map(s => ({
    source:     s.source,
    status:     s.status,
    confidence: s.confidence,
  }))

  const decisionMakers = [
    ...(brasilData.qsa ?? []).map(q => ({
      name:       q.nome,
      title:      q.qual || "Sócio/Administrador",
      confidence: "high" as const,
      source:     "receita_federal" as const,
      is_target:  true,
    })),
    ...linkedinData.decision_makers,
  ]

  return {
    cnpj:                         cnpj.replace(/\D/g, ""),
    company_identity:             brasilData,
    operational_summary:          buildOperationalSummary(brasilData, websiteData, newsData),
    business_model_hypothesis:    buildBusinessModelHypothesis(brasilData, websiteData, cnaeSignals),
    decision_makers:              decisionMakers,
    public_signals:               publicSignals,
    legal_signals:                taxSignals,
    tax_maturity_signals:         taxSignals,
    likely_operations:            buildLikelyOperations(brasilData, websiteData, cnaeSignals),
    commercial_hooks:             buildCommercialHooks(brasilData, websiteData, newsData, publicSignals),
    risks_and_unknowns:           [
      ...(brasil.warnings ?? []),
      ...(website.warnings ?? []),
      ...(news.warnings ?? []),
      ...(court.warnings ?? []),
      ...(linkedin.warnings ?? []),
    ].filter(Boolean).slice(0, 6),
    recommended_validation_questions: buildValidationQuestions(brasilData, websiteData, newsData, courtData),
    enrichment_sources:           allSources,
    enrichment_confidence:        aggregateConfidence(allSources),
    enriched_at:                  new Date().toISOString(),
  }
}
