// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Research --- Copilot
//
// Transforms research signals into contextual language for:
// - Pitch lines ("vi que voc--s..." / "h-- ind--cios de..." / "vale confirmar...")
// - Email subjects and hooks
// - WhatsApp messages
// - Smart questions
//
// Language rules:
// - confirmed fact --- assert directly
// - hypothesis (medium) --- "h-- ind--cios de" / "pelo perfil p--blico"
// - low confidence --- turn into question, never assertion
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { ResearchSignal }   from "./research-signals"
import type { CompanyResearch }  from "./research-orchestrator"
import type { PersonaType }      from "../copilot/types"
import { PERSONA_LABELS }        from "../copilot/persona-behavior"

// --------- Contextual line builder ------------------------------------------------------------------------------------------------------

export interface ContextualLine {
  text:       string
  type:       "assertion" | "indication" | "question"
  source:     string
  module_hint?: string
}

function buildContextualLine(signal: ResearchSignal): ContextualLine {
  if (signal.confidence === "high" && signal.is_confirmed) {
    return { text: signal.interpretation, type: "assertion", source: signal.source, module_hint: signal.module_hint }
  }
  if (signal.confidence === "medium") {
    return {
      text:  `Há indícios de ${signal.interpretation.charAt(0).toLowerCase()}${signal.interpretation.slice(1)}`,
      type:  "indication",
      source: signal.source,
      module_hint: signal.module_hint,
    }
  }
  // low confidence --- question
  const q = signal.interpretation.replace(/^[A-Z]/, c => c.toLowerCase())
  return {
    text:  `Vale confirmar: ${q}?`,
    type:  "question",
    source: signal.source,
    module_hint: signal.module_hint,
  }
}

// --------- Pitch line for a specific signal ------------------------------------------------------------------------

function signalToPitchLine(signal: ResearchSignal, companyName: string): string {
  const nome = companyName.split(" ")[0]
  const src  = signal.source.toLowerCase()

  switch (signal.signal_type) {
    case "exportacao":
      if (signal.is_confirmed) return `Vi que ${nome} tem operação exportadora — há um crédito de IPI de 5,37% fixado em lei (Lei 9.363/96) que muitas indústrias não aproveitam sistematicamente.`
      return `Pelo perfil público de ${nome}, há indícios de operação exportadora — vale confirmar o percentual do faturamento nesse canal.`

    case "ecommerce":
      if (signal.is_confirmed) return `${nome} tem canal de vendas digital — e-commerce gera operações interestaduais que costumam ter impacto no DIFAL que raramente é revisado.`
      return `Identificamos possível e-commerce no perfil de ${nome} — vale confirmar se há vendas para outros estados.`

    case "expansao":
      return `Identificamos que ${nome} está em expansão${src.includes("google") ? " — vi isso em uma notícia recente" : ""} — empresas nesse momento tipicamente têm folha crescendo e Sistema S sem revisão estratégica.`

    case "varejo":
      if (signal.confidence === "high") return `${nome} tem perfil varejista confirmado — e o STJ pacificou em 2023 (Tema 1.125) que o ICMS-ST embutido nas compras não deveria estar na base do PIS/COFINS.`
      return `Pelo CNAE de ${nome}, há perfil de varejo — vale confirmar se há compras com ICMS-ST relevantes.`

    case "industria":
      if (signal.confidence === "high") return `${nome} tem operação industrial confirmada — e a jurisprudência ampliou o conceito de insumo para PIS/COFINS desde 2018 (STJ REsp 1.221.170). A maioria das indústrias ainda não revisou.`
      return `Pelo CNAE de ${nome}, há perfil industrial — vale confirmar quais insumos são usados na produção.`

    case "tema_69_detectado":
      return `Identificamos referências ao Tema 69 no histórico de ${nome} — o Gross-Up do ICMS pode ser um próximo passo, dependendo do que já foi aproveitado.`

    case "sistema_s_detectado":
      return `${nome} tem histórico de discussão sobre Sistema S — antes de propor, vale confirmar se o Tema 1079 STJ já foi aproveitado retroativamente.`

    case "decisor_identificado":
      return `Identificamos ${signal.evidence} como responsável${signal.source.includes("Receita") ? " na Receita Federal" : " manualmente"} — a abordagem pode ser direta.`

    case "maturidade_juridica":
      return `${nome} tem histórico tributário jurídico ativo — a abordagem deve ser técnica e complementar ao que já foi trabalhado.`

    default:
      if (signal.confidence === "low") return `Vale confirmar com ${nome}: ${signal.interpretation.charAt(0).toLowerCase()}${signal.interpretation.slice(1)}?`
      return `Pelo perfil de ${nome}: ${signal.interpretation.charAt(0).toLowerCase()}${signal.interpretation.slice(1)}.`
  }
}

// --------- Context block ------------------------------------------------------------------------------------------------------------------------------------

export interface ResearchCopilotContext {
  opening_lines:       ContextualLine[]         // top 3 lines to open with
  pitch_lines:         string[]                  // assembled pitch sentences
  email_hooks:         string[]                  // for email subject/opener
  whatsapp_lines:      string[]                  // short, natural WA lines
  smart_questions:     string[]                  // questions derived from low-conf signals
  do_not_assert:       string[]                  // what NOT to state as facts
  persona_adjustments: Record<PersonaType, string> // persona-specific line
}

export function buildResearchCopilotContext(
  research: CompanyResearch,
  signals:  ResearchSignal[],
): ResearchCopilotContext {
  const nome       = research.razao_social.split(" ")[0]
  const razao      = research.razao_social

  // Opening lines (top 3 most confident)
  const topSignals = [...signals]
    .sort((a,b) => (b.confidence === "high" ? 2 : b.confidence === "medium" ? 1 : 0) - (a.confidence === "high" ? 2 : a.confidence === "medium" ? 1 : 0))
    .slice(0, 4)

  const opening_lines = topSignals.map(buildContextualLine)

  // Pitch lines
  const pitch_lines = topSignals
    .filter(s => s.confidence !== "low")
    .slice(0, 3)
    .map(s => signalToPitchLine(s, razao))

  // Email hooks
  const email_hooks: string[] = []
  if (research.website.found) {
    email_hooks.push(`Com base no perfil público de ${razao}`)
  }
  if (research.news.items.length > 0) {
    email_hooks.push(`Vi recentemente que ${nome} ${research.news.items[0].title.toLowerCase().split(nome.toLowerCase()).pop()?.trim().slice(0, 50) ?? "teve destaque na mídia"}`)
  }
  if (research.cnpj_result.merged.idade_empresa && research.cnpj_result.merged.idade_empresa >= 10) {
    email_hooks.push(`${razao} tem ${research.cnpj_result.merged.idade_empresa} anos de operação`)
  }
  if (email_hooks.length === 0) {
    email_hooks.push(`Analisamos o perfil público de ${razao}`)
  }

  // WhatsApp (max 250 chars each, human, no AI-smell)
  const whatsapp_lines: string[] = []
  if (research.cnpj_result.merged.idade_empresa && research.cnpj_result.merged.idade_empresa >= 10) {
    whatsapp_lines.push(`Oi [Nome]! Sou [Consultor]. ${nome} tem ${research.cnpj_result.merged.idade_empresa} anos — isso cria um período retroativo tributário relevante. Posso mandar um resumo rápido?`)
  }
  if (signals.some(s => s.signal_type === "expansao")) {
    whatsapp_lines.push(`Oi [Nome], tudo bem? Vi que ${nome} está crescendo — empresas nesse momento costumam ter oportunidades tributárias não revisadas. Posso explicar em 2 min?`)
  }
  if (whatsapp_lines.length === 0) {
    whatsapp_lines.push(`Oi [Nome], tudo bem? Sou [Consultor]. Analisei o perfil de ${nome} e identifiquei algo que vale uma conversa rápida. Posso mandar um resumo?`)
  }

  // Smart questions (from low-confidence signals + missing info)
  const smart_questions: string[] = []
  for (const s of signals.filter(s => s.confidence === "low" || !s.is_confirmed)) {
    const line = buildContextualLine(s)
    if (line.type === "question") smart_questions.push(line.text)
  }
  for (const missing of research.missing_information.slice(0, 2)) {
    smart_questions.push(`Como podemos confirmar: ${missing}?`)
  }

  // What NOT to assert
  const do_not_assert: string[] = signals
    .filter(s => !s.is_confirmed && s.signal_type !== "decisor_identificado")
    .map(s => `Não afirmar que ${s.interpretation.charAt(0).toLowerCase()}${s.interpretation.slice(1)} — ainda é hipótese`)
    .slice(0, 4)

  // Persona adjustments
  const topOpp = signals[0]
  const persona_adjustments: Record<PersonaType, string> = {
    cfo:      topOpp ? `Para o CFO: "${signalToPitchLine({ ...topOpp, confidence: topOpp.confidence === "low" ? "medium" : topOpp.confidence }, razao)}"` : `Para o CFO: foco em eficiência tributária e impacto no resultado.`,
    socio:    `Para o Sócio: mencionar que há informações públicas de ${nome} que justificam a conversa — sem detalhe técnico.`,
    fiscal:   topOpp ? `Para o Fiscal: "${buildContextualLine(topOpp).text}" — embasar tecnicamente.` : `Para o Fiscal: abordagem técnica com referência jurisprudencial.`,
    contador: `Para o Contador: apresentar como complementar — "${nome} pode ter frentes que não passam pelo trabalho cotidiano do escritório."`,
    rh:       `Para o RH: foco em encargos sobre folha — "há revisão previdenciária que não afeta os colaboradores."`,
  }

  return { opening_lines, pitch_lines, email_hooks, whatsapp_lines, smart_questions, do_not_assert, persona_adjustments }
}

// --------- Module evidence builder ------------------------------------------------------------------------------------------------------
// Used by UI to show "this module was activated by..."

export interface ModuleEvidence {
  module_slug:        string
  activating_signals: Array<{ signal: string; source: string; confidence: "low"|"medium"|"high" }>
  boosting_signals:   Array<{ signal: string; delta: number; source: string }>
  caution_signals:    Array<{ signal: string; source: string }>
  missing_to_confirm: string[]
}

export function buildModuleEvidence(
  module_slug: string,
  signals:     ResearchSignal[],
  adjustments: import("./research-to-score").ModuleFlagAdjustment[],
): ModuleEvidence {
  const relevant_adj  = adjustments.filter(a => a.module_slug === module_slug)
  const activating    = relevant_adj.filter(a => a.action === "promote_to_secondary").map(a => ({ signal: a.reason, source: a.signal_source, confidence: a.confidence }))
  const boosting      = relevant_adj.filter(a => a.action === "boost_score" && (a.delta_score ?? 0) > 0).map(a => ({ signal: a.reason, delta: a.delta_score!, source: a.signal_source }))
  const caution       = relevant_adj.filter(a => a.action === "caution").map(a => ({ signal: a.reason, source: a.signal_source }))

  // Missing signals that could further confirm this module
  const missing: string[] = []
  if (module_slug === "ipi_credito_presumido_exportacao" && !signals.some(s => s.signal_type === "exportacao" && s.is_confirmed)) {
    missing.push("Confirmar percentual do faturamento em exportação")
  }
  if (module_slug === "icms_st_pis_cofins" && !signals.some(s => s.signal_type === "icms_st_probable" || s.signal_type === "varejo")) {
    missing.push("Confirmar volume de compras com ICMS-ST")
  }
  if (module_slug === "sistema_s" && !signals.some(s => s.signal_type === "folha_relevante")) {
    missing.push("Confirmar valor da folha de pagamento mensal")
  }
  if (module_slug === "difal_pis_cofins" && !signals.some(s => s.signal_type === "ecommerce")) {
    missing.push("Confirmar volume de vendas interestaduais")
  }

  return { module_slug, activating_signals: activating, boosting_signals: boosting, caution_signals: caution, missing_to_confirm: missing }
}
