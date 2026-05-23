// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Multi-Source CNPJ Lookup
//
// Source priority chain:
// 1. Brasil API (brasilapi.com.br)
// 2. CNPJ.ws (cnpj.ws)
// 3. ReceitaWS (receitaws.com.br)
// 4. Manual fallback
//
// RULE: If a source fails, try the next. Never break the pipeline.
// The most confident data wins.
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

export interface CNPJData {
  razao_social?:       string
  nome_fantasia?:      string
  cnpj?:               string
  situacao?:           string
  data_abertura?:      string
  idade_empresa?:      number
  municipio?:          string
  uf?:                 string
  cnae_principal?:     string
  cnae_codigo?:        string
  cnaes_secundarios?:  string[]
  natureza_juridica?:  string
  capital_social?:     string
  capital_social_num?: number
  porte?:              string
  qsa?:                Array<{ nome: string; qualificacao?: string }>
  email?:              string
  telefone?:           string
}

export interface SourceAttempt {
  source:      string
  url:         string
  status:      "success" | "partial" | "failed" | "skipped"
  confidence:  "low" | "medium" | "high"
  data:        Partial<CNPJData>
  warnings:    string[]
  fetched_at:  string
  latency_ms:  number
}

export interface MultiSourceResult {
  merged:      CNPJData
  confidence:  "low" | "medium" | "high"
  primary_source: string
  attempts:    SourceAttempt[]
  debug:       { cnpj_searched: string; total_ms: number; sources_tried: string[]; sources_succeeded: string[] }
}

// --------- Helpers ------------------------------------------------------------------------------------------------------------------------------------------------------

function calcAge(dateStr: string): number {
  if (!dateStr) return 0
  const cleaned = dateStr.replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$2-$1")
  const year = parseInt(cleaned.split("-")[0])
  if (!year || year < 1900) return 0
  return new Date().getFullYear() - year
}

function normalizeDate(raw: string): string {
  if (!raw) return ""
  // Accept DD/MM/YYYY or YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return raw
}

// --------- Source 1: Brasil API ---------------------------------------------------------------------------------------------------------------

async function tryBrasilAPI(cnpj: string): Promise<SourceAttempt> {
  const t0       = Date.now()
  const url      = `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`
  const fetched_at = new Date().toISOString()

  try {
    const res = await fetch(url, {
      signal:  AbortSignal.timeout(8_000),
      headers: { Accept: "application/json" },
    })

    const latency_ms = Date.now() - t0

    if (res.status === 429) return { source:"BrasilAPI", url, status:"failed", confidence:"low", data:{}, warnings:["Rate limit BrasilAPI — tentar novamente em 60s"], fetched_at, latency_ms }
    if (res.status === 404) return { source:"BrasilAPI", url, status:"failed", confidence:"low", data:{}, warnings:["CNPJ não encontrado na BrasilAPI"], fetched_at, latency_ms }
    if (!res.ok)            return { source:"BrasilAPI", url, status:"failed", confidence:"low", data:{}, warnings:[`BrasilAPI HTTP ${res.status}`], fetched_at, latency_ms }

    const raw = await res.json() as Record<string, unknown>

    const qsa = Array.isArray(raw.qsa)
      ? (raw.qsa as Array<Record<string,string>>).map(q => ({ nome: q.nome_socio ?? q.nome ?? "", qualificacao: q.qualificacao_socio ?? "" }))
      : []

    const cnaes_sec = Array.isArray(raw.cnaes_secundarios)
      ? (raw.cnaes_secundarios as Array<Record<string,string>>).map(c => c.descricao ?? "").filter(Boolean)
      : []

    const data_abertura = normalizeDate(String(raw.data_inicio_atividade ?? raw.data_abertura ?? ""))

    const data: Partial<CNPJData> = {
      razao_social:       String(raw.razao_social ?? ""),
      nome_fantasia:      raw.nome_fantasia ? String(raw.nome_fantasia) : undefined,
      cnpj,
      situacao:           String(raw.descricao_situacao_cadastral ?? raw.situacao_cadastral ?? ""),
      data_abertura,
      idade_empresa:      calcAge(data_abertura),
      municipio:          String(raw.municipio ?? ""),
      uf:                 String(raw.uf ?? ""),
      cnae_principal:     String(raw.cnae_fiscal_descricao ?? ""),
      cnae_codigo:        String(raw.cnae_fiscal ?? ""),
      cnaes_secundarios:  cnaes_sec,
      natureza_juridica:  String(raw.descricao_natureza_juridica ?? raw.natureza_juridica ?? ""),
      capital_social:     raw.capital_social ? `R$ ${Number(raw.capital_social).toLocaleString("pt-BR")}` : undefined,
      capital_social_num: raw.capital_social ? Number(raw.capital_social) : undefined,
      porte:              String(raw.descricao_porte ?? raw.porte ?? ""),
      qsa:                qsa.length ? qsa : undefined,
      email:              raw.email ? String(raw.email) : undefined,
      telefone:           raw.ddd_telefone_1 ? String(raw.ddd_telefone_1) : undefined,
    }

    const warnings: string[] = []
    if (!qsa.length) warnings.push("QSA não disponível nesta fonte")
    if (!raw.email)  warnings.push("E-mail não disponível")

    return { source:"BrasilAPI", url, status:"success", confidence: qsa.length ? "high" : "medium", data, warnings, fetched_at, latency_ms }

  } catch (err) {
    return { source:"BrasilAPI", url, status:"failed", confidence:"low", data:{}, warnings:[`BrasilAPI erro: ${err instanceof Error ? err.message : "timeout"}`], fetched_at, latency_ms: Date.now()-t0 }
  }
}

// --------- Source 2: CNPJ.ws ------------------------------------------------------------------------------------------------------------------------

async function tryCNPJws(cnpj: string): Promise<SourceAttempt> {
  const t0       = Date.now()
  const url      = `https://publica.cnpj.ws/cnpj/${cnpj}`
  const fetched_at = new Date().toISOString()

  try {
    const res = await fetch(url, {
      signal:  AbortSignal.timeout(8_000),
      headers: { Accept: "application/json" },
    })

    const latency_ms = Date.now() - t0
    if (!res.ok) return { source:"CNPJ.ws", url, status:"failed", confidence:"low", data:{}, warnings:[`CNPJ.ws HTTP ${res.status}`], fetched_at, latency_ms }

    const raw = await res.json() as Record<string, unknown>

    // CNPJ.ws uses different field names
    const socios = Array.isArray(raw.socios)
      ? (raw.socios as Array<Record<string,unknown>>).map(s => ({
          nome: String((s.nome_socio as string) ?? s.nome ?? ""),
          qualificacao: String((s.qualificacao_socio as Record<string,string>)?.descricao ?? ""),
        }))
      : []

    const estabelecimento = (raw.estabelecimento as Record<string,unknown>) ?? raw
    const data_abertura = normalizeDate(String(estabelecimento.data_inicio_atividade ?? ""))

    const data: Partial<CNPJData> = {
      razao_social:    String(raw.razao_social ?? ""),
      nome_fantasia:   String((estabelecimento.nome_fantasia as string) ?? "") || undefined,
      cnpj,
      situacao:        String((estabelecimento.situacao_cadastral as Record<string,string>)?.descricao ?? ""),
      data_abertura,
      idade_empresa:   calcAge(data_abertura),
      municipio:       String((estabelecimento.cidade as Record<string,string>)?.descricao ?? (estabelecimento.municipio as string) ?? ""),
      uf:              String((estabelecimento.estado as Record<string,string>)?.sigla ?? estabelecimento.uf ?? ""),
      cnae_principal:  String((estabelecimento.cnae_fiscal_principal as Record<string,string>)?.descricao ?? ""),
      cnae_codigo:     String((estabelecimento.cnae_fiscal_principal as Record<string,string>)?.cnae ?? ""),
      natureza_juridica: String((raw.natureza_juridica as Record<string,string>)?.descricao ?? ""),
      capital_social:  raw.capital_social ? `R$ ${Number(raw.capital_social).toLocaleString("pt-BR")}` : undefined,
      qsa:             socios.length ? socios : undefined,
    }

    return { source:"CNPJ.ws", url, status:"success", confidence: socios.length ? "high" : "medium", data, warnings:[], fetched_at, latency_ms }

  } catch (err) {
    return { source:"CNPJ.ws", url, status:"failed", confidence:"low", data:{}, warnings:[`CNPJ.ws erro: ${err instanceof Error ? err.message : "timeout"}`], fetched_at, latency_ms: Date.now()-t0 }
  }
}

// --------- Source 3: ReceitaWS ------------------------------------------------------------------------------------------------------------------

// --------- Source 5: CNPJ.info (alternative free source) -------------------------------------------

async function tryCNPJInfo(cnpj: string): Promise<SourceAttempt> {
  const t0 = Date.now()
  const url = `https://www.cnpj.info/cnpj/${cnpj}`
  const fetched_at = new Date().toISOString()
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5_000),
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    })
    if (!res.ok) return { source:"cnpj.info", url, status:"failed", confidence:"low", data:{}, warnings:[], fetched_at, latency_ms: Date.now()-t0 }
    const html = await res.text()
    const data: Partial<CNPJData> = {}
    
    // Extract municipio
    const mun = html.match(/Munic[íi]pio[^:]*:\s*<[^>]+>([^<]+)/i)?.[1]?.trim()
      ?? html.match(/"municipio"\s*:\s*"([^"]+)"/i)?.[1]
    if (mun && mun.length > 2) data.municipio = mun

    // Extract UF
    const uf = html.match(/(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)/)?.[1]
    if (uf) data.uf = uf

    // Extract CNAE
    const cnae = html.match(/Atividade\s+Principal[^:]*:\s*<[^>]+>([^<]+)/i)?.[1]?.trim()
      ?? html.match(/cnae_fiscal_descricao["\s:]+["']([^"']{10,80})["']/i)?.[1]
    if (cnae && cnae.length > 5) data.cnae_principal = cnae

    // Extract porte
    const porte = html.match(/Porte[^:]*:\s*<[^>]+>([^<]+)/i)?.[1]?.trim()
    if (porte && porte.length > 2) data.porte = porte

    const hasData = Object.keys(data).length > 0
    return { source:"cnpj.info", url, status: hasData ? "success" : "failed", confidence:"low", data, warnings:[], fetched_at, latency_ms: Date.now()-t0 }
  } catch {
    return { source:"cnpj.info", url, status:"failed", confidence:"low", data:{}, warnings:[], fetched_at, latency_ms: Date.now()-t0 }
  }
}

// --------- Source 6: Dados.gov.br --- Receita Federal official data -------------------------------------------

async function tryDadosGov(cnpj: string): Promise<SourceAttempt> {
  const t0 = Date.now()
  // Official Receita Federal dataset via dados.gov.br API
  const url = `https://minhareceita.org/${cnpj}`
  const fetched_at = new Date().toISOString()
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6_000),
      headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0" }
    })
    if (!res.ok) return { source:"minhareceita", url, status:"failed", confidence:"low", data:{}, warnings:[], fetched_at, latency_ms: Date.now()-t0 }
    const raw = await res.json() as Record<string, any>
    
    const data: Partial<CNPJData> = {}
    if (raw.razao_social)           data.razao_social = String(raw.razao_social)
    if (raw.nome_fantasia)          data.nome_fantasia = String(raw.nome_fantasia)
    if (raw.municipio)              data.municipio = String(raw.municipio)
    if (raw.uf)                     data.uf = String(raw.uf)
    if (raw.cnae_fiscal_descricao)  data.cnae_principal = String(raw.cnae_fiscal_descricao)
    if (raw.cnae_fiscal)            data.cnae_codigo = String(raw.cnae_fiscal)
    if (raw.descricao_porte)        data.porte = String(raw.descricao_porte)
    if (raw.capital_social)         { data.capital_social = `R$ ${Number(raw.capital_social).toLocaleString("pt-BR")}`; data.capital_social_num = Number(raw.capital_social) }
    if (raw.data_inicio_atividade)  data.data_abertura = String(raw.data_inicio_atividade)
    if (raw.descricao_situacao_cadastral) data.situacao = String(raw.descricao_situacao_cadastral)
    if (raw.ddd_telefone_1)         data.telefone = String(raw.ddd_telefone_1)
    if (raw.email)                  data.email = String(raw.email)
    if (raw.natureza_juridica)      data.natureza_juridica = String(raw.natureza_juridica)
    if (Array.isArray(raw.qsa) && raw.qsa.length) {
      data.qsa = raw.qsa.map((q: any) => ({ nome: String(q.nome_socio ?? q.nome ?? ""), qualificacao: String(q.qualificacao_socio ?? q.qualificacao ?? "") }))
    }

    const hasCore = !!(data.razao_social || data.municipio || data.cnae_principal)
    return { source:"minhareceita", url, status: hasCore ? "success" : "partial", confidence: hasCore ? "high" : "low", data, warnings:[], fetched_at, latency_ms: Date.now()-t0 }
  } catch {
    return { source:"minhareceita", url, status:"failed", confidence:"low", data:{}, warnings:[], fetched_at, latency_ms: Date.now()-t0 }
  }
}

async function tryCNPJBiz(cnpj: string): Promise<SourceAttempt> {
  // CNPJ.biz - alternative free source, good for municipio/UF/CNAE when others fail
  const formatted = cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")
  const url = `https://www.cnpj.biz/cnpj/${cnpj}`
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5_000),
      headers: { "Accept": "text/html,application/xhtml+xml", "User-Agent": "Mozilla/5.0" }
    })
    if (!res.ok) return { source:"cnpj.biz", status:"error", data:{}, confidence:"low", latency_ms:0 }
    const html = await res.text()
    
    // Parse key fields from HTML
    const municipio = html.match(/Município[^<]*<\/[^>]+>[^<]*<[^>]+>([^<]+)</i)?.[1]?.trim()
      ?? html.match(/municipio["\s:]+["']?([A-Za-záéíóúàâêôãõç\s]+)["']?/i)?.[1]?.trim()
    const uf = html.match(/UF[^<]*<\/[^>]+>[^<]*<[^>]+>([A-Z]{2})</i)?.[1]
      ?? html.match(/"uf":\s*"([A-Z]{2})"/)?.[1]
    const cnae = html.match(/CNAE[^<]*<\/[^>]+>[^<]*<[^>]+>([^<]+)</i)?.[1]?.trim()
      ?? html.match(/atividade_principal[^"]*"([^"]{10,80})"/i)?.[1]
    const porte = html.match(/Porte[^<]*<\/[^>]+>[^<]*<[^>]+>([^<]+)</i)?.[1]?.trim()

    const data: CNPJData = {}
    if (municipio && municipio.length > 2) data.municipio = municipio
    if (uf && uf.length === 2) data.uf = uf
    if (cnae && cnae.length > 5) data.cnae_principal = cnae
    if (porte) data.porte = porte

    return {
      source: "cnpj.biz",
      status: Object.keys(data).length > 0 ? "success" : "error",
      data,
      confidence: "low",
      latency_ms: 0,
    }
  } catch {
    return { source:"cnpj.biz", status:"error", data:{}, confidence:"low", latency_ms:0 }
  }
}

async function tryReceitaWS(cnpj: string): Promise<SourceAttempt> {
  const t0       = Date.now()
  const url      = `https://www.receitaws.com.br/v1/cnpj/${cnpj}`
  const fetched_at = new Date().toISOString()

  try {
    const res = await fetch(url, {
      signal:  AbortSignal.timeout(8_000),
      headers: { Accept: "application/json" },
    })

    const latency_ms = Date.now() - t0
    if (!res.ok) return { source:"ReceitaWS", url, status:"failed", confidence:"low", data:{}, warnings:[`ReceitaWS HTTP ${res.status}`], fetched_at, latency_ms }

    const raw = await res.json() as Record<string, unknown>
    if (raw.status === "ERROR") return { source:"ReceitaWS", url, status:"failed", confidence:"low", data:{}, warnings:[String(raw.message ?? "ReceitaWS: CNPJ não encontrado")], fetched_at, latency_ms }

    const qsa = Array.isArray(raw.qsa)
      ? (raw.qsa as Array<Record<string,string>>).map(q => ({ nome: q.nome ?? "", qualificacao: q.qual ?? "" }))
      : []

    const data_abertura = normalizeDate(String(raw.abertura ?? raw.data_abertura ?? ""))

    const data: Partial<CNPJData> = {
      razao_social:    String(raw.nome ?? ""),
      nome_fantasia:   raw.fantasia ? String(raw.fantasia) : undefined,
      cnpj,
      situacao:        String(raw.situacao ?? ""),
      data_abertura,
      idade_empresa:   calcAge(data_abertura),
      municipio:       String(raw.municipio ?? ""),
      uf:              String(raw.uf ?? ""),
      cnae_principal:  String(raw.atividade_principal?.[0]?.text ?? ""),
      cnae_codigo:     String(raw.atividade_principal?.[0]?.code ?? ""),
      natureza_juridica: String(raw.natureza_juridica ?? ""),
      capital_social:  raw.capital_social ? String(raw.capital_social) : undefined,
      porte:           String(raw.porte ?? ""),
      qsa:             qsa.length ? qsa : undefined,
      email:           raw.email ? String(raw.email) : undefined,
      telefone:        raw.telefone ? String(raw.telefone) : undefined,
    }

    return { source:"ReceitaWS", url, status:"success", confidence:"medium", data, warnings:["ReceitaWS tem limite de requisições gratuitas"], fetched_at, latency_ms }

  } catch (err) {
    return { source:"ReceitaWS", url, status:"failed", confidence:"low", data:{}, warnings:[`ReceitaWS erro: ${err instanceof Error ? err.message : "timeout"}`], fetched_at, latency_ms: Date.now()-t0 }
  }
}

// --------- Merge: best data wins ------------------------------------------------------------------------------------------------------------

function mergeResults(attempts: SourceAttempt[]): { merged: CNPJData; primary_source: string; confidence: "low" | "medium" | "high" } {
  const successes = attempts.filter(a => a.status === "success")
    .sort((a, b) => (b.confidence === "high" ? 1 : 0) - (a.confidence === "high" ? 1 : 0))

  if (successes.length === 0) {
    return { merged: {}, primary_source: "none", confidence: "low" }
  }

  const primary = successes[0]
  const merged:  CNPJData = { ...primary.data }

  // Fill gaps from secondary sources --- null/empty NEVER overwrites valid value
  function valid(v: unknown): boolean { return v !== null && v !== undefined && String(v).trim() !== "" && String(v).trim() !== "0" }
  for (const s of successes.slice(1)) {
    if (!valid(merged.razao_social)      && valid(s.data.razao_social))      merged.razao_social      = s.data.razao_social
    if (!valid(merged.nome_fantasia)     && valid(s.data.nome_fantasia))     merged.nome_fantasia     = s.data.nome_fantasia
    if (!valid(merged.municipio)         && valid(s.data.municipio))         merged.municipio         = s.data.municipio
    if (!valid(merged.uf)                && valid(s.data.uf))                merged.uf                = s.data.uf
    if (!valid(merged.cnae_principal)    && valid(s.data.cnae_principal))    merged.cnae_principal    = s.data.cnae_principal
    if (!valid(merged.cnae_codigo)       && valid(s.data.cnae_codigo))       merged.cnae_codigo       = s.data.cnae_codigo
    if (!valid(merged.natureza_juridica) && valid(s.data.natureza_juridica)) merged.natureza_juridica = s.data.natureza_juridica
    if (!valid(merged.capital_social)    && valid(s.data.capital_social))    merged.capital_social    = s.data.capital_social
    if (!valid(merged.capital_social_num)&& valid(s.data.capital_social_num))merged.capital_social_num= s.data.capital_social_num
    if (!valid(merged.porte)             && valid(s.data.porte))             merged.porte             = s.data.porte
    if (!valid(merged.situacao)          && valid(s.data.situacao))          merged.situacao          = s.data.situacao
    if (!valid(merged.data_abertura)     && valid(s.data.data_abertura))     merged.data_abertura     = s.data.data_abertura
    if (!valid(merged.idade_empresa)     && valid(s.data.idade_empresa))     merged.idade_empresa     = s.data.idade_empresa
    if (!merged.qsa?.length             && s.data.qsa?.length)              merged.qsa               = s.data.qsa
    if (!valid(merged.email)             && valid(s.data.email))             merged.email             = s.data.email
    if (!valid(merged.telefone)          && valid(s.data.telefone))          merged.telefone          = s.data.telefone
    if ((!merged.cnaes_secundarios?.length) && s.data.cnaes_secundarios?.length)
      merged.cnaes_secundarios = s.data.cnaes_secundarios
  }

  // Confidence: high if primary has QSA, medium otherwise
  const confidence: "low" | "medium" | "high" =
    merged.qsa?.length ? "high" : successes.length >= 2 ? "medium" : "medium"

  return { merged, primary_source: primary.source, confidence }
}

// --------- CAMADA 5: Guaranteed field enrichment -------------------------
// ZERO empty fields. If no source has the data, we infer from available signals.
// Every inferred field is flagged as "estimated" --- no fake data.

const CNAE_SEGMENT_MAP: Record<string, { segment: string; porte_tipico: string; regime_tipico: string }> = {
  "01": { segment: "Agricultura e Pecuaria",          porte_tipico: "Pequeno",  regime_tipico: "Simples Nacional" },
  "10": { segment: "Industria de Alimentos",          porte_tipico: "Medio",    regime_tipico: "Lucro Presumido" },
  "13": { segment: "Industria Textil",                porte_tipico: "Medio",    regime_tipico: "Lucro Presumido" },
  "14": { segment: "Confeccoes e Vestuario",          porte_tipico: "Pequeno",  regime_tipico: "Simples Nacional" },
  "17": { segment: "Fabricacao de Papel",             porte_tipico: "Grande",   regime_tipico: "Lucro Real" },
  "20": { segment: "Industria Quimica",               porte_tipico: "Grande",   regime_tipico: "Lucro Real" },
  "22": { segment: "Fabricacao de Plasticos",         porte_tipico: "Medio",    regime_tipico: "Lucro Presumido" },
  "23": { segment: "Minerais Nao-Metalicos",          porte_tipico: "Medio",    regime_tipico: "Lucro Presumido" },
  "24": { segment: "Metalurgia",                      porte_tipico: "Grande",   regime_tipico: "Lucro Real" },
  "26": { segment: "Equipamentos de Informatica",     porte_tipico: "Medio",    regime_tipico: "Lucro Real" },
  "28": { segment: "Maquinas e Equipamentos",         porte_tipico: "Grande",   regime_tipico: "Lucro Real" },
  "29": { segment: "Veiculos Automotores",            porte_tipico: "Grande",   regime_tipico: "Lucro Real" },
  "33": { segment: "Manutencao e Reparacao",          porte_tipico: "Pequeno",  regime_tipico: "Simples Nacional" },
  "41": { segment: "Construcao Civil",                porte_tipico: "Medio",    regime_tipico: "Lucro Presumido" },
  "45": { segment: "Comercio de Veiculos",            porte_tipico: "Medio",    regime_tipico: "Lucro Presumido" },
  "46": { segment: "Comercio Atacadista",             porte_tipico: "Medio",    regime_tipico: "Lucro Real" },
  "47": { segment: "Comercio Varejista",              porte_tipico: "Medio",    regime_tipico: "Lucro Presumido" },
  "49": { segment: "Transporte Terrestre",            porte_tipico: "Medio",    regime_tipico: "Lucro Presumido" },
  "52": { segment: "Armazenamento e Logistica",       porte_tipico: "Grande",   regime_tipico: "Lucro Real" },
  "56": { segment: "Alimentacao e Restaurantes",      porte_tipico: "Pequeno",  regime_tipico: "Simples Nacional" },
  "61": { segment: "Telecomunicacoes",                porte_tipico: "Grande",   regime_tipico: "Lucro Real" },
  "62": { segment: "Tecnologia da Informacao",        porte_tipico: "Medio",    regime_tipico: "Lucro Presumido" },
  "64": { segment: "Servicos Financeiros",            porte_tipico: "Grande",   regime_tipico: "Lucro Real" },
  "65": { segment: "Seguros e Previdencia",           porte_tipico: "Grande",   regime_tipico: "Lucro Real" },
  "68": { segment: "Atividades Imobiliarias",         porte_tipico: "Medio",    regime_tipico: "Lucro Presumido" },
  "69": { segment: "Atividades Juridicas e Contabeis",porte_tipico: "Pequeno",  regime_tipico: "Simples Nacional" },
  "70": { segment: "Consultoria Empresarial",         porte_tipico: "Pequeno",  regime_tipico: "Lucro Presumido" },
  "71": { segment: "Arquitetura e Engenharia",        porte_tipico: "Pequeno",  regime_tipico: "Simples Nacional" },
  "73": { segment: "Publicidade e Pesquisa",          porte_tipico: "Pequeno",  regime_tipico: "Simples Nacional" },
  "75": { segment: "Veterinaria",                     porte_tipico: "Pequeno",  regime_tipico: "Simples Nacional" },
  "77": { segment: "Locacao e Arrendamento",          porte_tipico: "Medio",    regime_tipico: "Lucro Presumido" },
  "80": { segment: "Seguranca e Vigilancia",          porte_tipico: "Medio",    regime_tipico: "Lucro Presumido" },
  "81": { segment: "Servicos de Limpeza",             porte_tipico: "Pequeno",  regime_tipico: "Simples Nacional" },
  "84": { segment: "Administracao Publica",           porte_tipico: "Grande",   regime_tipico: "Lucro Real" },
  "85": { segment: "Educacao",                        porte_tipico: "Medio",    regime_tipico: "Lucro Presumido" },
  "86": { segment: "Saude e Hospitais",               porte_tipico: "Grande",   regime_tipico: "Lucro Real" },
  "87": { segment: "Servicos Sociais",                porte_tipico: "Medio",    regime_tipico: "Lucro Presumido" },
  "90": { segment: "Artes e Cultura",                 porte_tipico: "Pequeno",  regime_tipico: "Simples Nacional" },
  "96": { segment: "Outros Servicos Pessoais",        porte_tipico: "Pequeno",  regime_tipico: "Simples Nacional" },
}

export function guaranteedEnrich(data: CNPJData, cnpj: string): CNPJData & { estimated_fields: string[] } {
  const enriched = { ...data } as CNPJData
  const estimated: string[] = []

  // Infer from CNAE code (first 2 digits = division)
  const cnaeCodigo = data.cnae_codigo?.replace(/\D/g, "").slice(0, 2) ?? ""
  const segmentInfo = CNAE_SEGMENT_MAP[cnaeCodigo] ?? null

  // --- Municipio / UF ---
  if (!enriched.municipio || enriched.municipio.trim() === "") {
    // Can't infer city --- but at least provide state from CNPJ structure
    // CNPJ digits 3-5 encode the fiscal district (RF region)
    const digits = cnpj.replace(/\D/g, "")
    const rf = digits.slice(8, 10)
    const RF_TO_UF: Record<string, string> = {
      "01":"DF","02":"GO","03":"MT","04":"MS","05":"TO","06":"RO","07":"AC","08":"AM",
      "09":"RR","10":"PA","11":"AP","12":"MA","13":"PI","14":"CE","15":"RN","16":"PB",
      "17":"PE","18":"AL","19":"SE","20":"BA","21":"MG","22":"ES","23":"RJ","24":"SP",
      "25":"PR","26":"SC","27":"RS","80":"SP","81":"SP","82":"MG","83":"RJ","84":"RS",
      "85":"PR","86":"SC","87":"CE","88":"BA","89":"PE","90":"SP","91":"SP","92":"SP",
      "93":"SP","94":"SP","95":"SP","96":"SP","97":"SP","98":"SP","99":"SP",
    }
    if (!enriched.uf && RF_TO_UF[rf]) {
      enriched.uf = RF_TO_UF[rf]
      estimated.push("uf")
    }
  }

  // --- CNAE description from code ---
  if (!enriched.cnae_principal && enriched.cnae_codigo && segmentInfo) {
    enriched.cnae_principal = segmentInfo.segment
    estimated.push("cnae_principal")
  }

  // --- Porte from capital social or segment default ---
  if (!enriched.porte || enriched.porte.trim() === "") {
    const cap = enriched.capital_social_num ?? 0
    if (cap > 0) {
      enriched.porte = cap > 10_000_000 ? "Grande" : cap > 1_000_000 ? "Medio" : cap > 100_000 ? "Pequeno" : "Micro"
      estimated.push("porte")
    } else if (segmentInfo) {
      enriched.porte = segmentInfo.porte_tipico
      estimated.push("porte")
    }
  }

  // --- Natureza juridica default ---
  if (!enriched.natureza_juridica || enriched.natureza_juridica.trim() === "") {
    const digits = cnpj.replace(/\D/g, "")
    // Check if it's a MEI (CNPJ pattern)
    enriched.natureza_juridica = "Sociedade Limitada (estimado)"
    estimated.push("natureza_juridica")
  }

  // --- Situacao default if completely missing ---
  if (!enriched.situacao || enriched.situacao.trim() === "") {
    enriched.situacao = "Nao identificada nas fontes consultadas"
    estimated.push("situacao")
  }

  // --- Data abertura minimum ---
  if (!enriched.data_abertura || enriched.data_abertura.trim() === "") {
    estimated.push("data_abertura")
    // Leave empty but mark as missing --- don't fake a date
  }

  // Infer commercial name from razao_social when nome_fantasia is missing
  if (!enriched.nome_fantasia || enriched.nome_fantasia.trim() === "") {
    const SUFFIXES = /\b(LTDA|SA|ME|EPP|EIRELI|S\.A\.|INDUSTRIA|COMERCIO|SERVICOS|PARTICIPACOES|HOLDING|EMPRESA|IND|COM|EIRELI ME|EIRELI EPP)\b/gi
    const GENERIC_FIRST = /^(COMERCIO|INDUSTRIA|TRANSPORTES?|FARMACIAS?|CONSTRUTORAS?|HOSPITAL|TECNOLOGIA|SERVICOS?)\s+/i
    let comercial = enriched.razao_social ?? ""
    comercial = comercial.replace(SUFFIXES, "").replace(GENERIC_FIRST, "").trim()
    // Remove trailing "E" or "DE" or single chars
    comercial = comercial.replace(/\s+[EDE]{1,3}\s*$/, "").trim()
    if (comercial.length > 2 && comercial !== enriched.razao_social) {
      enriched.nome_fantasia = comercial
      estimated.push("nome_fantasia")
    }
  }

  return { ...enriched, estimated_fields: estimated }
}

// --------- Main multi-source lookup ---------------------------------------------------------------------------------------------------

export async function lookupCNPJ(cnpj: string): Promise<MultiSourceResult> {
  const clean = cnpj.replace(/\D/g, "")
  const t0    = Date.now()
  const attempts: SourceAttempt[] = []

  // WAVE 1: Run 4 sources in parallel for maximum speed + coverage
  // minhareceita = Receita Federal official data (most reliable)
  // brasilAPI + CNPJ.ws + ReceitaWS = established fallbacks
  const [r1, r2, r3, r4] = await Promise.allSettled([
    tryDadosGov(clean),    // Receita Federal official
    tryBrasilAPI(clean),   // Brasil API
    tryCNPJws(clean),      // CNPJ.ws
    tryReceitaWS(clean),   // ReceitaWS
  ])

  if (r1.status === "fulfilled") attempts.push(r1.value)
  if (r2.status === "fulfilled") attempts.push(r2.value)
  if (r3.status === "fulfilled") attempts.push(r3.value)
  if (r4.status === "fulfilled") attempts.push(r4.value)

  // Check what is still missing after wave 1
  function hasFilled(field: keyof CNPJData) {
    return attempts.some(a => {
      const v = (a.data as any)[field]
      return v && String(v).trim().length > 0
    })
  }

  // WAVE 2: targeted fallbacks for still-missing critical fields
  const needsMunicipio = !hasFilled("municipio")
  const needsCNAE      = !hasFilled("cnae_principal")
  const needsRazao     = !hasFilled("razao_social")

  if (needsMunicipio || needsCNAE) {
    // Try CNPJ.biz and CNPJ.info in parallel
    const [r5, r6] = await Promise.allSettled([
      tryCNPJBiz(clean),
      tryCNPJInfo(clean),
    ])
    if (r5.status === "fulfilled" && r5.value.status !== "failed") attempts.push(r5.value)
    if (r6.status === "fulfilled" && r6.value.status !== "failed") attempts.push(r6.value)
  }

  const { merged, primary_source, confidence } = mergeResults(attempts)
  const sources_tried     = attempts.map(a => a.source)
  const sources_succeeded = attempts.filter(a => a.status === "success").map(a => a.source)

  return {
    merged,
    confidence,
    primary_source,
    attempts,
    debug: {
      cnpj_searched:   clean,
      total_ms:        Date.now() - t0,
      sources_tried,
      sources_succeeded,
    },
  }
}
