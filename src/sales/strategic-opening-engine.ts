// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Strategic Opening Engine
//
// The call must NOT feel like prospecting.
// It must feel like strategic monitoring.
//
// BANNED: "Tem 2 minutos?" / "Identificamos oportunidades"
// CORRECT: "Venho acompanhando movimenta----es tribut--rias do setor..."
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { CompanyProfile }    from "../intelligence/company-profile-engine"
import type { DecisionMaker }     from "../intelligence/decision-maker-engine"
import type { PersonaKey }        from "./persona-language-engine"

// --------- Sector narrative library ---------------------------------------------------------------------------------------------------
// These sound like industry monitoring, not sales calls.

const SECTOR_MONITORING_NARRATIVES: Record<string, string[]> = {
  industria: [
    `Venho acompanhando algumas movimentações tributárias e operacionais em empresas industriais aqui na região, principalmente envolvendo estrutura de créditos de PIS/COFINS e o impacto que a jurisprudência recente do STJ está tendo na cadeia produtiva.`,
    `Tenho observado alguns padrões tributários em indústrias do setor nos últimos meses — especificamente envolvendo o conceito de insumo e créditos de IPI — que começaram a chamar atenção de forma mais recorrente.`,
    `Algumas indústrias do segmento começaram recentemente a revisitar determinadas estruturas tributárias por conta do impacto operacional que isso vem gerando na cadeia produtiva.`,
  ],
  comercio: [
    `Venho acompanhando algumas movimentações do setor varejista, principalmente envolvendo pressão de margem e a revisão da estrutura fiscal ligada à cadeia monofásica e ST. Algumas empresas do perfil de vocês começaram a revisitar isso recentemente.`,
    `Tenho observado movimentos tributários em empresas varejistas do segmento, principalmente em torno da interface entre ICMS-ST nas compras e a base de PIS/COFINS — que mudou bastante com decisões recentes do STJ.`,
    `Algumas empresas do setor começaram a identificar comportamentos fiscais específicos ligados à cadeia de distribuição que estavam fora do radar operacional cotidiano.`,
  ],
  servicos: [
    `Venho acompanhando alguns movimentos tributários em empresas de serviços com estrutura de folha relevante — principalmente envolvendo encargos previdenciários e o impacto de decisões recentes do STJ nesse perfil.`,
    `Tenho observado padrões fiscais específicos em empresas de serviços do segmento que começaram a gerar revisões estratégicas nos últimos meses.`,
    `Algumas empresas do setor de serviços começaram a revisitar estruturas de encargos e créditos que estavam fora do escopo da análise contábil corrente.`,
  ],
  exportacao: [
    `Venho acompanhando movimentos tributários em empresas exportadoras do setor — especificamente envolvendo a aplicação sistemática do crédito presumido de IPI, que tem sido revisado com frequência nos últimos meses.`,
    `Tenho observado que empresas exportadoras do segmento estão revisitando a estrutura de aproveitamento de créditos sobre as exportações — é um tema que voltou ao radar com força.`,
  ],
  ecommerce: [
    `Venho acompanhando algumas movimentações tributárias em empresas com operação digital no setor — principalmente envolvendo a interface entre DIFAL e base de PIS/COFINS em operações interestaduais.`,
    `Tenho observado movimentos fiscais em empresas com canal digital que têm revisitado a estrutura de tributação das vendas interestaduais.`,
  ],
}

const REGIONAL_CONTEXT: Record<string, string> = {
  SP: "aqui em São Paulo",
  MG: "aqui em Minas Gerais",
  RJ: "aqui no Rio de Janeiro",
  RS: "aqui no Rio Grande do Sul",
  PR: "aqui no Paraná",
  SC: "aqui em Santa Catarina",
  BA: "aqui na Bahia",
  PE: "aqui em Pernambuco",
  GO: "aqui em Goiás",
  DF: "aqui no DF",
  ES: "aqui no Espírito Santo",
  MT: "aqui no Mato Grosso",
  MS: "aqui no Mato Grosso do Sul",
}

export interface StrategicOpening {
  primary:           string   // the main opening (monitoring frame)
  with_company_ref:  string   // version that mentions the company
  with_region:       string   // version with regional context
  sector_narrative:  string   // the sector-level context
  persona_variant:   string   // adjusted for specific persona
  tone_instruction:  string   // how to deliver this
}

export function buildStrategicOpening(
  profile:   CompanyProfile,
  personaKey: PersonaKey,
  segment:   "servicos" | "comercio" | "industria",
): StrategicOpening {
  const nome      = profile.razao_social.split(" ")[0]
  const uf        = profile.localizacao.includes("/") ? profile.localizacao.split("/")[1]?.trim() : ""
  const municipio = profile.localizacao.includes("/") ? profile.localizacao.split("/")[0]?.trim() : profile.localizacao
  const region    = uf ? (REGIONAL_CONTEXT[uf] ?? `na região de ${municipio}`) : ""

  // Pick the right sector narrative
  const narratives = profile.has_export ? SECTOR_MONITORING_NARRATIVES.exportacao
    : profile.has_ecommerce ? SECTOR_MONITORING_NARRATIVES.ecommerce
    : SECTOR_MONITORING_NARRATIVES[segment] ?? SECTOR_MONITORING_NARRATIVES.comercio

  const sector_narrative = narratives[Math.floor(Math.random() * narratives.length)] ?? narratives[0]

  // Company-specific version
  const with_company_ref = profile.has_export
    ? `Venho acompanhando algumas movimentações tributárias em empresas exportadoras ${region ? region + " " : ""}— inclusive algumas com perfil operacional parecido com o da ${nome}. Há alguns comportamentos fiscais específicos que começaram a chamar atenção nos últimos meses.`
    : `Venho acompanhando algumas movimentações tributárias e operacionais ${region ? region + " " : ""}— especificamente em empresas com estrutura semelhante à ${nome}. Alguns comportamentos fiscais começaram a chamar atenção.`

  // Regional version
  const with_region = region
    ? `${sector_narrative.replace(".", "")} — isso tem sido especialmente relevante ${region}.`
    : sector_narrative

  // Persona-specific adjustment
  const persona_variant: Record<PersonaKey, string> = {
    cfo:      `Tenho acompanhado movimentos tributários no setor que estão gerando impacto direto no resultado operacional de empresas com o perfil de ${nome}. Há algo específico que vale contextualizar rapidamente.`,
    socio:    `Venho acompanhando alguns movimentos do mercado em empresas do setor — inclusive algumas que já revisitaram determinadas estruturas tributárias com resultado relevante. Há algo específico no perfil de ${nome} que me chamou atenção.`,
    fiscal:   `Tenho acompanhado alguns padrões tributários específicos em empresas do segmento — principalmente envolvendo teses de jurisprudência recente que raramente entram no escopo da análise corrente. Há algo técnico que vale contextualizar.`,
    contador: `Tenho observado alguns temas técnicos complementares que estão sendo revisitados em empresas do segmento — e há algo específico no perfil de ${nome} que normalmente está fora do escopo do trabalho cotidiano.`,
    rh:       `Tenho acompanhado movimentos em empresas do setor envolvendo a estrutura de encargos sobre folha — especificamente em torno de temas que raramente entram no radar do trabalho corrente.`,
    diretor:  `Tenho observado movimentos tributários estratégicos em empresas do segmento que estão gerando impacto estrutural no resultado. Há algo no perfil de ${nome} que vale uma conversa rápida.`,
    generico: `Venho acompanhando algumas movimentações tributárias em empresas do setor — e há algo específico no perfil de ${nome} que me chamou atenção nos últimos meses.`,
  }

  return {
    primary:          sector_narrative,
    with_company_ref,
    with_region,
    sector_narrative,
    persona_variant:  persona_variant[personaKey] ?? persona_variant.generico,
    tone_instruction: "Falar devagar, com pausas. Não parecer ansioso. Soar como alguém que observou algo e quer contextualizar — não vender.",
  }
}

// --------- Competitive Intelligence Engine ---------------------------------------------------------------------------
// Uses sector/region/CNAE to create "market monitoring" narrative
// NEVER invents competitors. Uses public sector signals only.

export interface CompetitiveIntelligence {
  sector_movement:    string    // what's happening in the sector
  peer_benchmark:     string    // what companies like them are doing
  market_timing:      string    // why this moment matters
  regional_signal:    string    // what's happening locally
  competitive_angle:  string    // the competitive pressure angle
}

const SECTOR_MOVEMENTS: Record<string, string> = {
  industria:  "empresas industriais do segmento estão revisitando a estrutura de créditos PIS/COFINS com base em jurisprudência recente do STJ — especificamente o conceito ampliado de insumo do REsp 1.221.170",
  comercio:   "empresas varejistas começaram a identificar impactos relevantes na base de PIS/COFINS relacionados à substituição tributária — o STJ pacificou o Tema 1.125 em dezembro de 2023",
  servicos:   "empresas de serviços com folha relevante estão revisitando a estrutura de encargos previdenciários — o Tema 1.079 do STJ abriu uma discussão específica sobre o Sistema S",
  exportacao: "empresas exportadoras estão revisitando o aproveitamento sistemático do crédito presumido de IPI — há um histórico retroativo disponível que raramente é aproveitado integralmente",
  ecommerce:  "empresas com canal digital têm revisitado a estrutura de DIFAL e PIS/COFINS em operações interestaduais — a base tributária mudou com a jurisprudência recente",
}

export function buildCompetitiveIntelligence(
  profile:  CompanyProfile,
  segment:  "servicos" | "comercio" | "industria",
): CompetitiveIntelligence {
  const nome    = profile.razao_social.split(" ")[0]
  const uf      = profile.localizacao.includes("/") ? profile.localizacao.split("/")[1]?.trim() : "BR"
  const region  = uf ? (REGIONAL_CONTEXT[uf] ?? `na região`) : "no Brasil"

  const movType = profile.has_export ? "exportacao"
    : profile.has_ecommerce ? "ecommerce"
    : segment

  const movement = SECTOR_MOVEMENTS[movType] ?? SECTOR_MOVEMENTS.comercio

  return {
    sector_movement:   `Nos últimos meses, ${movement}.`,

    peer_benchmark:    `Empresas com perfil operacional semelhante ao de ${nome} — ${profile.cnae_descricao ? profile.cnae_descricao.toLowerCase() : segment} — já começaram a mapear esse tema especificamente.`,

    market_timing:     profile.anos_operacao >= 10
      ? `O timing é relevante porque o período retroativo disponível para análise vai prescrevendo continuamente. Com ${profile.anos_operacao} anos de operação, o histórico de ${nome} ainda tem janela expressiva.`
      : `O timing importa porque a jurisprudência que embasaria essa análise foi pacificada recentemente — e o período retroativo ainda está em aberto.`,

    regional_signal:   `${region.charAt(0).toUpperCase() + region.slice(1)}, especificamente, algumas empresas do segmento de ${profile.cnae_descricao?.split(" ").slice(0,3).join(" ").toLowerCase() ?? segment} começaram a movimentar esse tema.`,

    competitive_angle: `A pergunta que normalmente fazemos é: enquanto empresas do mesmo perfil estão mapeando isso, ${nome} já avaliou se esse comportamento fiscal aparece na operação de vocês?`,
  }
}

// --------- Contextual Urgency Engine ------------------------------------------------------------------------------------------------
// Urgency must feel like timing, not pressure.

export interface ContextualUrgency {
  legal_timing:      string    // the STJ/legislative angle
  retroactive_math:  string    // prescriptive math, not pressure
  sector_timing:     string    // what peers are doing creates implicit urgency
  operational_hook:  string    // company-specific moment
  soft_urgency:      string    // the gentle version
  direct_urgency:    string    // the more direct version (for CFO/Sócio)
}

export function buildContextualUrgency(
  profile:   CompanyProfile,
  segment:   "servicos" | "comercio" | "industria",
): ContextualUrgency {
  const nome = profile.razao_social.split(" ")[0]

  const retroMonths = 60
  const retroActive = profile.anos_operacao >= 5 ? retroMonths : Math.min(profile.anos_operacao * 12, retroMonths)

  return {
    legal_timing:
      `O timing tributário desse tipo de tema começa a ficar mais sensível conforme decisões jurisprudenciais avançam — o STJ tem consolidado entendimentos que criam janelas específicas de análise.`,

    retroactive_math:
      `O período retroativo disponível vai prescrevendo mensalmente. Hoje ${nome} ainda tem ${retroActive} meses disponíveis para revisão — em 12 meses, serão ${retroActive - 12}. Não é pressão — é como funciona o sistema tributário.`,

    sector_timing:
      `Algumas empresas do segmento já iniciaram esse processo nos últimos 6 meses. Quanto mais isso avança no mercado, menor o diferencial estratégico de revisitar esse tema primeiro.`,

    operational_hook: profile.expansion_signals.length > 0
      ? `Com a expansão que identifiquei em ${nome}, a complexidade tributária cresce junto — e o momento certo para mapear isso é antes de a operação crescer mais, não depois.`
      : profile.anos_operacao >= 15
      ? `Com ${profile.anos_operacao} anos de operação, ${nome} acumulou um histórico fiscal extenso. Cada mês adicional amplia o passivo potencial de análise — e reduz o período ainda disponível.`
      : `O momento mais estratégico para mapear isso é antes que o período retroativo prescrevendo reduza o escopo disponível.`,

    soft_urgency:
      `Não há urgência artificial aqui — mas o timing tributário tem uma lógica própria: o que está disponível hoje pode não estar em 12 meses.`,

    direct_urgency:
      `Cada mês que passa, fecha um mês de período retroativo. Não é pressão — é matemática tributária. A decisão de quando mapear isso impacta diretamente o escopo disponível.`,
  }
}

// --------- Conversation Psychology Engine ------------------------------------------------------------------------------
// How to control the call, create curiosity, avoid resistance.

export interface ConversationPsychology {
  // Attention hooks
  pattern_interrupt:    string    // breaks the "another salesperson" pattern
  curiosity_builder:    string    // makes them want to know more
  authority_marker:     string    // proves you've done the homework
  // Resistance avoidance
  pre_empt_objection:   string    // neutralize before they object
  reframe_resistance:   string    // if they push back
  // Control moves
  anchor_question:      string    // the question that anchors the conversation
  transition_to_cta:    string    // how to move naturally to CTA
  // Call flow
  ideal_flow: string[]   // step by step
}

export function buildConversationPsychology(
  profile:    CompanyProfile,
  personaKey: PersonaKey,
): ConversationPsychology {
  const nome = profile.razao_social.split(" ")[0]

  const pattern_interrupt = `[Pausa depois de apresentar o nome — não preencher silêncio imediatamente. Deixar o contexto inicial pousar antes de continuar.]`

  const curiosity_builders: Record<PersonaKey, string> = {
    cfo:      `"Há algo específico no comportamento fiscal de ${nome} que me chamou atenção — que normalmente aparece em empresas com esse perfil operacional mas raramente está no escopo de análise corrente."`,
    socio:    `"Identifiquei algo no perfil de ${nome} que empresas similares já começaram a mapear — e que normalmente está fora do radar."`,
    fiscal:   `"Há um comportamento técnico específico no perfil de ${nome} que emerge quando cruzamos o CNAE com a jurisprudência recente do STJ — e que normalmente não está no escopo da análise corrente."`,
    contador: `"Há algo técnico complementar no perfil de ${nome} que normalmente não entra no escopo do trabalho contábil cotidiano — e que emerge de uma análise cruzada de jurisprudência recente."`,
    rh:       `"Há algo no perfil de encargos de ${nome} que normalmente não está no radar da análise corrente de folha."`,
    diretor:  `"Há um ponto estratégico no perfil tributário de ${nome} que começa a ganhar relevância dado o cenário que estamos observando no setor."`,
    generico: `"Há algo específico no perfil operacional de ${nome} que me chamou atenção — e que normalmente está fora do radar."`,
  }

  const authority_markers: Record<PersonaKey, string> = {
    cfo:      `[Mencionar empresa do mesmo segmento de forma genérica: "Empresas do mesmo perfil de ${nome} que já fizeram essa análise identificaram..."]`,
    fiscal:   `[Citar o REsp ou Tema específico relevante para o perfil: "O REsp 1.221.170..." ou "O Tema 1.079 do STJ..."]`,
    contador: `[Tratar como colega: "Do jeito que você já deve ter acompanhado — a discussão do STJ sobre..."]`,
    socio:    `[Falar de resultado de empresa genérica: "Uma empresa do mesmo perfil que vocês que já fez essa revisão identificou..."]`,
    rh:       `[Manter simples: "Em empresas do perfil de vocês, esse tipo de revisão não tem impacto no dia a dia da equipe."]`,
    diretor:  `[Falar de impacto estrutural: "Em termos de P&L, o impacto típico para empresas do segmento de ${nome} é..."]`,
    generico: `[Mencionar o setor: "Empresas do segmento de vocês estão revisitando isso nos últimos meses."]`,
  }

  return {
    pattern_interrupt,
    curiosity_builder:   curiosity_builders[personaKey] ?? curiosity_builders.generico,
    authority_marker:    authority_markers[personaKey]  ?? authority_markers.generico,
    pre_empt_objection:  `"Antes que você pergunte — não estou propondo nada ainda. Quero entender melhor a operação de vocês para confirmar se o que identifiquei realmente se aplica."`,
    reframe_resistance:  `"Perfeito. Até porque o ideal não é passar isso por e-mail — esse tipo de tema perde muita profundidade sem contexto."`,
    anchor_question:     profile.has_industry
      ? `"Como está estruturada a relação de vocês com fornecedores atacadistas? Isso define muito do que estou vendo."` 
      : profile.has_export
      ? `"Vocês exportam diretamente ou via trading? Isso muda bastante o que identifico aqui."`
      : profile.has_ecommerce
      ? `"Como está a distribuição de vendas de vocês entre canais físico e digital? Isso é relevante para o que estou acompanhando."`
      : `"Como está a estrutura fiscal de vocês hoje — é mais voltada para obrigações correntes ou já tem algum apoio especializado em revisão retroativa?"`,
    transition_to_cta:   `"Faz mais sentido a gente alinhar isso em 15 minutos — consigo contextualizar exatamente o que chamou atenção de forma muito mais clara do que em texto."`,
    ideal_flow: [
      "01 · Abertura de monitoramento (não de prospecção) — sem pedir permissão",
      "02 · Contexto setorial (o que está acontecendo no mercado) — sem citar o produto",
      "03 · Curiosity gap (o que você identificou especificamente) — sem revelar",
      "04 · Âncora (a pergunta que qualifica e gera engajamento)",
      "05 · Autoridade (dado ou referência que prova que você fez o dever de casa)",
      "06 · Pré-empt de objeção (neutralizar antes que apareça)",
      "07 · Transição natural para CTA — sem pedir permissão",
    ],
  }
}

// --------- High Authority CTA Engine ------------------------------------------------------------------------------------------------
// CTA must assume authority, not beg for time.

export interface HighAuthorityCTA {
  primary:    string    // assumes the meeting, gives options
  secondary:  string    // if they hesitate
  no_time:    string    // when they say "no time now"
  email_push: string    // when they say "send email"
  closer:     string    // the final close
}

export function buildHighAuthorityCTA(
  profile:    CompanyProfile,
  personaKey: PersonaKey,
): HighAuthorityCTA {
  const nome = profile.razao_social.split(" ")[0]

  // Option-close: never "do you have time?" --- always "which works better?"
  const primary_options: Record<PersonaKey, string> = {
    cfo:      `"Faz mais sentido alinharmos isso na sexta de manhã ou segunda no início da tarde — são 15 minutos para eu contextualizar o que chamou nossa atenção."`,
    socio:    `"Faz mais sentido você entender isso diretamente do que por e-mail — quando fica melhor para você, essa semana ou início da próxima?"`,
    fiscal:   `"Para contextualizar adequadamente o ponto técnico, o melhor é uma call de 20 minutos. Fica melhor amanhã de tarde ou quinta de manhã?"`,
    contador: `"Para você avaliar se faz sentido levar para o cliente, o melhor é uma call técnica de 20 minutos. Quando você tem disponibilidade essa semana?"`,
    rh:       `"O melhor é uma conversa de 15 minutos para eu contextualizar. Fica melhor no início ou no final da semana?"`,
    diretor:  `"Para o nível de contexto que esse tema merece, o melhor é 15 minutos. Fica melhor na quinta ou sexta de manhã?"`,
    generico: `"O ideal é alinharmos 15 minutos — fica melhor essa semana ou início da próxima?"`,
  }

  return {
    primary:
      primary_options[personaKey] ?? primary_options.generico,

    secondary:
      `"Não precisa ser longo — são 15 minutos para eu contextualizar exatamente o que identifiquei no perfil de ${nome}. Se não fizer sentido depois disso, sem problemas."`,

    no_time:
      `"Sem problemas. Até para não tomar seu tempo agora, o ideal seria alinharmos 15 minutos em um momento mais tranquilo. Esse tipo de tema perde profundidade em e-mail."`,

    email_push:
      `"Posso enviar algo — mas prefiro ser honesto: e-mail perde muito contexto nesse tipo de tema. São 15 minutos que fazem mais diferença do que um PDF de 3 páginas. Qual o melhor horário para você essa semana?"`,

    closer:
      `"Perfeito. [Dia e hora]. Confirmo por WhatsApp — qual o melhor número?"`,
  }
}

// --------- Call Control Engine ------------------------------------------------------------------------------------------------------------------
// How to handle resistance without losing frame.

export interface CallControlResponse {
  trigger:   string
  response:  string
  follow_up: string
  never_say: string
}

export const CALL_CONTROL_RESPONSES: CallControlResponse[] = [
  {
    trigger:   "Não tenho tempo agora",
    response:  "Sem problemas. Até para não tomar seu tempo agora, o ideal seria alinharmos 15 minutos em um momento mais tranquilo para eu contextualizar rapidamente o que chamou nossa atenção no perfil operacional de vocês.",
    follow_up: "Fica melhor amanhã ou no início da próxima semana?",
    never_say: "Posso mandar um e-mail? / Você teria disponibilidade? / Quando seria um bom momento?",
  },
  {
    trigger:   "Me manda por e-mail",
    response:  "Posso fazer isso — mas prefiro ser honesto: esse tipo de tema perde muito profundidade em e-mail. São 15 minutos que vão contextualizar o que identifiquei de forma muito mais clara do que qualquer PDF.",
    follow_up: "Qual o melhor horário para você essa semana — quinta ou sexta?",
    never_say: "Claro! Para qual e-mail eu mando? / Ok, vou enviar.",
  },
  {
    trigger:   "Já temos estrutura para isso",
    response:  "Ótimo — isso facilita muito a conversa. O que estou acompanhando é específico e normalmente complementar ao que já está sendo feito. Em 15 minutos consigo contextualizar se há algo que ainda não foi coberto.",
    follow_up: "Quando fica melhor para alinharmos?",
    never_say: "Então você não precisa de nada? / Mas pode ser que tenha algo que não foi visto...",
  },
  {
    trigger:   "Não é prioridade agora",
    response:  "Entendo. Só quero deixar um ponto — o período retroativo disponível vai prescrevendo mensalmente. Não é pressão: é simplesmente como funciona tributariamente. O que está disponível hoje pode não estar em 12 meses.",
    follow_up: "Em quanto tempo esse tema naturalmente voltaria ao radar de vocês?",
    never_say: "Ok, sem problemas. Posso ligar de novo depois?",
  },
  {
    trigger:   "Já temos contador / advogado",
    response:  "Perfeito. O que estou acompanhando é complementar — são teses de jurisprudência recente que normalmente ficam fora do escopo do trabalho cotidiano. Em 15 minutos consigo contextualizar o que identifiquei especificamente.",
    follow_up: "Qual o melhor horário para alinharmos?",
    never_say: "Mas será que eles cobriram tudo? / Às vezes o contador não vê essas coisas...",
  },
]
