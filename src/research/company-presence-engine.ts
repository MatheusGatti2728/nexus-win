// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Company Presence Engine
// website-discovery + social-discovery + news-discovery
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { CompanyIdentity } from "./entity-normalizer"

// --------- Types ------------------------------------------------------------------------------------------------------------------------------------------------------------

export interface WebsiteDiscovery {
  found:             boolean
  url?:              string
  title?:            string
  description?:      string
  confidence:        "low" | "medium" | "high"
  name_match:        boolean     // page content mentions company name
  city_match:        boolean     // mentions municipio
  cnpj_match:        boolean     // has CNPJ in page
  signals: {
    ecommerce:     boolean
    exportation:   boolean
    industry:      boolean
    logistics:     boolean
    b2b:           boolean
    esg:           boolean
    certifications: string[]
    products:       string[]
  }
  evidence:   string[]
  warnings:   string[]
}

export interface SocialProfile {
  platform:   "linkedin" | "instagram" | "facebook" | "google_business"
  url?:       string
  found:      boolean
  confidence: "low" | "medium" | "high"
  signals:    string[]
  source:     string
}

export interface NewsSignal {
  title:               string
  url:                 string | null
  source:              string
  date?:               string
  tags:                string[]
  sentiment:           "positive" | "neutral" | "negative"
  commercial_hook:     string
  confidence:          "medium"
}

export interface CompanyPresence {
  entity:               CompanyIdentity
  website:              WebsiteDiscovery
  social_profiles:      SocialProfile[]
  news_signals:         NewsSignal[]
  operational_summary:  string
  digital_presence_score: number    // 0-100
  confidence:           "low" | "medium" | "high"
  enriched_at:          string
  debug: {
    domains_tried:      string[]
    search_queries:     string[]
    news_query:         string
    total_ms:           number
  }
}

// --------- Website discovery ------------------------------------------------------------------------------------------------------------------------

async function tryDomain(
  url:        string,
  identity:   CompanyIdentity,
  municipio?: string,
): Promise<WebsiteDiscovery | null> {
  try {
    const res = await fetch(url, {
      signal:  AbortSignal.timeout(6_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; research-bot/1.0)" },
    })
    if (!res.ok) return null

    const html    = await res.text()
    const content = html.toLowerCase()

    // Name presence check --- must match at least one alias
    const name_match = identity.aliases.some(alias =>
      content.includes(alias.toLowerCase())
    )

    const city_match = Boolean(municipio && content.includes(municipio.toLowerCase()))

    // CNPJ presence (formatted or raw)
    const cnpj_match = Boolean(html.match(/\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\\/\.\s]?\d{4}[\-\.\s]?\d{2}/))

    // Signal extraction
    const ecommerce   = /carrinho|checkout|comprar agora|adicionar ao cart|loja virtual|e-commerce|ecommerce|marketplace/.test(content)
    const exportation = /export|import|exterior|international|overseas|worldwide|global/.test(content)
    const industry    = /fabricação|manufatura|industrial|produção|fábrica|planta industrial/.test(content)
    const logistics   = /logística|entrega|distribuição|armazém|frete|transporte|modal/.test(content)
    const b2b         = /b2b|distribuidores|revendedores|atacado|representante|parceiro/.test(content)
    const esg         = /sustentabilidade|esg|ambiental|carbono|social|governança|responsabilidade/.test(content)

    // Certifications
    const certifications: string[] = []
    if (content.includes("iso 9001")) certifications.push("ISO 9001")
    if (content.includes("iso 14001")) certifications.push("ISO 14001")
    if (content.includes("iso 45001")) certifications.push("ISO 45001")
    if (content.includes("inmetro")) certifications.push("INMETRO")
    if (content.includes("abnt")) certifications.push("ABNT")
    if (content.includes("gmp") || content.includes("bpf")) certifications.push("GMP/BPF")

    // Product extraction (simple)
    const products: string[] = []
    const productMatch = html.match(/<h[123][^>]*>([^<]{5,60})<\/h[123]>/gi)
    if (productMatch) products.push(...productMatch.slice(0,5).map(m => m.replace(/<[^>]+>/g,"").trim()))

    // Meta
    const title  = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()
    const metaD  = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{10,250})["']/i)?.[1]?.trim()
      ?? html.match(/<meta[^>]+content=["']([^"']{10,250})["'][^>]+name=["']description["']/i)?.[1]?.trim()

    // Confidence: if name matches + has content, medium. If CNPJ matches, high.
    const confidence: "low"|"medium"|"high" =
      cnpj_match ? "high"
      : name_match ? "medium"
      : "low"

    // Evidence
    const evidence: string[] = []
    if (title)       evidence.push(`Título: ${title}`)
    if (metaD)       evidence.push(`Descrição: ${metaD.slice(0, 100)}`)
    if (name_match)  evidence.push(`Nome "${identity.canonical_name}" encontrado no conteúdo`)
    if (cnpj_match)  evidence.push("CNPJ encontrado na página")
    if (ecommerce)   evidence.push("Canal de vendas digital identificado")
    if (exportation) evidence.push("Menção a operação internacional")

    // Only return if we have at least low confidence
    if (!name_match && !cnpj_match && confidence === "low") {
      // Check if domain name itself matches
      const domainSlug = url.replace(/https?:\/\/(www\.)?/, "").split(".")[0]
      const aliasMatch = identity.aliases.some(a =>
        a.toLowerCase().replace(/[^a-z]/g,"").includes(domainSlug) ||
        domainSlug.includes(a.toLowerCase().slice(0,4).replace(/[^a-z]/g,""))
      )
      if (!aliasMatch) return null
    }

    return {
      found:       true,
      url,
      title,
      description: metaD,
      confidence,
      name_match,
      city_match,
      cnpj_match,
      signals:     { ecommerce, exportation, industry, logistics, b2b, esg, certifications, products: products.slice(0,3) },
      evidence,
      warnings:    [],
    }
  } catch { return null }
}

export async function discoverWebsite(
  identity:   CompanyIdentity,
  municipio?: string,
  manual_url?: string,
): Promise<WebsiteDiscovery> {
  const domains_tried: string[] = []

  // Try manual URL first
  if (manual_url) {
    const result = await tryDomain(manual_url, identity, municipio)
    if (result) return result
  }

  // Try generated domain guesses
  for (const domain of identity.domain_guesses) {
    domains_tried.push(domain)
    const result = await tryDomain(domain, identity, municipio)
    if (result && (result.name_match || result.cnpj_match)) return result
  }

  // Not found
  return {
    found:       false,
    confidence:  "low",
    name_match:  false,
    city_match:  false,
    cnpj_match:  false,
    signals:     { ecommerce: false, exportation: false, industry: false, logistics: false, b2b: false, esg: false, certifications: [], products: [] },
    evidence:    [],
    warnings:    [`Site não encontrado em ${domains_tried.length} domínios candidatos. Informe a URL manualmente.`],
  }
}

// --------- News discovery ---------------------------------------------------------------------------------------------------------------------------------

export async function discoverNews(identity: CompanyIdentity): Promise<NewsSignal[]> {
  const query = encodeURIComponent(identity.canonical_name)
  const url   = `https://news.google.com/rss/search?q=${query}&hl=pt-BR&gl=BR&ceid=BR:pt-419`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7_000) })
    if (!res.ok) return []

    const xml   = await res.text()
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 8)

    return items.map(m => {
      const c     = m[1]
      const title = c.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() ?? ""
      const link  = c.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? null
      const pub   = c.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim()
      const src   = c.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]?.trim() ?? "Google News"
      const lc    = title.toLowerCase()

      const tags: string[] = []
      if (/expan|inaugur|nova unidade|nova loja/.test(lc)) tags.push("expansão")
      if (/export|internacional|mercado externo/.test(lc)) tags.push("exportação")
      if (/invest|aporta|captaç|série [abc]/.test(lc))     tags.push("investimento")
      if (/aquisi|compra|incorpor|fusão/.test(lc))          tags.push("aquisição")
      if (/demiti|crise|fechamento|falência/.test(lc))      tags.push("reestruturação")
      if (/prêmio|premiou|reconhec|destaque/.test(lc))      tags.push("premiação")
      if (/contrat|vagas|seleção|recruta/.test(lc))          tags.push("contratação")
      if (/esg|sustentab|ambiental|carbono/.test(lc))        tags.push("esg")

      const sentiment: "positive"|"neutral"|"negative" =
        tags.some(t => ["expansão","investimento","premiação","exportação"].includes(t)) ? "positive"
        : tags.some(t => ["reestruturação"].includes(t)) ? "negative"
        : "neutral"

      const hook =
        tags.includes("expansão")     ? `${identity.short_name} está em expansão — empresas nesse momento têm complexidade tributária crescente não revisada.`
        : tags.includes("contratação") ? `${identity.short_name} está contratando — folha crescente cria revisão previdenciária estratégica.`
        : tags.includes("exportação")  ? `${identity.short_name} tem operação exportadora identificada em notícia — IPI Crédito Presumido (5,37%) relevante.`
        : tags.includes("investimento") ? `${identity.short_name} captou/investiu recentemente — estrutura tributária pode estar mudando.`
        : `Notícia pública de ${identity.short_name} disponível para contextualizar a abertura.`

      return { title, url: link, source: src, date: pub, tags, sentiment, commercial_hook: hook, confidence: "medium" as const }
    }).filter(i => i.title.length > 5)
  } catch { return [] }
}

// --------- Social presence (search-based, no scraping) ---------------------------------------

export async function discoverSocials(identity: CompanyIdentity): Promise<SocialProfile[]> {
  // Build search-based social candidates without aggressive scraping
  const nome = identity.canonical_name
  const slug  = nome.toLowerCase().replace(/[^a-z0-9]/g,"")

  const candidates: SocialProfile[] = [
    {
      platform:   "linkedin",
      url:        `https://www.linkedin.com/company/${slug}`,
      found:      false,
      confidence: "low",
      signals:    ["URL gerada por nome — confirmar manualmente"],
      source:     "Inferido por nome",
    },
    {
      platform:   "instagram",
      url:        `https://www.instagram.com/${slug}/`,
      found:      false,
      confidence: "low",
      signals:    ["URL gerada por nome — confirmar manualmente"],
      source:     "Inferido por nome",
    },
  ]

  // Try to verify LinkedIn (HEAD request only)
  for (const profile of candidates) {
    if (!profile.url) continue
    try {
      const res = await fetch(profile.url, {
        method: "HEAD",
        signal: AbortSignal.timeout(4_000),
        headers: { "User-Agent": "Mozilla/5.0" },
      })
      if (res.ok || res.status === 302 || res.status === 999) {
        profile.found      = true
        profile.confidence = "medium"
        profile.signals    = ["Perfil pode existir — verificar manualmente"]
      }
    } catch { /* not available */ }
  }

  return candidates
}

// --------- Operational summary builder ---------------------------------------------------------------------------------------

function buildOperationalSummary(
  website: WebsiteDiscovery,
  news:    NewsSignal[],
  identity: CompanyIdentity,
): string {
  const nome = identity.short_name
  const parts: string[] = []

  if (website.found) {
    const ops: string[] = []
    if (website.signals.industry)    ops.push("operação industrial")
    if (website.signals.ecommerce)   ops.push("canal digital")
    if (website.signals.exportation) ops.push("atuação internacional")
    if (website.signals.logistics)   ops.push("operação logística")
    if (website.signals.b2b)         ops.push("modelo B2B")

    if (ops.length > 0) {
      parts.push(`O site institucional de ${nome} indica ${ops.join(", ")}.`)
    } else {
      parts.push(`${nome} possui presença digital identificada.`)
    }

    if (website.signals.certifications.length > 0) {
      parts.push(`Certificações: ${website.signals.certifications.join(", ")}.`)
    }
  } else {
    parts.push(`${nome} não possui site identificado automaticamente — enriquecer manualmente.`)
  }

  if (news.length > 0) {
    const positive = news.filter(n => n.sentiment === "positive")
    if (positive.length > 0) {
      parts.push(`Há ${positive.length} sinal(is) positivo(s) recente(s) na mídia.`)
    }
  }

  return parts.join(" ")
}

// --------- Main engine ------------------------------------------------------------------------------------------------------------------------------------------

export async function buildCompanyPresence(
  identity:    CompanyIdentity,
  municipio?:  string,
  manual_url?: string,
): Promise<CompanyPresence> {
  const t0 = Date.now()

  const [website, news] = await Promise.allSettled([
    discoverWebsite(identity, municipio, manual_url),
    discoverNews(identity),
  ])

  const websiteResult = website.status === "fulfilled" ? website.value : {
    found: false, confidence: "low" as const, name_match: false, city_match: false, cnpj_match: false,
    signals: { ecommerce: false, exportation: false, industry: false, logistics: false, b2b: false, esg: false, certifications: [], products: [] },
    evidence: [], warnings: ["Website discovery failed"],
  }

  const newsResult = news.status === "fulfilled" ? news.value : []

  // Digital presence score
  let score = 0
  if (websiteResult.found)                   score += websiteResult.cnpj_match ? 40 : 25
  if (websiteResult.signals.ecommerce)       score += 10
  if (websiteResult.signals.exportation)     score += 8
  if (newsResult.length >= 3)                score += 15
  else if (newsResult.length >= 1)           score += 8

  const confidence: "low"|"medium"|"high" =
    websiteResult.cnpj_match ? "high"
    : websiteResult.name_match || newsResult.length >= 2 ? "medium"
    : "low"

  const socials = await discoverSocials(identity)

  return {
    entity:               identity,
    website:              websiteResult,
    social_profiles:      socials,
    news_signals:         newsResult,
    operational_summary:  buildOperationalSummary(websiteResult, newsResult, identity),
    digital_presence_score: Math.min(100, score),
    confidence,
    enriched_at:          new Date().toISOString(),
    debug: {
      domains_tried:  identity.domain_guesses,
      search_queries: identity.search_terms,
      news_query:     identity.canonical_name,
      total_ms:       Date.now() - t0,
    },
  }
}
