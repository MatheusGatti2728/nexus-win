// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Behavioral Playbook Engine v22
//
// NOT scripts. NOT copy-paste phrases.
// BEHAVIORAL GUIDANCE --- how to act during prospecting.
//
// Teaches: tone, pacing, psychology, persona reading,
// objection control, WhatsApp flow, and follow-up sequencing.
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { CompanyProfile }    from "../intelligence/company-profile-engine"
import type { DecisionMaker }     from "../intelligence/decision-maker-engine"
import type { PersonaKey }        from "./persona-language-engine"

// --------- Opening opportunity selector ------------------------------------------------------------------------------------
// The #1 rule: never dump 10 opportunities. Choose the best door.

export interface OpeningOpportunity {
  slug:            string
  name:            string
  why_first:       string    // why this is the best opening move
  opening_angle:   string    // the angle to use — NOT a script
  curiosity_line:  string    // the line that generates curiosity
  avoid:           string    // what NOT to do with this opportunity
  commercial_temp: "easy" | "medium" | "technical"
}

const OPPORTUNITY_COMMERCIAL_PROFILE: Record<string, { temp: OpeningOpportunity["commercial_temp"]; apertura_power: number }> = {
  pis_cofins_taxa_cartao:          { temp:"easy",      apertura_power: 95 },
  icms_st_pis_cofins:              { temp:"easy",      apertura_power: 90 },
  sistema_s:                       { temp:"easy",      apertura_power: 88 },
  verbas_indenizatorias:           { temp:"easy",      apertura_power: 85 },
  icms_iss_acao_coletiva:          { temp:"medium",    apertura_power: 80 },
  ipi_credito_presumido_exportacao:{ temp:"medium",    apertura_power: 78 },
  revisao_insumos_pis_cofins:      { temp:"technical", apertura_power: 70 },
  bonificacoes_descontos:          { temp:"medium",    apertura_power: 65 },
  ipi_atacadista:                  { temp:"technical", apertura_power: 60 },
  difal_pis_cofins:                { temp:"medium",    apertura_power: 60 },
  icms_grossup:                    { temp:"technical", apertura_power: 55 },
  pis_cofins_folha:                { temp:"technical", apertura_power: 50 },
  plurifasico_beneficio:           { temp:"technical", apertura_power: 45 },
}

const OPPORTUNITY_OPENING_PROFILE: Record<string, Omit<OpeningOpportunity, "slug"|"name">> = {
  pis_cofins_taxa_cartao: {
    why_first:      "É simples, financeiro e universalmente compreensível — qualquer dono de empresa entende que pagar imposto sobre a taxa da maquininha é absurdo.",
    opening_angle:  "Ângulo financeiro direto: impacto na margem. Não citar STJ logo de início. Deixar surgir como resposta a uma pergunta.",
    curiosity_line: "Há um ponto sobre como o PIS/COFINS incide sobre as vendas em cartão que muitas empresas do perfil de vocês ainda não revisaram.",
    avoid:          "Não usar juridiquês de abertura. Não citar 'Temas 779/780' logo de início. Não pedir para calcular o volume antes de gerar interesse.",
    commercial_temp:"easy",
  },
  icms_st_pis_cofins: {
    why_first:      "Abre bem porque é recente (2023), tem impacto financeiro claro e muitas empresas varejistas/distribuidoras ainda não aproveitaram.",
    opening_angle:  "Ângulo de timing: 'aconteceu recentemente, ainda tem janela'. Não como 'descoberta', mas como 'revisão de mercado'.",
    curiosity_line: "Depois de uma decisão recente do STJ sobre como o ICMS-ST compõe a base do PIS/COFINS, muitas empresas varejistas ainda têm janela retroativa aberta.",
    avoid:          "Não falar 'exclusão' na abertura — soa técnico demais. Usar 'revisão de como o ICMS-ST é tratado no PIS/COFINS'.",
    commercial_temp:"easy",
  },
  sistema_s: {
    why_first:      "Abre bem para empresas com folha relevante porque o teto do STJ é facilmente explicável em termos financeiros e gera curiosidade imediata.",
    opening_angle:  "Ângulo de folha: 'empresa com X funcionários normalmente tem isso'. Tornar pessoal para o perfil específico.",
    curiosity_line: "O STJ reconheceu um limite para as contribuições ao Sistema S — e a maioria das empresas com folha relevante ainda recolhe além desse teto.",
    avoid:          "Não falar 'recuperação' ou 'repetição de indébito'. Falar em 'revisão da composição da folha'.",
    commercial_temp:"easy",
  },
  verbas_indenizatorias: {
    why_first:      "Toda empresa com folha tem. É simples, está consolidado no STJ e qualquer CFO entende que pagar INSS sobre férias proporcionais é questionável.",
    opening_angle:  "Ângulo de folha + período retroativo. Sem juridiquês. A lógica é intuitiva: férias não são salário.",
    curiosity_line: "Há parcelas da folha que o STJ consolidou que não deveriam ter INSS — e os últimos 5 anos ainda estão disponíveis para revisão.",
    avoid:          "Não citar 'Tema 20' na abertura. Usar linguagem de folha, não de processo.",
    commercial_temp:"easy",
  },
  revisao_insumos_pis_cofins: {
    why_first:      "Abre bem para indústrias porque é específico e técnico — sinaliza que o consultor conhece a operação industrial.",
    opening_angle:  "Ângulo técnico-operacional: 'o conceito de insumo mudou em 2018'. Falar de créditos não aproveitados como algo que ficou fora do radar.",
    curiosity_line: "O conceito de insumo para PIS/COFINS foi expandido pelo STJ em 2018 — e a maioria das indústrias ainda não revisou quais itens se qualificam.",
    avoid:          "Não falar 'recuperação'. Falar em 'revisão de aproveitamento de créditos'. Não simplificar demais para perfil fiscal.",
    commercial_temp:"technical",
  },
  ipi_credito_presumido_exportacao: {
    why_first:      "Para exportadores, é o mais direto: alíquota fixada em lei, sem risco, 5 anos de retroativo. Difícil refutar.",
    opening_angle:  "Ângulo de certeza jurídica: 'alíquota fixada em lei, sem litígio'. Contrastar com outras teses mais arriscadas.",
    curiosity_line: "Há um crédito de IPI com alíquota fixada em lei — 5,37% — que indústrias exportadoras raramente aproveitam sistematicamente nos 5 anos disponíveis.",
    avoid:          "Não começar pela alíquota. Começar pelo contexto: 'para quem exporta...'",
    commercial_temp:"medium",
  },
}

export function selectBestOpeningOpportunity(
  modules:   Array<{ slug: string; name: string; score: number }>,
  segment:   "servicos" | "comercio" | "industria",
  personaKey: PersonaKey,
  profile:   CompanyProfile,
): OpeningOpportunity | null {
  if (modules.length === 0) return null

  // Filter to recommended (score > 0) and sort by apertura_power -- score
  const ranked = modules
    .filter(m => m.score > 0)
    .map(m => {
      const prof = OPPORTUNITY_COMMERCIAL_PROFILE[m.slug]
      const apertPower = prof?.apertura_power ?? 40
      // Adjust for persona: technical personas prefer technical modules
      const techBonus = (personaKey === "fiscal" && prof?.temp === "technical") ? 15
        : (personaKey === "cfo" && prof?.temp === "easy") ? 10
        : (personaKey === "socio" && prof?.temp === "easy") ? 12
        : 0
      return { ...m, rank: (apertPower + techBonus) * (m.score / 100) }
    })
    .sort((a, b) => b.rank - a.rank)

  const best = ranked[0]
  if (!best) return null

  const openingProfile = OPPORTUNITY_OPENING_PROFILE[best.slug]
  if (!openingProfile) {
    return {
      slug:           best.slug,
      name:           best.name,
      why_first:      `${best.name} tem score ${best.score} e é o módulo mais relevante para este perfil.`,
      opening_angle:  "Abordar como revisão específica do perfil da empresa.",
      curiosity_line: `Há um ponto sobre ${best.name.toLowerCase()} que empresas do perfil de vocês raramente revisam.`,
      avoid:          "Não usar juridiquês na abertura.",
      commercial_temp:"medium",
    }
  }

  return { slug: best.slug, name: best.name, ...openingProfile }
}

// --------- Pre-call mentality panel ---------------------------------------------------------------------------------------------------

export interface PreCallMentality {
  mindset_rules:     string[]    // behavioral rules, not scripts
  tone_guidance:     string      // how to sound
  pacing_note:       string      // when to slow down / speed up
  what_to_validate:  string[]    // checklist for the call
  what_not_to_do:    string[]    // behavioral don'ts
  opening_module:    OpeningOpportunity | null
  secondary_modules: string[]    // mention only if asked or natural
}

export function buildPreCallMentality(
  profile:    CompanyProfile,
  makers:     DecisionMaker[],
  modules:    Array<{ slug: string; name: string; score: number }>,
  personaKey: PersonaKey,
  segment:    "servicos" | "comercio" | "industria",
): PreCallMentality {
  const primary = makers.find(m => m.is_primary_target) ?? makers[0]
  const openingMod = selectBestOpeningOpportunity(modules, segment, personaKey, profile)

  // Persona-specific mindset
  const mindset: Record<PersonaKey, string[]> = {
    cfo: [
      "Fale devagar e com pausas — CFOs detectam ansiedade imediatamente",
      "Nunca explique mais de 1 oportunidade na abertura",
      "Abra com contexto de mercado, não com proposta",
      "Use números apenas quando perguntado — não voluntarie estimativas cedo",
      "Projete que você monitora o setor, não que você quer vender algo",
      "Termine com opção de horário, não com pergunta de permissão",
    ],
    socio: [
      "Seja direto — sócios não têm paciência para rodeios",
      "Abra com impacto financeiro ou vantagem competitiva",
      "Evite linguagem técnica tributária na abertura",
      "Conecte ao negócio, não à tese jurídica",
      "Use referência de empresa similar para validar relevância",
      "Mova para reunião rapidamente — sócio decide rápido",
    ],
    fiscal: [
      "Vá direto ao ponto técnico — fiscal valoriza profundidade, não aquecimento",
      "Cite referência jurídica correta desde o início",
      "Posicione como análise complementar, nunca como crítica",
      "Demonstre que você conhece a operação antes de propor qualquer coisa",
      "Não simplifique — fiscal rejeita superficialidade",
      "Pergunte antes de concluir — mostre que quer entender, não apenas vender",
    ],
    contador: [
      "Tom de parceiro, nunca de concorrente",
      "Mencione explicitamente que o trabalho é complementar",
      "Nunca insinue que algo 'passou despercebido'",
      "Proponha análise conjunta, não substituição",
      "Garanta que o cliente não será contatado sem aprovação",
      "Foque em teses que estão fora do escopo cotidiano contábil",
    ],
    rh: [
      "Simplifique — RH não quer complexidade tributária",
      "Enfatize que não há impacto nos colaboradores",
      "Mova para o decisor correto rapidamente",
      "Use linguagem de benefício para a empresa, não de processo",
    ],
    diretor: [
      "Tom executivo — foque em impacto estratégico e P&L",
      "Use dado de mercado para contextualizar antes de propor",
      "Seja objetivo — directores têm agenda apertada",
      "Posicione como decisão estratégica, não operacional",
    ],
    generico: [
      "Fale devagar e observe como a pessoa reage",
      "Ajuste o nível técnico conforme a resposta",
      "Abra com contexto de mercado antes de mencionar oportunidade",
      "Valide quem é o interlocutor antes de aprofundar",
    ],
  }

  const pacing: Record<PersonaKey, string> = {
    cfo:      "Lento e deliberado. Pause depois de cada ponto importante. Deixe o silêncio trabalhar.",
    socio:    "Moderado. Direto ao ponto. Se mostrar interesse, accelere. Se hesitar, recue e reframe.",
    fiscal:   "Técnico e cadenciado. Não rush. Demonstre que você fez o dever de casa.",
    contador: "Calmo e colaborativo. Nunca apressado. Tom de parceria academic.",
    rh:       "Leve e simples. Vá rápido para o decisor certo.",
    diretor:  "Executivo. Conciso. Um ponto forte, depois CTA.",
    generico: "Observe e ajuste. Pause depois da abertura e leia a reação.",
  }

  const toneGuide: Record<PersonaKey, string> = {
    cfo:      "Institucional e seguro. Como um consultor sênior que monitora o setor — não como um vendedor que quer fechar.",
    socio:    "Direto e estratégico. Como um parceiro de negócio trazendo uma observação relevante.",
    fiscal:   "Técnico e respeitoso. Como um especialista que reconhece a competência do interlocutor.",
    contador: "Colaborativo e discreto. Como um colega de especialidade diferente, não um concorrente.",
    rh:       "Simples e amigável. Como alguém trazendo um benefício para a empresa.",
    diretor:  "Executivo e objetivo. Como um assessor estratégico, não um fornecedor.",
    generico: "Consultivo e curioso. Pergunte antes de afirmar.",
  }

  // What to validate on the call (from profile gaps + signals)
  const toValidate: string[] = []
  if (profile.has_ecommerce) toValidate.push("Volume de vendas interestaduais e distribuição por estado")
  if (profile.has_export) toValidate.push("Exportação direta ou via trading? Percentual do faturamento?")
  if (profile.has_industry) toValidate.push("Relação com fornecedores atacadistas — há compras de não contribuintes de IPI?")
  if (profile.has_retail) toValidate.push("Volume de compras com ICMS-ST e percentual de vendas em cartão")
  if (profile.has_logistics) toValidate.push("Combustível e manutenção de frota — volume e estrutura de aproveitamento")
  toValidate.push("Quem é o responsável fiscal/tributário interno?")
  toValidate.push("Existe apoio externo especializado além da contabilidade corrente?")
  toValidate.push(`Já houve alguma revisão tributária retroativa nos últimos ${profile.anos_operacao >= 5 ? "5" : "3"} anos?`)

  // What NOT to do
  const whatNot = [
    "Não mencionar mais de 1 oportunidade na abertura",
    "Não usar 'recuperação tributária' ou 'crédito tributário' como primeira frase",
    "Não perguntar faturamento ou folha cedo demais",
    "Não parecer que você precisa fechar — projete que você está selecionando quem atender",
    "Não aceitar 'manda por e-mail' como resposta final — usar como gancho",
    "Não dar valores estimados sem avisar que é preliminar",
    ...(personaKey === "fiscal" ? ["Não simplificar demais — fiscal rejeita superficialidade"] : []),
    ...(personaKey === "contador" ? ["Não insinuar que algo passou despercebido no trabalho deles"] : []),
  ]

  const secondary = modules
    .filter(m => m.score > 0 && m.slug !== openingMod?.slug)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(m => m.name)

  return {
    mindset_rules:    mindset[personaKey] ?? mindset.generico,
    tone_guidance:    toneGuide[personaKey] ?? toneGuide.generico,
    pacing_note:      pacing[personaKey] ?? pacing.generico,
    what_to_validate: toValidate.slice(0, 6),
    what_not_to_do:   whatNot,
    opening_module:   openingMod,
    secondary_modules: secondary,
  }
}

// --------- WhatsApp conversation flows ---------------------------------------------------------------------------------------

export interface WhatsAppFlow {
  sequence_label:  string
  messages:        Array<{
    step:     string
    when:     string
    message:  string
    note:     string    // behavioral note, not part of message
    is_natural: boolean
  }>
}

const FOLLOWUP_FLOWS: Record<string, WhatsAppFlow> = {
  no_response: {
    sequence_label: "Sem resposta",
    messages: [
      {
        step: "D+3",
        when: "3 dias após o primeiro contato sem resposta",
        message: "Oi [Nome], tudo bem? Só passando para confirmar que minha mensagem chegou. Qualquer coisa é só chamar — não tem pressa.",
        note: "Tom completamente leve. Sem cobrança. O objetivo é apenas saber se recebeu.",
        is_natural: true,
      },
      {
        step: "D+7",
        when: "7 dias — última tentativa no WhatsApp",
        message: "Oi [Nome]! Deixo o contato em aberto para quando fizer sentido. Quando tiver curiosidade sobre o que identifiquei, é só chamar.",
        note: "Tom de abundância — você não precisa deles. Isso cria mais interesse do que insistência.",
        is_natural: true,
      },
    ],
  },
  replied_disappeared: {
    sequence_label: "Respondeu mas sumiu",
    messages: [
      {
        step: "D+2",
        when: "2 dias após a última mensagem respondida",
        message: "Oi [Nome]! Aquela conversa ficou em aberto — quando tiver um momento, vale retomar. Identificamos algo específico no perfil de vocês que acho que vai fazer sentido.",
        note: "Reacenda a conversa com curiosidade. Não com cobrança.",
        is_natural: true,
      },
    ],
  },
  asked_to_return: {
    sequence_label: "Pediu para retornar depois",
    messages: [
      {
        step: "Data combinada",
        when: "Na data ou semana que combinaram",
        message: "Oi [Nome], bom dia! Conforme combinamos — estou por aqui quando tiver 15 minutos. Identificamos algumas coisas sobre o perfil de vocês que acho que vão chamar atenção.",
        note: "Mencione o combinado. Não seja genérico — referencie a conversa anterior.",
        is_natural: true,
      },
    ],
  },
  asked_email: {
    sequence_label: "Pediu e-mail",
    messages: [
      {
        step: "Imediato após pedido de e-mail",
        when: "Logo após a pessoa pedir o e-mail no WhatsApp",
        message: "Claro. Antes de enviar — me ajuda a entender uma coisa para não ficar um e-mail solto: vocês já fizeram alguma revisão tributária retroativa nos últimos 3 anos? Dependendo disso, o que envio muda bastante.",
        note: "NUNCA aceite o pedido de e-mail passivamente. Use como oportunidade para qualificar. Se responder bem, you have permission to send something specific.",
        is_natural: true,
      },
    ],
  },
  has_assessoria: {
    sequence_label: "Já tem assessoria tributária",
    messages: [
      {
        step: "Resposta imediata",
        when: "Quando a pessoa menciona que já tem contador ou assessoria",
        message: "Faz todo sentido — o que fazemos é complementar ao trabalho deles, com foco em algumas teses específicas que normalmente ficam fora do escopo corrente. Faz sentido alinharmos 15 minutos para você avaliar se cabe?",
        note: "Nunca diga 'seu contador não vê isso'. Diga 'complementar'. Posicione como especialidade diferente.",
        is_natural: true,
      },
    ],
  },
  contador_barrou: {
    sequence_label: "Contador barrou o contato",
    messages: [
      {
        step: "Quando o contador bloqueia",
        when: "O decisor menciona que passou para o contador e o contador não quis avançar",
        message: "Entendo. Nesses casos costumo alinhar diretamente com o escritório para apresentar o que identificamos de forma técnica. Seria possível você passar o contato do contador responsável?",
        note: "Transforme o bloqueio em uma abertura com o próprio contador. Nunca questione a decisão do contador na frente do cliente.",
        is_natural: true,
      },
    ],
  },
  financeiro_desconfiado: {
    sequence_label: "Financeiro desconfiado",
    messages: [
      {
        step: "Quando há ceticismo financeiro",
        when: "A pessoa demonstra desconfiança com promessas tributárias",
        message: "Faz todo sentido a desconfiança — o mercado está cheio de promessas nessa área. O que faço é diferente: antes de qualquer proposta, quero entender a operação de vocês. Se não fizer sentido, deixo claro. Se fizer, aí vai para a mesa para análise documental. Sem pressão.",
        note: "Valide a desconfiança. Isso cria mais credibilidade do que rebater.",
        is_natural: true,
      },
    ],
  },
  fiscal_tecnico: {
    sequence_label: "Fiscal técnico — quer profundidade",
    messages: [
      {
        step: "Quando o fiscal pede mais detalhes técnicos",
        when: "O responsável fiscal demonstra interesse mas quer fundamento antes de avançar",
        message: "Perfeito — a leitura técnica é exatamente o que espero. Para contextualizar adequadamente o que identificamos, o melhor é uma call de 30 minutos onde posso apresentar as referências jurídicas específicas. Você tem abertura essa semana?",
        note: "Não despeje o fundamento no WhatsApp. Use a demanda técnica como razão para a reunião.",
        is_natural: true,
      },
    ],
  },
}

export function buildWhatsAppFlows(
  nome:      string,
  personaKey: PersonaKey,
  openingMod: OpeningOpportunity | null,
): {
  initial:     WhatsAppFlow
  followups:   WhatsAppFlow[]
} {
  const slug = openingMod?.slug ?? ""
  const curiosity = openingMod?.curiosity_line ?? `um ponto específico no perfil de ${nome} que vale uma conversa`

  // Initial message --- contextual, not template
  const initial_msgs: Record<PersonaKey, string> = {
    cfo:      `Oi [Nome], bom dia!\n\nTenho acompanhado algumas movimentações tributárias relevantes no setor e alguns pontos me chamaram atenção no perfil de ${nome}.\n\nPrincipalmente em temas que costumam ter impacto direto no resultado — ${curiosity}.\n\nFaz sentido alinharmos 15 minutos?\n\nAbraço`,
    socio:    `Oi [Nome]!\n\nTenho acompanhado movimentações do segmento — e há algo específico no perfil de ${nome} que me chamou atenção. Principalmente em relação a ${curiosity}.\n\nVale 15 minutos?\n\nAbraço`,
    fiscal:   `Oi [Nome], bom dia!\n\nTenho acompanhado algumas discussões técnicas relevantes — e há um ponto específico no perfil de ${nome} que gostaria de alinhar. Tem a ver com ${curiosity}.\n\nTem abertura para uma call técnica de 20 minutos?\n\nAbraço`,
    contador: `Oi [Nome]!\n\nTenho algo técnico complementar ao que vocês provavelmente já fazem em ${nome} — queria alinhar antes de qualquer passo. Tem a ver com ${curiosity}.\n\nPodemos falar 15 minutos?\n\nAbraço`,
    rh:       `Oi [Nome], bom dia!\n\nTenho algo sobre a estrutura de encargos de ${nome} que pode ser relevante — sem impacto nos colaboradores. Vale 15 minutos?\n\nAbraço`,
    diretor:  `Oi [Nome], bom dia!\n\nTenho acompanhado movimentos estratégicos no setor — e há algo específico no perfil de ${nome} que vale uma conversa rápida. Principalmente em relação a ${curiosity}.\n\nQuando fica melhor?\n\nAbraço`,
    generico: `Oi [Nome], bom dia!\n\nIdentifiquei algo específico no perfil de ${nome} que vale 15 minutos — principalmente sobre ${curiosity}.\n\nTem disponibilidade essa semana?\n\nAbraço`,
  }

  const initial: WhatsAppFlow = {
    sequence_label: "Primeiro contato",
    messages: [{
      step:       "D+0",
      when:       "Primeiro contato",
      message:    initial_msgs[personaKey] ?? initial_msgs.generico,
      note:       "Contextual, curto, sem juridiquês. A curiosidade é o único objetivo desta mensagem.",
      is_natural: !["recuperação tributária","oportunidade tributária","tem 2 minutos?"].some(b => (initial_msgs[personaKey] ?? "").toLowerCase().includes(b)),
    }],
  }

  const followups = [
    FOLLOWUP_FLOWS.no_response,
    FOLLOWUP_FLOWS.replied_disappeared,
    FOLLOWUP_FLOWS.asked_email,
    FOLLOWUP_FLOWS.has_assessoria,
    FOLLOWUP_FLOWS.contador_barrou,
    FOLLOWUP_FLOWS.financeiro_desconfiado,
    FOLLOWUP_FLOWS.fiscal_tecnico,
  ]

  return { initial, followups }
}

// --------- Persona conversation guide ------------------------------------------------------------------------------------------------

export interface PersonaConversationGuide {
  persona_label:     string
  primary_goal:      string     // what they want in the conversation
  what_they_fear:    string     // what blocks them
  unlock_pattern:    string     // what unlocks their interest
  danger_zone:       string     // what kills the conversation
  language_model:    "financial" | "technical" | "strategic" | "collaborative"
  example_intro:     string     // NOT a script — an EXAMPLE of the tone
  transition_to_cta: string     // how to naturally move to scheduling
}

export const PERSONA_GUIDES: Record<PersonaKey, PersonaConversationGuide> = {
  cfo: {
    persona_label:     "CFO / Diretor Financeiro",
    primary_goal:      "Quer impacto no resultado e certeza de que não vai gerar surpresa",
    what_they_fear:    "Comprometer-se com algo sem análise prévia ou gerar problema com a estrutura atual",
    unlock_pattern:    "Dado de contexto de mercado + impacto financeiro claro + baixo compromisso inicial",
    danger_zone:       "Juridiquês na abertura, urgência artificial, perguntas financeiras cedo demais",
    language_model:    "financial",
    example_intro:     "Tenho acompanhado algumas movimentações tributárias relevantes no setor — principalmente temas que estão gerando impacto financeiro real em empresas do perfil de vocês, sem necessariamente aumentar exposição operacional.",
    transition_to_cta: "Faz mais sentido alinharmos isso na sexta de manhã ou segunda no início da tarde — são 15 minutos para contextualizar o que identificamos.",
  },
  socio: {
    persona_label:     "Sócio / Proprietário",
    primary_goal:      "Quer saber se tem dinheiro disponível e se a empresa está em desvantagem competitiva",
    what_they_fear:    "Ser enganado, gerar problema ou perder tempo com algo irrelevante",
    unlock_pattern:    "Referência a empresa similar + clareza de impacto financeiro + velocidade",
    danger_zone:       "Excesso técnico, juridiquês, rodeios antes de chegar ao ponto",
    language_model:    "strategic",
    example_intro:     "Tenho acompanhado algumas empresas do segmento de vocês que revisitaram determinadas estruturas tributárias recentemente — e o impacto financeiro tem sido relevante. Há algo específico no perfil de vocês que chamou minha atenção.",
    transition_to_cta: "Quando fica melhor para vocês — essa semana ou início da próxima? São 20 minutos direto ao ponto.",
  },
  fiscal: {
    persona_label:     "Responsável Fiscal / Tributário",
    primary_goal:      "Quer profundidade técnica, fundamento jurídico e segurança antes de qualquer análise",
    what_they_fear:    "Ser substituído, aprovar algo sem fundamento ou gerar risco",
    unlock_pattern:    "Referência jurídica correta + posicionamento como complementar + perguntar antes de concluir",
    danger_zone:       "Simplificar demais, prometer resultado antes de analisar, tom comercial na abertura",
    language_model:    "technical",
    example_intro:     "O Tema 1.125 do STJ mudou bastante a leitura sobre ICMS-ST na composição da base de PIS/COFINS — e muitas empresas ainda não revisaram o impacto operacional disso. Há algo específico no perfil de vocês que gostaria de alinhar tecnicamente.",
    transition_to_cta: "Para contextualizar adequadamente o ponto técnico, o melhor é uma call de 30 minutos. Você tem abertura essa semana ou na próxima?",
  },
  contador: {
    persona_label:     "Contador / Escritório Contábil",
    primary_goal:      "Quer parceria, não concorrência. Quer ser respeitado como especialista",
    what_they_fear:    "Perder o cliente, parecer que errou, gerar conflito com o cliente",
    unlock_pattern:    "Parceria explícita + análise conjunta + compromisso de não acesso direto ao cliente",
    danger_zone:       "'Identificamos erro', 'contador deixou passar', abordagem ao cliente sem aviso prévio",
    language_model:    "collaborative",
    example_intro:     "Vocês provavelmente já acompanham boa parte dessas discussões. O que temos feito em alguns grupos específicos é atuar de forma complementar em linhas mais estratégicas que acabam não entrando na rotina do escritório — sem substituir o trabalho de ninguém.",
    transition_to_cta: "Podemos fazer uma call técnica conjunta de 20 minutos para você avaliar se faz sentido levar para o cliente?",
  },
  rh: {
    persona_label:     "RH / Recursos Humanos",
    primary_goal:      "Quer simplicidade e garantia de que não vai afetar os colaboradores",
    what_they_fear:    "Criar expectativa nos funcionários ou gerar trabalho adicional",
    unlock_pattern:    "Simplicidade + garantia de que não muda processos + indicar o decisor correto",
    danger_zone:       "Termos previdenciários na abertura, excesso de detalhes, parecer que vai mudar processos",
    language_model:    "financial",
    example_intro:     "Há um ponto sobre a estrutura de encargos de vocês que pode gerar um resultado relevante para a empresa — sem nenhum impacto nos colaboradores ou nos processos internos.",
    transition_to_cta: "Qual seria o melhor caminho para apresentar isso para quem decide financeiramente na empresa?",
  },
  diretor: {
    persona_label:     "Diretor / VP",
    primary_goal:      "Quer impacto estratégico e visão de longo prazo",
    what_they_fear:    "Decisão errada que gera passivo ou constrangimento interno",
    unlock_pattern:    "Dado estratégico + impacto no P&L + abordagem top-down",
    danger_zone:       "Detalhes operacionais, juridiquês, parecer fornecedor em vez de assessor",
    language_model:    "strategic",
    example_intro:     "Tenho acompanhado movimentos tributários estratégicos no setor que estão gerando impacto direto no P&L — e há algo específico no perfil de vocês que vale uma conversa estratégica.",
    transition_to_cta: "Para o nível de contexto que esse tema merece, o melhor é 15 minutos. Quinta ou sexta de manhã funcionam?",
  },
  generico: {
    persona_label:     "Interlocutor não identificado",
    primary_goal:      "Quer entender do que se trata antes de qualquer compromisso",
    what_they_fear:    "Perder tempo com algo irrelevante",
    unlock_pattern:    "Especificidade imediata sobre a empresa + abertura baixa fricção",
    danger_zone:       "Parecer automação genérica, juridiquês, urgência artificial",
    language_model:    "financial",
    example_intro:     "Tenho acompanhado o setor e identifiquei algo específico no perfil de vocês que vale uma conversa rápida.",
    transition_to_cta: "O ideal é alinharmos 15 minutos — quando fica melhor para você?",
  },
}
