import type { ConfidenceLevel, RiskLevel, ScoreTier } from "@/src/types"

export function formatBRL(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1).replace(".", ",")}M`
  if (value >= 1_000) return `R$ ${Math.round(value / 1_000)}k`
  return `R$ ${value.toLocaleString("pt-BR")}`
}

export function formatCNPJ(raw: string): string {
  const v = raw.replace(/\D/g, "").slice(0, 14)
  if (v.length <= 2) return v
  if (v.length <= 5) return `${v.slice(0,2)}.${v.slice(2)}`
  if (v.length <= 8) return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5)}`
  if (v.length <= 12) return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8)}`
  return `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8,12)}-${v.slice(12)}`
}

export function normalizeCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, "")
}

export function validateCNPJ(cnpj: string): boolean {
  const c = cnpj.replace(/\D/g, "")
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false
  let sum = 0, weight = 5
  for (let i = 0; i < 12; i++) { sum += parseInt(c[i]) * weight; weight = weight === 2 ? 9 : weight - 1 }
  const d1 = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (parseInt(c[12]) !== d1) return false
  sum = 0; weight = 6
  for (let i = 0; i < 13; i++) { sum += parseInt(c[i]) * weight; weight = weight === 2 ? 9 : weight - 1 }
  const d2 = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  return parseInt(c[13]) === d2
}

export function scoreTierLabel(tier: ScoreTier): string {
  return { S: "Prioridade Máxima", A: "Alta Prioridade", B: "Prioridade Média", C: "Prioridade Baixa", D: "Sem Aderência" }[tier]
}

export function confidencePercent(level: ConfidenceLevel): number {
  return { high: 80, medium: 55, low: 30 }[level]
}

export function confidenceLabel(level: ConfidenceLevel): string {
  return { high: "Alta confiança", medium: "Confiança média", low: "Confiança baixa" }[level]
}

export function riskLevelLabel(risk: RiskLevel | string): string {
  return { remoto: "Remoto", possível: "Possível", estruturante: "Estruturante", baixo: "Baixo" }[risk] ?? risk
}

export function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`
}

export const TIER_COLORS = {
  S: { ring: "#b8965a", text: "text-amber-400" },
  A: { ring: "#b8965a", text: "text-amber-400" },
  B: { ring: "#6b8f71", text: "text-emerald-400" },
  C: { ring: "#4a5752", text: "text-slate-400" },
  D: { ring: "#374151", text: "text-slate-500" },
}

export const TIMELINE_STEPS = [
  { key: "started",      label: "Iniciando análise",        event: "dossier_started" },
  { key: "validated",    label: "CNPJ validado",             event: "cnpj_validated" },
  { key: "enriched",     label: "Empresa identificada",      event: "company_enriched" },
  { key: "persisted",    label: "Empresa registrada",        event: "company_persisted" },
  { key: "score",        label: "Score calculado",           event: "score_pronto" },
  { key: "financial",    label: "Estimativas financeiras",   event: "financial_estimations_ready" },
  { key: "prompt",       label: "Contexto montado",          event: "prompt_built" },
  { key: "llm_start",    label: "Gerando dossiê com IA",     event: "llm_generation_started" },
  { key: "llm_done",     label: "Geração concluída",         event: "llm_generation_completed" },
  { key: "validated_out",label: "Output validado",           event: "output_validated" },
  { key: "ready",        label: "Dossiê disponível",         event: "report_ready" },
] as const
