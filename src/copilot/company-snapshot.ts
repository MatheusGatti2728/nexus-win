// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS COPILOT --- Company Snapshot Engine
// Reads company context and produces an operational snapshot.
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { CompanyContext } from "../engine/rule-engine"
import type { CompanySnapshot, OperationSignal, ProbablePain, LikelyFocus } from "./types"
import { SEGMENT_LABELS, REGIME_LABELS } from "../engine/tax-matrix"

// --------- Subsegment reading ---------------------------------------------------------------------------------------------------------------------

const SUBSEGMENT_MAP: Record<string, Record<string, string>> = {
  comercio: {
    default: "Varejo",
    high_cartao: "Varejo com alto volume de cartão",
    st: "Distribuição com substituição tributária",
    interestadual: "Comércio interestadual",
    ecommerce: "E-commerce",
  },
  servicos: {
    default: "Prestação de Serviços",
    folha: "Serviços intensivos em mão de obra",
    iss: "Serviços sujeitos a ISS",
  },
  industria: {
    default: "Indústria Manufatureira",
    exportacao: "Indústria exportadora",
    atacadista: "Indústria com canal atacadista",
    industrial: "Operação industrial integrada",
  },
}

function readSubsegment(ctx: CompanyContext): string {
  const seg   = ctx.consultant.segment
  const flags = ctx.consultant.operation_flags ?? []
  const map   = SUBSEGMENT_MAP[seg] ?? { default: SEGMENT_LABELS[seg] }

  if (seg === "comercio") {
    if (flags.includes("ecommerce"))           return map.ecommerce
    if (flags.includes("venda_interestadual"))  return map.interestadual
    if (flags.includes("icms_st"))             return map.st
    if (flags.includes("venda_cartao"))        return map.high_cartao
  }
  if (seg === "servicos") {
    if (flags.includes("operacao_iss"))        return map.iss
    if (flags.includes("folha_relevante"))     return map.folha
  }
  if (seg === "industria") {
    if (flags.includes("exportacao"))          return map.exportacao
    if (flags.includes("operacao_industrial")) return map.industrial
  }
  return map.default
}

// --------- Signal detection ---------------------------------------------------------------------------------------------------------------------------

function detectSignals(ctx: CompanyContext): OperationSignal[] {
  const flags  = ctx.consultant.operation_flags ?? []
  const signals: OperationSignal[] = []

  if (flags.includes("venda_cartao"))        signals.push("alto_cartao")
  if (flags.includes("icms_st"))             signals.push("provavel_st")
  if (ctx.consultant.segment === "comercio") signals.push("consumidor_final")
  if (flags.includes("folha_relevante"))     signals.push("alta_folha")
  if (flags.includes("exportacao"))          signals.push("exportador")
  if (flags.includes("operacao_industrial")) signals.push("industrial")
  if (ctx.consultant.segment === "servicos") signals.push("servico_intensivo")
  if (flags.includes("venda_interestadual")) signals.push("interestadual")
  if (flags.includes("ecommerce"))           signals.push("ecommerce")
  if (ctx.porte === "grande")                signals.push("grande_porte")
  if (ctx.anos_operacao >= 10)               signals.push("maturidade_alta")
  if (ctx.anos_operacao < 5)                 signals.push("maturidade_baixa")

  return signals
}

// --------- Pain mapping ---------------------------------------------------------------------------------------------------------------------------------------

function detectPains(ctx: CompanyContext, signals: OperationSignal[]): ProbablePain[] {
  const seg    = ctx.consultant.segment
  const regime = ctx.consultant.tax_regime
  const pains: ProbablePain[] = []

  if (seg === "comercio") {
    pains.push("margem_operacional")
    if (signals.includes("alto_cartao"))  pains.push("custo_tributario_alto")
    if (signals.includes("provavel_st"))  pains.push("ineficiencia_creditos")
    pains.push("pressao_caixa")
  }

  if (seg === "servicos") {
    if (signals.includes("alta_folha"))   pains.push("encargos_folha")
    pains.push("custo_tributario_alto")
    pains.push("complexidade_fiscal")
  }

  if (seg === "industria") {
    pains.push("ineficiencia_creditos")
    pains.push("custo_tributario_alto")
    if (signals.includes("exportador"))   pains.push("revisao_atrasada")
    pains.push("eficiencia" as unknown as ProbablePain)
  }

  if (regime === "lucro_real")            pains.push("revisao_atrasada")
  if (signals.includes("maturidade_alta"))pains.push("complexidade_fiscal")

  return [...new Set(pains)].slice(0, 4) as ProbablePain[]
}

// --------- Likely focus ---------------------------------------------------------------------------------------------------------------------------------------

function detectFocus(ctx: CompanyContext): LikelyFocus[] {
  const seg    = ctx.consultant.segment
  const flags  = ctx.consultant.operation_flags ?? []
  const focus: LikelyFocus[] = []

  if (seg === "comercio") focus.push("eficiencia", "caixa")
  if (seg === "servicos") focus.push("folha", "encargos")
  if (seg === "industria") focus.push("creditos", "eficiencia")

  if (flags.includes("exportacao"))       focus.push("exportacao")
  if (flags.includes("folha_relevante"))  focus.push("folha")
  if (ctx.consultant.tax_regime === "lucro_real") focus.push("revisao_operacional")

  return [...new Set(focus)].slice(0, 4)
}

// --------- Maturity reading ---------------------------------------------------------------------------------------------------------------------------

function buildMaturityReading(ctx: CompanyContext): string {
  const seg   = SEGMENT_LABELS[ctx.consultant.segment]
  const reg   = REGIME_LABELS[ctx.consultant.tax_regime]
  const anos  = ctx.anos_operacao
  const porte = ctx.porte

  if (ctx.consultant.tax_regime === "simples_nacional") {
    return `Empresa de ${seg} no Simples Nacional — perfil com menor complexidade tributária e revisão simplificada.`
  }

  if (anos >= 15 && ctx.porte !== "micro") {
    return `Empresa de ${seg} com ${anos} anos de operação no ${reg}. Maturidade operacional elevada — provavelmente nunca realizou revisão tributária estratégica profunda.`
  }
  if (anos >= 8) {
    return `Empresa de ${seg} estabelecida (${anos} anos) no ${reg}, porte ${porte}. Operação consolidada — janela ideal para primeira revisão estratégica.`
  }
  return `Empresa de ${seg} em crescimento (${anos} anos) no ${reg}. Perfil em construção — oportunidade de posicionamento como parceiro de longo prazo.`
}

// --------- Strategic moment ---------------------------------------------------------------------------------------------------------------------------

function buildStrategicMoment(ctx: CompanyContext, signals: OperationSignal[]): string {
  const moments: string[] = []

  if (signals.includes("maturidade_alta")) {
    moments.push("Empresa com histórico acumulado — janela retroativa ampla disponível.")
  }
  if (ctx.consultant.tax_regime === "lucro_real" && signals.includes("alto_cartao")) {
    moments.push("Operação em cartão + LR é o perfil com maior frequência de crédito não aproveitado.")
  }
  if (signals.includes("exportador")) {
    moments.push("Exportação ativa + IPI: tese de mais alta segurança jurídica disponível para indústrias.")
  }
  if (signals.includes("alta_folha") && ctx.consultant.segment !== "comercio") {
    moments.push("Folha relevante + encargos — momento certo para revisão previdenciária estratégica.")
  }

  return moments.length > 0 ? moments.join(" ") : "Perfil identificado — análise prévia necessária para definir timing ideal."
}

// --------- Red flags ------------------------------------------------------------------------------------------------------------------------------------------------

function buildRedFlags(ctx: CompanyContext): string[] {
  const flags: string[] = []

  if (ctx.consultant.tax_regime === "simples_nacional") {
    flags.push("Simples Nacional — potencial de revisão limitado. Abordagem deve ser direta sobre limitações.")
  }
  if (!ctx.faturamento_estimado) {
    flags.push("Faturamento desconhecido — estimativas financeiras imprecisas. Qualificar antes de prometer números.")
  }
  if (!ctx.folha_estimada && ["sistema_s","verbas_indenizatorias"].some(_ => true)) {
    flags.push("Folha de pagamento não informada — módulos previdenciários sem base de cálculo.")
  }
  if (ctx.anos_operacao < 3) {
    flags.push("Empresa jovem — período retroativo limitado. Posicionar como parceiro de crescimento, não recuperação.")
  }
  return flags
}

// --------- Main export ------------------------------------------------------------------------------------------------------------------------------------------

export function buildCompanySnapshot(ctx: CompanyContext): CompanySnapshot {
  const signals = detectSignals(ctx)
  const pains   = detectPains(ctx, signals)
  const focus   = detectFocus(ctx)

  const hasHighOpportunity =
    ctx.consultant.tax_regime !== "simples_nacional" &&
    (signals.includes("alto_cartao") || signals.includes("provavel_st") || signals.includes("exportador"))

  return {
    segment:            ctx.consultant.segment,
    subsegment:         readSubsegment(ctx),
    operation_signals:  signals,
    probable_pains:     pains,
    likely_focus:       focus,
    maturity_reading:   buildMaturityReading(ctx),
    strategic_moment:   buildStrategicMoment(ctx, signals),
    red_flags:          buildRedFlags(ctx),
    opportunity_urgency: hasHighOpportunity ? "alta" : ctx.anos_operacao >= 8 ? "media" : "baixa",
  }
}
