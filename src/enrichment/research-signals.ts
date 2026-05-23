// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Research Signals
//
// Converts raw research findings (site, news, legal, manual) into
// structured ResearchSignal objects used by the entire bridge.
//
// RULE: confidence drives language:
// - high --- assert ("a empresa exporta")
// - medium --- indicate ("h-- ind--cio de exporta----o")
// - low --- question ("vale confirmar se h-- exporta----o")
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { CompanyResearch } from "./research-orchestrator"

// --------- Signal types ---------------------------------------------------------------------------------------------------------------------------------------

export type SignalType =
  | "exportacao"
  | "ecommerce"
  | "expansao"
  | "nova_unidade"
  | "esg"
  | "certificacao"
  | "industria"
  | "varejo"
  | "servico"
  | "alto_cartao"
  | "icms_st_probable"
  | "folha_relevante"
  | "tema_69_detectado"
  | "sistema_s_detectado"
  | "maturidade_juridica"
  | "decisor_identificado"
  | "reestruturacao"
  | "investimento"
  | "contratacao"

export interface ResearchSignal {
  signal_type:    SignalType
  source:         string
  confidence:     "low" | "medium" | "high"
  evidence:       string       // the actual data point that generated this signal
  interpretation: string       // commercial meaning
  module_hint?:   string       // which tax module this affects
  is_confirmed:   boolean      // false = hypothesis
}

// --------- Language guard ---------------------------------------------------------------------------------------------------------------------------------

export function signalLanguage(signal: ResearchSignal): string {
  const nome = signal.evidence
  if (signal.confidence === "high" && signal.is_confirmed) {
    return signal.interpretation
  }
  if (signal.confidence === "medium") {
    return `Há indícios de ${signal.interpretation.charAt(0).toLowerCase()}${signal.interpretation.slice(1)}`
  }
  return `Vale confirmar: ${signal.interpretation.charAt(0).toLowerCase()}${signal.interpretation.slice(1)}`
}

// --------- Extractors ---------------------------------------------------------------------------------------------------------------------------------------------

function fromCNPJData(research: CompanyResearch): ResearchSignal[] {
  const signals: ResearchSignal[] = []
  const d = research.cnpj_result.merged
  const isReal = research.cnpj_result.confidence === "high"  // only Receita Federal with QSA = truly confirmed

  if (d.cnae_principal) {
    const cnae = d.cnae_principal.toLowerCase()
    if (cnae.includes("fabricação") || cnae.includes("manufatura") || cnae.includes("industrial")) {
      signals.push({ signal_type: "industria", source: research.cnpj_result.primary_source, confidence: isReal ? "high" : "medium", evidence: `CNAE: ${d.cnae_principal}`, interpretation: "Operação industrial identificada pelo CNAE", module_hint: "ipi_credito_presumido_exportacao", is_confirmed: isReal })
    }
    if (cnae.includes("comércio") || cnae.includes("varejo") || cnae.includes("atacado")) {
      signals.push({ signal_type: "varejo", source: research.cnpj_result.primary_source, confidence: isReal ? "high" : "medium", evidence: `CNAE: ${d.cnae_principal}`, interpretation: "Operação varejista identificada pelo CNAE", module_hint: "icms_st_pis_cofins", is_confirmed: isReal })
    }
    if (cnae.includes("exportação") || cnae.includes("importação") || cnae.includes("comércio exterior")) {
      signals.push({ signal_type: "exportacao", source: research.cnpj_result.primary_source, confidence: isReal ? "high" : "medium", evidence: `CNAE: ${d.cnae_principal}`, interpretation: "Comércio exterior identificado pelo CNAE", module_hint: "ipi_credito_presumido_exportacao", is_confirmed: isReal })
    }
    if (cnae.includes("serviço") || cnae.includes("tecnologia") || cnae.includes("consultoria")) {
      signals.push({ signal_type: "servico", source: research.cnpj_result.primary_source, confidence: isReal ? "high" : "medium", evidence: `CNAE: ${d.cnae_principal}`, interpretation: "Prestação de serviços identificada pelo CNAE", module_hint: "icms_iss_acao_coletiva", is_confirmed: isReal })
    }
  }

  if (d.qsa?.length) {
    signals.push({ signal_type: "decisor_identificado", source: research.cnpj_result.primary_source, confidence: "high", evidence: `${d.qsa.length} sócio(s): ${d.qsa.map(q => q.nome).join(", ")}`, interpretation: "Sócios identificados na Receita Federal — abordagem direta disponível", is_confirmed: true })
  }

  return signals
}

function fromWebsite(research: CompanyResearch): ResearchSignal[] {
  const signals: ResearchSignal[] = []
  if (!research.website.found) return signals

  const s = research.website.extracted_signals

  if (s.exportation) {
    signals.push({ signal_type: "exportacao", source: `Site (${research.website.official_site})`, confidence: "medium", evidence: "Menção a exportação/internacional no site", interpretation: "Empresa com operação exportadora — IPI Crédito Presumido relevante (5,37% Lei 9.363/96)", module_hint: "ipi_credito_presumido_exportacao", is_confirmed: false })
  }
  if (s.ecommerce) {
    signals.push({ signal_type: "ecommerce", source: `Site (${research.website.official_site})`, confidence: "medium", evidence: "Sinais de loja virtual/checkout no site", interpretation: "E-commerce identificado — DIFAL em operações interestaduais relevante", module_hint: "difal_pis_cofins", is_confirmed: false })
  }
  if (s.esg) {
    signals.push({ signal_type: "esg", source: `Site (${research.website.official_site})`, confidence: "medium", evidence: "Programa de sustentabilidade/ESG mencionado", interpretation: "Empresa com programa ESG — perfil receptivo a compliance tributário", is_confirmed: false })
  }
  if (s.certifications?.length) {
    signals.push({ signal_type: "certificacao", source: `Site (${research.website.official_site})`, confidence: "medium", evidence: `Certificações: ${s.certifications.join(", ")}`, interpretation: "Certificações indicam estrutura operacional madura — perfil de revisão tributária estruturada", is_confirmed: false })
  }

  return signals
}

function fromNews(research: CompanyResearch): ResearchSignal[] {
  const signals: ResearchSignal[] = []
  const typeMap: Record<string, { type: SignalType; module?: string; interp: string }> = {
    expansão:      { type: "expansao",    module: "sistema_s",                 interp: "Expansão recente — folha em crescimento, Sistema S e verbas previdenciárias relevantes" },
    nova_unidade:  { type: "nova_unidade",module: "sistema_s",                 interp: "Nova unidade — estrutura de custo e folha em expansão" },
    investimento:  { type: "investimento",                                      interp: "Investimento recente — revisão tributária prospectiva é mais bem recebida" },
    contratação:   { type: "contratacao", module: "verbas_indenizatorias",      interp: "Contratações ativas — folha crescente, encargos previdenciários em aumento" },
    exportação:    { type: "exportacao",  module: "ipi_credito_presumido_exportacao", interp: "Exportação confirmada em notícia pública — IPI Crédito Presumido" },
    reestruturação:{ type: "reestruturacao",                                    interp: "Sinal de reestruturação — abordar com cautela, foco em eficiência" },
  }

  for (const item of research.news.items.slice(0, 5)) {
    for (const tag of item.tags) {
      const mapping = typeMap[tag]
      if (mapping) {
        signals.push({ signal_type: mapping.type, source: `Google News: ${item.source}`, confidence: "medium", evidence: `"${item.title.slice(0, 80)}"`, interpretation: mapping.interp, module_hint: mapping.module, is_confirmed: false })
      }
    }
  }
  return signals
}

function fromLegal(research: CompanyResearch): ResearchSignal[] {
  const signals: ResearchSignal[] = []

  if (research.legal.has_tax_litigation) {
    signals.push({ signal_type: "maturidade_juridica", source: "Input manual — tribunais", confidence: "medium", evidence: "Histórico tributário litigioso identificado", interpretation: "Empresa com maturidade jurídica tributária — abordagem técnica é preferida", is_confirmed: false })
  }

  for (const theme of research.legal.recurring_themes) {
    if (theme.includes("PIS/COFINS") || theme.includes("Tema 69")) {
      signals.push({ signal_type: "tema_69_detectado", source: "Input manual — tribunais", confidence: "medium", evidence: `Tema detectado: ${theme}`, interpretation: "Empresa já discutiu Tema 69/PIS/COFINS — pode ter aproveitado ou ter período retroativo ainda aberto", module_hint: "icms_grossup", is_confirmed: false })
    }
    if (theme.includes("Sistema S") || theme.includes("Previdenciário")) {
      signals.push({ signal_type: "sistema_s_detectado", source: "Input manual — tribunais", confidence: "medium", evidence: `Tema detectado: ${theme}`, interpretation: "Sistema S já analisado juridicamente — verificar se Tema 1079 foi aproveitado retroativamente", module_hint: "sistema_s", is_confirmed: false })
    }
  }

  if (research.legal.known_lawyers.length > 0) {
    signals.push({ signal_type: "maturidade_juridica", source: "Input manual", confidence: "medium", evidence: `Escritório(s): ${research.legal.known_lawyers.join(", ")}`, interpretation: "Representação jurídica tributária ativa — abordagem deve ser complementar", is_confirmed: false })
  }

  return signals
}

function fromDecisionMakers(research: CompanyResearch): ResearchSignal[] {
  const targets = research.decision_makers.decision_makers.filter(dm => dm.is_target)
  if (targets.length === 0) return []
  return [{
    signal_type: "decisor_identificado",
    source:      targets[0].source,
    confidence:  targets[0].confidence,
    evidence:    targets.map(dm => `${dm.name} (${dm.role})`).join(", "),
    interpretation: `Decisor-alvo identificado: ${targets[0].name} — ${targets[0].role}`,
    is_confirmed: targets[0].confidence === "high",
  }]
}

// --------- De-duplicate signals ---------------------------------------------------------------------------------------------------------------

function dedup(signals: ResearchSignal[]): ResearchSignal[] {
  const seen = new Map<SignalType, ResearchSignal>()
  for (const s of signals) {
    const existing = seen.get(s.signal_type)
    // Keep highest confidence; combine evidence
    if (!existing || confidenceRank(s.confidence) > confidenceRank(existing.confidence)) {
      seen.set(s.signal_type, s)
    } else if (existing && existing.evidence !== s.evidence) {
      seen.set(s.signal_type, { ...existing, evidence: `${existing.evidence}; ${s.evidence}` })
    }
  }
  return [...seen.values()]
}

function confidenceRank(c: "low" | "medium" | "high"): number {
  return c === "high" ? 3 : c === "medium" ? 2 : 1
}

// --------- Main extractor ---------------------------------------------------------------------------------------------------------------------------------

export function extractResearchSignals(research: CompanyResearch): ResearchSignal[] {
  return dedup([
    ...fromCNPJData(research),
    ...fromWebsite(research),
    ...fromNews(research),
    ...fromLegal(research),
    ...fromDecisionMakers(research),
  ])
}

// --------- Contradiction detector ---------------------------------------------------------------------------------------------------------

export function detectContradictions(signals: ResearchSignal[]): string[] {
  const contradictions: string[] = []
  const hasIndustria = signals.some(s => s.signal_type === "industria")
  const hasVarejo    = signals.some(s => s.signal_type === "varejo")
  const hasServico   = signals.some(s => s.signal_type === "servico")

  if (hasIndustria && hasVarejo) contradictions.push("Sinais contraditórios: CNAE sugere indústria mas também varejo — confirmar modelo de negócios na ligação")
  if (hasIndustria && hasServico) contradictions.push("Sinais mistos: indústria + prestação de serviços — empresa pode ter múltiplas atividades")
  return contradictions
}
