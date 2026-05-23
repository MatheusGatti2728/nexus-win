// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Evidence-First Signal Engine v19
//
// PRINCIPLE: The system only asserts what it can prove.
// Fact --- confirmed evidence from objective source
// Hypothesis --- reasonable inference, not confirmed
// Validation question --- insufficient evidence, ask instead
//
// CRITICAL RULE: Export is NEVER asserted without explicit evidence.
// A generic industry CNAE does NOT imply export.
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// --------- Evidence classification ------------------------------------------------------------------------------------------------------

export type EvidenceClassification = "fact" | "hypothesis" | "validation_question"
export type SignalConfidence       = "high" | "medium" | "low"
export type WebsiteValidity        = "confirmed" | "partial" | "invalid" | "not_found"

// --------- Website validator ------------------------------------------------------------------------------------------------------------------------
// A website must PROVE it belongs to the company before
// its content can generate operational signals.

export interface WebsiteValidationResult {
  validity:       WebsiteValidity
  confidence:     SignalConfidence
  match_score:    number      // 0-10, needs ≥ 4 for "confirmed", ≥ 2 for "partial"
  match_reasons:  string[]    // what matched
  reject_reasons: string[]    // what didn't match or disqualified it
  can_generate_facts:    boolean   // confirmed only
  can_generate_hypotheses: boolean // confirmed or partial
  max_score_impact: number         // max score points this site can contribute
}

const INVALID_SITE_PATTERNS = [
  /facebook\.com\/pages/i,
  /linkedin\.com\/company/i,
  /reclameaqui\.com\.br/i,
  /cnpj\.info/i,
  /cnpja\.com/i,
  /empresaqui\.com/i,
  /econodata\.com\.br/i,
  /guiainvest\.com/i,
  /infocnpj\.com/i,
  /123provedores\.com/i,
  /portaldatransparencia/i,
  /receita\.fazenda/i,
  /jusbrasil\.com\.br/i,
  /escavador\.com/i,
  /tudo\.com\.br/i,
  /listadefirmas\.com/i,
  /agenciaclick\.com\.br/i,
]

export function validateOfficialWebsite(
  url:          string | null | undefined,
  htmlContent:  string,
  cnpjData: {
    razao_social?:  string
    nome_fantasia?: string
    cnpj?:          string
    municipio?:     string
    uf?:            string
  },
  entity_names: string[],   // canonical_name + aliases from entity-normalizer
): WebsiteValidationResult {
  const notFound: WebsiteValidationResult = {
    validity:"not_found", confidence:"low", match_score:0, match_reasons:[], reject_reasons:["Site não encontrado"],
    can_generate_facts:false, can_generate_hypotheses:false, max_score_impact:0,
  }

  if (!url || !htmlContent || htmlContent.length < 20) return notFound

  // Check for known aggregators/directories
  if (INVALID_SITE_PATTERNS.some(p => p.test(url))) {
    return {
      validity:"invalid", confidence:"low", match_score:0, match_reasons:[],
      reject_reasons:[`URL é agregador/diretório: ${url}`],
      can_generate_facts:false, can_generate_hypotheses:false, max_score_impact:0,
    }
  }

  const content   = htmlContent.toLowerCase()
  const htmlLower = htmlContent.toLowerCase()
  let score = 0
  const matchReasons:  string[] = []
  const rejectReasons: string[] = []

  // Score: CNPJ in page (strongest signal)
  const cnpjRaw = cnpjData.cnpj?.replace(/\D/g, "") ?? ""
  if (cnpjRaw.length === 14 && htmlContent.includes(cnpjRaw.substring(0, 8))) {
    score += 4; matchReasons.push("CNPJ encontrado na página")
  }

  // Score: company name matches
  const razao = cnpjData.razao_social?.toLowerCase() ?? ""
  const fantasia = cnpjData.nome_fantasia?.toLowerCase() ?? ""

  for (const alias of entity_names) {
    const aliasLow = alias.toLowerCase().replace(/[^a-záéíóúàâêôãõçüñ\s]/gi, "")
    if (aliasLow.length >= 4 && content.includes(aliasLow)) {
      score += 3; matchReasons.push(`Nome "${alias}" encontrado no conteúdo`); break
    }
  }

  // Score: city/UF match
  const municipio = cnpjData.municipio?.toLowerCase() ?? ""
  const uf        = cnpjData.uf?.toLowerCase() ?? ""
  if (municipio && municipio.length > 3 && content.includes(municipio)) {
    score += 1; matchReasons.push(`Município "${cnpjData.municipio}" encontrado`)
  }
  if (uf && content.includes(` ${uf} `) || content.includes(`/${uf}`)) {
    score += 1; matchReasons.push(`UF "${cnpjData.uf}" encontrada`)
  }

  // Score: title/meta has company reference
  const title = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.toLowerCase() ?? ""
  for (const alias of entity_names) {
    if (alias.length >= 4 && title.includes(alias.toLowerCase())) {
      score += 2; matchReasons.push(`Nome da empresa no título: "${title.slice(0,60)}"`); break
    }
  }

  // Deduct: generic site content
  const genericCount = [
    /diretório de empresas/i, /consulta cnpj/i, /dados da empresa/i,
    /razão social:/i, /situação cadastral:/i, /atividade principal:/i,
    /receita federal/i,
  ].filter(p => p.test(htmlContent)).length
  if (genericCount >= 2) {
    score -= 3; rejectReasons.push("Conteúdo típico de agregador de dados cadastrais")
  }

  // Classify
  const validity: WebsiteValidity =
    score >= 4 ? "confirmed"
    : score >= 2 ? "partial"
    : score >= 0 && matchReasons.length > 0 ? "partial"
    : "invalid"

  return {
    validity,
    confidence: score >= 4 ? "high" : score >= 2 ? "medium" : "low",
    match_score: score,
    match_reasons: matchReasons,
    reject_reasons: rejectReasons,
    can_generate_facts:      validity === "confirmed",
    can_generate_hypotheses: validity === "confirmed" || validity === "partial",
    max_score_impact: validity === "confirmed" ? 3 : validity === "partial" ? 1 : 0,
  }
}

// --------- Export evidence classifier ---------------------------------------------------------------------------------------------
// CRITICAL: Export is only "confirmed" when there is explicit textual evidence.
// Being an industrial company does NOT imply export.

const EXPORT_CONFIRMED_PATTERNS = [
  /exporta[çc][aã]o/i, /exportamos/i, /exportadora/i,
  /mercado externo/i, /presença internacional/i,
  /\bexport\b/i, /\bglobal market/i, /\binternational market/i,
  /\btrading\b/i, /internacionaliza[çc][aã]o/i,
  /atua.*exterior/i, /vend.*exterior/i, /cliente.*exterior/i,
  /operac[aã]o internacional/i,
]

const EXPORT_POSSIBLE_PATTERNS = [
  /\binternacional\b/i, /worldwide/i, /\bglobal\b/i,
  /certificac[aã]o.*export/i, /drawback/i,
]

export type ExportClassification = "confirmed_export" | "possible_export" | "no_export_evidence"

export interface ExportSignal {
  classification:  ExportClassification
  evidence:        string | null
  source:          string
  confidence:      SignalConfidence
  can_activate_ipi_module: boolean
  display_as:      EvidenceClassification
  recommended_question: string
}

export function classifyExport(params: {
  cnae_descricao?:     string
  website_html?:       string
  website_validity:    WebsiteValidity
  news_titles?:        string[]
  consultant_flags?:   string[]   // flags like "exportacao"
}): ExportSignal {
  const { cnae_descricao = "", website_html = "", website_validity, news_titles = [], consultant_flags = [] } = params
  const combinedText = `${cnae_descricao} ${website_html} ${news_titles.join(" ")}`

  // Consultant explicitly flagged export --- treat as hypothesis (not fact --- consultant could be wrong)
  if (consultant_flags.includes("exportacao")) {
    return {
      classification:  "possible_export",
      evidence:        "Sinalizado pelo consultor como flag de operação",
      source:          "Input do consultor",
      confidence:      "medium",
      can_activate_ipi_module: true,
      display_as:      "hypothesis",
      recommended_question: "Vocês exportam diretamente ou via trading company? Qual o percentual do faturamento?",
    }
  }

  // CNAE explicitly mentions export/import
  if (/exporta[çc][aã]o|importa[çc][aã]o|comércio exterior/i.test(cnae_descricao)) {
    return {
      classification:  "confirmed_export",
      evidence:        `CNAE: "${cnae_descricao}"`,
      source:          "Receita Federal",
      confidence:      "high",
      can_activate_ipi_module: true,
      display_as:      "fact",
      recommended_question: "Vocês exportam diretamente ou via trading company?",
    }
  }

  // Confirmed pattern in validated website or news
  const confirmedMatch = EXPORT_CONFIRMED_PATTERNS.find(p => p.test(combinedText))
  if (confirmedMatch && (website_validity === "confirmed" || news_titles.some(t => confirmedMatch.test(t)))) {
    const source = news_titles.some(t => confirmedMatch.test(t)) ? "Google News" : "Site institucional validado"
    return {
      classification:  "confirmed_export",
      evidence:        `Menção explícita de exportação encontrada em ${source}`,
      source,
      confidence:      "medium",
      can_activate_ipi_module: true,
      display_as:      "fact",
      recommended_question: "Qual o percentual do faturamento destinado à exportação nos últimos 5 anos?",
    }
  }

  // Partial site with possible signal --- only hypothesis
  const possibleMatch = EXPORT_POSSIBLE_PATTERNS.find(p => p.test(combinedText))
  if (possibleMatch && website_validity === "partial") {
    return {
      classification:  "possible_export",
      evidence:        "Termo genérico encontrado em fonte parcial — não confirmado",
      source:          "Site (validação parcial)",
      confidence:      "low",
      can_activate_ipi_module: false,
      display_as:      "hypothesis",
      recommended_question: "A empresa tem alguma operação com mercado externo ou exportação?",
    }
  }

  // No evidence
  return {
    classification:  "no_export_evidence",
    evidence:        null,
    source:          "Nenhuma fonte identificou exportação",
    confidence:      "low",
    can_activate_ipi_module: false,
    display_as:      "validation_question",
    recommended_question: "A empresa tem operação com mercado externo ou exportação?",
  }
}

// --------- Evidence-first signal builder ---------------------------------------------------------------------------------
// All signals are now typed as fact | hypothesis | validation_question

export interface EvidenceSignal {
  title:              string
  classification:     EvidenceClassification
  evidence:           string
  source:             string
  confidence:         SignalConfidence
  tax_impact:         string
  commercial_impact:  string
  related_modules:    string[]
  recommended_question: string
}

export function buildEvidenceSignals(params: {
  cnpjData: {
    cnae_principal?: string
    cnae_codigo?:    string
    municipio?:      string
    uf?:             string
    qsa?:            unknown[]
  }
  websiteValidation: WebsiteValidationResult
  websiteSignals: {
    ecommerce?:    boolean
    exportation?:  boolean
    esg?:          boolean
    logistics?:    boolean
    b2b?:          boolean
    certifications?: string[]
  }
  exportClassification: ExportSignal
  newsItems:   Array<{ title: string; tags?: string[] }>
  consultantFlags: string[]
  segment: string
}): EvidenceSignal[] {
  const { cnpjData, websiteValidation, websiteSignals, exportClassification, newsItems, consultantFlags, segment } = params
  const signals: EvidenceSignal[] = []
  const cnae = cnpjData.cnae_principal ?? ""
  const cnaeLow = cnae.toLowerCase()
  const wv = websiteValidation

  // ------ From CNAE (Receita Federal --- always a fact) ------------------------------------------
  if (/fabricação|manufatura|industrial/i.test(cnaeLow)) {
    signals.push({
      title:              "Operação industrial",
      classification:     "fact",
      evidence:           `CNAE: "${cnae}" (Receita Federal)`,
      source:             "Receita Federal",
      confidence:         "high",
      tax_impact:         "Créditos de insumos PIS/COFINS (REsp 1.221.170) + IPI sobre saídas",
      commercial_impact:  "Empresas industriais têm créditos de insumos não revisados — especialmente após 2018",
      related_modules:    ["revisao_insumos_pis_cofins", "sistema_s", "verbas_indenizatorias"],
      recommended_question: "Como está estruturada a relação com fornecedores — há compras de atacadistas não contribuintes de IPI?",
    })
  }

  if (/comércio|varejo/i.test(cnaeLow)) {
    signals.push({
      title:              "Operação varejista",
      classification:     "fact",
      evidence:           `CNAE: "${cnae}" (Receita Federal)`,
      source:             "Receita Federal",
      confidence:         "high",
      tax_impact:         "ICMS-ST nas compras (Tema 1.125 STJ) + taxas de cartão (Temas 779/780)",
      commercial_impact:  "Varejistas têm dois pontos técnicos recentes: ICMS-ST e taxa de cartão",
      related_modules:    ["icms_st_pis_cofins", "icms_iss_acao_coletiva"],
      recommended_question: "Qual o percentual de compras com ICMS-ST embutido? Qual o percentual de vendas em cartão?",
    })
  }

  if (/distribui|atacad/i.test(cnaeLow)) {
    signals.push({
      title:              "Distribuição/Atacado",
      classification:     "fact",
      evidence:           `CNAE: "${cnae}" (Receita Federal)`,
      source:             "Receita Federal",
      confidence:         "high",
      tax_impact:         "ICMS interestadual + ICMS-ST nas transferências + base PIS/COFINS",
      commercial_impact:  "Distribuidores têm exposição alta em ICMS-ST e operações interestaduais",
      related_modules:    ["icms_st_pis_cofins", "icms_iss_acao_coletiva"],
      recommended_question: "Qual o volume de operações interestaduais?",
    })
  }

  if (/serviços|tecnologia|consultoria/i.test(cnaeLow)) {
    signals.push({
      title:              "Prestação de serviços",
      classification:     "fact",
      evidence:           `CNAE: "${cnae}" (Receita Federal)`,
      source:             "Receita Federal",
      confidence:         "high",
      tax_impact:         "ISS (base PIS/COFINS — extensão Tema 69) + encargos sobre folha",
      commercial_impact:  "Empresas de serviços com folha relevante têm verbas indenizatórias e Sistema S",
      related_modules:    ["verbas_indenizatorias", "sistema_s", "icms_iss_acao_coletiva"],
      recommended_question: "Qual o porte da folha mensal e há encargos sobre subcontratados?",
    })
  }

  // ------ Export signal (EVIDENCE-FIRST) ---------------------------------------------------------------------------------
  if (exportClassification.classification !== "no_export_evidence") {
    signals.push({
      title:              exportClassification.classification === "confirmed_export" ? "Exportação identificada" : "Possível exportação — a confirmar",
      classification:     exportClassification.display_as,
      evidence:           exportClassification.evidence ?? "Nenhuma evidência direta encontrada",
      source:             exportClassification.source,
      confidence:         exportClassification.confidence,
      tax_impact:         exportClassification.can_activate_ipi_module
        ? "IPI Crédito Presumido Exportação (5,37% — Lei 9.363/96) + créditos acumulados PIS/COFINS"
        : "A confirmar — não ativar módulo sem validação",
      commercial_impact:  exportClassification.classification === "confirmed_export"
        ? "Exportação confirmada — crédito presumido de IPI é o ponto mais direto"
        : "Hipótese — confirmar na ligação antes de mencionar",
      related_modules:    exportClassification.can_activate_ipi_module ? ["ipi_credito_presumido_exportacao"] : [],
      recommended_question: exportClassification.recommended_question,
    })
  }

  // ------ E-commerce --- ONLY from validated website ---------------------------------------------------
  if (websiteSignals.ecommerce && wv.can_generate_facts) {
    signals.push({
      title:              "E-commerce identificado",
      classification:     "fact",
      evidence:           `Canal digital encontrado em ${wv.match_reasons[0] ?? "site validado"}`,
      source:             "Site institucional validado",
      confidence:         "medium",
      tax_impact:         "DIFAL nas operações interestaduais + base PIS/COFINS interestadual",
      commercial_impact:  "E-commerce com operação nacional tem ponto específico sobre DIFAL",
      related_modules:    ["difal_pis_cofins"],
      recommended_question: "Qual a distribuição de vendas por estado e qual o volume interestadual?",
    })
  } else if (websiteSignals.ecommerce && wv.can_generate_hypotheses) {
    signals.push({
      title:              "Possível e-commerce — a confirmar",
      classification:     "hypothesis",
      evidence:           "Sinal de loja virtual em site com validação parcial",
      source:             "Site (validação parcial)",
      confidence:         "low",
      tax_impact:         "A confirmar — possível DIFAL se operação interestadual relevante",
      commercial_impact:  "Confirmar na ligação se há canal digital e volume interestadual",
      related_modules:    [],
      recommended_question: "A empresa tem canal de venda online? Para quais estados?",
    })
  }

  // ------ ESG --- only from validated sites ------------------------------------------------------------------------------
  if (websiteSignals.esg && wv.can_generate_hypotheses) {
    signals.push({
      title:              "Presença de ESG identificada",
      classification:     wv.can_generate_facts ? "fact" : "hypothesis",
      evidence:           "Programa de sustentabilidade mencionado no site",
      source:             `Site institucional (${wv.validity})`,
      confidence:         "low",
      tax_impact:         "Perfil receptivo a compliance tributário e governança fiscal",
      commercial_impact:  "ESG indica abertura para análise tributária dentro da legalidade",
      related_modules:    [],
      recommended_question: "Como está estruturada a governança tributária da empresa?",
    })
  }

  // ------ From news (expansion, M&A, investment) ------------------------------------------------------------
  for (const item of newsItems.slice(0, 5)) {
    const lc = item.title.toLowerCase()
    if (/expan|nova unidade|inaugur|nova loja/i.test(lc)) {
      signals.push({
        title:              "Expansão detectada em notícia",
        classification:     "fact",
        evidence:           `"${item.title.slice(0, 80)}"`,
        source:             "Google News",
        confidence:         "medium",
        tax_impact:         "Expansão de folha → encargos crescentes → maior impacto retroativo",
        commercial_impact:  "Empresa em expansão é o momento ideal — complexidade tributária cresce antes do controle",
        related_modules:    ["sistema_s", "verbas_indenizatorias"],
        recommended_question: "Com a expansão, a estrutura de encargos previdenciários foi revisada?",
      })
      break
    }
  }

  // ------ Consultant flags (treated as hypotheses, not facts) ---------------------
  if (consultantFlags.includes("venda_cartao") && !signals.some(s => s.related_modules.includes("icms_iss_acao_coletiva"))) {
    signals.push({
      title:              "Alto volume de vendas em cartão — informado",
      classification:     "hypothesis",
      evidence:           "Flag informada pelo consultor: venda_cartao",
      source:             "Input do consultor",
      confidence:         "medium",
      tax_impact:         "Taxa de operadora (MDR) pode ser excluída da base PIS/COFINS — Temas 779/780",
      commercial_impact:  "Confirmar percentual de vendas em cartão para dimensionar o ponto",
      related_modules:    ["icms_st_pis_cofins"],
      recommended_question: "Qual o percentual aproximado das vendas realizadas via cartão hoje?",
    })
  }

  if (consultantFlags.includes("folha_relevante")) {
    signals.push({
      title:              "Folha de pagamento relevante — informada",
      classification:     "hypothesis",
      evidence:           "Flag informada pelo consultor: folha_relevante",
      source:             "Input do consultor",
      confidence:         "medium",
      tax_impact:         "Sistema S (Tema 1.079 STJ) + Verbas Indenizatórias (Tema 20 STJ)",
      commercial_impact:  "Empresas com folha acima de R$ 100k/mês têm período retroativo relevante em encargos",
      related_modules:    ["sistema_s", "verbas_indenizatorias"],
      recommended_question: "Qual o porte aproximado da folha mensal e há quanto tempo a empresa opera nesse volume?",
    })
  }

  return signals
}
