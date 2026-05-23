// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Brasil API Enrichment
// Fetches company data from Receita Federal via Brasil API.
// Graceful fallback --- pipeline never fails if API is down.
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { SourceResult, BrasilAPIData } from "./types"

const BRASIL_API_BASE = "https://brasilapi.com.br/api/cnpj/v1"
const TIMEOUT_MS      = 8_000

// --------- CNPJ validation ------------------------------------------------------------------------------------------------------------------------------

export function cleanCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, "")
}

// --------- Fetch from Brasil API ------------------------------------------------------------------------------------------------------------

export async function fetchBrasilAPI(cnpj: string): Promise<SourceResult<Partial<BrasilAPIData>>> {
  const clean = cleanCNPJ(cnpj)
  const fetched_at = new Date().toISOString()

  try {
    const res = await fetch(`${BRASIL_API_BASE}/${clean}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "Accept": "application/json" },
    })

    if (res.status === 429) {
      return {
        source: "BrasilAPI / Receita Federal",
        status: "partial",
        confidence: "low",
        data: {},
        findings: [],
        warnings: ["Rate limit da Brasil API atingido. Tente novamente em alguns minutos."],
        fetched_at,
      }
    }

    if (res.status === 404) {
      return {
        source: "BrasilAPI / Receita Federal",
        status: "failed",
        confidence: "low",
        data: {},
        findings: [],
        warnings: [`CNPJ ${clean} não encontrado na Receita Federal.`],
        fetched_at,
      }
    }

    if (!res.ok) {
      return {
        source: "BrasilAPI / Receita Federal",
        status: "failed",
        confidence: "low",
        data: {},
        findings: [],
        warnings: [`Brasil API retornou HTTP ${res.status}.`],
        fetched_at,
      }
    }

    const raw = await res.json() as Record<string, unknown>

    // Parse QSA
    const qsa = Array.isArray(raw.qsa)
      ? (raw.qsa as Array<Record<string, string>>).map(q => ({
          nome:    q.nome_socio ?? q.nome ?? "não identificado",
          qual:    q.qualificacao_socio ?? "",
          qual_rf: q.codigo_qualificacao_socio ?? "",
        }))
      : []

    // Parse CNAEs secund--rios
    const cnaes_sec = Array.isArray(raw.cnaes_secundarios)
      ? (raw.cnaes_secundarios as Array<Record<string, string>>).map(c => ({
          codigo:   String(c.codigo ?? ""),
          descricao: c.descricao ?? "",
        }))
      : []

    // Calculate company age
    const data_abertura = String(raw.data_inicio_atividade ?? raw.data_abertura ?? "")
    let idade_anos = 0
    if (data_abertura) {
      const [y] = data_abertura.split("-").map(Number)
      if (y > 1900) idade_anos = new Date().getFullYear() - y
    }

    const data: Partial<BrasilAPIData> = {
      cnpj:                clean,
      razao_social:        String(raw.razao_social ?? ""),
      nome_fantasia:       raw.nome_fantasia ? String(raw.nome_fantasia) : null,
      situacao_cadastral:  String(raw.descricao_situacao_cadastral ?? raw.situacao_cadastral ?? ""),
      data_abertura:       data_abertura,
      idade_anos,
      natureza_juridica:   String(raw.descricao_natureza_juridica ?? raw.natureza_juridica ?? ""),
      capital_social:      raw.capital_social ? Number(raw.capital_social) : null,
      porte:               String(raw.descricao_porte ?? raw.porte ?? ""),
      uf:                  String(raw.uf ?? ""),
      municipio:           String(raw.municipio ?? ""),
      cnae_fiscal:         String(raw.cnae_fiscal ?? ""),
      cnae_fiscal_descricao: String(raw.cnae_fiscal_descricao ?? ""),
      cnaes_secundarios:   cnaes_sec,
      qsa,
      email:               raw.email ? String(raw.email) : null,
      telefone:            raw.ddd_telefone_1 ? String(raw.ddd_telefone_1) : null,
    }

    // Build findings (only confirmed facts)
    const findings: string[] = []
    if (data.razao_social)         findings.push(`Razão social: ${data.razao_social}`)
    if (data.nome_fantasia)        findings.push(`Nome fantasia: ${data.nome_fantasia}`)
    if (data.cnae_fiscal_descricao)findings.push(`CNAE principal: ${data.cnae_fiscal_descricao}`)
    if (data.municipio && data.uf) findings.push(`Localização: ${data.municipio}/${data.uf}`)
    if (idade_anos > 0)            findings.push(`${idade_anos} anos de operação`)
    if (data.capital_social)       findings.push(`Capital social: R$ ${data.capital_social.toLocaleString("pt-BR")}`)
    if (qsa.length > 0)            findings.push(`${qsa.length} sócio(s) identificado(s): ${qsa.map(q => q.nome).join(", ")}`)
    if (cnaes_sec.length > 0)      findings.push(`${cnaes_sec.length} CNAE(s) secundário(s)`)

    const warnings: string[] = []
    if (!raw.qsa || qsa.length === 0) warnings.push("QSA não disponível — sócios não identificados.")
    if (!data.email)                  warnings.push("E-mail não disponível na Receita Federal.")
    if (data.situacao_cadastral && data.situacao_cadastral !== "ATIVA")
      warnings.push(`Situação cadastral: ${data.situacao_cadastral} — verificar antes de abordar.`)

    return {
      source:     "BrasilAPI / Receita Federal",
      source_url: `${BRASIL_API_BASE}/${clean}`,
      status:     "success",
      confidence: qsa.length > 0 ? "high" : "medium",
      data,
      findings,
      warnings,
      fetched_at,
    }

  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "TimeoutError"
    return {
      source:  "BrasilAPI / Receita Federal",
      status:  "failed",
      confidence: "low",
      data:    {},
      findings: [],
      warnings: [isTimeout ? "Brasil API timeout — dados públicos indisponíveis no momento." : `Erro ao consultar Brasil API: ${err instanceof Error ? err.message : "desconhecido"}`],
      fetched_at,
    }
  }
}

// --------- Extract commercial signals from CNAE ---------------------------------------------------------------

export function extractSignalsFromCNAE(cnae: string, descricao: string): string[] {
  const signals: string[] = []
  const d = descricao.toLowerCase()

  if (d.includes("comércio") || d.includes("varejo"))            signals.push("Operação varejista")
  if (d.includes("atacado") || d.includes("distribuição"))       signals.push("Operação atacadista/distribuidora")
  if (d.includes("fabricação") || d.includes("manufatura"))      signals.push("Operação industrial")
  if (d.includes("serviços") || d.includes("consultoria"))       signals.push("Prestação de serviços")
  if (d.includes("tecnologia") || d.includes("software"))        signals.push("Empresa de tecnologia")
  if (d.includes("saúde") || d.includes("hospital"))             signals.push("Setor de saúde")
  if (d.includes("construção") || d.includes("edificação"))      signals.push("Construção civil")
  if (d.includes("alimento") || d.includes("bebida"))            signals.push("Setor alimentício")
  if (d.includes("exportação") || d.includes("importação"))      signals.push("Operação de comércio exterior")
  if (d.includes("transporte") || d.includes("logística"))       signals.push("Logística e transporte")

  return signals
}
