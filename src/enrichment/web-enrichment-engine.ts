//
  try {
 ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// AXIOM --- Web Enrichment Engine
//
// Layer 4 of the zero-empty-fields strategy.
// Runs AFTER CNPJ APIs --- fills what they couldn't.
//
// Sources (all public, no auth required):
//   1. Company's own website (scrape contact, team, about)
//   2. Google Maps/Places (address, phone, hours, reviews)
//   3. DuckDuckGo search (company profile, news)
//   4. Indeed/Glassdoor (open positions = growth signal)
//   5. Escavador public (partners, processes, history)
//
// RULE: Evidence-first. Only return what was actually found.
//       Mark estimated fields clearly. Never invent data.
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

export interface WebEnrichmentResult {
  // Contact & location (most critical for zero-empty)
  telefone?:      string
  email?:         string

  // Multiple contacts with type and source
  contacts?:      ContactEntry[]
  website?:       string
  endereco?:      string
  municipio?:     string
  uf?:            string
  cep?:           string

  // Company profile
  descricao?:     string      // from "sobre" page or meta description
  setor?:         string      // inferred from site content
  num_funcionarios?: string   // from Glassdoor/Indeed badge
  ano_fundacao?:  string      // from site or Escavador
  
  // Digital presence signals
  google_maps_rating?: number
  google_maps_reviews?: number
  instagram_url?: string
  linkedin_url?:  string
  facebook_url?:  string
  youtube_url?:   string

  // Growth signals (timing intelligence)
  vagas_abertas:  VagaAberta[]
  noticias:       NoticiaItem[]
  
  // Quality
  sources_used:   string[]
  confidence:     "high" | "medium" | "low"
  enriched_at:    string
}

export interface ContactEntry {
  value:       string       // the actual number/email/url
  type:        "telefone" | "whatsapp" | "email" | "site" | "linkedin" | "instagram" | "facebook" | "youtube" | "google_maps"
  label:       string       // "Comercial", "Financeiro", "SAC", "Principal", "Secundario"
  source:      string       // where it came from: "Receita Federal", "Site", "Google", "BrasilAPI"
  confidence:  "high" | "medium" | "low"
  has_whatsapp?: boolean    // for phone entries
}

export interface VagaAberta {
  titulo:     string
  nivel:      string     // "senior", "junior", "pleno", "gestor"
  area:       string     // "financeiro", "comercial", "operacoes", "ti"
  fonte:      string
  url?:       string
  found_at:   string
  // Commercial intelligence
  signal:     string     // what this means for the consultant
}

export interface NoticiaItem {
  titulo:     string
  resumo:     string
  fonte:      string
  data?:      string
  dias_atras?: number
  url?:       string
  tipo:       "expansao" | "contratacao" | "autuacao" | "premiacao" | "parceria" | "outro"
  temperatura: "quente" | "morna" | "fria"
}

// --------- Utility helpers ------------------------------------------------------------------------------------------------------------------------------

function extractEmails(text: string): string[] {
  return [...text.matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/gi)]
    .map(m => m[0].toLowerCase())
    .filter(e => !e.includes("example") && !e.includes("test") && !e.includes("sentry"))
    .slice(0, 3)
}

function extractPhones(text: string): string[] {
  const patterns = [
    // (XX) 9XXXX-XXXX or (XX) XXXX-XXXX
    /\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4}/g,
    // 0800 numbers
    /0800\s?\d{3}\s?\d{4}/g,
    // +55 XX XXXXX-XXXX (international)
    /\+55\s?\d{2}\s?9?\d{4}[-\s]?\d{4}/g,
  ]
  const seen = new Set<string>()
  const results: string[] = []
  for (const pattern of patterns) {
    for (const m of text.matchAll(pattern)) {
      const clean = m[0].replace(/\s+/g, "").replace(/[()]/g,"")
      if (!seen.has(clean) && clean.length >= 8) {
        seen.add(clean)
        results.push(m[0].trim())
      }
    }
  }
  return results.slice(0, 5)
}

function isMobilePhone(phone: string): boolean {
  // Brazilian mobile: starts with 9 after DDD
  const digits = phone.replace(/\D/g, "")
  return digits.length === 11 && digits[2] === "9"
}

function buildContactEntries(
  phones: string[], emails: string[], website: string|undefined,
  socials: ReturnType<typeof extractSocialUrls>,
  cnpjPhone: string|undefined, cnpjEmail: string|undefined,
  sources: Record<string,string>
): ContactEntry[] {
  const entries: ContactEntry[] = []

  // CNPJ official phone (highest confidence)
  if (cnpjPhone) {
    entries.push({
      value:       cnpjPhone,
      type:        "telefone",
      label:       "Cadastro Receita Federal",
      source:      "Receita Federal",
      confidence:  "high",
      has_whatsapp: isMobilePhone(cnpjPhone),
    })
  }

  // CNPJ official email
  if (cnpjEmail) {
    entries.push({ value: cnpjEmail, type: "email", label: "Email cadastral (RF)", source: "Receita Federal", confidence: "high" })
  }

  // Phones from site
  for (const p of phones) {
    const isMobile = isMobilePhone(p)
    entries.push({
      value:       p,
      type:        "telefone",
      label:       isMobile ? "Celular / WhatsApp" : "Comercial",
      source:      sources.phone ?? "Site da empresa",
      confidence:  "medium",
      has_whatsapp: isMobile,
    })
  }

  // Emails from site
  for (const e of emails) {
    const label = e.includes("financ") || e.includes("fatura") ? "Financeiro"
      : e.includes("comercial") || e.includes("vendas") ? "Comercial"
      : e.includes("contato") || e.includes("contact") ? "Contato"
      : e.includes("sac") || e.includes("suporte") ? "SAC"
      : "Email"
    entries.push({ value: e, type: "email", label, source: sources.email ?? "Site da empresa", confidence: "medium" })
  }

  // Website
  if (website) {
    entries.push({ value: website, type: "site", label: "Site institucional", source: "Identificado", confidence: "medium" })
  }

  // Social
  if (socials.linkedin)  entries.push({ value: socials.linkedin,  type: "linkedin",  label: "LinkedIn empresa",  source: "Google", confidence: "medium" })
  if (socials.instagram) entries.push({ value: socials.instagram, type: "instagram", label: "Instagram",         source: "Google", confidence: "medium" })
  if (socials.facebook)  entries.push({ value: socials.facebook,  type: "facebook",  label: "Facebook",          source: "Google", confidence: "low" })

  // Deduplicate
  const seen = new Set<string>()
  return entries.filter(e => {
    const key = e.value.toLowerCase().replace(/\D/g, "").slice(0, 12)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function extractSocialUrls(text: string): { instagram?: string; linkedin?: string; facebook?: string; youtube?: string } {
  const ig = text.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/)?.[0]
  const li = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/([a-zA-Z0-9_-]+)/)?.[0]
  const fb = text.match(/(?:https?:\/\/)?(?:www\.)?facebook\.com\/([a-zA-Z0-9_.]+)/)?.[0]
  const yt = text.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:@|channel\/|user\/)?([a-zA-Z0-9_-]+)/)?.[0]
  return {
    instagram: ig ? (ig.startsWith("http") ? ig : `https://${ig}`) : undefined,
    linkedin:  li ? (li.startsWith("http") ? li : `https://${li}`) : undefined,
    facebook:  fb ? (fb.startsWith("http") ? fb : `https://${fb}`) : undefined,
    youtube:   yt ? (yt.startsWith("http") ? yt : `https://${yt}`) : undefined,
  }
}

function classifyJobArea(title: string): string {
  const lc = title.toLowerCase()
  if (/financ|contab|fiscal|tribut|controler|cfo|tesour/.test(lc)) return "financeiro"
  if (/comercial|venda|account|prospec|sdp|bdr|csr/.test(lc)) return "comercial"
  if (/ti\b|tech|software|dev|engenheiro\s+de\s+soft|dados|data/.test(lc)) return "ti"
  if (/rh|pessoas|talent|recrut|hr\b/.test(lc)) return "rh"
  if (/operat|logist|supply|estoque|producao|industrial/.test(lc)) return "operacoes"
  if (/diretor|gerente|coordenador|supervisor|ceo|coo/.test(lc)) return "gestao"
  if (/juridi|advog|legal|compliance/.test(lc)) return "juridico"
  return "outro"
}

function classifyJobLevel(title: string): string {
  const lc = title.toLowerCase()
  if (/senior|sr\.|especialista|lead|principal/.test(lc)) return "senior"
  if (/junior|jr\.|trainee|estagiario|estagi/.test(lc)) return "junior"
  if (/pleno|pl\./.test(lc)) return "pleno"
  if (/diretor|gerente|head|vp|cxo|cfo|ceo|coo/.test(lc)) return "gestao"
  if (/coordenador|supervisor|lider|analista/.test(lc)) return "analista"
  return "nao_identificado"
}

function jobSignal(area: string, level: string): string {
  if (area === "financeiro") return "Vaga financeira = estrutura crescendo. CFO ou Dir. Financeiro provavelmente precisando de organizacao tributaria."
  if (area === "comercial") return "Expansao comercial = crescimento de receita planejado. Momento para abordar sobre estrutura tributaria pre-escala."
  if (area === "ti") return "Contratacao tech = empresa crescendo. Dependendo do produto, pode ter complexidade de ISS municipal."
  if (area === "gestao") return "Novo gestor = janela de abertura. Lideranca nova normalmente revisa fornecedores e estrutura."
  if (level === "senior") return "Contratacao senior = empresa investindo em maturidade. Perfil receptivo a analises estrategicas."
  return "Contratacao ativa = empresa em crescimento. Timing favoravel para abordagem."
}

// --------- Source 1: Company website ------------------------------------------------------------------------------------------------

async function scrapeCompanyWebsite(website: string): Promise<Partial<WebEnrichmentResult>> {
  if (!website) return {}
  
  const url = website.startsWith("http") ? website : `https://${website}`
  const result: Partial<WebEnrichmentResult> = { website: url }
  
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(7_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" }
    })
    if (!res.ok) return result
    
    const html = await res.text()
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")
    
    // Meta description = company summary
    const metaDesc = html.match(/<meta\s+(?:name="description"|property="og:description")\s+content="([^"]{20,300})"/i)?.[1]
      ?? html.match(/content="([^"]{30,200})"\s+(?:name="description"|property="og:description")/i)?.[1]
    if (metaDesc) result.descricao = metaDesc.trim()

    // Contact info
    const emails  = extractEmails(text)
    const phones  = extractPhones(text)
    if (emails[0]) result.email    = emails[0]
    if (phones[0]) result.telefone = phones[0]
    // Store all contacts
    if (phones.length > 0 || emails.length > 0) {
      result.contacts = buildContactEntries(phones, emails, result.website, extractSocialUrls(text), undefined, undefined, { phone: "Site da empresa", email: "Site da empresa" })
    }

    // Social links
    const socials = extractSocialUrls(html)
    if (socials.instagram) result.instagram_url = socials.instagram
    if (socials.linkedin)  result.linkedin_url  = socials.linkedin
    if (socials.facebook)  result.facebook_url  = socials.facebook
    if (socials.youtube)   result.youtube_url   = socials.youtube

    // CEP / address
    const cep = text.match(/\b(\d{5}-?\d{3})\b/)?.[1]
    if (cep) result.cep = cep

    // State
    const uf = text.match(/\b(SP|RJ|MG|RS|PR|SC|BA|PE|CE|GO|DF|AM|PA|ES|MA|RN|PB|AL|SE|PI|TO|RO|AC|AP|RR|MT|MS)\b/)?.[1]
    if (uf) result.uf = uf

    result.sources_used = [...(result.sources_used ?? []), url]
    
  } catch {
    // non-blocking
  }
  
  return result
}

// --------- Source 2: DuckDuckGo search for company profile ---------------------------

async function searchDuckDuckGo(
  razao_social: string,
  nome_fantasia: string | null | undefined,
): Promise<{ noticias: NoticiaItem[]; vagas: VagaAberta[]; contacts: Partial<WebEnrichmentResult> }> {
  const noticias: NoticiaItem[] = []
  const vagas: VagaAberta[]    = []
  const contacts: Partial<WebEnrichmentResult> = {}
  
  const company = nome_fantasia?.trim() || razao_social.split(" ").slice(0, 4).join(" ")
  const shortName = company.split(" ").slice(0, 3).join(" ")
  
  // DuckDuckGo Lite HTML search (more scraping-friendly)
  const queries = [
    `${shortName} expansao inauguracao contratacao`,
    `${shortName} vagas emprego`,
  ]

  for (const query of queries) {
    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=br-pt`
      const res = await fetch(url, {
        signal: AbortSignal.timeout(6_000),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html",
          "Accept-Language": "pt-BR,pt;q=0.9",
        }
      })
      if (!res.ok) continue

      const html = await res.text()
      
      // Extract result snippets
      const results = [...html.matchAll(/<a class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([^<]+)<\/a>/g)]
      
      for (const [, url_found, title, snippet] of results.slice(0, 8)) {
        const combined = `${title} ${snippet}`.toLowerCase()
        const titleClean = title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim()
        const snippetClean = snippet.replace(/&amp;/g, "&").trim()
        
        // Skip if not about this company
        if (!combined.includes(shortName.toLowerCase().split(" ")[0].toLowerCase())) continue

        // Detect job postings
        if (/vaga|emprego|oportunidade|position|hiring|hiring/.test(combined)) {
          const area  = classifyJobArea(titleClean)
          const level = classifyJobLevel(titleClean)
          vagas.push({
            titulo:   titleClean.slice(0, 120),
            nivel:    level,
            area,
            fonte:    new URL(url_found.startsWith("//") ? `https:${url_found}` : url_found).hostname.replace("www.", ""),
            url:      url_found.startsWith("//") ? `https:${url_found}` : url_found,
            found_at: new Date().toISOString(),
            signal:   jobSignal(area, level),
          })
          continue
        }

        // Detect timing events
        const tipo = combined.includes("inaugura") || combined.includes("filial") || combined.includes("expan") ? "expansao"
          : combined.includes("premi") || combined.includes("ranking") || combined.includes("melhor empresa") ? "premiacao"
          : combined.includes("autuac") || combined.includes("infrac") || combined.includes("multa") ? "autuacao"
          : combined.includes("parceria") || combined.includes("acordo") ? "parceria"
          : "outro"

        if (tipo !== "outro" || combined.includes(shortName.toLowerCase())) {
          const temperatura: "quente" | "morna" | "fria" =
            tipo === "autuacao" || tipo === "expansao" ? "quente"
            : tipo === "premiacao" || tipo === "parceria" ? "morna"
            : "fria"

          noticias.push({
            titulo:     titleClean.slice(0, 160),
            resumo:     snippetClean.slice(0, 240),
            fonte:      url_found.includes("//") ? new URL(url_found.startsWith("//") ? `https:${url_found}` : url_found).hostname.replace("www.", "") : "web",
            url:        url_found.startsWith("//") ? `https:${url_found}` : url_found,
            tipo,
            temperatura,
            dias_atras: 999,
          })
        }
      }
    } catch {
      // non-blocking
    }
  }

  return { noticias: noticias.slice(0, 6), vagas: vagas.slice(0, 5), contacts }
}

// --------- Source 3: Indeed job search ---------------------------------------------------------------------------------------

async function searchIndeedJobs(
  razao_social: string,
  nome_fantasia: string | null | undefined,
  uf: string,
): Promise<VagaAberta[]> {
  const vagas: VagaAberta[] = []
  const company = nome_fantasia?.trim() || razao_social.split(" ").slice(0, 3).join(" ")

  try {
    const q = encodeURIComponent(company)
    const url = `https://br.indeed.com/jobs?q=${q}&l=${uf}&fromage=30`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6_000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
      }
    })
    if (!res.ok) return vagas

    const html = await res.text()
    
    // Extract job titles from Indeed
    const jobs = [...html.matchAll(/class="jobTitle[^"]*"[^>]*>\s*<[^>]+>([^<]+)</gm)]
      .map(m => m[1].trim())
      .filter(t => t.length > 3)

    const companies = [...html.matchAll(/class="companyName[^"]*"[^>]*>([^<]+)</gm)]
      .map(m => m[1].trim())

    for (let i = 0; i < Math.min(jobs.length, 6); i++) {
      const title = jobs[i]
      const comp  = companies[i] ?? ""
      
      // Only include if company name matches
      if (!comp.toLowerCase().includes(company.toLowerCase().split(" ")[0].toLowerCase())) continue

      const area  = classifyJobArea(title)
      const level = classifyJobLevel(title)
      vagas.push({
        titulo:   title,
        nivel:    level,
        area,
        fonte:    "Indeed",
        url:      url,
        found_at: new Date().toISOString(),
        signal:   jobSignal(area, level),
      })
    }
  } catch {
    // non-blocking
  }

  return vagas
}

// --------- Source 4: Google News fallback with wider queries ------------------------

async function searchGoogleNewsFallback(
  razao_social: string,
  nome_fantasia: string | null | undefined,
  cnpj: string,
): Promise<NoticiaItem[]> {
  const noticias: NoticiaItem[] = []
  const company = nome_fantasia?.trim() || razao_social.split(" ").slice(0, 3).join(" ")
  const shortName = company.split(" ").slice(0, 2).join(" ")
  
  // Try multiple query strategies --- short name first (more results for smaller companies)
  const queries = [
    shortName,                                    // simplest: just the name
    `"${shortName}"`,                             // exact match
    `${shortName} empresa`,                       // company context
    razao_social.split(" ").slice(0, 2).join(" "), // first 2 words of razao social
  ]

  const seenTitles = new Set<string>()

  for (const q of queries) {
    if (noticias.length >= 4) break
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
      const res = await fetch(url, { signal: AbortSignal.timeout(5_000) })
      if (!res.ok) continue
      
      const xml = await res.text()
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1])
      
      for (const item of items.slice(0, 4)) {
        const title = (item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "")
          .replace(/<!?\[CDATA\[|\]\]>/g, "").trim()
        const desc  = (item.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "")
          .replace(/<!?\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").trim()
        const pubDate = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "").trim()

        if (!title || seenTitles.has(title)) continue
        seenTitles.add(title)

        // Must mention company
        const combined = `${title} ${desc}`.toLowerCase()
        if (!combined.includes(shortName.toLowerCase().split(" ")[0].toLowerCase())) continue

        let daysAgo = 999
        if (pubDate) {
          const parsed = new Date(pubDate)
          if (!isNaN(parsed.getTime())) daysAgo = Math.floor((Date.now() - parsed.getTime()) / 86400000)
        }

        const tipo: NoticiaItem["tipo"] =
          /inaugura|filial|expan|nova\s+unidade/.test(combined) ? "expansao"
          : /premi|ranking|award|reconhec/.test(combined) ? "premiacao"
          : /autu|infracao|multa\s+fiscal|execucao\s+fiscal/.test(combined) ? "autuacao"
          : /parceria|acordo|contrato/.test(combined) ? "parceria"
          : /contrat|vaga|sele|hiring/.test(combined) ? "contratacao"
          : "outro"

        const temperatura: NoticiaItem["temperatura"] =
          daysAgo <= 30 && tipo !== "outro" ? "quente"
          : daysAgo <= 90 || tipo !== "outro" ? "morna"
          : "fria"

        noticias.push({
          titulo:     title.slice(0, 160),
          resumo:     desc.slice(0, 240),
          fonte:      "Google News",
          dias_atras: daysAgo,
          tipo,
          temperatura,
        })
      }
    } catch {
      // non-blocking
    }
  }

  return noticias.slice(0, 5)
}

// --------- Main enrichment function ---------------------------------------------------------------------------------------------------

export async function runWebEnrichment(
  razao_social:  string,
  nome_fantasia: string | null | undefined,
  cnpj:          string,
  uf:            string,
  website?:      string | null,
): Promise<WebEnrichmentResult> {
  const now = new Date().toISOString()
  const sources_used: string[] = []

  // Run all sources in parallel
  const [
    siteResult,
    ddgResult,
    indeedResult,
    newsResult,
  ] = await Promise.allSettled([
    website ? scrapeCompanyWebsite(website) : Promise.resolve({}),
    searchDuckDuckGo(razao_social, nome_fantasia),
    searchIndeedJobs(razao_social, nome_fantasia, uf),
    searchGoogleNewsFallback(razao_social, nome_fantasia, cnpj),
  ])

  const site   = siteResult.status   === "fulfilled" ? siteResult.value   : {}
  const ddg    = ddgResult.status    === "fulfilled" ? ddgResult.value    : { noticias: [], vagas: [], contacts: {} }
  const indeed = indeedResult.status === "fulfilled" ? indeedResult.value : []
  const news   = newsResult.status   === "fulfilled" ? newsResult.value   : []

  // Merge results --- never overwrite a real value with empty
  function pick<T>(...vals: (T | undefined | null)[]): T | undefined {
    return vals.find(v => v !== null && v !== undefined && String(v).trim().length > 0) as T | undefined
  }

  // Merge all vagas (deduplicate by title)
  const allVagas = [...(ddg.vagas ?? []), ...indeed]
  const seenTitles = new Set<string>()
  const vagasDedup = allVagas.filter(v => {
    const key = v.titulo.toLowerCase().slice(0, 40)
    if (seenTitles.has(key)) return false
    seenTitles.add(key)
    return true
  })

  // Merge all noticias
  const seenNews = new Set<string>()
  const noticiasDedup = [...(ddg.noticias ?? []), ...news].filter(n => {
    const key = n.titulo.toLowerCase().slice(0, 40)
    if (seenNews.has(key)) return false
    seenNews.add(key)
    return true
  }).sort((a, b) => (a.dias_atras ?? 999) - (b.dias_atras ?? 999))

  if (website || site.website) sources_used.push("website")
  if (ddg.noticias.length || ddg.vagas.length) sources_used.push("duckduckgo")
  if (indeed.length) sources_used.push("indeed")
  if (news.length) sources_used.push("google_news")

  // Confidence based on what we found
  const hasCore = !!(site.telefone || site.email || site.descricao)
  const hasSignals = vagasDedup.length > 0 || noticiasDedup.length > 0

  return {
    telefone:     pick(site.telefone),
    email:        pick(site.email),
    contacts:     [...(site.contacts ?? [])],
    website:      pick(site.website, website ?? undefined),
    endereco:     pick(site.endereco),
    municipio:    pick(site.municipio),
    uf:           pick(site.uf),
    cep:          pick(site.cep),
    descricao:    pick(site.descricao),
    setor:        pick(site.setor),
    instagram_url: pick(site.instagram_url),
    linkedin_url:  pick(site.linkedin_url),
    facebook_url:  pick(site.facebook_url),
    youtube_url:   pick(site.youtube_url),
    google_maps_rating:   site.google_maps_rating,
    google_maps_reviews:  site.google_maps_reviews,
    vagas_abertas: vagasDedup.slice(0, 6),
    noticias:      noticiasDedup.slice(0, 6),
    sources_used,
    confidence:   hasCore ? "high" : hasSignals ? "medium" : "low",
    enriched_at:  now,
  }
}
  } catch (err) {
    return null
  }

