// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS COPILOT --- Conversation Entry Engine
// Generates contextual, intelligent, non-generic conversation openings.
// NEVER: "temos oportunidades tribut--rias"
// ALWAYS: contextual, operational, consultive
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { CompanyContext } from "../engine/rule-engine"
import type { ConversationEntry, PersonaType, CompanySnapshot } from "./types"
import { SEGMENT_LABELS, REGIME_LABELS } from "../engine/tax-matrix"

// --------- Context hook builder ---------------------------------------------------------------------------------------------------------------
// The hook that shows the consultant knows the company before pitching.

function buildContextHook(ctx: CompanyContext, snapshot: CompanySnapshot): string {
  const seg    = SEGMENT_LABELS[ctx.consultant.segment]
  const regime = REGIME_LABELS[ctx.consultant.tax_regime]
  const flags  = ctx.consultant.operation_flags ?? []
  const nome   = ctx.razao_social.split(" ")[0]

  if (ctx.consultant.segment === "comercio" && flags.includes("venda_cartao")) {
    return `Percebi que ${nome} tem uma operação varejista com volume relevante em cartão — e temos trabalhado com grupos do mesmo perfil justamente porque o comportamento fiscal ligado às taxas de adquirentes ainda é uma área pouco revisada nesse segmento.`
  }
  if (ctx.consultant.segment === "comercio" && flags.includes("icms_st")) {
    return `Identificamos que ${nome} atua no varejo com operações de substituição tributária — e esse é exatamente o perfil onde o STJ consolidou, em 2023, uma mudança importante na base do PIS/COFINS que a maioria das empresas ainda não aplicou retroativamente.`
  }
  if (ctx.consultant.segment === "industria" && flags.includes("exportacao")) {
    return `Notamos que ${nome} tem operação exportadora — e há uma tese de crédito de IPI com alíquota fixada em lei (5,37%) que muitas indústrias do perfil de vocês ainda não aproveitaram de forma sistemática.`
  }
  if (ctx.consultant.segment === "industria" && flags.includes("operacao_industrial")) {
    return `A ${nome} tem um perfil industrial que, no ${regime}, costuma apresentar créditos de PIS/COFINS sobre insumos não aproveitados — a jurisprudência ampliou o conceito de insumo significativamente desde 2018, mas a revisão prática ainda não chegou na maioria das empresas.`
  }
  if (ctx.consultant.segment === "servicos" && flags.includes("folha_relevante")) {
    return `Empresas de ${seg.toLowerCase()} com folha relevante como ${nome} costumam ter uma exposição previdenciária que raramente é revisada em profundidade — e os ${ctx.anos_operacao} anos de operação criam um período retroativo expressivo.`
  }
  if (ctx.consultant.segment === "servicos" && flags.includes("operacao_iss")) {
    return `${nome} opera com ISS — e o Tema 69 do STF, que excluiu o ICMS da base do PIS/COFINS, tem desdobramentos diretos para prestadores de serviços que ainda não foram aproveitados pela maioria das empresas do setor.`
  }

  // Generic fallback --- still contextual, never generic
  return `Temos trabalhado com empresas de ${seg.toLowerCase()} no ${regime} e identificamos comportamentos fiscais recorrentes nesse perfil que raramente passam pela revisão estratégica cotidiana.`
}

// --------- Opening line (the first 10 seconds) ---------------------------------------------------------------

function buildOpeningLine(ctx: CompanyContext, persona: PersonaType): string {
  const nome  = ctx.razao_social.split(" ")[0]
  const cargo = { cfo: "CFO", socio: "sócio", fiscal: "responsável fiscal", contador: "contador", rh: "responsável de RH" }[persona]

  const openings: Record<typeof persona, string> = {
    cfo:
      `Bom dia, [Nome]. Meu nome é [Consultor]. Trabalho com revisão tributária estratégica para empresas de ${SEGMENT_LABELS[ctx.consultant.segment]} — e identificamos no perfil de ${nome} alguns comportamentos que merecem atenção. Tenho 2 minutos agora?`,
    socio:
      `Bom dia, [Nome]. Tenho 1 minuto? Sou [Consultor]. Identificamos na operação de ${nome} algo que empresas do seu setor estão revisando agora — e que costuma gerar impacto direto no caixa.`,
    fiscal:
      `Bom dia, [Nome]. Meu nome é [Consultor], especialista em revisão de PIS/COFINS para ${SEGMENT_LABELS[ctx.consultant.segment]}. Queria conversar tecnicamente sobre alguns temas que identificamos no perfil de ${nome}. Tem alguns minutos?`,
    contador:
      `Bom dia, [Nome]. Sou [Consultor]. Trabalho com revisão tributária complementar ao trabalho dos escritórios contábeis — e estou entrando em contato porque identificamos no perfil de um dos seus clientes algo que gostaríamos de discutir com você antes de qualquer movimentação.`,
    rh:
      `Bom dia, [Nome]. Meu nome é [Consultor]. Trabalho com eficiência de encargos sobre folha — e identificamos no perfil de ${nome} algo relacionado à área previdenciária que vale uma conversa rápida.`,
  }

  return openings[persona]
}

// --------- Pain trigger ---------------------------------------------------------------------------------------------------------------------------------------

function buildPainTrigger(ctx: CompanyContext, persona: PersonaType, snapshot: CompanySnapshot): string {
  const seg = ctx.consultant.segment

  const triggers: Record<PersonaType, Record<string, string>> = {
    cfo: {
      comercio:  "A pressão de margem no varejo está levando muitas empresas a revisitar comportamentos fiscais que nunca foram analisados estrategicamente.",
      servicos:  "Para empresas de serviços com folha relevante, o custo previdenciário é frequentemente o maior custo não revisado.",
      industria: "Indústrias em Lucro Real raramente revisam o aproveitamento de créditos de IPI e PIS/COFINS de forma sistemática — mesmo com jurisprudência favorável.",
    },
    socio: {
      comercio:  "Há dinheiro na operação de vocês que provavelmente nunca chegou ao caixa da empresa — e que tecnicamente poderia ter sido evitado.",
      servicos:  "Empresas com o perfil de vocês normalmente têm encargos que poderiam ser menores — sem nenhum risco jurídico.",
      industria: "Indústrias exportadoras do perfil de vocês têm créditos de IPI com alíquota fixada em lei que muitas vezes não são aproveitados sistematicamente.",
    },
    fiscal: {
      comercio:  "O Tema 1.125 do STJ, de dezembro/2023, mudou o tratamento do ICMS-ST na base do PIS/COFINS — a revisão retroativa ainda não chegou na maioria das empresas.",
      servicos:  "O conceito ampliado de insumo (REsp 1.221.170) e os desdobramentos do Tema 69 para ISS são dois temas que ainda têm revisão pendente em muitas empresas de serviços.",
      industria: "O crédito presumido de IPI (Lei 9.363/96) e a revisão de insumos (REsp 1.221.170) têm fundamento jurídico sólido — mas a revisão prática costuma ficar incompleta.",
    },
    contador: {
      comercio:  "Identificamos no perfil de um dos seus clientes oportunidades ligadas ao ICMS-ST e PIS/COFINS que têm base jurídica consolidada mas ainda não passaram por revisão retroativa.",
      servicos:  "Há temas de jurisprudência recente — especialmente do STJ — que abrem oportunidades para prestadores de serviços que raramente são revisados no trabalho contábil cotidiano.",
      industria: "Créditos de IPI e PIS/COFINS com embasamento sólido que complementariam bem a revisão que o escritório já realiza.",
    },
    rh: {
      comercio:  "Identificamos no perfil da empresa uma oportunidade ligada a encargos sobre folha — algo que não impacta os funcionários, mas que pode gerar resultado para a empresa.",
      servicos:  "Empresas com o perfil de vocês frequentemente têm recolhimentos previdenciários que podem ser revisados — sem impacto nos colaboradores.",
      industria: "Há encargos sobre folha que, para o perfil de vocês, podem ter sido recolhidos a maior — algo que podemos revisar sem gerar nenhuma complexidade para a equipe de RH.",
    },
  }

  return triggers[persona][seg] ?? `Identificamos comportamentos fiscais no perfil de ${ctx.razao_social} que merecem uma análise complementar.`
}

// --------- Full call script ---------------------------------------------------------------------------------------------------------------------------

function buildFullScript(
  ctx:      CompanyContext,
  persona:  PersonaType,
  hook:     string,
  trigger:  string,
  gap:      string,
): string[] {
  const nome = ctx.razao_social.split(" ")[0]

  const ctaMap: Record<PersonaType, string> = {
    cfo:      "Semana que vem você tem 20 minutos para eu apresentar o que identificamos?",
    socio:    "Posso agendar 20 minutos com você e o responsável financeiro para apresentar o diagnóstico?",
    fiscal:   "Teria disponibilidade para uma call técnica de 30 minutos para eu apresentar o que identificamos?",
    contador: "Podemos agendar uma call para discutir o que identificamos e pensar em como trabalhar juntos nesse caso?",
    rh:       "Posso enviar um resumo por e-mail e agendamos 15 minutos para tirar as dúvidas?",
  }

  return [
    `ABERTURA: ${buildOpeningLine(ctx, persona)}`,
    `CONTEXTO: "${hook}"`,
    `DOR: "${trigger}"`,
    `CURIOSIDADE: "${gap}"`,
    `VALIDAÇÃO: "Antes de qualquer coisa — vocês já realizaram alguma revisão tributária estratégica nos últimos 3 anos?"`,
    `AUTORIDADE: "Trabalhamos com análise baseada em jurisprudência do STJ e STF — não teses em desenvolvimento. A segurança jurídica é o critério principal."`,
    `TRANSIÇÃO: "Para trazer uma estimativa mais precisa do potencial para ${nome}, precisaria de 20 minutos com ${persona === "cfo" ? "você" : "o responsável financeiro"}."`,
    `CTA: "${ctaMap[persona]}"`,
    `FALLBACK: "Entendo que está corrido. Posso enviar um resumo de 1 página por e-mail — você avalia quando tiver 5 minutos. Qual e-mail?"`,
    `PÓS-FALLBACK: Se aceitar o e-mail — enviar em até 2 horas, assunto personalizado, sem anexo no primeiro e-mail.`,
  ]
}

// --------- Curiosity gap ------------------------------------------------------------------------------------------------------------------------------------

function buildCuriosityGap(ctx: CompanyContext, persona: PersonaType): string {
  const seg = ctx.consultant.segment
  const flags = ctx.consultant.operation_flags ?? []

  if (seg === "comercio" && flags.includes("venda_cartao")) {
    return "A maioria dos varejistas não percebe que paga PIS e Cofins sobre as taxas das operadoras — valores que nunca chegaram ao caixa deles."
  }
  if (seg === "comercio" && flags.includes("icms_st")) {
    return "Em 2023, o STJ decidiu que o ICMS-ST embutido no preço de compra não deveria estar na base do PIS/COFINS. O período retroativo ainda está disponível para a maioria das empresas."
  }
  if (seg === "industria" && flags.includes("exportacao")) {
    return "Há um crédito de IPI sobre exportações com alíquota fixada em lei — 5,37% — que muitas indústrias não aproveitam sistematicamente nos 60 meses disponíveis."
  }
  if (seg === "servicos" && flags.includes("folha_relevante")) {
    return "Empresas com estrutura de folha relevante têm recolhimentos ao Sistema S que o STJ limitou em 2022 — mas a revisão retroativa de 39 meses ainda não aconteceu na maioria das empresas."
  }
  return "Há comportamentos fiscais ligados à operação específica de vocês que raramente são revisados no trabalho contábil rotineiro."
}

// --------- Main export ------------------------------------------------------------------------------------------------------------------------------------------

export function generateConversationEntry(
  ctx:      CompanyContext,
  persona:  PersonaType,
  snapshot: CompanySnapshot,
  channel:  "telefone" | "email" | "whatsapp" | "linkedin" = "telefone",
): ConversationEntry {
  const hook    = buildContextHook(ctx, snapshot)
  const trigger = buildPainTrigger(ctx, persona, snapshot)
  const gap     = buildCuriosityGap(ctx, persona)
  const script  = buildFullScript(ctx, persona, hook, trigger, gap)

  const toneMap: Record<PersonaType, string> = {
    cfo:      "Financeiro e direto. Sem juridiquês. Demonstrar que conhece o segmento antes de mencionar oportunidade.",
    socio:    "Estratégico e simples. Velocidade. Conectar ao resultado, não ao processo.",
    fiscal:   "Técnico e respeitoso. Demonstrar domínio da norma. Não simplificar demais.",
    contador: "Colaborativo e cuidadoso. Nunca posicionar como substituto. Parceria com o cliente em comum.",
    rh:       "Operacional e humano. Sem termos tributários logo de início. Foco no processo.",
  }

  return {
    channel,
    persona,
    opening_line:  buildOpeningLine(ctx, persona),
    context_hook:  hook,
    pain_trigger:  trigger,
    curiosity_gap: gap,
    full_script:   script,
    fallback:      "Entendo que está corrido. Posso enviar um resumo por e-mail — você avalia quando tiver 5 minutos?",
    tone_notes:    toneMap[persona],
  }
}
