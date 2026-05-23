// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Sales Strategy Engine
//
// Generates complete go-to-market strategy for a specific company:
// - Best persona to approach first
// - Best thesis and pain
// - Best CTA and channel
// - Technical depth ideal
// - Language ideal
// - Smart questions that demonstrate context
// - Executive Meeting Briefing (1-page)
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { CompanyProfile, CommercialTemp } from "./company-profile-engine"
import type { DecisionMaker }                   from "./decision-maker-engine"
import type { Segment, TaxRegime }              from "../engine/tax-matrix"
import { SEGMENT_LABELS, REGIME_LABELS }        from "../engine/tax-matrix"

// --------- Sales strategy ---------------------------------------------------------------------------------------------------------------------------------

export type SalesChannel = "telefone" | "whatsapp" | "email" | "linkedin"

export interface SalesStrategy {
  primary_persona:       DecisionMaker
  primary_channel:       SalesChannel
  primary_thesis:        string      // the main argument
  primary_pain:          string      // the pain to open with
  opening_line:          string      // first 20 words on the call
  context_hook:          string      // company-specific hook
  curiosity_gap:         string      // what makes them want to know more
  technical_depth:       "baixa" | "media" | "alta"
  language_style:        string
  ideal_timing:          string
  cta:                   string
  fallback_cta:          string      // if they say they're busy
  sequence: Array<{
    day:     string
    channel: SalesChannel
    action:  string
    message: string
  }>
}

export interface ExecutiveBriefing {
  // Header
  company_name:     string
  cnpj:             string
  generated_at:     string
  // The 1-page content
  empresa_resumo:   string       // 2 sentences max
  operacao:         string       // what they do
  sinais_chave:     string[]     // top 5 signals
  decisores:        string[]     // who to call
  // Opportunities
  top_oportunidades: Array<{ nome: string; motivo: string; urgencia: string }>
  // Approach
  abordagem_ideal:  string
  abertura:         string
  riscos:           string[]
  objecoes:         Array<{ objecao: string; resposta: string }>
  // Smart questions
  perguntas_inteligentes: string[]
  // Timing
  timing:           string
  temperatura:      CommercialTemp
  estrategia:       string       // the 1-paragraph strategy
}

// --------- Context-aware opening line ---------------------------------------------------------------------------------------------

function buildOpeningLine(
  profile:  CompanyProfile,
  persona:  DecisionMaker,
  modules:  Array<{ name: string; slug: string }>,
): string {
  const nome = profile.razao_social.split(" ")[0]
  const seg  = SEGMENT_LABELS[profile.business_model.includes("serviços") ? "servicos" : profile.business_model.includes("indústria") ? "industria" : "comercio" as Segment] ?? "serviços"

  // Use the strongest available signal for the opening
  const topSignal = profile.operational_signals[0]
  const topModule = modules[0]

  if (profile.has_export && profile.has_industry) {
    return `Bom dia, [Nome]. Sou [Consultor]. Identifiquei que ${nome} tem operação industrial com exportação — empresas nesse perfil no ${REGIME_LABELS["lucro_real"]} têm um crédito de IPI fixado em lei (5,37%) que raramente é aproveitado sistematicamente. Tenho 2 minutos?`
  }
  if (profile.has_ecommerce && profile.anos_operacao >= 5) {
    return `Bom dia, [Nome]. Sou [Consultor]. ${nome} tem operação de e-commerce — e isso cria movimentações interestaduais que raramente são revisadas do ponto de vista tributário. Tenho 2 minutos?`
  }
  if (profile.anos_operacao >= 12) {
    return `Bom dia, [Nome]. Sou [Consultor]. ${nome} tem ${profile.anos_operacao} anos de operação — e empresas com esse histórico normalmente acumulam revisões tributárias que nunca foram feitas. Tenho 2 minutos?`
  }
  if (topModule) {
    return `Bom dia, [Nome]. Sou [Consultor]. Analisei o perfil de ${nome} e identifiquei algo relacionado a ${topModule.name} que vale uma conversa rápida. Tenho 2 minutos?`
  }
  return `Bom dia, [Nome]. Sou [Consultor]. Temos trabalhado com empresas de ${seg.toLowerCase()} e o perfil de ${nome} apresenta características que merecem atenção tributária. Tenho 2 minutos?`
}

// --------- Context hook ---------------------------------------------------------------------------------------------------------------------------------------

function buildContextHook(profile: CompanyProfile): string {
  const nome = profile.razao_social.split(" ")[0]
  const sigs = profile.operational_signals

  if (sigs.some(s => s.type === "export")) {
    return `Percebi que ${nome} tem operação exportadora — e há um crédito de IPI com alíquota fixada em lei (5,37%) que muitas indústrias do perfil de vocês ainda não aproveitaram sistematicamente nos 60 meses disponíveis.`
  }
  if (sigs.some(s => s.type === "ecommerce")) {
    return `Identifiquei que ${nome} tem canal digital — e operações de e-commerce criam movimentações interestaduais com implicações tributárias (DIFAL) que raramente são revisadas nesse perfil.`
  }
  if (sigs.some(s => s.type === "industry")) {
    return `${nome} tem perfil industrial — e a jurisprudência ampliou o conceito de insumo para PIS/COFINS desde 2018 (STJ REsp 1.221.170). A maioria das indústrias ainda não revisou com base na nova tese.`
  }
  if (profile.expansion_signals.length > 0) {
    return `Identifiquei que ${nome} está em expansão — e empresas nesse momento costumam ter complexidade tributária crescente que não foi revisada estrategicamente.`
  }
  if (profile.anos_operacao >= 10) {
    return `${nome} tem ${profile.anos_operacao} anos de operação — e isso cria um período retroativo tributário expressivo que ainda pode ser aproveitado.`
  }
  return `Analisamos o perfil público de ${nome} e identificamos comportamentos fiscais específicos do setor que raramente passam pelo radar do trabalho contábil cotidiano.`
}

// --------- Smart questions ------------------------------------------------------------------------------------------------------------------------------
// Questions that demonstrate context and generate opening

export function buildSmartQuestions(profile: CompanyProfile, hasDecisionMakers: boolean): string[] {
  const questions: string[] = []

  // Context-demonstrating questions (not generic "voc-- tem oportunidade?")
  if (profile.has_industry) {
    questions.push("Hoje vocês possuem operação industrial própria ou parte da produção é terceirizada?")
    questions.push("Qual o percentual de insumos adquiridos de fornecedores atacadistas não contribuintes de IPI?")
  }
  if (profile.has_export) {
    questions.push("Vocês exportam diretamente ou via trading company?")
    questions.push("Qual o percentual do faturamento destinado à exportação?")
  }
  if (profile.has_ecommerce) {
    questions.push("Qual o volume de vendas online e para quais estados vocês vendem mais?")
    questions.push("O e-commerce opera sob o mesmo CNPJ ou tem estrutura separada?")
  }
  if (profile.has_retail) {
    questions.push("Vocês adquirem mercadorias com ICMS-ST embutido de forma relevante?")
    questions.push("Qual o percentual de vendas em cartão no faturamento total?")
  }
  if (profile.anos_operacao >= 8) {
    questions.push(`Com ${profile.anos_operacao} anos de operação, vocês já realizaram alguma revisão tributária estratégica retroativa?`)
  }
  if (!hasDecisionMakers) {
    questions.push("Quem é o responsável pela área fiscal e tributária da empresa?")
  }

  // Always include
  questions.push("Qual o escritório contábil/tributário atual e qual é o foco principal do trabalho deles?")
  questions.push("Como está a pressão de margem no setor de vocês atualmente?")

  return questions.slice(0, 6)
}

// --------- Sales sequence ---------------------------------------------------------------------------------------------------------------------------------

function buildSalesSequence(
  nome:    string,
  persona: DecisionMaker,
  temp:    CommercialTemp,
): SalesStrategy["sequence"] {
  return [
    { day: "D+0", channel: "telefone", action: "Ligação de abertura",          message: `Ligação inicial — usar abertura contextual. CTA: 20 minutos de diagnóstico.` },
    { day: "D+0", channel: "email",    action: "E-mail se não atender",         message: `E-mail com assunto específico (sem 'recuperação tributária'). Corpo: contexto + 1 hook + CTA leve.` },
    { day: "D+3", channel: "whatsapp", action: "Follow-up curto",               message: `"Oi [Nome], só confirmando o recebimento do e-mail sobre ${nome}. Quando tiver 5 minutos, fico à disposição."` },
    { day: "D+7", channel: "email",    action: "Valor adicionado — sem pedir",  message: `E-mail com dado relevante do setor. Não pedir reunião — construir credibilidade.` },
    { day: "D+14", channel: temp === "muito_quente" ? "telefone" : "whatsapp", action: "Reforço final", message: `Última tentativa. Tom: "Deixo o contato aberto para quando fizer sentido."` },
  ]
}

// --------- Main strategy builder ------------------------------------------------------------------------------------------------------------

export function buildSalesStrategy(
  profile:  CompanyProfile,
  makers:   DecisionMaker[],
  modules:  Array<{ name: string; slug: string; score: number }>,
): SalesStrategy {
  const primary   = makers.find(m => m.is_primary_target) ?? makers[0]
  const topModules = modules.sort((a,b) => b.score - a.score).slice(0, 3)

  const channel: SalesChannel =
    primary.preferred_language === "técnico" ? "email"
    : profile.commercial_temperature === "muito_quente" ? "telefone"
    : "telefone"

  const depth: SalesStrategy["technical_depth"] =
    primary.technical_level === "alto" ? "alta"
    : primary.technical_level === "medio" ? "media"
    : "baixa"

  return {
    primary_persona:   primary,
    primary_channel:   channel,
    primary_thesis:    topModules[0] ? `${topModules[0].name} — base jurídica consolidada para o perfil de ${profile.razao_social}` : "Revisão tributária estratégica — perfil com oportunidades não revisadas",
    primary_pain:      primary.expected_pain,
    opening_line:      buildOpeningLine(profile, primary, topModules),
    context_hook:      buildContextHook(profile),
    curiosity_gap:     `A maioria das empresas do perfil de ${profile.razao_social.split(" ")[0]} nunca revisou especificamente ${topModules[0]?.name ?? "esses comportamentos fiscais"}.`,
    technical_depth:   depth,
    language_style:    primary.preferred_language,
    ideal_timing:      primary.source === "Receita Federal (QSA)" ? "Contato direto disponível" : "Pesquisar decisor antes de ligar",
    cta:               primary.best_approach.includes("20 minutos") ? "20 minutos para diagnóstico preliminar" : primary.best_approach,
    fallback_cta:      "Posso enviar um resumo de 1 página por e-mail — você avalia quando tiver 5 minutos?",
    sequence:          buildSalesSequence(profile.razao_social.split(" ")[0], primary, profile.commercial_temperature),
  }
}

// --------- Executive Briefing ---------------------------------------------------------------------------------------------------------------------

export function buildExecutiveBriefing(
  profile:   CompanyProfile,
  makers:    DecisionMaker[],
  modules:   Array<{ name: string; slug: string; score: number; risk: string }>,
  objections: Array<{ objection: string; response: string }>,
): ExecutiveBriefing {
  const hasDecisionMakers = makers.some(m => m.source !== "Inferido por segmento")
  const questions         = buildSmartQuestions(profile, hasDecisionMakers)
  const strategy          = buildSalesStrategy(profile, makers, modules)
  const topMods           = modules.slice(0, 3)

  const tempLabel = {
    fria: "🔵 Fria", morna: "🟡 Morna", quente: "🟠 Quente", muito_quente: "🔴 Muito Quente"
  }[profile.commercial_temperature] ?? "🔵 Fria"

  return {
    company_name:    profile.razao_social,
    cnpj:            profile.cnpj,
    generated_at:    new Date().toISOString(),
    empresa_resumo:  profile.strategic_summary,
    operacao:        profile.operational_summary,
    sinais_chave:    [
      ...profile.operational_signals.slice(0,3).map(s => `${s.label}: ${s.evidence}`),
      ...profile.expansion_signals.slice(0,2),
    ].slice(0, 5),
    decisores: makers.filter(m => m.confidence !== "low").map(m => `${m.name} — ${m.probable_role} (${m.source})`),
    top_oportunidades: topMods.map(m => ({
      nome:     m.name,
      motivo:   `Módulo ${m.risk === "remoto" ? "de baixo risco" : "com risco " + m.risk} para o perfil identificado`,
      urgencia: m.score >= 80 ? "Alta" : m.score >= 60 ? "Média" : "Baixa",
    })),
    abordagem_ideal: profile.q_best_approach,
    abertura:        strategy.opening_line,
    riscos:          [
      profile.data_gaps.length > 0 ? `Dados incompletos: ${profile.data_gaps.slice(0,2).join(", ")}` : null,
      ...modules.filter(m => m.risk === "possível").map(m => `${m.name}: risco possível — mencionar proativamente`),
    ].filter((x): x is string => Boolean(x)).slice(0,3),
    objecoes: objections.slice(0,3),
    perguntas_inteligentes: questions,
    timing:   strategy.ideal_timing,
    temperatura: profile.commercial_temperature,
    estrategia: `${tempLabel} — ${profile.strategic_summary} A abordagem recomendada é ${strategy.primary_channel} para ${strategy.primary_persona.probable_role}, com profundidade técnica ${strategy.technical_depth} e linguagem ${strategy.language_style}. CTA: ${strategy.cta}.`,
  }
}
