// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Company Research Engine
//
// Given a company name (from CNPJ lookup), researches:
// - Official website
// - Google News / public news
// - LinkedIn / decision makers
// - Courts / legal signals
//
// RULE: Never invent. Missing = "n--o identificado".
// Every finding has source + confidence.
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// --------- Website Research ---------------------------------------------------------------------------------------------------------------------------

export interface WebsiteSignals {
  products?:          string[]
  services?:          string[]
  industries_served?: string[]
  units?:             string[]
  certifications?:    string[]
  ecommerce?:         boolean
  exportation?:       boolean
  esg?:               boolean
  logistics?:         boolean
  careers?:           boolean
}

export interface WebsiteResult {
  official_site?:    string
  found:             boolean
  confidence:        "low" | "medium" | "high"
  evidence:          string[]
  title?:            string
  description?:      string
  extracted_signals: WebsiteSignals
  about_text?:       string
  warnings:          string[]
  fetched_at:        string
}

function inferDomains(name: string): string[] {
  const slug = name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // remove accents
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(w => !["ltda","sa","me","eireli","epp","sas","ss","ss","industria","comercio","servicos","grupo","cia"].includes(w))

  const short = slug.slice(0, 2).join("")
  const full  = slug.slice(0, 3).join("")
  const first = slug[0] ?? ""

  return [
    `https://www.${short}.com.br`,
    `https://www.${full}.com.br`,
    `https://www.${first}.com.br`,
    `https://${short}.com.br`,
    `https://www.${short}.com`,
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4)
}

export async function researchWebsite(
  razao_social:  string,
  nome_fantasia?: string,
  manual_url?:   string,
): Promise<WebsiteResult> {
  const fetched_at = new Date().toISOString()

  const name        = nome_fantasia && nome_fantasia.length > 3 ? nome_fantasia : razao_social
  const candidates  = manual_url ? [manual_url, ...inferDomains(name)] : inferDomains(name)

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, {
        signal:  AbortSignal.timeout(6_000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; research-bot/1.0)" },
      })

      if (!res.ok) continue

      const html    = await res.text()
      const content = html.toLowerCase()

      // Meta extraction
      const title  = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null
      const metaD  = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{10,200})["']/i)?.[1]?.trim() ?? null

      // Signal extraction
      const signals: WebsiteSignals = {
        ecommerce:   /carrinho|checkout|comprar agora|adicionar ao cart|loja virtual|e-commerce|ecommerce/.test(content),
        exportation: /export|import|exterior|international|overseas|worldwide/.test(content),
        esg:         /sustentabilidade|esg|ambiental|carbono|social|governança/.test(content),
        logistics:   /logística|entrega|distribuição|armazém|frete/.test(content),
        careers:     /carreira|trabalhe conosco|vagas|oportunidades|linkedin/.test(content),
        certifications: extractCertifications(content),
        products:    extractListItems(html, "produto"),
        services:    extractListItems(html, "serviço"),
      }

      const evidence: string[] = []
      if (title)                  evidence.push(`Título: ${title}`)
      if (metaD)                  evidence.push(`Descrição: ${metaD.slice(0, 100)}`)
      if (signals.ecommerce)      evidence.push("E-commerce identificado")
      if (signals.exportation)    evidence.push("Operação exportadora sinalizada")
      if (signals.esg)            evidence.push("Programa ESG/sustentabilidade")

      return {
        official_site:     candidate,
        found:             true,
        confidence:        manual_url && candidate === manual_url ? "high" : "medium",
        evidence,
        title:             title ?? undefined,
        description:       metaD ?? undefined,
        extracted_signals: signals,
        about_text:        metaD ?? undefined,
        warnings:          ["Análise baseada em conteúdo público — pode não refletir toda a operação"],
        fetched_at,
      }
    } catch { continue }
  }

  return {
    found:             false,
    confidence:        "low",
    evidence:          [],
    extracted_signals: {},
    warnings:          [`Site não encontrado em ${candidates.length} candidatos. Informe a URL manualmente.`],
    fetched_at,
  }
}

function extractCertifications(content: string): string[] {
  const certs: string[] = []
  if (content.includes("iso 9001"))  certs.push("ISO 9001")
  if (content.includes("iso 14001")) certs.push("ISO 14001")
  if (content.includes("iso 45001")) certs.push("ISO 45001")
  if (content.includes("inmetro"))   certs.push("INMETRO")
  if (content.includes("abnt"))      certs.push("ABNT")
  return certs
}

function extractListItems(html: string, keyword: string): string[] {
  // Very simple extraction --- look for the keyword near list items
  const regex = new RegExp(`<li[^>]*>[^<]*${keyword}[^<]*<\/li>`, "gi")
  return (html.match(regex) ?? []).slice(0, 5).map(s => s.replace(/<[^>]+>/g, "").trim())
}

// --------- News Research ------------------------------------------------------------------------------------------------------------------------------------

export interface NewsItem {
  title:                string
  url:                  string | null
  source:               string
  date?:                string
  summary:              string
  commercial_relevance: string
  confidence:           "low" | "medium" | "high"
  tags:                 string[]
}

export interface NewsResult {
  items:            NewsItem[]
  commercial_hooks: string[]   // ready-to-use in conversation
  signals:          string[]   // expansion, investment, crisis, etc.
  growth_signal:    boolean
  risk_signal:      boolean
  fetched_at:       string
}

export async function researchNews(razao_social: string): Promise<NewsResult> {
  const fetched_at = new Date().toISOString()
  // Use first 3 words for search --- full name has too many generic words
  const q   = encodeURIComponent(razao_social.split(" ").slice(0, 3).join(" "))
  const url = `https://news.google.com/rss/search?q=${q}&hl=pt-BR&gl=BR&ceid=BR:pt-419`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7_000) })
    if (!res.ok) throw new Error(`RSS HTTP ${res.status}`)

    const xml   = await res.text()
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 8)

    const parsed: NewsItem[] = items.map(m => {
      const c     = m[1]
      const title = c.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() ?? ""
      const link  = c.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? null
      const pub   = c.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? undefined
      const src   = c.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]?.trim() ?? "Google News"
      const lc    = title.toLowerCase()

      const tags: string[] = []
      if (/expan|cresce|inaugura|nova unidade|novo hub/.test(lc))    tags.push("expansão")
      if (/export|importa|exterior/.test(lc))                         tags.push("exportação")
      if (/invest|aporta|captação|série/.test(lc))                    tags.push("investimento")
      if (/demiti|corte|fechamento|falência|crise/.test(lc))          tags.push("reestruturação")
      if (/prêmio|premiou|reconhece|destaque/.test(lc))               tags.push("premiação")
      if (/contrat|vagas|seleção/.test(lc))                           tags.push("contratação")

      const relevance = tags.includes("expansão")     ? "Empresa em expansão — momento ideal para revisão tributária prospectiva"
        : tags.includes("investimento")               ? "Captação/investimento recente — estrutura tributária pode mudar"
        : tags.includes("contratação")                ? "Contratações ativas — folha de pagamento em crescimento"
        : tags.includes("exportação")                 ? "Operação exportadora — IPI Crédito Presumido relevante"
        : tags.includes("reestruturação")             ? "Sinais de reestruturação — abordar com cautela"
        : "Notícia pública disponível para contextualizar a abertura"

      return { title, url: link, source: src, date: pub, summary: title, commercial_relevance: relevance, confidence: "medium" as const, tags }
    })

    const nome  = razao_social.split(" ")[0]
    const hooks: string[] = []

    for (const item of parsed.slice(0, 3)) {
      if (item.tags.includes("expansão"))    hooks.push(`"Vi que ${nome} está em expansão — empresas nesse momento têm janela estratégica para revisão tributária antes do crescimento."`)
      if (item.tags.includes("contratação")) hooks.push(`"${nome} está contratando — folha crescente cria oportunidade para revisão previdenciária estratégica."`)
      if (item.tags.includes("exportação"))  hooks.push(`"Identificamos que ${nome} tem operação exportadora — há crédito de IPI com alíquota fixada em lei (5,37%)."`)
    }

    return {
      items:            parsed,
      commercial_hooks: hooks,
      signals:          [...new Set(parsed.flatMap(i => i.tags))],
      growth_signal:    parsed.some(i => ["expansão","investimento","contratação","premiação"].some(t => i.tags.includes(t))),
      risk_signal:      parsed.some(i => i.tags.includes("reestruturação")),
      fetched_at,
    }

  } catch {
    return { items: [], commercial_hooks: [], signals: [], growth_signal: false, risk_signal: false, fetched_at }
  }
}

// --------- Decision Makers ---------------------------------------------------------------------------------------------------------------------------

export interface DecisionMaker {
  name:         string
  role:         string
  source:       "receita_federal" | "linkedin_manual" | "website" | "news" | "manual"
  confidence:   "low" | "medium" | "high"
  linkedin_url?: string
  notes?:        string
  is_target:    boolean
}

export interface DecisionMakersResult {
  decision_makers:  DecisionMaker[]
  coverage:         "none" | "partial" | "good"
  missing_roles:    string[]
  manual_fields_available: string[]
  fetched_at:       string
}

const TARGET_ROLES = ["CFO", "Controller", "Gerente Financeiro", "Responsável Fiscal", "Responsável Tributário", "Sócio"]

export function buildDecisionMakers(
  qsa:           Array<{ nome: string; qualificacao?: string }> | undefined,
  manualInput?:  {
    decision_maker_name?:  string
    decision_maker_role?:  string
    linkedin_url?:         string
    extra_names?:          string   // "João Silva - CFO\nMaria Santos - Controller"
    notes?:                string
  },
): DecisionMakersResult {
  const fetched_at = new Date().toISOString()
  const makers: DecisionMaker[] = []

  // From Receita Federal QSA (always high confidence when available)
  if (qsa?.length) {
    for (const q of qsa) {
      if (!q.nome) continue
      makers.push({
        name:       q.nome,
        role:       q.qualificacao || "Sócio/Administrador",
        source:     "receita_federal",
        confidence: "high",
        is_target:  true,
      })
    }
  }

  // From manual input --- single person
  if (manualInput?.decision_maker_name) {
    const role  = manualInput.decision_maker_role ?? "Cargo não informado"
    const isT   = TARGET_ROLES.some(r => role.toLowerCase().includes(r.toLowerCase()))
    makers.push({
      name:         manualInput.decision_maker_name,
      role,
      source:       "linkedin_manual",
      confidence:   "medium",
      linkedin_url: manualInput.linkedin_url,
      is_target:    isT,
    })
  }

  // From manual "extra_names" (multi-line paste)
  if (manualInput?.extra_names) {
    const lines = manualInput.extra_names.split("\n").filter(l => l.trim().length > 2)
    for (const line of lines.slice(0, 8)) {
      const parts = line.split(/[-–|,]/).map(s => s.trim())
      if (parts.length >= 2 && parts[0] && parts[1]) {
        const isT = TARGET_ROLES.some(r => parts[1].toLowerCase().includes(r.toLowerCase()))
        makers.push({
          name:       parts[0],
          role:       parts[1],
          source:     "manual",
          confidence: "medium",
          is_target:  isT,
        })
      }
    }
  }

  const present_roles = makers.map(m => m.role.toLowerCase())
  const missing_roles = ["CFO / Financeiro", "Responsável Fiscal", "Controller"]
    .filter(r => !present_roles.some(p => p.includes(r.split("/")[0].trim().toLowerCase())))

  const coverage: "none" | "partial" | "good" =
    makers.length === 0 ? "none"
    : missing_roles.length <= 1 ? "good"
    : "partial"

  return {
    decision_makers: makers,
    coverage,
    missing_roles,
    manual_fields_available: ["Nome e cargo (LinkedIn)", "URL LinkedIn", "Lista de decisores (cole da página)"],
    fetched_at,
  }
}

// --------- Legal / Court Research ---------------------------------------------------------------------------------------------------------

export interface LegalSignal {
  type:                     string
  description:              string
  source:                   string
  confidence:               "low" | "medium" | "high"
  commercial_interpretation: string
}

export interface LegalResult {
  legal_signals:       LegalSignal[]
  has_tax_litigation:  boolean
  maturity_level:      "none" | "low" | "medium" | "high"
  recurring_themes:    string[]
  known_lawyers:       string[]
  approach_note:       string
  fetched_at:          string
}

export function processLegalInput(manual_input?: string): LegalResult {
  const fetched_at = new Date().toISOString()
  const signals:    LegalSignal[] = []

  if (!manual_input?.trim()) {
    return {
      legal_signals:      [],
      has_tax_litigation: false,
      maturity_level:     "none",
      recurring_themes:   [],
      known_lawyers:      [],
      approach_note:      "Nenhum histórico jurídico identificado — consultar tribunais manualmente se necessário.",
      fetched_at,
    }
  }

  const text = manual_input.toLowerCase()

  // Tax themes
  const themes: Record<string, { type: string; commercial: string }> = {
    "tema 69":        { type: "PIS/COFINS - Exclusão ICMS", commercial: "Empresa já discutiu Tema 69 — pode ter aproveitado ou estar revisando." },
    "icms-st":        { type: "ICMS-ST / PIS/COFINS",       commercial: "Histórico de ICMS-ST indica maturidade tributária — abordagem técnica é bem recebida." },
    "sistema s":      { type: "Sistema S",                   commercial: "Sistema S em litígio — Tema 1079 pode ter sido tratado ou não." },
    "pis/cofins":     { type: "PIS/COFINS",                  commercial: "Empresa litiga sobre PIS/COFINS — conhece o tema, abordagem consultiva é preferida." },
    "inss":           { type: "Previdenciário",              commercial: "Histórico previdenciário — verbas indenizatórias provavelmente já avaliadas." },
    "mandado de segurança": { type: "Mandado de Segurança", commercial: "Empresa usa MS tributário — postura proativa juridicamente." },
    "execução fiscal": { type: "Execução Fiscal",           commercial: "Execução fiscal pendente — verificar situação antes de abordar." },
    "irpj":           { type: "IRPJ/CSLL",                  commercial: "Litígio de IRPJ/CSLL — empresa tem estrutura jurídica tributária ativa." },
  }

  let has_tax = false
  const found_themes: string[] = []

  for (const [keyword, info] of Object.entries(themes)) {
    if (text.includes(keyword)) {
      has_tax = true
      found_themes.push(info.type)
      signals.push({ type: info.type, description: `Referência a "${keyword}" identificada no input.`, source: "Input manual do consultor", confidence: "medium", commercial_interpretation: info.commercial })
    }
  }

  // Extract lawyer names (simple heuristic: words before "Advogados" or "Advocacia")
  const lawyerMatches = [...manual_input.matchAll(/([A-Z][a-z]+ (?:[A-Z][a-z]+ )?(?:Advogados|Advocacia|OAB))/g)]
  const known_lawyers = lawyerMatches.map(m => m[1]).slice(0, 3)

  if (known_lawyers.length > 0) {
    signals.push({ type: "Escritório Jurídico", description: `Escritório(s) identificado(s): ${known_lawyers.join(", ")}`, source: "Input manual", confidence: "medium", commercial_interpretation: "Empresa tem representação jurídica tributária ativa." })
  }

  const maturity: "none" | "low" | "medium" | "high" =
    found_themes.length >= 3 ? "high"
    : found_themes.length >= 2 ? "medium"
    : found_themes.length === 1 ? "low"
    : "none"

  const approach_note = maturity === "none" ? "Empresa sem histórico tributário litigioso identificado."
    : maturity === "low" ? "Empresa com histórico tributário incipiente — abordagem técnica é bem-vinda."
    : maturity === "medium" ? "Empresa com maturidade tributária relevante — abordagem deve demonstrar profundidade técnica."
    : "Empresa com alto histórico litigioso — posicionar como parceiro complementar, nunca substituto."

  return { legal_signals: signals, has_tax_litigation: has_tax, maturity_level: maturity, recurring_themes: found_themes, known_lawyers, approach_note, fetched_at }
}
