// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Persona Language Engine + Authority Engine + Curiosity Gap
//
// The foundation of the Persuasion Engine.
// Each persona has a complete psychological + linguistic profile.
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { CompanyProfile }  from "../intelligence/company-profile-engine"
import type { DecisionMaker }   from "../intelligence/decision-maker-engine"

// --------- Persona psychological profile ---------------------------------------------------------------------------------

export type PersonaKey = "cfo" | "socio" | "fiscal" | "contador" | "rh" | "diretor" | "generico"

export interface PersonaLanguageProfile {
  key:                 PersonaKey
  label:               string
  tone:                "financeiro" | "técnico" | "estratégico" | "consultivo" | "operacional"
  technical_depth:     "baixa" | "media" | "alta"
  aggressiveness:      "suave" | "moderada" | "direta"
  // Psychology
  emotional_trigger:   string   // the feeling they want
  rational_trigger:    string   // the logic that moves them
  financial_trigger:   string   // the money argument
  main_fear:           string   // what they fear most
  main_resistance:     string   // why they push back
  trust_signal:        string   // what makes them trust you
  credibility_marker:  string   // what proves you're serious
  // Language
  words_that_work:     string[]   // power words for this persona
  words_to_avoid:      string[]   // instant credibility killers
  // Openers
  best_opener:         string     // how to start the conversation
  worst_opener:        string     // what kills the call immediately
  // Email/WA tone
  email_tone:          string
  wa_tone:             string
}

export const PERSONA_PROFILES: Record<PersonaKey, PersonaLanguageProfile> = {
  cfo: {
    key:                "cfo",
    label:              "CFO / Diretor Financeiro",
    tone:               "financeiro",
    technical_depth:    "media",
    aggressiveness:     "direta",
    emotional_trigger:  "Quero ter certeza que não estou deixando dinheiro na mesa",
    rational_trigger:   "Quero ver os números antes de qualquer compromisso",
    financial_trigger:  "Impacto no EBITDA e previsibilidade de caixa",
    main_fear:          "Surpresa tributária ou comprometimento sem análise prévia",
    main_resistance:    "Já temos estrutura — não quero mais uma consultoria",
    trust_signal:       "Dados concretos sobre empresas do mesmo perfil",
    credibility_marker: "Conhecimento do segmento antes de pedir reunião",
    words_that_work:    ["eficiência", "resultado", "margem", "caixa", "diagnóstico", "preliminar", "sem compromisso"],
    words_to_avoid:     ["recuperação tributária", "ganho garantido", "juridiquês"],
    best_opener:        "Contextualizar o segmento e apresentar dado específico antes de propor qualquer coisa",
    worst_opener:       "Tenho uma oportunidade tributária para vocês",
    email_tone:         "Objetivo e direto. Dados antes de proposta. CTA leve.",
    wa_tone:            "Uma linha de contexto + pergunta simples. Sem excesso.",
  },

  socio: {
    key:                "socio",
    label:              "Sócio / Proprietário",
    tone:               "estratégico",
    technical_depth:    "baixa",
    aggressiveness:     "moderada",
    emotional_trigger:  "Não quero que concorrentes estejam à minha frente",
    rational_trigger:   "Se tem resultado concreto, quero saber",
    financial_trigger:  "Dinheiro que está sendo deixado para trás",
    main_fear:          "Ser enganado ou comprometer dados sem motivo",
    main_resistance:    "Meu contador já cuida disso",
    trust_signal:       "Referência ou resultado de empresa similar",
    credibility_marker: "Falar sobre o negócio antes de falar de tributário",
    words_that_work:    ["estratégico", "competitividade", "resultado", "revisão", "histórico"],
    words_to_avoid:     ["crédito tributário", "repetição de indébito", "mandado de segurança"],
    best_opener:        "Mencionar algo específico da empresa antes de qualquer proposta",
    worst_opener:       "Tenho oportunidade de recuperação tributária",
    email_tone:         "Curto. Uma coisa específica sobre a empresa. CTA claro.",
    wa_tone:            "Natural. Como um conhecido do setor. Sem juridiquês.",
  },

  fiscal: {
    key:                "fiscal",
    label:              "Fiscal / Tributário",
    tone:               "técnico",
    technical_depth:    "alta",
    aggressiveness:     "suave",
    emotional_trigger:  "Quero ser reconhecido como especialista, não substituído",
    rational_trigger:   "Preciso de fundamento jurídico sólido antes de qualquer análise",
    financial_trigger:  "Impacto que justifica o trabalho técnico adicional",
    main_fear:          "Aprovar algo que gere autuação ou risco para a empresa",
    main_resistance:    "Já analisamos isso internamente",
    trust_signal:       "Profundidade técnica imediata — citar legislação correta",
    credibility_marker: "Tratar como especialista desde o primeiro contato",
    words_that_work:    ["complementar", "análise técnica", "jurisprudência", "STJ", "Tema", "fundamento"],
    words_to_avoid:     ["fácil", "simples", "garantido", "seu contador não viu", "recuperar dinheiro"],
    best_opener:        "Referência técnica imediata — mostrar que conhece o tema em profundidade",
    worst_opener:       "Posso te mostrar como recuperar dinheiro",
    email_tone:         "Técnico desde a primeira linha. Referências jurídicas. CTA técnico.",
    wa_tone:            "Formal e direto. Uma pergunta técnica específica.",
  },

  contador: {
    key:                "contador",
    label:              "Contador / Escritório Contábil",
    tone:               "consultivo",
    technical_depth:    "alta",
    aggressiveness:     "suave",
    emotional_trigger:  "Quero ser parceiro, não ser ameaçado",
    rational_trigger:   "Complementariedade clara — sem risco de perder o cliente",
    financial_trigger:  "Honorários adicionais ou manutenção de relacionamento com cliente",
    main_fear:          "Ser substituído ou fazer o cliente pensar que errou",
    main_resistance:    "Não consigo indicar algo sem ter certeza que é seguro",
    trust_signal:       "Parceria declarada desde o início — nunca concorrência",
    credibility_marker: "Compromisso de não abordar o cliente sem o escritório",
    words_that_work:    ["complementar", "conjunto", "parceria", "análise adicional", "especialidade"],
    words_to_avoid:     ["seu cliente não sabe", "isso está sendo subutilizado", "não foi revisado"],
    best_opener:        "Parceiro especializado com foco diferente do contábil cotidiano",
    worst_opener:       "Identificamos algo no seu cliente que você não viu",
    email_tone:         "Parceria desde o assunto. Proposta de análise conjunta.",
    wa_tone:            "Colega do setor. Curto. Proposta de call técnica.",
  },

  rh: {
    key:                "rh",
    label:              "RH / Recursos Humanos",
    tone:               "operacional",
    technical_depth:    "baixa",
    aggressiveness:     "suave",
    emotional_trigger:  "Quero que seja simples e não gere trabalho extra",
    rational_trigger:   "Não vai afetar os colaboradores de forma negativa",
    financial_trigger:  "Benefício para a empresa sem custo para a equipe",
    main_fear:          "Criar expectativa nos colaboradores ou complicar processos",
    main_resistance:    "Não é minha área de decisão",
    trust_signal:       "Mostrar que o processo é simples e não invasivo",
    credibility_marker: "Ter aprovação do CFO/sócio antes de envolver RH",
    words_that_work:    ["simples", "transparente", "benefício para a empresa", "sem impacto nos colaboradores"],
    words_to_avoid:     ["encargos", "revisão previdenciária", "folha", "INSS"],
    best_opener:        "Benefício para a empresa sem implicações nos funcionários",
    worst_opener:       "Tenho análise de encargos previdenciários",
    email_tone:         "Simples. Uma ação clara. Encaminhar para o decisor certo.",
    wa_tone:            "Amigável. Objetivo. Pedir indicação do responsável.",
  },

  diretor: {
    key:                "diretor",
    label:              "Diretor / VP",
    tone:               "estratégico",
    technical_depth:    "media",
    aggressiveness:     "moderada",
    emotional_trigger:  "Preciso de visão estratégica, não operacional",
    rational_trigger:   "Impacto no resultado e na competitividade",
    financial_trigger:  "Eficiência que impacta o P&L",
    main_fear:          "Decisão errada que gera passivo ou constrangimento interno",
    main_resistance:    "Minha equipe já avalia isso",
    trust_signal:       "Abordagem top-down com dado estratégico",
    credibility_marker: "Falar de impacto estrutural, não de tese isolada",
    words_that_work:    ["estrutura", "eficiência", "impacto", "P&L", "competitividade"],
    words_to_avoid:     ["tese tributária", "repetição de indébito", "liminar"],
    best_opener:        "Impacto na estrutura tributária de longo prazo",
    worst_opener:       "Posso ajudar a recuperar créditos",
    email_tone:         "Executivo. Uma página. Dado + impacto + CTA claro.",
    wa_tone:            "Conciso. Dado específico. Proposta de 15 minutos.",
  },

  generico: {
    key:                "generico",
    label:              "Interlocutor não identificado",
    tone:               "consultivo",
    technical_depth:    "media",
    aggressiveness:     "suave",
    emotional_trigger:  "Quero entender do que se trata antes de qualquer compromisso",
    rational_trigger:   "Preciso ver relevância para a nossa operação",
    financial_trigger:  "Se há resultado potencial, vale 20 minutos",
    main_fear:          "Perder tempo com algo irrelevante",
    main_resistance:    "Não tenho certeza se é a pessoa certa para falar",
    trust_signal:       "Especificidade imediata — não parece abordagem em massa",
    credibility_marker: "Menção à empresa antes de mencionar produto",
    words_that_work:    ["específico", "operação", "perfil", "20 minutos", "diagnóstico"],
    words_to_avoid:     ["recuperação tributária", "crédito", "tese"],
    best_opener:        "Especificidade sobre a empresa + pedido educado de 2 minutos",
    worst_opener:       "Tenho algo importante para apresentar",
    email_tone:         "Contextual. Pesquisado. CTA mínimo.",
    wa_tone:            "Natural. Específico. Humano.",
  },
}

// --------- Authority Engine ---------------------------------------------------------------------------------------------------------------------------

export interface AuthorityFrame {
  institutional_opener: string   // sounds like a senior consultant, not a salesperson
  expertise_signal:     string   // proof of technical depth without saying "I'm an expert"
  social_proof:         string   // companies like them have done this
  urgency_frame:        string   // why now, without pressure
  posture:              string   // the overall attitude to project
}

export function buildAuthorityFrame(
  profile:  CompanyProfile,
  persona:  PersonaLanguageProfile,
): AuthorityFrame {
  const nome = profile.razao_social.split(" ")[0]

  return {
    institutional_opener: `Venho acompanhando determinados movimentos operacionais e tributários relacionados ao perfil de ${nome} — e há algo específico que vale uma conversa.`,

    expertise_signal: persona.technical_depth === "alta"
      ? `Trabalhamos especificamente com a interface entre jurisprudência recente e impacto operacional — não é uma análise de superfície.`
      : `Temos analisado o comportamento fiscal de empresas do segmento e identificamos padrões que raramente entram no radar operacional cotidiano.`,

    social_proof: `Empresas do mesmo perfil de ${nome} — ${profile.business_model.split(".")[0].toLowerCase()} — têm revisitado essas frentes nos últimos 18 meses especificamente por conta de decisões recentes do STJ.`,

    urgency_frame: profile.anos_operacao >= 10
      ? `Com ${profile.anos_operacao} anos de operação, o período retroativo ainda disponível é expressivo — mas vai prescrevendo mensalmente.`
      : `O timing é relevante porque a jurisprudência que embasaria essa análise foi pacificada recentemente — o período retroativo ainda está aberto.`,

    posture: `Não estou propondo nada ainda. Quero entender a operação antes de concluir se há algo aplicável.`,
  }
}

// --------- Curiosity Gap Engine ---------------------------------------------------------------------------------------------------------------

export interface CuriosityGap {
  gap_statement:    string   // the "what I found" without revealing
  implied_value:    string   // the value without quantifying
  validation_ask:   string   // the question that makes them curious
  mystery_element:  string   // what they'll want to find out in the call
}

export function buildCuriosityGap(
  profile:  CompanyProfile,
  persona:  PersonaLanguageProfile,
): CuriosityGap {
  const nome = profile.razao_social.split(" ")[0]
  const sigs = profile.operational_signals

  // Pick the most distinctive signal to tease
  const topSignal = sigs.find(s => ["export","ecommerce","industry","expansion"].includes(s.type)) ?? sigs[0]

  const gap_base = topSignal
    ? `relacionados ao ${topSignal.label.toLowerCase()} de ${nome}`
    : `do perfil operacional de ${nome}`

  return {
    gap_statement:
      `Existem alguns comportamentos fiscais específicos ${gap_base} que normalmente passam despercebidos até mesmo em estruturas muito bem organizadas.`,

    implied_value:
      persona.key === "cfo" || persona.key === "socio"
        ? `O impacto não é marginal — estamos falando de algo que afeta diretamente o custo operacional.`
        : `O ponto não é simples e exige análise específica — por isso ainda não chegou ao radar de revisão interna.`,

    validation_ask:
      profile.has_industry ? `Vocês já realizaram uma revisão específica do conceito de insumo para PIS/COFINS após o REsp 1.221.170?`
      : profile.has_export  ? `O crédito presumido de IPI sobre as exportações está sendo aproveitado sistematicamente nos últimos 60 meses?`
      : profile.has_ecommerce ? `As operações interestaduais do e-commerce de ${nome} já passaram por análise específica de DIFAL?`
      : `${nome} já realizou alguma revisão tributária estratégica retroativa nos últimos 3 anos?`,

    mystery_element:
      `O que me chamou atenção especificamente foi um comportamento fiscal que costuma aparecer em empresas com o perfil operacional de ${nome} — mas que raramente é revisado porque não está no escopo do trabalho contábil cotidiano.`,
  }
}
