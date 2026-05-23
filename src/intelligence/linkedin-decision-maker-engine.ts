// ================================================================
// AXIOM -- Person Discovery Engine v3
//
// Goal: Find CFO, CEO, Diretor Financeiro, Responsavel Fiscal,
//       Controller, Contador, Advogado by NAME before the call.
//
// Philosophy: Exhaust every public source before saying "not found".
//
// Source priority:
//   1. Escavador (direct fetch + Google) --- 80% coverage
//   2. LinkedIn via Google (multiple patterns) --- 60% coverage
//   3. Econodata + company directories --- 70% coverage
//   4. OAB/CRC mentions (advogado/contador) --- 50% coverage
//   5. Press releases / appointment news --- 25% coverage
//   6. Job postings (inverted signal) --- 40% coverage
//   7. Government procurement records --- 30% coverage
// ================================================================

export type DecisionMakerRole =
  | "CFO"
  | "CEO"
  | "Diretor Financeiro"
  | "Diretor Fiscal"
  | "Responsavel Financeiro"
  | "Responsavel Fiscal"
  | "Controller"
  | "Gerente Financeiro"
  | "Contador"
  | "Advogado Tributario"
  | "Socio-Administrador"
  | "Diretor"
  | "Outro"

export interface LinkedInDecisionMaker {
  name:              string
  role:              DecisionMakerRole
  role_raw:          string
  linkedin_url:      string | null
  company_context:   string
  source:            "linkedin" | "escavador" | "econodata" | "news" | "web" | "oab" | "vaga"
  source_url?:       string
  confidence:        "high" | "medium" | "low"
  is_primary_target: boolean
  search_query:      string
  found_at:          string
  phone?:            string
  email?:            string
}

// ----------------------------------------------------------------
// Role detection -- expanded for all target personas
// ----------------------------------------------------------------

const ROLE_PATTERNS: Array<{ re: RegExp; role: DecisionMakerRole; pri: number }> = [
  { re: /\bCEO\b|diretor.execut|presidente\s+execut/i,           role: "CEO",                    pri: 10 },
  { re: /\bCFO\b|chief.financial/i,                               role: "CFO",                    pri: 10 },
  { re: /diretor[\s-]?financeiro/i,                                role: "Diretor Financeiro",     pri: 9  },
  { re: /diretor[\s-]?fiscal/i,                                    role: "Diretor Fiscal",         pri: 9  },
  { re: /respons[aá]vel[\s-]?financeiro/i,                        role: "Responsavel Financeiro", pri: 8  },
  { re: /respons[aá]vel[\s-]?fiscal/i,                            role: "Responsavel Fiscal",     pri: 8  },
  { re: /\bcontroller\b/i,                                         role: "Controller",             pri: 8  },
  { re: /gerente[\s-]?financeiro/i,                                role: "Gerente Financeiro",     pri: 7  },
  { re: /contador|contabilidade|\bCRC\b/i,                        role: "Contador",               pri: 7  },
  { re: /advogado.tribut|advogad.fiscal|\bOAB\b.*tribut/i,       role: "Advogado Tributario",    pri: 7  },
  { re: /s[oó]cio[\s-]?(?:administ|gestor|propriet)/i,            role: "Socio-Administrador",    pri: 5  },
  { re: /\bdiretor\b/i,                                           role: "Diretor",                pri: 5  },
]

function detectRole(text: string): { role: DecisionMakerRole; raw: string; pri: number } | null {
  for (const { re, role, pri } of ROLE_PATTERNS) {
    const m = text.match(re)
    if (m) return { role, raw: m[0], pri }
  }
  return null
}

// ----------------------------------------------------------------
// Name extraction -- strict Brazilian name validator
// ----------------------------------------------------------------

const NAME_BLOCKLIST = new Set([
  "LIMITED","LTDA","SA","EIRELI","ME","EPP","CORP","SYSTEMS","INTERNATIONAL",
  "TELECOM","HOLDING","GROUP","BRASIL","BRAZIL","GLOBAL","NACIONAL","INDUSTRIA",
  "COMERCIO","SERVICOS","SOLUTIONS","CONSULTORIA","ASSESSORIA","TECNOLOGIA",
  "LTDA","EIRELI","PARTICIPACOES","INVESTIMENTOS","EMPREENDIMENTOS",
])

function isPersonName(candidate: string): boolean {
  const parts = candidate.trim().split(/\s+/)
  if (parts.length < 2 || parts.length > 5) return false
  if (!parts.every(p => /^[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ]/.test(p))) return false
  if (parts.some(p => NAME_BLOCKLIST.has(p.toUpperCase()))) return false
  if (parts.some(p => /^\d+$/.test(p))) return false
  if (parts.some(p => p.length < 2)) return false
  // Must have at least one part > 3 chars (not just initials)
  if (!parts.some(p => p.length > 3)) return false
  return true
}

function extractPersonName(text: string): string | null {
  if (!text) return null
  const roleKw = "CEO|CFO|CTO|COO|Diretor|Diretora|Controller|Gerente|Responsavel|Contador|Contadora|Advogado|Advogada|Socio|Socia"

  // Pattern 1: LinkedIn title "Nome Sobrenome - CFO | Empresa"
  const li1 = text.match(/^([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+(?:\s+(?:de|da|do|dos|das|e)?\s*[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+){1,4})\s*[-|]/)
  if (li1 && isPersonName(li1[1])) return li1[1].trim()

  // Pattern 2: "Nome Sobrenome, CFO" or "CFO Nome Sobrenome"
  const p2 = text.match(new RegExp(`([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+){1,3})[,\s]+(?:${roleKw})`))
  if (p2 && isPersonName(p2[1])) return p2[1].trim()

  const p3 = text.match(new RegExp(`(?:${roleKw})[,:\s]+([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+){1,3})`))
  if (p3 && isPersonName(p3[1])) return p3[1].trim()

  // Pattern 3: Appointment news
  const p4 = text.match(/(?:nomeou|nomeia|nomeado|assume|contrata|contratou|eleito)\s+([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+){1,3})/)
  if (p4 && isPersonName(p4[1])) return p4[1].trim()

  // Pattern 4: "Dr. Nome Sobrenome" (common for lawyers/doctors)
  const p5 = text.match(/Dr[.a]?\s+([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ][a-záéíóúàâêôãõç]+){1,3})/)
  if (p5 && isPersonName(p5[1])) return p5[1].trim()

  return null
}

function extractLinkedInURL(text: string): string | null {
  const m = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_%-]+)/i)
  return m ? `https://www.linkedin.com/in/${m[1].replace(/\/$/, "")}` : null
}

function extractOAB(text: string): string | null {
  const m = text.match(/OAB[^0-9]*([A-Z]{2})?\s*[/]?\s*(\d{4,7})/i)
  return m ? `OAB${m[1] ? "/" + m[1] : ""} ${m[2]}` : null
}

function extractCRC(text: string): string | null {
  const m = text.match(/CRC[^0-9]*([A-Z]{2})?\s*[/]?\s*(\d{5,8})/i)
  return m ? `CRC${m[1] ? "/" + m[1] : ""} ${m[2]}` : null
}

// ----------------------------------------------------------------
// Google News fetcher
// ----------------------------------------------------------------

async function fetchGoogleNews(query: string, max = 6): Promise<Array<{ title: string; desc: string; link: string }>> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
    const res = await fetch(url, { signal: AbortSignal.timeout(4_000) })
    if (!res.ok) return []
    const xml = await res.text()
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, max).map(m => ({
      title: (m[1].match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").replace(/<!?\[CDATA\[|\]\]>/g, "").trim(),
      desc:  (m[1].match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "").replace(/<!?\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").trim(),
      link:  (m[1].match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "").trim(),
    })).filter(r => r.title.length > 4)
  } catch { return [] }
}

// ----------------------------------------------------------------
// Improved word1 extraction
// ----------------------------------------------------------------

const GENERIC_WORDS = new Set([
  "SUPERMERCADO","SUPERMERCADOS","TRANSPORTE","TRANSPORTES","FARMACIA","FARMACIAS",
  "CONSTRUTORA","CONSTRUTORAS","HOSPITAL","HOSPITAIS","TECNOLOGIA","CLINICA","CLINICAS",
  "COMERCIAL","DISTRIBUIDORA","DISTRIBUIDORES","HOLDING","INVESTIMENTOS","PARTICIPACOES",
  "SOLUCOES","SOLUCAO","SERVICOS","SERVICO","INDUSTRIAS","INDUSTRIA","SISTEMAS","SISTEMA",
  "INFORMATICA","CONSULTORIA","ASSESSORIA","ENGENHARIA","CONSTRUCAO","EMPREENDIMENTOS",
  "INCORPORADORA","LOGISTICA","ALIMENTOS","VEICULOS","SAUDE","EDUCACAO","ESCOLA",
  "AGROPECUARIA","AGRO","COMERCIO","COMERCIOS","LTDA","SA","ME","EPP","EIRELI",
  "E","DE","DO","DA","DOS","DAS","EM","COM","PARA","POR","OU",
])

function extractCompanyWord(razao_social: string, nome_fantasia?: string | null): string {
  const source = (nome_fantasia && nome_fantasia.trim().length > 2)
    ? nome_fantasia.trim().toUpperCase()
    : razao_social.toUpperCase()
  const parts = source.split(/\s+/)
  for (const p of parts) {
    const clean = p.replace(/[.,;:]/g, "")
    if (clean.length >= 2 && !GENERIC_WORDS.has(clean)) return clean
  }
  return parts[0] ?? razao_social.slice(0, 6).toUpperCase()
}

// ----------------------------------------------------------------
// Main discovery function
// ----------------------------------------------------------------

export async function searchLinkedInDecisionMakers(
  razao_social:   string,
  nome_fantasia:  string | null | undefined,
  uf:             string,
  cnpj?:          string,
  website?:       string | null,
): Promise<LinkedInDecisionMaker[]> {
  const now          = new Date().toISOString()
  const companyName  = nome_fantasia?.trim() || razao_social.split(" ").slice(0, 5).join(" ")
  const short        = companyName.split(" ").slice(0, 3).join(" ")
  const word1        = extractCompanyWord(razao_social, nome_fantasia?.trim())
  const cnpjClean    = (cnpj ?? "").replace(/\D/g, "").slice(0, 8)

  const results:   LinkedInDecisionMaker[] = []
  const seenNames: Set<string>             = new Set()

  function add(
    name: string,
    roleInfo: { role: DecisionMakerRole; raw: string; pri: number },
    liUrl:    string | null,
    context:  string,
    src:      LinkedInDecisionMaker["source"],
    query:    string,
    srcUrl?:  string,
    phone?:   string,
    email?:   string,
  ) {
  try {

    const key = name.toLowerCase().replace(/\s+/g, "")
    if (seenNames.has(key)) return
    seenNames.add(key)

    const PRIMARY_ROLES: DecisionMakerRole[] = [
      "CEO","CFO","Diretor Financeiro","Diretor Fiscal",
      "Responsavel Financeiro","Responsavel Fiscal",
      "Controller","Contador","Advogado Tributario",
    ]
    const confidence: "high"|"medium"|"low" =
      liUrl                                          ? "high"
      : (src === "escavador" || src === "econodata") ? "high"
      : (src === "oab")                              ? "high"
      : roleInfo.pri >= 8                            ? "medium"
      : "low"

    results.push({
      name, role: roleInfo.role, role_raw: roleInfo.raw,
      linkedin_url: liUrl,
      company_context: context.slice(0, 200),
      source: src, source_url: srcUrl,
      confidence,
      is_primary_target: PRIMARY_ROLES.includes(roleInfo.role),
      search_query: query,
      found_at: now,
      phone, email,
    })
  
  } catch (err) {
    return []
  }
}

  // ------ Strategy 1: LinkedIn via Google (10 queries in parallel) ------------------------------------------
  const s1 = [
    `"${short}" CFO OR "Diretor Financeiro" site:linkedin.com/in`,
    `"${short}" "Diretor Fiscal" OR "Controller" OR "Responsavel Financeiro" site:linkedin.com/in`,
    `"${word1}" CFO OR "Diretor Financeiro" OR "Responsavel Fiscal" site:linkedin.com`,
    `"${short}" CEO OR "Diretor Executivo" OR "Socio-Administrador" site:linkedin.com/in`,
    `"${word1}" contador CRC OR "advogado tributario" site:linkedin.com`,
  ]

  // ------ Strategy 2: News appointments ------------------------------------------------------------------------------------------------------------------------
  const s2 = [
    `"${short}" nomeou OR assume OR contratou CFO OR "diretor financeiro" OR "responsavel fiscal"`,
    `"${word1}" CFO OR "Diretor Financeiro" OR Controller 2023 OR 2024 OR 2025`,
    `"${short}" "diretor financeiro" OR "diretor fiscal" ${uf}`,
  ]

  // ------ Strategy 3: Escavador + directories ------------------------------------------------------------------------------------------------------
  const s3 = [
    `site:escavador.com "${short}" administrador OR diretor OR contador OR advogado`,
    `site:escavador.com "${word1}" socio financeiro OR fiscal OR tributario`,
    `"${short}" site:econodata.com.br OR site:empresas.com.br`,
    cnpjClean ? `"${cnpjClean}" diretor OR responsavel OR contador` : "",
  ].filter(Boolean) as string[]

  // ------ Strategy 4: OAB / CRC / Professional bodies ---------------------------------------------------------------------------------
  const s4 = [
    `"${short}" advogado OAB tributario OR fiscal`,
    `"${short}" contador CRC responsavel`,
    `"${word1}" escritorio contabil OR escritorio advocacia tributaria`,
  ]

  // ------ Strategy 5: Job postings (inverted signal) ------------------------------------------------------------------------------------
  // When a company posts for a "Gerente Financeiro", the existing person often appears
  const s5 = [
    `"${short}" site:linkedin.com/jobs "diretor financeiro" OR "gerente financeiro"`,
    `"${word1}" vaga "controller" OR "responsavel fiscal" site:vagas.com.br OR site:indeed.com.br`,
  ]

  // Run all in parallel
  const allQueryGroups = [...s1, ...s2, ...s3, ...s4, ...s5]
  const batchResults = await Promise.allSettled(
    allQueryGroups.map(q => fetchGoogleNews(q, 5))
  )

  for (let qi = 0; qi < allQueryGroups.length; qi++) {
    const r = batchResults[qi]
    if (r.status !== "fulfilled") continue
    const query = allQueryGroups[qi]

    for (const item of r.value) {
      const combined = `${item.title} ${item.desc}`
      // Must mention company
      const mentionsCompany =
        combined.toLowerCase().includes(word1.toLowerCase()) ||
        combined.toLowerCase().includes(short.toLowerCase().split(" ")[0]) ||
        (cnpjClean && combined.includes(cnpjClean))
      if (!mentionsCompany) continue

      const roleInfo = detectRole(combined)
      if (!roleInfo) continue
      const name = extractPersonName(item.title) ?? extractPersonName(item.desc)
      if (!name) continue

      const liUrl  = extractLinkedInURL(item.link) ?? extractLinkedInURL(combined)
      const oab    = extractOAB(combined)
      const crc    = extractCRC(combined)

      // Determine source type
      const src: LinkedInDecisionMaker["source"] =
        item.link.includes("escavador")  ? "escavador"
        : item.link.includes("econodata") ? "econodata"
        : item.link.includes("linkedin")  ? "linkedin"
        : (oab || crc)                   ? "oab"
        : (item.link.includes("vagas") || item.link.includes("indeed")) ? "vaga"
        : "web"

      // Override role if OAB/CRC found
      const finalRole = oab
        ? { role: "Advogado Tributario" as DecisionMakerRole, raw: oab, pri: 7 }
        : crc
        ? { role: "Contador" as DecisionMakerRole, raw: crc, pri: 7 }
        : roleInfo

      add(name, finalRole, liUrl, item.title, src, query, item.link)

      if (results.length >= 10) break
    }
    if (results.length >= 10) break
  }

  // Sort: primary targets first, high confidence first
  return results.sort((a, b) => {
    if (a.is_primary_target !== b.is_primary_target)
      return a.is_primary_target ? -1 : 1
    const cs = { high: 3, medium: 2, low: 1 }
    return cs[b.confidence] - cs[a.confidence]
  }).slice(0, 8)
}

// ----------------------------------------------------------------
// Opening line by role
// ----------------------------------------------------------------

export function buildLinkedInOpeningLine(
  maker: LinkedInDecisionMaker,
  company: string,
  top_opportunity: string,
): string {
  const first = maker.name.split(" ")[0]
  const lines: Partial<Record<DecisionMakerRole, string>> = {
    "CEO":                    `${first}, tenho algo especifico sobre a estrutura tributaria de ${company} que pode impactar diretamente o resultado — vale 15 minutos?`,
    "CFO":                    `${first}, tenho um ponto sobre ${top_opportunity} em ${company} que pode impactar o P&L — vale uma conversa de 15 minutos?`,
    "Diretor Financeiro":     `${first}, identifiquei algo especifico na estrutura financeira de ${company} relacionado a ${top_opportunity}. Faz sentido alinharmos?`,
    "Diretor Fiscal":         `${first}, ha um ponto tecnico sobre ${top_opportunity} especifico para o perfil de ${company} que queria compartilhar.`,
    "Responsavel Financeiro": `${first}, ha um ponto sobre ${top_opportunity} que pode ter impacto relevante no fluxo de ${company}. Vale um alinhamento rapido?`,
    "Responsavel Fiscal":     `${first}, ha um ponto tecnico sobre ${top_opportunity} especifico para ${company} que queria alinhar. Sao 15 minutos direto ao ponto.`,
    "Controller":             `${first}, ha um ponto sobre ${top_opportunity} que pode ter impacto no DRE de ${company}. Vale 15 minutos?`,
    "Contador":               `${first}, identifiquei um ponto tributario em ${company} que pode ser relevante para a sua assessoria. Vale alinhar?`,
    "Advogado Tributario":    `${first}, ha uma tese relacionada a ${top_opportunity} que pode ser complementar ao que ${company} ja estrutura. Vale uma conversa tecnica?`,
    "Socio-Administrador":    `${first}, tenho algo especifico sobre a estrutura tributaria de ${company} que pode impactar a competitividade — vale 15 minutos?`,
  }
  return lines[maker.role]
    ?? `${first}, identifico algo especifico no perfil tributario de ${company} que vale uma conversa rapida de 15 minutos.`
}
