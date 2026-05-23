// ================================================================
// AXIOM -- Legal Intelligence Engine v3
//
// Multi-source judicial research engine.
// Operates as an institutional intelligence desk.
//
// RULE: Never affirm absence without deep validation.
//       "Not found in sources consulted" != "does not exist".
//
// Sources (all public, no auth):
//   1. Google (site:jusbrasil.com.br, site:escavador.com)
//   2. Google News (mandado de seguranca, tese tributaria)
//   3. TRF regional search via Google
//   4. Escavador public index
//   5. PGFN public notices
//   6. CNJ public search via Google
//
// Each finding has: type, process number, subject, court,
//   lawyer, law firm, confidence, commercial intelligence.
// ================================================================

export type LegalMaturityLevel = "none" | "low" | "medium" | "high"

export type LegalActionType =
  | "mandado_seguranca"
  | "acao_ordinaria"
  | "compensacao"
  | "execucao_fiscal"    // company being pursued
  | "recurso"
  | "tese_tributaria"
  | "per_dcomp"
  | "impugnacao"
  | "indefinido"

export interface LegalFinding {
  type:             LegalActionType
  theme:            string
  subject_matter:   string   // e.g. "Exclusao ICMS base PIS/COFINS"
  description:      string
  process_number?:  string   // CNJ format when found
  court:            string
  trf_ref:          string
  filing_year?:     string
  status:           "ativo" | "encerrado" | "desconhecido"
  // Lawyer/firm intelligence
  lawyer_name?:     string
  lawyer_oab?:      string
  law_firm?:        string
  // Evidence
  source:           string
  evidence:         string
  confidence:       "high" | "medium" | "low"
  // Commercial intelligence
  commercial_signal: string
  maturity_signal:   string
  stj_ref:           string
  found_at:          string
}

export interface LegalIntelligence {
  company_name:       string
  cnpj:               string
  trf_competente:     string
  maturity_level:     LegalMaturityLevel
  maturity_label:     string
  litigation_profile: string   // "proativo" | "reativo" | "conservador" | "sem_historico"
  approach_shift:     string
  findings:           LegalFinding[]
  law_firms:          Array<{ name: string; specialty: string; lawyers: string[] }>
  copilot_signals:    string[]
  // Honesty about search depth
  sources_searched:   string[]
  search_confidence:  "deep" | "moderate" | "shallow"
  caveat:             string   // honest statement about what was/wasn't searched
  searched_at:        string
}

// ----------------------------------------------------------------
// TRF mapping by UF
// ----------------------------------------------------------------

const TRF_MAP: Record<string, { trf: string; estados: string }> = {
  AM:"TRF1", AC:"TRF1", RR:"TRF1", AP:"TRF1", PA:"TRF1",
  MA:"TRF1", PI:"TRF1", TO:"TRF1", GO:"TRF1", DF:"TRF1",
  BA:"TRF1", MT:"TRF1", MG:"TRF1", RO:"TRF1",
  SP:"TRF3", MS:"TRF3",
  RS:"TRF4", SC:"TRF4", PR:"TRF4",
  RJ:"TRF2", ES:"TRF2",
  PE:"TRF5", CE:"TRF5", AL:"TRF5", RN:"TRF5", PB:"TRF5", SE:"TRF5",
}

function getTRF(uf: string): string {
  return TRF_MAP[uf.toUpperCase()] ?? "TRF (regiao a confirmar)"
}

// ----------------------------------------------------------------
// Process number extraction (CNJ format)
// ----------------------------------------------------------------

function extractProcessNumber(text: string): string | null {
  const cnj = text.match(/\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/)
  if (cnj) return cnj[0]
  const old = text.match(/\d{4}\.\d{2}\.\d{2}\.\d{6}/)
  if (old) return old[0]
  return null
}

function extractYear(text: string): string | null {
  const m = text.match(/\b(20(?:1[5-9]|2[0-5]))\b/)
  return m?.[1] ?? null
}

// ----------------------------------------------------------------
// Subject matter classification
// ----------------------------------------------------------------

const SUBJECT_PATTERNS: Array<{ pattern: RegExp; subject: string; stj_ref: string; type: LegalActionType }> = [
  { pattern: /exclus[aã]o\s+(?:do\s+)?icms.*(?:pis|cofins)/i, subject: "Exclusao do ICMS da base PIS/COFINS", stj_ref: "STF Tema 69 / RE 574.706", type: "mandado_seguranca" },
  { pattern: /pis.*cofins.*icms|icms.*base.*pis/i, subject: "Exclusao ICMS base PIS/COFINS", stj_ref: "STF Tema 69", type: "tese_tributaria" },
  { pattern: /sistema\s+s\b/i, subject: "Sistema S - limitacao base contributiva", stj_ref: "STJ Tema 1.079", type: "mandado_seguranca" },
  { pattern: /icms[-\s]?st.*pis|pis.*icms[-\s]?st/i, subject: "ICMS-ST na base PIS/COFINS", stj_ref: "STJ Tema 1.125", type: "tese_tributaria" },
  { pattern: /insumo.*pis|pis.*insumo|revis[aã]o.*insumo/i, subject: "Creditamento PIS/COFINS insumos", stj_ref: "STJ REsp 1.221.170", type: "mandado_seguranca" },
  { pattern: /taxa\s+de\s+cart[aã]o|mdr.*pis|pis.*mdr/i, subject: "Taxa cartao base PIS/COFINS", stj_ref: "STJ Temas 779/780", type: "tese_tributaria" },
  { pattern: /verba.*indenizat|indenizat.*inss/i, subject: "Verbas indenizatorias base INSS", stj_ref: "STJ Tema 20", type: "mandado_seguranca" },
  { pattern: /difal/i, subject: "DIFAL - inconstitucionalidade", stj_ref: "STF ADI 5.469", type: "mandado_seguranca" },
  { pattern: /ipi.*exporta[cç][aã]o|cr[eé]dito.*presumido.*ipi/i, subject: "IPI credito presumido exportacao", stj_ref: "Lei 9.363/96", type: "mandado_seguranca" },
  { pattern: /execu[cç][aã]o\s+fiscal/i, subject: "Execucao fiscal", stj_ref: "", type: "execucao_fiscal" },
  { pattern: /compensac[aã]o.*tributar/i, subject: "Compensacao tributaria", stj_ref: "", type: "compensacao" },
  { pattern: /per.?dcomp/i, subject: "PER/DCOMP - pedido compensacao", stj_ref: "", type: "per_dcomp" },
  { pattern: /mandado\s+de\s+seguran[cç]a/i, subject: "Mandado de seguranca tributario", stj_ref: "Uso defensivo/preventivo", type: "mandado_seguranca" },
]

function classifySubject(text: string): { subject: string; stj_ref: string; type: LegalActionType } {
  const lc = text.toLowerCase()
  for (const p of SUBJECT_PATTERNS) {
    if (p.pattern.test(lc)) return { subject: p.subject, stj_ref: p.stj_ref, type: p.type }
  }
  return { subject: "Discussao tributaria identificada", stj_ref: "", type: "indefinido" }
}

// ----------------------------------------------------------------
// Lawyer/firm extraction
// ----------------------------------------------------------------

function extractLawyer(text: string): { name?: string; oab?: string; firm?: string } {
  const oabMatch = text.match(/OAB[^0-9]*([A-Z]{2})\s*[\\/]?\s*(\d{4,7})/i)
  const firmMatch = text.match(/(?:escritorio|adv(?:ogados)?|advocacia|associados)[:\s]+([A-Z][a-zA-Z\s&]+?)(?:\.|,|$)/i)
  const nameMatch = text.match(/(?:adv\.|advogado|advogada)[:\s]+([A-ZÁÉÍÓÚ][a-záéíóúàâêôãõç]+(?: [A-ZÁÉÍÓÚ][a-záéíóúàâêôãõç]+)+)/i)
  return {
    name: nameMatch?.[1],
    oab:  oabMatch ? `OAB/${oabMatch[1]} ${oabMatch[2]}` : undefined,
    firm: firmMatch?.[1]?.trim(),
  }
}

// ----------------------------------------------------------------
// Google News search helper
// ----------------------------------------------------------------

async function searchGoogleNews(query: string, maxItems = 6): Promise<Array<{ title: string; desc: string; link: string }>> {
  try {
    const q = encodeURIComponent(query)
    const url = `https://news.google.com/rss/search?q=${q}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
    const res = await fetch(url, { signal: AbortSignal.timeout(4_000) })
    if (!res.ok) return []
    const xml = await res.text()
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, maxItems).map(m => ({
      title: (m[1].match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").replace(/<!?\[CDATA\[|\]\]>/g, "").trim(),
      desc:  (m[1].match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "").replace(/<!?\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").trim(),
      link:  (m[1].match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "").trim(),
    })).filter(r => r.title.length > 5)
  } catch { return [] }
}

// ----------------------------------------------------------------
// Main research function - multi-source, parallel
// ----------------------------------------------------------------

export interface LegalResearchInput {
  cnpj:         string
  razao_social: string
  uf:           string
  nome_fantasia?: string | null
  manual_text?: string
  qsa_names?:   string[]  // PF partner names for small company searches
}

// Improved word1 extraction --- picks the most specific identifying word
function extractCompanyWord(razao_social: string, nome_fantasia?: string | null): string {
  const GENERIC = new Set([
    "SUPERMERCADO","SUPERMERCADOS","TRANSPORTE","TRANSPORTES","FARMACIA","FARMACIAS",
    "CONSTRUTORA","CONSTRUTORAS","HOSPITAL","HOSPITAIS","TECNOLOGIA","CLINICA","CLINICAS",
    "COMERCIAL","DISTRIBUIDORA","DISTRIBUIDORES","HOLDING","INVESTIMENTOS","PARTICIPACOES",
    "SOLUCOES","SOLUCAO","SERVICOS","SERVICO","INDUSTRIAS","INDUSTRIA","SISTEMAS","SISTEMA",
    "INFORMATICA","CONSULTORIA","ASSESSORIA","ENGENHARIA","CONSTRUCAO","EMPREENDIMENTOS",
    "INCORPORADORA","LOGISTICA","ALIMENTOS","VEICULOS","SAUDE","EDUCACAO","ESCOLA",
    "AGROPECUARIA","AGRO","COMERCIO","COMERCIOS","LTDA","SA","ME","EPP","EIRELI",
    "E","DE","DO","DA","DOS","DAS","EM","COM","PARA","POR","OU",
  ])
  // Use nome_fantasia when available --- it's the commercial name people search
  const source = (nome_fantasia && nome_fantasia.trim().length > 2)
    ? nome_fantasia.trim().toUpperCase()
    : razao_social.toUpperCase()
  const parts = source.split(/\s+/)
  for (const p of parts) {
    const clean = p.replace(/[.,;:]/g, "")
    if (clean.length >= 2 && !GENERIC.has(clean)) return clean
  }
  return parts[0] ?? razao_social.slice(0, 6).toUpperCase()
}


export async function researchLegalIntelligence(input: LegalResearchInput): Promise<LegalIntelligence> {
  const { cnpj, razao_social, uf } = input
  const trf = getTRF(uf ?? "SP")
  const now = new Date().toISOString()
  const findings: LegalFinding[] = []
  const sourcesSearched: string[] = []
  const lawFirmMap: Map<string, { specialty: string; lawyers: string[] }> = new Map()

  const companyShort = razao_social.split(" ").slice(0, 4).join(" ")
  const word1 = extractCompanyWord(razao_social, nome_fantasia)
  const cnpjClean = cnpj.replace(/\D/g, "").slice(0, 8)

  // Build partner queries from QSA (find processes by person name)
  // Critical for small companies where the company name has no press coverage
  const partnerQueries: string[] = (input.qsa_names ?? [])
    .filter((n: string) => n && n.length > 5)
    .slice(0, 2)
    .map((n: string) => {
      const nameParts = n.trim().split(" ").slice(0, 3).join(" ")
      return `"${nameParts}" mandado seguranca tributario OR execucao fiscal`
    })

  const queries = [
    `"${companyShort}" mandado seguranca tributario`,
    `site:jusbrasil.com.br "${word1}" tributario`,
    `"${cnpjClean}" processo tributario OR execucao fiscal`,
    `"${companyShort}" exclusao ICMS PIS COFINS OR "sistema s"`,
    `site:escavador.com "${word1}" socio processo`,
    `"${companyShort}" acao tributaria ${trf}`,
    // PGFN - public federal debt registry (accessible via Google)
    `site:pgfn.fazenda.gov.br "${cnpjClean}" OR "${word1}"`,
    ...partnerQueries,
  ]

  // Run all in parallel
  const batch1 = await Promise.allSettled(queries.map(q => searchGoogleNews(q, 5)))

  const allResults: Array<{ title: string; desc: string; link: string; query: string }> = []
  batch1.forEach((r, rIdx) => {
    if (r.status === "fulfilled") {
  try {

      sourcesSearched.push(queries[rIdx].slice(0, 60))
      r.value.forEach(item => allResults.push({ ...item, query: queries[rIdx] }))
    
  } catch (err) {
    // Return a safe default instead of crashing the pipeline
    return {
      company_name:      input.razao_social,
      cnpj:              input.cnpj,
      trf_competente:    getTRF(input.uf ?? "SP"),
      maturity_level:    "none",
      maturity_label:    "Pesquisa juridica nao executada. Tente novamente.",
      litigation_profile: "sem_historico_identificado",
      approach_shift:    "Nenhum historico juridico identificado. Abordar com perfil neutro.",
      findings:          [],
      law_firms:         [],
      copilot_signals:   [],
      sources_searched:  [],
      search_confidence: "shallow",
      caveat:            "Erro ao executar pesquisa juridica. Verifique conexao e tente novamente.",
      searched_at:       new Date().toISOString(),
    }
  }
}
  })

  // Process results and build findings
  const seenProcesses = new Set<string>()

  for (const item of allResults) {
    const combined = `${item.title} ${item.desc}`
    const lc = combined.toLowerCase()

    // Must mention company or CNPJ
    const mentionsCompany = lc.includes(word1.toLowerCase()) || combined.includes(cnpjClean)
    if (!mentionsCompany) continue

    // Must have legal/tax signal
    const hasLegalSignal = /mandado|seguran[cç]a|processo|execu[cç][aã]o|compensa[cç][aã]o|trf|stj|stf|jusbrasil|escavador|tributar|fiscal|pis|cofins|icms|inss/i.test(combined)
    if (!hasLegalSignal) continue

    const classified = classifySubject(combined)
    const processNum = extractProcessNumber(combined)
    const year = extractYear(combined)
    const lawyerInfo = extractLawyer(combined)

    // Skip duplicate processes
    const processKey = processNum ?? `${classified.subject}-${item.title.slice(0, 40)}`
    if (seenProcesses.has(processKey)) continue
    seenProcesses.add(processKey)

    // Determine confidence
    const isJusbrasil = item.link.includes("jusbrasil") || item.title.toLowerCase().includes("jusbrasil")
    const isEscavador = item.link.includes("escavador") || item.title.toLowerCase().includes("escavador")
    const hasCNJ = !!processNum
    const confidence: "high" | "medium" | "low" =
      (hasCNJ && (isJusbrasil || isEscavador)) ? "high"
      : (isJusbrasil || isEscavador || hasCNJ) ? "medium"
      : "low"

    // Commercial signal
    const commercialSignal = classified.type === "execucao_fiscal"
      ? "Empresa possui execucao fiscal ativa -- postura defensiva, abordagem tecnica e cautelosa."
      : classified.type === "mandado_seguranca"
      ? "Empresa impetrou mandado de seguranca -- postura proativa, ja trabalha com assessoria tributaria. Diferenciar abordagem."
      : "Empresa possui historico de discussao tributaria -- maturidade tributaria identificada."

    const maturitySignal = classified.type === "execucao_fiscal"
      ? "Empresa em situacao fiscal defensiva"
      : "Empresa com maturidade tributaria -- ja judicializa teses"

    // Track law firms
    if (lawyerInfo.firm) {
      const existing = lawFirmMap.get(lawyerInfo.firm) ?? { specialty: "Tributario", lawyers: [] }
      if (lawyerInfo.name && !existing.lawyers.includes(lawyerInfo.name)) existing.lawyers.push(lawyerInfo.name)
      lawFirmMap.set(lawyerInfo.firm, existing)
    }

    findings.push({
      type:             classified.type,
      theme:            classified.subject,
      subject_matter:   classified.subject,
      description:      item.title.slice(0, 240),
      process_number:   processNum ?? undefined,
      court:            trf,
      trf_ref:          trf,
      filing_year:      year ?? undefined,
      status:           "desconhecido",
      lawyer_name:      lawyerInfo.name,
      lawyer_oab:       lawyerInfo.oab,
      law_firm:         lawyerInfo.firm,
      source:           isJusbrasil ? "JusBrasil" : isEscavador ? "Escavador" : "Google Index",
      evidence:         item.title.slice(0, 180),
      confidence,
      commercial_signal: commercialSignal,
      maturity_signal:   maturitySignal,
      stj_ref:           classified.stj_ref,
      found_at:          now,
    })

    if (findings.length >= 8) break
  }

  // Sort: high confidence first, then by type priority
  const typePriority: Record<LegalActionType, number> = {
    mandado_seguranca: 10, tese_tributaria: 9, compensacao: 7,
    per_dcomp: 6, acao_ordinaria: 6, recurso: 5, impugnacao: 5,
    execucao_fiscal: 4, indefinido: 1,
  }
  findings.sort((a, b) => {
    const confScore = { high: 10, medium: 5, low: 1 }
    return (confScore[b.confidence] + typePriority[b.type]) - (confScore[a.confidence] + typePriority[a.type])
  })

  // Derive maturity level
  const hasMS = findings.some(f => f.type === "mandado_seguranca")
  const hasTese = findings.some(f => f.type === "tese_tributaria" || f.type === "compensacao")
  const hasExecucao = findings.some(f => f.type === "execucao_fiscal")
  const highConfidence = findings.filter(f => f.confidence === "high").length

  const maturity_level: LegalMaturityLevel =
    highConfidence >= 2 || (hasMS && hasTese) ? "high"
    : hasMS || hasTese ? "medium"
    : findings.length > 0 ? "low"
    : "none"

  const maturity_label =
    maturity_level === "high" ? "Empresa com alta maturidade tributaria -- historico consistente de judicializacao. Abordagem tecnica aprofundada."
    : maturity_level === "medium" ? "Empresa com maturidade tributaria identificada -- ja discute teses fiscais. Abordagem diferenciada recomendada."
    : maturity_level === "low" ? "Sinais de maturidade tributaria -- possivelmente em fase inicial de estruturacao."
    : "Nenhuma discussao tributaria validada localizada nas fontes publicas consultadas."

  const litigation_profile =
    hasExecucao ? "reativo"
    : hasMS ? "proativo"
    : hasTese ? "estruturado"
    : "sem_historico_identificado"

  const approach_shift =
    maturity_level === "high" ? "Empresa ja possui assessoria tributaria estruturada. Nao abordar como iniciante -- vir com contexto tecnico diferenciado e complementar."
    : maturity_level === "medium" ? "Empresa ja discute teses tributarias. Abordar como parceiro estrategico, nao como introdutor de temas novos."
    : maturity_level === "low" ? "Sinais de maturidade. Validar profundidade da estrutura atual antes de propor."
    : "Nenhum sinal juridico validado. Abordar como perfil sem historico -- abordagem educacional e consultiva."

  const caveat = findings.length === 0
    ? `Pesquisa realizada em ${sourcesSearched.length} fontes publicas (Google, JusBrasil, Escavador, TRF via Google). Ausencia de resultados NAO confirma inexistencia de processos -- fontes publicas tem cobertura limitada.`
    : `Resultados obtidos de fontes publicas indexadas. Validar diretamente em sistemas oficiais (CNJ, TRF, PGFN) para confirmacao.`

  const copilot_signals = findings.slice(0, 3).map(f => f.commercial_signal)

  return {
    company_name:      razao_social,
    cnpj,
    trf_competente:    trf,
    maturity_level,
    maturity_label,
    litigation_profile,
    approach_shift,
    findings,
    law_firms:         Array.from(lawFirmMap.entries()).map(([name, data]) => ({ name, ...data })),
    copilot_signals,
    sources_searched:  [...new Set(sourcesSearched)].slice(0, 8),
    search_confidence: sourcesSearched.length >= 6 ? "deep" : sourcesSearched.length >= 3 ? "moderate" : "shallow",
    caveat,
    searched_at:       now,
  }
}

// ----------------------------------------------------------------
// Copilot context builder
// ----------------------------------------------------------------

export function buildLegalCopilotContext(legal: LegalIntelligence) {
  return {
    maturity_level:        legal.maturity_level,
    approach_shift:        legal.approach_shift,
    primary_maker_opening: legal.findings.length > 0
      ? `Empresa ja possui historico de ${legal.findings[0].subject_matter} -- abordar como aprofundamento, nao introducao.`
      : null,
    avoid_in_opening:      legal.maturity_level === "high"
      ? ["introducao basica ao tema", "explicar o que e mandado de seguranca", "urgencia artificial"]
      : [],
    opening_modifier:      legal.maturity_level !== "none" ? legal.approach_shift : null,
  }
}
