// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- External Enrichment Sources
// website / news / court / linkedin
// Each returns a SourceResult --- never throws, never invents.
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { SourceResult, WebsiteData, NewsData, CourtData, LinkedInData, ManualEnrichmentInput } from "./types"

const TIMEOUT_MS = 8_000

// --------- Website enrichment ---------------------------------------------------------------------------------------------------------------------

export async function enrichFromWebsite(
  razao_social: string,
  cnpj: string,
  manual_url?: string,
): Promise<SourceResult<WebsiteData>> {
  const fetched_at = new Date().toISOString()

  // Try to infer URL from company name (naive heuristic)
  const slug = razao_social
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(w => !["ltda","sa","me","eireli","epp","sas","ss"].includes(w))
    .slice(0, 2)
    .join("")

  const candidateUrl = manual_url ?? `https://www.${slug}.com.br`

  try {
    const res = await fetch(candidateUrl, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; research-bot)" },
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()

    // Extract meta description
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? null
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? null

    // Signal detection from content
    const content = html.toLowerCase()
    const has_ecommerce = content.includes("carrinho") || content.includes("comprar") || content.includes("loja") || content.includes("checkout")
    const has_export    = content.includes("export") || content.includes("importação") || content.includes("exterior")
    const has_esg       = content.includes("sustentabilidade") || content.includes("esg") || content.includes("ambiental")

    // Extract key phrases from title + description
    const key_phrases = [titleMatch, metaDesc]
      .filter((x): x is string => Boolean(x))
      .flatMap(t => t.split(/[,.|–\-]/).map(s => s.trim()))
      .filter(s => s.length > 5 && s.length < 80)
      .slice(0, 6)

    const data: WebsiteData = {
      url:               candidateUrl,
      found:             true,
      title:             titleMatch?.trim() ?? null,
      description:       metaDesc?.trim() ?? null,
      products_services: [],
      segments_served:   [],
      has_ecommerce,
      has_export,
      has_esg,
      certifications:    [],
      locations:         [],
      about_summary:     metaDesc ?? null,
      key_phrases,
    }

    const findings: string[] = []
    if (data.title)       findings.push(`Site encontrado: ${candidateUrl}`)
    if (data.description) findings.push(`Descrição: ${data.description.slice(0, 100)}`)
    if (has_ecommerce)    findings.push("Sinais de e-commerce identificados no site")
    if (has_export)       findings.push("Sinais de exportação/comércio exterior identificados")
    if (has_esg)          findings.push("Sinais de programa ESG/sustentabilidade identificados")

    return {
      source:      "Site da Empresa",
      source_url:  candidateUrl,
      status:      "success",
      confidence:  "medium",
      data,
      findings,
      warnings:    ["Análise baseada em conteúdo público — pode não refletir toda a operação."],
      fetched_at,
    }

  } catch {
    // Site not found or timeout --- not a failure, just unknown
    return {
      source:    "Site da Empresa",
      status:    "partial",
      confidence: "low",
      data:      { url: candidateUrl, found: false, title: null, description: null, products_services: [], segments_served: [], has_ecommerce: false, has_export: false, has_esg: false, certifications: [], locations: [], about_summary: null, key_phrases: [] },
      findings:  [],
      warnings:  [`Site não encontrado em ${candidateUrl}. Verificar URL manualmente.`],
      fetched_at,
    }
  }
}

// --------- News enrichment ------------------------------------------------------------------------------------------------------------------------------

export async function enrichFromNews(
  razao_social: string,
  cnpj: string,
): Promise<SourceResult<NewsData>> {
  const fetched_at = new Date().toISOString()

  // Use Google News RSS (public, no auth)
  const query = encodeURIComponent(`"${razao_social.split(" ").slice(0, 3).join(" ")}"`)
  const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=pt-BR&gl=BR&ceid=BR:pt-419`

  try {
    const res = await fetch(rssUrl, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const xml = await res.text()

    // Parse items from RSS
    const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 5)

    const items = itemMatches.map(m => {
      const content = m[1]
      const title   = content.match(/<title>(.*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() ?? ""
      const pubDate = content.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? null
      const link    = content.match(/<link>(.*?)<\/link>/)?.[1] ?? null
      const source  = content.match(/<source[^>]*>(.*?)<\/source>/)?.[1] ?? "Google News"

      // Simple sentiment
      const titleLow = title.toLowerCase()
      const positive = ["expansão","crescimento","investimento","novo","lança","record","prêmio"].some(w => titleLow.includes(w))
      const negative  = ["crise","demissão","fechamento","fraude","processo","perda"].some(w => titleLow.includes(w))

      const tags: string[] = []
      if (titleLow.includes("expans") || titleLow.includes("cresce")) tags.push("expansão")
      if (titleLow.includes("export")) tags.push("exportação")
      if (titleLow.includes("invest")) tags.push("investimento")
      if (titleLow.includes("nova unidade") || titleLow.includes("inaugurou")) tags.push("nova_unidade")
      if (titleLow.includes("demiti") || titleLow.includes("corte")) tags.push("reestruturação")

      return {
        title,
        summary: title,
        date:    pubDate,
        source,
        url:     link,
        sentiment: (positive ? "positive" : negative ? "negative" : "neutral") as "positive" | "neutral" | "negative",
        tags,
      }
    })

    const top_signals = [...new Set(items.flatMap(i => i.tags))]
    const growth_signals = items.some(i => i.sentiment === "positive")
    const risk_signals   = items.some(i => i.sentiment === "negative")

    const findings = items.slice(0, 3).map(i => `Notícia: "${i.title.slice(0, 80)}"`)

    return {
      source:     "Google News",
      source_url: rssUrl,
      status:     items.length > 0 ? "success" : "partial",
      confidence: items.length > 0 ? "medium" : "low",
      data:       { items, top_signals, growth_signals, risk_signals },
      findings,
      warnings:   items.length === 0 ? ["Nenhuma notícia encontrada. Empresa pode ter baixa cobertura midiática."] : [],
      fetched_at,
    }

  } catch {
    return {
      source:    "Google News",
      status:    "partial",
      confidence: "low",
      data:      { items: [], top_signals: [], growth_signals: false, risk_signals: false },
      findings:  [],
      warnings:  ["Google News indisponível ou empresa sem cobertura midiática."],
      fetched_at,
    }
  }
}

// --------- Court enrichment (manual-first, scraping-assisted) ---------------------
// Automated scraping of court systems is legally and technically
// complex. This module supports manual input by the consultant
// and provides structure for future automation.

export async function enrichFromCourts(
  cnpj: string,
  manual_input?: string,
): Promise<SourceResult<CourtData>> {
  const fetched_at = new Date().toISOString()
  const clean = cnpj.replace(/\D/g, "")

  const data: CourtData = {
    cases:              [],
    has_tax_litigation: false,
    recurring_themes:   [],
    known_lawyers:      [],
    maturity_level:     "none",
    manual_input,
  }

  // Parse manual input if provided
  if (manual_input && manual_input.trim().length > 0) {
    const text = manual_input.toLowerCase()

    data.has_tax_litigation = text.includes("tributár") || text.includes("fiscal") || text.includes("cofins") || text.includes("irpj")

    const themes: string[] = []
    if (text.includes("icms"))    themes.push("ICMS")
    if (text.includes("pis") || text.includes("cofins")) themes.push("PIS/COFINS")
    if (text.includes("irpj") || text.includes("csll"))  themes.push("IRPJ/CSLL")
    if (text.includes("inss") || text.includes("previdenciário")) themes.push("Previdenciário")
    if (text.includes("mandado de segurança"))  themes.push("Mandado de Segurança")
    if (text.includes("execução fiscal"))       themes.push("Execução Fiscal")

    data.recurring_themes = themes
    data.maturity_level   = themes.length >= 2 ? "medium" : themes.length === 1 ? "low" : "none"

    return {
      source:    "Tribunais (input manual do consultor)",
      status:    "success",
      confidence: "medium",
      data,
      findings:  data.has_tax_litigation ? ["Histórico tributário litigioso identificado no input manual."] : [],
      warnings:  ["Dados inseridos manualmente — verificar nas fontes primárias."],
      fetched_at,
    }
  }

  // Without manual input, return structured empty result
  return {
    source:    "Tribunais",
    status:    "skipped",
    confidence: "low",
    data,
    findings:  [],
    warnings:  ["Consulta a tribunais não automatizada. Cole informações encontradas manualmente para enriquecer."],
    fetched_at,
  }
}

// --------- LinkedIn enrichment (manual-first) ---------------------------------------------------------------------
// LinkedIn automation violates ToS. This module supports:
// 1. Manual input by consultant
// 2. Name/title parsing from pasted content

export async function enrichFromLinkedIn(
  razao_social: string,
  manual_input?: ManualEnrichmentInput,
): Promise<SourceResult<LinkedInData>> {
  const fetched_at = new Date().toISOString()

  const data: LinkedInData = {
    decision_makers: [],
    manual_input:    manual_input?.notes,
  }

  // Parse manually provided decision maker
  if (manual_input?.decision_maker_name && manual_input?.decision_maker_title) {
    const title_lower = manual_input.decision_maker_title.toLowerCase()
    const is_target = ["cfo","financeiro","controller","fiscal","tributário","sócio","diretor","ceo"].some(t => title_lower.includes(t))

    data.decision_makers.push({
      name:        manual_input.decision_maker_name,
      title:       manual_input.decision_maker_title,
      linkedin_url: manual_input.linkedin_url,
      confidence:  "medium",
      source:      "manual",
      is_target,
    })
  }

  // Parse from notes if they contain name patterns
  if (manual_input?.notes) {
    const lines = manual_input.notes.split("\n").filter(l => l.trim())
    for (const line of lines.slice(0, 5)) {
      if (line.match(/CFO|Controller|Financeiro|Fiscal|Tributário|Sócio|Diretor/i)) {
        const parts = line.split(/[-–|]/).map(s => s.trim())
        if (parts.length >= 2) {
          data.decision_makers.push({
            name:       parts[0],
            title:      parts[1],
            confidence: "low",
            source:     "manual",
            is_target:  true,
          })
        }
      }
    }
  }

  const hasData = data.decision_makers.length > 0

  return {
    source:    "LinkedIn (input manual)",
    status:    hasData ? "success" : "skipped",
    confidence: hasData ? "medium" : "low",
    data,
    findings:  data.decision_makers.map(dm => `Decisor identificado: ${dm.name} (${dm.title})`),
    warnings:  [
      ...(hasData ? [] : ["Nenhum decisor identificado. Cole nomes e cargos encontrados no LinkedIn para enriquecer."]),
      "Dados de LinkedIn inseridos manualmente — verificar atualização dos cargos.",
    ],
    fetched_at,
  }
}
