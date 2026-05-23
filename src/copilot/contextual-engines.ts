// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Company-Aware Communication Engines
// Email / WhatsApp / Objections / Meeting Prep
// All use CopilotContext --- no generic output
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { CopilotContext, ContextItem, cautious as CautiousType } from "./context-builder"
import { cautious } from "./context-builder"
import type { PersonaType } from "./types"
import { PERSONA_LABELS } from "./persona-behavior"

// --------- Company-Aware Email ------------------------------------------------------------------------------------------------------------------

export interface ContextualEmail {
  subject:        string
  preview:        string
  body:           string
  ps:             string
  version:        "formal" | "curta" | "pos_ligacao"
  uses_real_data: boolean
  data_used:      string[]    // what facts/signals were used
}

export function generateContextualEmail(
  ctx:     CopilotContext,
  persona: PersonaType,
  version: "formal" | "curta" | "pos_ligacao" = "formal",
): ContextualEmail {
  const nome  = ctx.company_name.split(" ")[0]
  const full  = ctx.company_name
  const seg   = ctx.segment_label.toLowerCase()
  const reg   = ctx.regime_label
  const topOp = ctx.tax_opportunities[0]
  const op2   = ctx.tax_opportunities[1]

  // Subject: specific, never generic
  const subjects: Record<PersonaType, string> = {
    cfo: ctx.anos_operacao >= 10
      ? `${nome} — revisão tributária: ${ctx.anos_operacao} anos de histórico não analisado`
      : topOp ? `${nome} — análise de ${topOp.name.split(" ").slice(0, 3).join(" ")}`
      : `${nome} — revisão tributária estratégica para ${seg}`,
    socio:    `${nome} — identificamos algo no perfil de vocês`,
    fiscal:   `${nome} — revisão técnica complementar: ${topOp?.name ?? "PIS/COFINS e encargos"}`,
    contador: `Revisão tributária complementar para ${nome}`,
    rh:       `${nome} — eficiência de encargos sobre folha`,
  }

  // Data used (transparency)
  const data_used: string[] = []
  if (ctx.anos_operacao > 0) data_used.push(`${ctx.anos_operacao} anos de operação (Receita Federal)`)
  if (topOp) data_used.push(`Oportunidade core: ${topOp.name}`)
  if (ctx.operational_signals.length > 0) data_used.push(ctx.operational_signals[0].text)

  // Body by version
  const hook = ctx.commercial_hooks[0]?.replace(/^"|"$/g, "") ?? `Temos trabalhado com empresas de ${seg} no ${reg} e identificamos comportamentos fiscais específicos do perfil.`

  const contextLine = ctx.company_facts.length > 0
    ? `Analisando o perfil público de ${full}, identificamos: ${ctx.company_facts.slice(0, 2).map(f => f.text.toLowerCase()).join(", ")}.`
    : `Analisando o perfil de ${full}, identificamos algumas características do setor que merecem atenção.`

  const bodies: Record<typeof version, string> = {
    formal: `Olá, [Nome],

${contextLine}

${hook}

${topOp ? `A frente prioritária para o perfil de vocês é ${topOp.name} — ${topOp.pitch}` : "Identificamos frentes de revisão tributária com base jurídica consolidada aplicáveis ao perfil de vocês."}
${op2 ? `\nUma segunda frente relevante: ${op2.name}.` : ""}

Não estou propondo nada ainda. Antes de qualquer análise, preciso de 20 minutos para entender melhor a operação de vocês e confirmar se o que identificamos é aplicável.

${ctx.decision_makers.filter(dm => dm.is_target).length > 0 ? `Tenho o nome de ${ctx.decision_makers.find(dm => dm.is_target)?.name} como possível referência — poderia confirmar se é a pessoa certa?` : "Poderia indicar a pessoa certa para conversar sobre esse tema?"}

[Nome do Consultor]`,

    curta: `Olá, [Nome],

${hook}

Para ${full}, identificamos ${topOp?.name ?? "oportunidades de revisão tributária"} como frente prioritária.

Vale 20 minutos para apresentar o diagnóstico?

[Nome do Consultor]`,

    pos_ligacao: `Olá, [Nome],

Obrigado pela conversa de hoje.

Conforme alinhado, seguem os pontos principais:

${topOp ? `— ${topOp.name}: ${topOp.pitch}` : "— Frentes de revisão identificadas no perfil de vocês"}
${op2 ? `— ${op2.name}: aplicável ao perfil de ${full}` : ""}
${ctx.missing_information.length > 0 ? `\nPara refinar a análise, precisarei de: ${ctx.missing_information.slice(0, 2).join(", ")}.` : ""}

Próximo passo: [combinado na ligação].

[Nome do Consultor]`,
  }

  const psMap: Record<PersonaType, string> = {
    cfo:      `P.S. Nenhum documento necessário nessa etapa — a análise inicial é baseada em dados públicos e nas informações que você me passar.`,
    socio:    `P.S. O diagnóstico inicial é gratuito e sem compromisso.`,
    fiscal:   `P.S. Posso enviar as referências jurídicas dos temas que levantei se quiser avaliar tecnicamente antes da call.`,
    contador: `P.S. Nenhuma movimentação com o cliente sem seu conhecimento e aprovação prévia.`,
    rh:       `P.S. O processo não tem nenhum impacto nos colaboradores.`,
  }

  return {
    subject:        subjects[persona],
    preview:        `${ctx.company_facts[0]?.text ?? hook.slice(0, 60)}…`,
    body:           bodies[version],
    ps:             version !== "pos_ligacao" ? psMap[persona] : "",
    version,
    uses_real_data: data_used.length > 0,
    data_used,
  }
}

// --------- Company-Aware WhatsApp ---------------------------------------------------------------------------------------------------------

export interface ContextualWhatsApp {
  text:        string
  char_count:  number
  tone_check:  string
  uses_hook:   boolean
  data_used:   string
}

export function generateContextualWhatsApp(
  ctx:     CopilotContext,
  persona: PersonaType,
  stage:   "abordagem" | "followup" | "pos_reuniao" = "abordagem",
): ContextualWhatsApp {
  const nome = ctx.company_name.split(" ")[0]
  const seg  = ctx.segment_label.toLowerCase()
  const hook = ctx.commercial_hooks[0]?.replace(/^"|"$/g, "").split("—")[0]?.trim() ?? `algo no perfil de ${nome}`

  const messages: Record<typeof stage, Record<PersonaType, string>> = {
    abordagem: {
      cfo:
        ctx.has_enrichment && ctx.anos_operacao >= 10
          ? `Oi [Nome], tudo bem? Sou [Consultor].\n\n${nome} tem ${ctx.anos_operacao} anos de operação — esse histórico cria um período retroativo relevante para revisão tributária que ainda não prescreve.\n\nPosso mandar um resumo rápido?`
          : `Oi [Nome], tudo bem? Sou [Consultor].\n\nIdentifiquei algo no perfil de ${nome} como ${seg} no ${ctx.regime_label} — vale 2 minutos da sua atenção.\n\nPosso mandar por e-mail?`,
      socio:
        `Oi [Nome]! Sou [Consultor].\n\n${hook} que empresas do setor estão revisando agora.\n\nPosso mandar um resumo?`,
      fiscal:
        ctx.tax_opportunities.length > 0
          ? `Oi [Nome], tudo bem? Sou [Consultor], especialista em ${ctx.tax_opportunities[0].name}.\n\nIdentifiquei pontos específicos no perfil de ${nome} — vale uma call técnica de 20 minutos?\n\nAbraço`
          : `Oi [Nome], tudo bem? Sou [Consultor].\n\nIdentifiquei aspectos do PIS/COFINS aplicáveis ao perfil de ${nome} que vale uma conversa técnica.\n\nTem disponibilidade?`,
      contador:
        `Oi [Nome]! Sou [Consultor].\n\nIdentifiquei algo em um cliente que queria alinhar com você antes de qualquer contato.\n\nPodemos falar 10 minutos?`,
      rh:
        `Oi [Nome], tudo bem? Sou [Consultor].\n\nIdentifiquei algo nos encargos de ${nome} que pode beneficiar a empresa sem nenhum impacto para a equipe.\n\nPosso mandar um resumo?`,
    },
    followup: {
      cfo:      `Oi [Nome]! Só confirmando o recebimento do e-mail sobre ${nome}. Sem pressa — qualquer dúvida é só falar.`,
      socio:    `Oi [Nome]! Passou o e-mail sobre o perfil de vocês — quando tiver 5 minutos vale a leitura!`,
      fiscal:   `Oi [Nome]! Confirmando recebimento do e-mail. Posso mandar as referências jurídicas se quiser avaliar antes da call.`,
      contador: `Oi [Nome]! Confirmando recebimento. Aguardo retorno quando tiver disponibilidade.`,
      rh:       `Oi [Nome]! Só confirmando o e-mail. Qualquer dúvida é só chamar!`,
    },
    pos_reuniao: {
      cfo:      `Oi [Nome]! Foi ótimo conversar. Vou enviar o resumo que combinamos por e-mail ainda hoje.`,
      socio:    `Oi [Nome]! Ótima conversa! Vou enviar o resumo por e-mail. Qualquer dúvida é só falar.`,
      fiscal:   `Oi [Nome]! Foi ótima a troca. Vou formalizar os pontos técnicos por e-mail com as referências legais.`,
      contador: `Oi [Nome]! Ótima conversa. Vou formalizar a proposta de trabalho conjunto por e-mail.`,
      rh:       `Oi [Nome]! Obrigado! Vou enviar o resumo por e-mail para facilitar a apresentação interna.`,
    },
  }

  const text = messages[stage][persona]

  const hasBanned = ["recuperação tributária", "ganho garantido"].some(b => text.toLowerCase().includes(b))
  const tooLong   = text.length > 450

  return {
    text,
    char_count:  text.length,
    tone_check:  hasBanned ? "⚠ Contém frase banida — revisar" : tooLong ? "⚠ Considere encurtar" : "✓ Curto e natural",
    uses_hook:   ctx.has_enrichment,
    data_used:   ctx.has_enrichment ? ctx.company_facts[0]?.text ?? "Perfil inferido" : "Baseado em segmento/regime",
  }
}

// --------- Contextual Objections ------------------------------------------------------------------------------------------------------------

export interface ContextualObjection {
  objection:   string
  context:     string   // why this objection is likely for this company
  response:    string
  follow_up:   string
  avoid:       string
  persona:     PersonaType[]
}

export function buildContextualObjections(ctx: CopilotContext, persona: PersonaType): ContextualObjection[] {
  const nome = ctx.company_name.split(" ")[0]
  const objs: ContextualObjection[] = []

  // Universal
  objs.push({
    objection: "Manda por e-mail.",
    context:   "Fuga educada da conversa.",
    response:  `Claro, vou enviar. Mas antes de escrever — me deixa entender só 1 coisa: ${nome} já realizou alguma revisão tributária estratégica nos últimos 3 anos? Depende disso o que faz mais sentido enviar.`,
    follow_up: "Se responder que sim: 'Ótimo — qual foi o escopo coberto?' | Se não: 'Então faz sentido eu enviar um resumo específico.'",
    avoid:     "Enviar e-mail genérico e esperar — vai para o lixo",
    persona:   ["cfo", "socio", "fiscal", "contador", "rh"],
  })

  objs.push({
    objection: "Já temos contador/advogado tributário.",
    context:   "Protetora — não quer criar conflito com parceiros atuais.",
    response:  `Perfeito. Nossa atuação é complementar — olhamos especificamente para teses de jurisprudência recente que demandam análise retroativa, o que geralmente está fora do escopo do trabalho cotidiano. Qual é o foco principal do escritório atual de vocês?`,
    follow_up: "Entender o escopo atual para identificar o que está faltando",
    avoid:     "Insinuar que o contador não fez bem o trabalho",
    persona:   ["cfo", "socio"],
  })

  // Persona-specific
  if (persona === "contador") {
    objs.push({
      objection: "Isso vai atrapalhar minha relação com o cliente.",
      context:   "Medo de perder o cliente ou parecer que não viu algo.",
      response:  `Entendo a preocupação — e por isso entro em contato com você primeiro. O modelo que trabalhamos é sempre com o escritório, não sem ele. A análise complementa, não substitui, e o escritório fica como ponto de referência do cliente.`,
      follow_up: "Propor uma call conjunta onde o escritório participaria da análise",
      avoid:     "Avançar com o cliente sem o aval do contador",
      persona:   ["contador"],
    })
  }

  if (persona === "fiscal") {
    objs.push({
      objection: "Já fazemos isso internamente.",
      context:   "Proteção de território — não quer que o trabalho dele seja questionado.",
      response:  `Ótimo — isso facilita. O que propomos é uma segunda opinião técnica específica sobre o período retroativo disponível. Se já estiver feito, ótimo — só quero confirmar o escopo. Qual foi o período coberto na última revisão?`,
      follow_up: "Identificar o que foi e o que não foi coberto",
      avoid:     "Sugerir que o trabalho interno está incompleto sem ter os dados",
      persona:   ["fiscal"],
    })
  }

  // Company-specific: based on enrichment
  if (ctx.anos_operacao >= 15) {
    objs.push({
      objection: "Não é o momento certo.",
      context:   `${nome} tem ${ctx.anos_operacao} anos — quanto mais tempo passa, menor o período retroativo disponível.`,
      response:  `Entendo. Mas uma coisa que vale considerar: ${nome} tem ${ctx.anos_operacao} anos de operação — e o período retroativo de certas teses está prescrevendo continuamente. Não precisa decidir agora — mas vale entender o que ainda está disponível.`,
      follow_up: "Pedir 20 minutos para apresentar o que ainda está disponível",
      avoid:     "Criar urgência artificial",
      persona:   ["cfo", "socio"],
    })
  }

  // Risk-based
  if (ctx.tax_opportunities.some(op => op.risk === "possível")) {
    objs.push({
      objection: "Isso é muito arriscado.",
      context:   "Legítima — há módulos com risco possível no perfil.",
      response:  `Entendo a cautela — ela é o critério correto. Por isso separamos as teses por nível de risco antes de apresentar qualquer coisa. As frentes que priorizamos para ${nome} têm risco remoto — as de risco possível apresentamos com transparência total, para o jurídico avaliar.`,
      follow_up: "Apresentar apenas as teses de risco remoto primeiro",
      avoid:     "Minimizar o risco para fechar a reunião",
      persona:   ["cfo", "fiscal"],
    })
  }

  return objs.filter(o => o.persona.includes(persona))
}

// --------- Meeting Prep Briefing ------------------------------------------------------------------------------------------------------------

export interface MeetingPrepBriefing {
  headline:          string
  company_summary:   string
  mention_these:     string[]   // 3 facts to mention
  hypotheses:        string[]   // 3 hypotheses — with caution flag
  do_not_say:        string[]
  top_opportunities: string[]   // 3 best opportunities
  smart_questions:   string[]   // 5 intelligent questions
  ideal_persona:     string
  opening_line:      string
  main_objection:    string
  response_ready:    string
  best_cta:          string
  confidence_note:   string
}

export function buildMeetingPrepBriefing(
  ctx:     CopilotContext,
  persona: PersonaType,
): MeetingPrepBriefing {
  const nome     = ctx.company_name.split(" ")[0]
  const topOps   = ctx.tax_opportunities.filter(o => o.priority === "core").slice(0, 3)
  const objections = buildContextualObjections(ctx, persona)
  const mainObj  = objections[0]

  const topPersona = ctx.decision_makers.find(dm => dm.is_target)
  const personaLabel = topPersona ? `${topPersona.name} (${topPersona.title})` : PERSONA_LABELS[persona]

  // Opening line using best available data
  const opening = ctx.has_enrichment && ctx.anos_operacao > 0
    ? `Percebi que ${nome} tem ${ctx.anos_operacao} anos de operação como ${ctx.segment_label.toLowerCase()} no ${ctx.regime_label}. Temos trabalhado com empresas do mesmo perfil em frentes que raramente passam pelo radar do trabalho contábil.`
    : `Temos trabalhado com empresas de ${ctx.segment_label.toLowerCase()} no ${ctx.regime_label} — e o perfil de ${nome} apresenta características que merecem atenção.`

  return {
    headline:          `Briefing — ${nome} | ${PERSONA_LABELS[persona]}`,
    company_summary:
      `${ctx.company_name} | ${ctx.segment_label} + ${ctx.regime_label} | ${ctx.anos_operacao > 0 ? `${ctx.anos_operacao} anos` : "idade a confirmar"} | ${ctx.municipio_uf || "UF a confirmar"}`,
    mention_these: [
      ...ctx.company_facts.filter(f => f.confidence === "high").slice(0, 3).map(f => `${f.text} (${f.source_label})`),
      ...ctx.operational_signals.slice(0, 3).map(s => s.text),
    ].slice(0, 3),
    hypotheses: ctx.company_hypotheses.slice(0, 3).map(h => `HIPÓTESE: ${h.text} — confirmar na ligação`),
    do_not_say: [
      "recuperação tributária",
      "ganho garantido",
      "seu contador não viu isso",
      persona === "fiscal" ? "Isso é simples" : "crédito tributário (logo de início)",
    ].filter(Boolean),
    top_opportunities: topOps.map(op => `${op.name} (${op.priority}, risco ${op.risk})`),
    smart_questions: [
      ...(ctx.recommended_questions.slice(0, 5)),
      ...(!ctx.faturamento_estimado ? ["Qual o faturamento mensal aproximado?"] : []),
      ...(ctx.decision_makers.length === 0 ? ["Quem é o responsável pela área fiscal da empresa?"] : []),
    ].slice(0, 5),
    ideal_persona:   personaLabel,
    opening_line:    opening,
    main_objection:  mainObj?.objection ?? "Já temos contador/advogado.",
    response_ready:  mainObj?.response ?? "Nossa atuação é complementar ao trabalho existente.",
    best_cta:        `Agendar 20 minutos com ${topPersona?.name ?? "o responsável financeiro"} para apresentar diagnóstico preliminar`,
    confidence_note: ctx.confidence_level === "low"
      ? "⚠ Enriquecimento limitado — confirmar dados na ligação antes de mencionar como fatos."
      : ctx.confidence_level === "medium"
      ? "Dados parcialmente confirmados — usar linguagem cautelosa para hipóteses."
      : "✓ Dados de alta confiança — pode mencionar fatos diretamente.",
  }
}
