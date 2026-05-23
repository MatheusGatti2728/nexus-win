// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Company Profile Engine v2
//
// Builds REAL operational intelligence from CNPJ + site + news.
// Every output is contextual, specific, never generic.
//
// RULE: Never say "empresa com maturidade tribut--ria m--dia."
// DO: "Empresa atua na fabrica----o de embalagens industriais com
//     opera----o B2B e sinais de industrializa----o pr--pria."
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { Segment, TaxRegime } from "../engine/tax-matrix"
import { validateOfficialWebsite, classifyExport, buildEvidenceSignals, type EvidenceSignal, type WebsiteValidationResult } from "./evidence-engine"
import { SEGMENT_LABELS, REGIME_LABELS } from "../engine/tax-matrix"

export type TaxMaturity    = "none" | "low" | "medium" | "high"
export type CommercialTemp = "fria" | "morna" | "quente" | "muito_quente"
export type OpComplexity   = "baixa" | "media" | "alta" | "muito_alta"

// --------- CNAE to operational intelligence ---------------------------------------------------------------------

interface CNAEProfile {
  sector:           string
  activity:         string
  business_model:   string
  revenue_model:    string
  typical_ops:      string[]
  tax_signals:      string[]
  key_ops:          string[]
}

const CNAE_PROFILES: Array<{ pattern: RegExp; profile: CNAEProfile }> = [
  {
    pattern: /embala|plástic/i,
    profile: {
      sector:         "Indústria de embalagens",
      activity:       "fabricação de embalagens industriais ou comerciais",
      business_model: "B2B com venda direta a indústrias e distribuidores",
      revenue_model:  "venda de embalagens para indústrias, atacado e grandes redes",
      typical_ops:    ["fabricação própria", "cadeia de insumos (resinas, tintas, adesivos)", "operação interestadual", "logística de saída"],
      tax_signals:    ["créditos de insumos PIS/COFINS (REsp 1.221.170)", "IPI sobre saídas", "ICMS interestadual", "possível exportação"],
      key_ops:        ["industrialização", "distribuição regional ou nacional", "B2B"],
    },
  },
  {
    pattern: /supermercado|hipermercado|varejo.*alimento|alimentar.*varejo/i,
    profile: {
      sector:         "Varejo alimentar",
      activity:       "comércio varejista de alimentos e produtos de consumo",
      business_model: "varejo B2C com múltiplos fornecedores e cadeia monofásica",
      revenue_model:  "venda direta ao consumidor final com alta rotatividade de estoque",
      typical_ops:    ["compras com ICMS-ST embutido", "alto volume de cartões", "cadeia monofásica de bebidas e cigarros", "operação regional ou multiunidade"],
      tax_signals:    ["ICMS-ST na base PIS/COFINS (Tema 1.125)", "exclusão do ICMS base PIS/COFINS (Tema 69)", "taxas de maquininha", "sistema S sobre folha"],
      key_ops:        ["varejo físico", "abastecimento diário", "folha relevante"],
    },
  },
  {
    pattern: /distribui|atacad/i,
    profile: {
      sector:         "Distribuição e atacado",
      activity:       "distribuição atacadista de produtos para o varejo e foodservice",
      business_model: "B2B com cadeia logística própria e alto volume de movimentação",
      revenue_model:  "margem sobre volume com operação interestadual relevante",
      typical_ops:    ["operação interestadual", "frota logística", "múltiplos CNAEs de produto", "cadeia monofásica"],
      tax_signals:    ["ICMS-ST embutido nas compras e nas vendas", "ICMS interestadual", "PIS/COFINS sobre distribuição", "créditos logísticos"],
      key_ops:        ["distribuição regional", "B2B", "alta movimentação de estoque"],
    },
  },
  {
    pattern: /constru|obras|engenharia/i,
    profile: {
      sector:         "Construção civil e engenharia",
      activity:       "execução de obras e prestação de serviços de engenharia",
      business_model: "contratação por projeto com subcontratação de mão de obra",
      revenue_model:  "contratos de obra com materiais e serviços incluídos",
      typical_ops:    ["folha relevante com subempreiteiros", "ISS sobre serviços", "compra de materiais com IPI e ICMS", "operação multiestado"],
      tax_signals:    ["ISS sobre serviços (base PIS/COFINS)", "créditos sobre materiais de construção", "INSS sobre folha e subcontratados", "sistema S"],
      key_ops:        ["obras físicas", "gestão de subempreiteiros", "folha intensiva"],
    },
  },
  {
    pattern: /farmacêut|medicamento|farmácia|drogaria/i,
    profile: {
      sector:         "Farmacêutico e drogarias",
      activity:       "comércio ou fabricação de produtos farmacêuticos",
      business_model: "cadeia altamente regulada com monofasia em medicamentos",
      revenue_model:  "venda de produtos com tributação monofásica de PIS/COFINS",
      typical_ops:    ["cadeia monofásica de medicamentos", "operação fracionada por unidade", "substituição tributária", "importação em alguns casos"],
      tax_signals:    ["PIS/COFINS monofásico sobre medicamentos", "ICMS-ST na compra", "créditos de insumos na produção (indústria)", "isenções e reduções de base"],
      key_ops:        ["comércio regulado", "cadeia monofásica", "alto volume transacional"],
    },
  },
  {
    pattern: /tecnologia|software|ti |t\.i\.|informátic/i,
    profile: {
      sector:         "Tecnologia e software",
      activity:       "desenvolvimento de software e prestação de serviços de TI",
      business_model: "SaaS, projetos ou serviços gerenciados B2B",
      revenue_model:  "receita recorrente (ARR/MRR) ou projetos com alto valor por cliente",
      typical_ops:    ["folha intensiva (desenvolvedores)", "baixo imobilizado", "ISS municipal", "operação nacional com sede única"],
      tax_signals:    ["ISS (base PIS/COFINS — Tema 69 extensão)", "encargos sobre folha intensiva", "INSS e sistema S", "PIS/COFINS sobre receita bruta"],
      key_ops:        ["serviços intelectuais", "equipe técnica", "crescimento rápido de headcount"],
    },
  },
  {
    pattern: /transpor|logísti|frete|carga/i,
    profile: {
      sector:         "Transporte e logística",
      activity:       "transporte de cargas e prestação de serviços logísticos",
      business_model: "B2B com contratos de frete e operação interestadual",
      revenue_model:  "receita por volume de carga e contratos de transporte",
      typical_ops:    ["frota própria ou terceirizada", "ICMS sobre frete interestadual", "diesel e manutenção como insumos", "operação 24h com folha relevante"],
      tax_signals:    ["ICMS sobre frete (base PIS/COFINS)", "créditos sobre combustível e manutenção", "INSS sobre folha operacional", "sistema S"],
      key_ops:        ["operação interestadual", "frota pesada", "folha operacional"],
    },
  },
  {
    pattern: /alimento|bebida|frigor|abatedouro/i,
    profile: {
      sector:         "Alimentos e bebidas",
      activity:       "industrialização ou distribuição de alimentos e bebidas",
      business_model: "indústria com venda para varejo, food service ou exportação",
      revenue_model:  "venda de produtos alimentícios com cadeia de insumos agrícolas",
      typical_ops:    ["cadeia monofásica em alguns produtos", "exportação em alguns casos", "insumos agrícolas com imunidade/isenção", "grande folha operacional"],
      tax_signals:    ["PIS/COFINS monofásico ou não-cumulativo", "créditos sobre insumos agrícolas", "IPI em bebidas", "ICMS interestadual", "exportação (crédito IPI)"],
      key_ops:        ["industrialização de alimentos", "cadeia logística fria", "alta dependência de matéria-prima"],
    },
  },
]

function getCNAEProfile(cnae_descricao: string): CNAEProfile | null {
  for (const entry of CNAE_PROFILES) {
    if (entry.pattern.test(cnae_descricao)) return entry.profile
  }
  return null
}

// --------- Operational signal types ---------------------------------------------------------------------------------------------------
// In v19, signals are Evidence-first: fact | hypothesis | validation_question
export type { EvidenceSignal as OperationalSignal } from "./evidence-engine"
export type { WebsiteValidationResult } from "./evidence-engine"

// Internal compatibility shim
interface OldStyleSignal {
  type: string; label: string; evidence: string; source: string
  confidence: "low"|"medium"|"high"; tax_impact: string
  operational_impact: string; financial_read: string; commercial_read: string
}

// --------- Company profile ------------------------------------------------------------------------------------------------------------------------------

export interface CompanyProfile {
  razao_social:        string
  cnpj:                string
  anos_operacao:       number
  localizacao:         string
  cnae_descricao:      string
  cnae_codigo:         string
  porte:               string
  situacao_cadastral:  string
  natureza_juridica:   string
  capital_social:      string
  cnaes_secundarios:   string[]
  // Business model
  business_model:      string
  how_they_make_money: string
  operational_summary: string
  // Deep operational intelligence
  sector_profile:      CNAEProfile | null
  operational_narrative: string   // 2-3 sentence specific description
  tax_exposure_narrative: string  // what tax themes are likely relevant
  // Booleans
  has_ecommerce:       boolean
  has_export:          boolean
  has_retail:          boolean
  has_industry:        boolean
  has_logistics:       boolean
  has_multiple_units:  boolean
  has_esg:             boolean
  has_interstate_ops:  boolean
  has_big_payroll:     boolean
  // Signals
  operational_signals: OperationalSignal[]
  // Intelligence
  market_positioning:  string
  tax_maturity:        TaxMaturity
  operational_complexity: OpComplexity
  expansion_signals:   string[]
  // Commercial
  commercial_temperature: CommercialTemp
  commercial_temp_reasons: string[]
  strategic_summary:   string
  // Questions (the 20)
  q_what_they_do:      string
  q_how_they_operate:  string
  q_revenue_model:     string
  q_export:            string
  q_ecommerce:         string
  q_retail:            string
  q_industry:          string
  q_logistics:         string
  q_multiple_units:    string
  q_tax_maturity:      string
  q_conservatism:      string
  q_best_approach:     string
  // Meta
  overall_confidence:  "low" | "medium" | "high"
  data_gaps:           string[]
  enriched_at:         string
}

// --------- Helpers ------------------------------------------------------------------------------------------------------------------------------------------------------

function cautious(text: string, confidence: "low"|"medium"|"high"): string {
  if (confidence === "high") return text
  if (confidence === "medium") return `Provavelmente, ${text.charAt(0).toLowerCase()}${text.slice(1)}`
  return `A confirmar: ${text.charAt(0).toLowerCase()}${text.slice(1)}`
}

function detectExpansionSignals(items: Array<{ title: string; tags?: string[] }>): string[] {
  const signals: string[] = []
  for (const item of items.slice(0, 5)) {
    const lc = item.title.toLowerCase()
    if (/expan|nova unidade|inaugur/.test(lc)) signals.push(`Expansão detectada em notícia: "${item.title.slice(0, 80)}"`)
    if (/aquisição|compra|incorpora/.test(lc)) signals.push(`Aquisição/M&A detectada: "${item.title.slice(0, 80)}"`)
    if (/export|internacional/.test(lc)) signals.push(`Internacionalização detectada: "${item.title.slice(0, 80)}"`)
    if (/invest|aporta|captaç/.test(lc)) signals.push(`Investimento captado: "${item.title.slice(0, 80)}"`)
    if (/contrat|vagas/.test(lc)) signals.push(`Crescimento de equipe detectado: "${item.title.slice(0, 80)}"`)
  }
  return signals
}

// --------- Main builder ---------------------------------------------------------------------------------------------------------------------------------------

export interface BuildProfileInput {
  cnpjData:         {
    razao_social?:       string
    nome_fantasia?:      string
    cnae_principal?:     string
    cnae_codigo?:        string
    cnaes_secundarios?:  string[]
    municipio?:          string
    uf?:                 string
    data_abertura?:      string
    idade_empresa?:      number
    qsa?:                Array<{ nome: string; qualificacao?: string }>
    capital_social?:     string
    porte?:              string
    natureza_juridica?:  string
    situacao?:           string
  }
  website:          {
    found:             boolean
    description?:      string
    about_text?:       string
    extracted_signals?: {
      ecommerce?:    boolean
      exportation?:  boolean
      esg?:          boolean
      logistics?:    boolean
      b2b?:          boolean
      certifications?: string[]
      products?:     string[]
    }
    evidence?:         string[]
    warnings?:         string[]
  }
  news:             { items: Array<{ title: string; tags?: string[]; sentiment?: string }> }
  segment:          Segment
  regime:           TaxRegime
  legalMaturity?:   TaxMaturity
  anos_operacao?:   number
}

export function buildCompanyProfile(input: BuildProfileInput): CompanyProfile {
  const { cnpjData, website, news, segment, regime, legalMaturity = "none", anos_operacao = 0 } = input
  const nome    = cnpjData.razao_social ?? "Empresa"
  const anos    = cnpjData.idade_empresa ?? anos_operacao
  const isReal  = Boolean(cnpjData.razao_social)
  const cnae    = cnpjData.cnae_principal ?? ""
  const cnaeLow = cnae.toLowerCase()
  const segLabel = SEGMENT_LABELS[segment]
  const regLabel = REGIME_LABELS[regime]
  const sig     = website.extracted_signals ?? {}

  // ------ Sector profile ---------------------------------------------------------------------------------------------------------------------------
  const sectorProfile = getCNAEProfile(cnae)

  // ------ Website validation (EVIDENCE-FIRST v19) ---------------------------------------------
  const websiteHtml = (website as any).raw_html ?? (website.found && website.description ? website.description : "")
  const websiteValidation = validateOfficialWebsite(
    (website as any).url ?? null,
    websiteHtml,
    { razao_social: cnpjData.razao_social, nome_fantasia: cnpjData.nome_fantasia, cnpj: (cnpjData as any).cnpj, municipio: cnpjData.municipio, uf: cnpjData.uf },
    [cnpjData.razao_social ?? "", cnpjData.nome_fantasia ?? ""].filter(Boolean)
  )

  // ------ Export classification (EVIDENCE-FIRST v19) ---------------------------------------
  const consultantFlags = (input as any).operation_flags ?? []
  const exportSignal = classifyExport({
    cnae_descricao:   cnae,
    website_html:     websiteHtml,
    website_validity: websiteValidation.validity,
    news_titles:      news.items.map(i => i.title),
    consultant_flags: consultantFlags,
  })

  // ------ Evidence-first signals ---------------------------------------------------------------------------------------------------
  const evidenceSignals = buildEvidenceSignals({
    cnpjData: { cnae_principal: cnae, cnae_codigo: cnpjData.cnae_codigo, municipio: cnpjData.municipio, uf: cnpjData.uf, qsa: cnpjData.qsa },
    websiteValidation,
    websiteSignals: sig as any,
    exportClassification: exportSignal,
    newsItems: news.items,
    consultantFlags,
    segment,
  })

  // Compatibility: map to old OperationalSignal shape for downstream
  const opSignals = evidenceSignals.map(s => ({
    type:               s.related_modules[0]?.split("_")[0] ?? "general",
    label:              s.title,
    evidence:           s.evidence,
    source:             s.source,
    confidence:         s.confidence,
    tax_impact:         s.tax_impact,
    operational_impact: s.tax_impact,
    financial_read:     s.commercial_impact,
    commercial_read:    s.commercial_impact,
    // New v19 fields
    classification:     s.classification,
    recommended_question: s.recommended_question,
    related_modules:    s.related_modules,
  }))

  const expSignals = detectExpansionSignals(news.items)

  // ------ Operational narrative (specific, never generic) ------------------------
  let operationalNarrative = ""
  if (sectorProfile) {
    const loc = cnpjData.municipio && cnpjData.uf ? ` sediada em ${cnpjData.municipio}/${cnpjData.uf}` : ""
    const opsStr = sectorProfile.typical_ops.slice(0, 3).join(", ")
    operationalNarrative = `${nome} atua em ${sectorProfile.activity}${loc}, com modelo de negócio ${sectorProfile.business_model}. A operação típica envolve ${opsStr}.`
  } else if (cnae) {
    const loc = cnpjData.municipio && cnpjData.uf ? ` em ${cnpjData.municipio}/${cnpjData.uf}` : ""
    operationalNarrative = `${nome} atua em ${cnae.toLowerCase()}${loc}, como empresa de ${segLabel.toLowerCase()} no ${regLabel}.`
  } else {
    operationalNarrative = `Empresa de ${segLabel.toLowerCase()} no ${regLabel}. CNAE e operação a confirmar na ligação.`
  }

  // Add website signals
  if (website.found && website.description) {
    operationalNarrative += ` Site institucional indica: "${website.description.slice(0, 100)}".`
  }

  // ------ Tax exposure narrative (specific themes) ---------------------------------------------
  const taxNarrative = sectorProfile
    ? `Pelo perfil de ${sectorProfile.sector}, os temas tributários com maior aderência são: ${sectorProfile.tax_signals.slice(0, 3).join("; ")}.`
    : `Temas tributários a validar com base no perfil cadastral e regime ${regLabel}.`

  // ------ Business model ---------------------------------------------------------------------------------------------------------------------------
  const businessModel = operationalNarrative
  const howTheyMakeMoney = sectorProfile?.revenue_model
    ?? (segment === "comercio" ? `Receita via venda de produtos${sig.ecommerce ? " (físico + digital)" : ""}.`
    : segment === "industria" ? `Receita via fabricação e venda${sig.exportation ? " com canal de exportação" : ""}.`
    : `Receita via prestação de serviços.`)

  // ------ Tax maturity ---------------------------------------------------------------------------------------------------------------------------------
  const taxMaturity: TaxMaturity =
    legalMaturity !== "none" ? legalMaturity
    : anos >= 15 ? "medium"
    : anos >= 8  ? "low"
    : "none"

  // ------ Commercial temperature ---------------------------------------------------------------------------------------------------
  let heat = 0
  const tempReasons: string[] = []
  if (anos >= 10) { heat += 2; tempReasons.push(`${anos} anos de operação — período retroativo relevante`) }
  if (opSignals.some(s => s.type === "ecommerce"))    { heat += 2; tempReasons.push("E-commerce ativo") }
  if (opSignals.some(s => s.type === "export"))       { heat += 2; tempReasons.push("Exportação identificada") }
  if (opSignals.some(s => s.type === "industry"))     { heat += 2; tempReasons.push("Operação industrial") }
  if (opSignals.some(s => s.type === "logistics"))    { heat += 1; tempReasons.push("Logística/distribuição") }
  if (opSignals.some(s => s.type === "retail"))       { heat += 1; tempReasons.push("Varejo (ICMS-ST + cartão)") }
  if (opSignals.some(s => s.type === "distribution")) { heat += 2; tempReasons.push("Distribuição interestadual") }
  if (expSignals.length >= 2)                         { heat += 2; tempReasons.push("Expansão recente identificada") }
  if (taxMaturity === "medium" || taxMaturity === "high") { heat += 1; tempReasons.push("Maturidade tributária — abertura técnica") }

  const temp: CommercialTemp =
    heat >= 8 ? "muito_quente"
    : heat >= 5 ? "quente"
    : heat >= 3 ? "morna"
    : "fria"

  const opComplexity: OpComplexity =
    opSignals.filter(s => ["ecommerce","export","industry","logistics","distribution"].includes(s.type)).length >= 3 ? "muito_alta"
    : opSignals.filter(s => ["ecommerce","export","industry","logistics"].includes(s.type)).length >= 2 ? "alta"
    : opSignals.length >= 2 ? "media" : "baixa"

  // ------ Strategic summary ------------------------------------------------------------------------------------------------------------------
  const stratSummary = operationalNarrative + ` Temperatura comercial: ${temp.replace("_"," ")}. Complexidade tributária: ${opComplexity}.`

  // ------ Data gaps ------------------------------------------------------------------------------------------------------------------------------------------
  const gaps: string[] = []
  if (!cnpjData.razao_social) gaps.push("Razão social — CNPJ não encontrado nas fontes")
  if (!website.found) gaps.push("Site não encontrado — operação a confirmar na ligação")
  if (news.items.length === 0) gaps.push("Sem notícias — empresa sem cobertura midiática recente")
  if (!cnpjData.qsa?.length) gaps.push("QSA não disponível — sócios a confirmar")
  if (!cnpjData.capital_social) gaps.push("Capital social não informado")

  const conf: "low"|"medium"|"high" = isReal && website.found ? "high" : isReal ? "medium" : "low"

  return {
    razao_social:           cnpjData.razao_social ?? "Não identificado",
    cnpj:                   "",
    anos_operacao:          anos,
    localizacao:            cnpjData.municipio && cnpjData.uf ? `${cnpjData.municipio}/${cnpjData.uf}` : "A confirmar",
    cnae_descricao:         cnae || "A confirmar",
    cnae_codigo:            cnpjData.cnae_codigo ?? "",
    porte:                  cnpjData.porte || "A confirmar",
    situacao_cadastral:     cnpjData.situacao || "A confirmar",
    natureza_juridica:      cnpjData.natureza_juridica || "A confirmar",
    capital_social:         cnpjData.capital_social || "A confirmar",
    cnaes_secundarios:      cnpjData.cnaes_secundarios ?? [],
    business_model:         businessModel,
    how_they_make_money:    howTheyMakeMoney,
    operational_summary:    operationalNarrative,
    sector_profile:         sectorProfile,
    operational_narrative:  operationalNarrative,
    tax_exposure_narrative: taxNarrative,
    has_ecommerce:          opSignals.some(s => s.type === "ecommerce"),
    has_export:             exportSignal.classification === "confirmed_export",
    has_retail:             opSignals.some(s => s.type === "retail"),
    has_industry:           opSignals.some(s => s.type === "industry"),
    has_logistics:          opSignals.some(s => s.type === "logistics"),
    has_multiple_units:     opSignals.some(s => s.type === "multi_unit"),
    has_esg:                opSignals.some(s => s.type === "esg"),
    has_interstate_ops:     opSignals.some(s => ["ecommerce","export","logistics","distribution"].includes(s.type)),
    has_big_payroll:        opSignals.some(s => ["services","industry"].includes(s.type)),
    operational_signals:    opSignals,
    market_positioning:     website.found && website.description ? website.description.slice(0, 150) : operationalNarrative.slice(0, 150),
    tax_maturity:           taxMaturity,
    operational_complexity: opComplexity,
    expansion_signals:      expSignals,
    commercial_temperature: temp,
    commercial_temp_reasons: tempReasons,
    strategic_summary:      stratSummary,
    q_what_they_do:      cautious(operationalNarrative, conf),
    q_how_they_operate:  cautious(howTheyMakeMoney, conf),
    q_revenue_model:     cautious(howTheyMakeMoney, conf),
    q_export:            exportSignal.classification === "confirmed_export" ? "Exportação confirmada por evidência — IPI Crédito Presumido disponível" : exportSignal.classification === "possible_export" ? "Hipótese de exportação — confirmar na ligação: " + exportSignal.recommended_question : "Sem sinal de exportação — confirmar: " + exportSignal.recommended_question,
    q_ecommerce:         opSignals.some(s=>s.type==="ecommerce") ? "Canal digital identificado — confirmar volume e estados atendidos para análise de DIFAL" : "Sem sinal de e-commerce",
    q_retail:            opSignals.some(s=>s.type==="retail") ? cautious("Operação varejista com potencial ICMS-ST e taxa de cartão", conf) : "Sem sinal de varejo",
    q_industry:          opSignals.some(s=>s.type==="industry") ? cautious("Operação industrial com potencial de insumos PIS/COFINS não revisados", conf) : "Sem sinal industrial",
    q_logistics:         opSignals.some(s=>s.type==="logistics") ? "Logística/distribuição identificada — combustível e manutenção podem qualificar como insumos" : "Sem sinal de logística",
    q_multiple_units:    "Confirmar na ligação — múltiplas unidades ampliam período retroativo",
    q_tax_maturity:      taxMaturity === "none" ? "Primeira revisão tributária provável — postura educacional recomendada"
      : taxMaturity === "low" ? "Baixa maturidade — oportunidades provavelmente intactas — foco em diagnóstico"
      : "Maturidade tributária identificada — abordagem técnica direta recomendada",
    q_conservatism:      taxMaturity === "high" ? "Empresa com histórico jurídico — postura proativa identificada" : "Perfil provavelmente conservador — construir confiança antes de propor",
    q_best_approach:     temp === "muito_quente" || temp === "quente" ? "Abordagem técnica direta com dado específico sobre a operação" : "Abordagem consultiva — demonstrar contexto antes de propor",
    overall_confidence:  conf,
    data_gaps:           gaps,
    enriched_at:         new Date().toISOString(),
  }
}
