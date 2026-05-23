// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Unified Copilot Engine
//
// Replaces: context-builder, why-now-engine, contextual-engines,
// persuasion-engine --- into ONE unified output.
//
// The dashboard has ONE copilot tab. This powers it entirely.
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { CompanyProfile }  from "../intelligence/company-profile-engine"
import type { DecisionMaker }   from "../intelligence/decision-maker-engine"
import type { PersonaKey }      from "./persona-language-engine"
import { PERSONA_PROFILES }     from "./persona-language-engine"
import {
  buildStrategicOpening,
  buildCompetitiveIntelligence,
  buildContextualUrgency,
  buildConversationPsychology,
  buildHighAuthorityCTA,
  CALL_CONTROL_RESPONSES,
} from "./strategic-opening-engine"
import { buildContextualHooks, OBJECTION_INTELLIGENCE } from "./contextual-hooks"
import {
  buildPreCallMentality,
  buildWhatsAppFlows,
  selectBestOpeningOpportunity,
  PERSONA_GUIDES,
  type PreCallMentality,
  type WhatsAppFlow,
  type OpeningOpportunity,
  type PersonaConversationGuide,
} from "./behavioral-playbook-engine"
import type { LegalIntelligence } from "../intelligence/legal-intelligence-engine"
import type { EnrichedDecisionMaker } from "../intelligence/decision-maker-intelligence"

// --------- The unified output ---------------------------------------------------------------------------------------------------------------------

export interface UnifiedCopilotOutput {
  // Meta
  persona:              PersonaKey
  company_name:         string
  commercial_temp:      string
  recommended_channel:  string
  best_call_time:       string

  // ------ ANTES DE LIGAR ------------------------------------------------------------------------------------------------------------------------
  pre_call: {
    what_you_know:       string[]   // facts to mention (real data)
    hypotheses:          string[]   // hypotheses to confirm
    do_not_say:          string[]   // banned phrases and topics
    persona_profile:     string     // who you're calling and how they think
    authority_frame:     string     // the posture to project
    tone_instruction:    string
  }

  // ------ ROTEIRO DA LIGA----O ------------------------------------------------------------------------------------------------------------
  call_flow: {
    opening:             string     // the monitoring frame, not sales frame
    with_company_ref:    string     // company-specific version
    sector_context:      string     // what's happening in the market
    competitive_angle:   string     // what peers are doing
    curiosity_gap:       string     // what you found (without revealing)
    anchor_question:     string     // the qualifying question
    pre_empt_objection:  string     // neutralize before they object
    cta_primary:         string     // assumes the meeting
    cta_secondary:       string     // if they hesitate
    full_script:         string     // assembled script
    flow_steps:          string[]   // step by step guide
  }

  // ------ OBJE----ES ------------------------------------------------------------------------------------------------------------------------------------------
  objections: Array<{
    trigger:             string
    psychological_read:  string
    response:            string
    follow_up:           string
    never_say:           string
  }>

  // ------ URG--NCIA ---------------------------------------------------------------------------------------------------------------------------------------
  urgency: {
    soft:                string
    direct:              string
    retroactive_math:    string
    sector_timing:       string
  }

  // ------ E-MAIL ---------------------------------------------------------------------------------------------------------------------------------------------
  email: {
    subject:             string
    body_formal:         string
    body_short:          string
    ps:                  string
    tone:                string
  }

  // ------ WHATSAPP ---------------------------------------------------------------------------------------------------------------------------------------
  whatsapp: {
    initial:             string
    followup:            string
    post_meeting:        string
    char_check:          string
  }

  // ------ PERGUNTAS INTELIGENTES ------------------------------------------------------------------------------------------------
  smart_questions:       string[]

  // ------ GANCHOS CONTEXTUAIS ---------------------------------------------------------------------------------------------------------
  contextual_hooks:      Array<{ hook: string; evidence: string; type: string }>

  // ------ CONTROLE DE LIGA----O ---------------------------------------------------------------------------------------------------------
  call_control:          typeof CALL_CONTROL_RESPONSES
  legal_context?: {
    maturity_level:     string
    approach_shift:     string | null
    avoid_in_opening:   string[]
    opening_modifier:   string | null
    primary_maker_opening: string | null
  } | null
  behavioral?: {
    pre_call_mentality:  any
    whatsapp_flows:      any
    opening_opportunity: any
    persona_guide:       any
  }
}

// --------- Builder ------------------------------------------------------------------------------------------------------------------------------------------------------

export function buildUnifiedCopilot(
  profile:       CompanyProfile,
  makers:        DecisionMaker[],
  modules:       Array<{ name: string; slug: string; score: number }>,
  newsSignals:   Array<{ title: string; tags: string[]; commercial_hook: string }>,
  segment:       "servicos" | "comercio" | "industria",
  legalIntel?:   LegalIntelligence | null,
  enrichedMakers?: EnrichedDecisionMaker[] | null,
): UnifiedCopilotOutput {
  const nome       = profile.razao_social.split(" ")[0]
  const razao      = profile.razao_social
  const topMaker   = makers.find(m => m.is_primary_target) ?? makers[0]
  const topModule  = modules.sort((a,b) => b.score - a.score)[0]

  // Determine persona
  const personaKey: PersonaKey =
    topMaker?.preferred_language === "técnico" ? "fiscal"
    : topMaker?.preferred_language === "estratégico" ? "socio"
    : topMaker?.preferred_language === "financeiro" ? "cfo"
    : "cfo"

  const persona    = PERSONA_PROFILES[personaKey]

  // Use enriched maker if available
  const primaryEnriched = enrichedMakers?.find(m => m.is_primary_target) ?? null

  // Legal-informed persona override
  const legalMaturity = legalIntel?.maturity_level ?? "none"
  const hasLitigation = (legalIntel?.findings?.length ?? 0) > 0
  const topFirm       = legalIntel?.law_firms?.[0] ?? null

  // Build components
  const opening    = buildStrategicOpening(profile, personaKey, segment)
  const competitive = buildCompetitiveIntelligence(profile, segment)
  const urgency    = buildContextualUrgency(profile, segment)
  const psychology = buildConversationPsychology(profile, personaKey)
  const cta        = buildHighAuthorityCTA(profile, personaKey)
  const hooks      = buildContextualHooks(profile, newsSignals)

  // Smart questions --- contextual, never generic
  const smart_questions: string[] = []
  if (profile.has_industry) {
    smart_questions.push("Como está estruturada a relação de vocês com fornecedores atacadistas — têm IPI incidente nas compras?")
    smart_questions.push("A operação de vocês tem insumos que entram diretamente na produção ou é mais de embalagem e auxiliares?")
  }
  if (profile.has_export) {
    smart_questions.push("Vocês exportam diretamente ou via trading company?")
    smart_questions.push("Qual o percentual do faturamento destinado à exportação nos últimos 5 anos?")
  }
  if (profile.has_ecommerce) {
    smart_questions.push("Qual a distribuição de vendas entre os estados — têm estados fora de SP que concentram volume relevante?")
  }
  if (profile.has_retail) {
    smart_questions.push("Como está a relação de compras com ICMS-ST — é relevante no mix de fornecedores de vocês?")
    smart_questions.push("Qual o percentual de vendas que passa por maquininha hoje?")
  }
  if (profile.anos_operacao >= 8) {
    smart_questions.push(`Com ${profile.anos_operacao} anos de operação, vocês já realizaram alguma revisão tributária retroativa específica?`)
  }
  smart_questions.push("Como está a estrutura de apoio jurídico-tributário de vocês — é mais interno ou têm escritório especializado externo?")
  smart_questions.push("Qual o escopo do trabalho contábil atual — é mais voltado para compliance e obrigações correntes?")

  // Pre-call intelligence
  const what_you_know: string[] = []
  if (profile.anos_operacao > 0) what_you_know.push(`${profile.anos_operacao} anos de operação (Receita Federal — confirmado)`)
  if (profile.cnae_descricao !== "A confirmar") what_you_know.push(`CNAE: ${profile.cnae_descricao} (Receita Federal)`)
  if (profile.localizacao !== "A confirmar") what_you_know.push(`Localização: ${profile.localizacao} (Receita Federal)`)
  if (profile.has_export) what_you_know.push("Sinal de operação exportadora (site institucional)")
  if (profile.has_ecommerce) what_you_know.push("Canal digital identificado (site institucional)")
  if (profile.has_industry) what_you_know.push("Operação industrial confirmada pelo CNAE")
  what_you_know.push(...profile.expansion_signals.slice(0, 2))

  const hypotheses: string[] = profile.operational_signals
    .filter(s => s.confidence !== "high" || !s.type.includes("industry"))
    .slice(0, 3)
    .map(s => `HIPÓTESE — ${s.label}: confirmar na ligação`)

  // Emails
  const subject_map: Record<PersonaKey, string> = {
    cfo:      `${nome} — comportamentos fiscais identificados no perfil operacional`,
    socio:    `${nome} — movimentação tributária relevante no segmento`,
    fiscal:   `${nome} — análise técnica complementar: jurisprudência recente`,
    contador: `Tema complementar identificado — ${nome}`,
    rh:       `${nome} — estrutura de encargos: revisão específica`,
    diretor:  `${nome} — inteligência tributária estratégica`,
    generico: `${nome} — algo específico identificado no perfil operacional`,
  }

  const topHook = hooks[0]
  const email_body_formal = `Olá, [Nome],

${opening.with_company_ref}

${competitive.sector_movement}

${competitive.peer_benchmark}

${topModule ? `O ponto que se destaca especificamente no perfil de ${razao} está relacionado a ${topModule.name} — e é o tipo de tema que normalmente está fora do escopo da análise corrente.` : `Há um comportamento fiscal específico do perfil de ${razao} que normalmente está fora do escopo da análise corrente.`}

Não estou propondo nada ainda. O melhor é 15 minutos para contextualizar o que identifiquei de forma mais clara do que qualquer e-mail consegue passar.

${cta.primary.replace(/^"|"$/g, "")}

[Nome do Consultor]`

  const email_body_short = `Olá, [Nome],

${topHook?.hook ?? opening.persona_variant}

${topModule ? `Há algo específico sobre ${topModule.name} no perfil de ${nome} que vale 15 minutos.` : `Há algo específico sobre o perfil de ${nome} que vale uma conversa rápida.`}

${cta.primary.replace(/^"|"$/g, "")}

[Nome do Consultor]`

  // WhatsApp
  const wa_initial_map: Record<PersonaKey, string> = {
    cfo:      profile.anos_operacao >= 10
      ? `Oi [Nome], bom dia! Sou [Consultor].\n\nVenho acompanhando movimentos tributários em empresas do segmento — e ${nome} tem ${profile.anos_operacao} anos de operação, o que cria um perfil específico que chamou atenção.\n\nTem sentido alinharmos 15 minutos essa semana?\n\nAbraço`
      : `Oi [Nome], bom dia! Sou [Consultor].\n\nIdentifiquei algo específico no perfil fiscal de ${nome} que vale 15 minutos. Tem sentido alinharmos essa semana?\n\nAbraço`,
    socio:    `Oi [Nome]! Sou [Consultor].\n\nVenho acompanhando movimentações do segmento — e há algo específico no perfil de ${nome} que me chamou atenção. Vale 15 minutos?\n\nAbraço`,
    fiscal:   `Oi [Nome], bom dia! Sou [Consultor].\n\nHá um ponto técnico específico no perfil de ${nome} que queria alinhar — é complementar ao que já está sendo feito. Vale uma call de 20 minutos?\n\nAbraço`,
    contador: `Oi [Nome]! Sou [Consultor].\n\nIdentifiquei algo técnico complementar no perfil de ${nome} que queria alinhar com você antes de qualquer passo. Podemos falar 15 minutos?\n\nAbraço`,
    rh:       `Oi [Nome], bom dia! Sou [Consultor].\n\nIdentifiquei algo no perfil de encargos de ${nome} que pode ser relevante — sem impacto operacional nos colaboradores. Vale 15 minutos?\n\nAbraço`,
    diretor:  `Oi [Nome], bom dia! Sou [Consultor].\n\nVenho acompanhando movimentos tributários estratégicos no setor — e há algo no perfil de ${nome} que vale 15 minutos. Quando fica melhor?\n\nAbraço`,
    generico: `Oi [Nome], bom dia! Sou [Consultor].\n\nIdentifiquei algo específico no perfil de ${nome} que vale 15 minutos de contexto. Tem disponibilidade essa semana?\n\nAbraço`,
  }

  const wa_initial = wa_initial_map[personaKey] ?? wa_initial_map.generico
  const hasBanned = ["recuperação tributária","ganho garantido","oportunidade tributária"].some(b => wa_initial.toLowerCase().includes(b))

  // Full assembled script
  const full_script = `[ABERTURA — FRAME DE MONITORAMENTO]
${opening.persona_variant}

[CONTEXTO SETORIAL]
${competitive.sector_movement}

[CURIOSITY GAP]
${psychology.curiosity_builder.replace(/^"|"$/g, "")}

[ÂNCORA]
${psychology.anchor_question.replace(/^"|"$/g, "")}

[PRÉ-EMPT DE OBJEÇÃO]
${psychology.pre_empt_objection.replace(/^"|"$/g, "")}

[CTA]
${cta.primary.replace(/^"|"$/g, "")}`

  // ------ Behavioral guidance (v22) ------------------------------------------------------------------------------------------------------
  const behaviorMakers = (enrichedMakers ?? makers).map((m: any) => ({
    ...m, is_primary_target: m.is_primary_target ?? false,
    preferred_language: m.preferred_language ?? (personaKey === "fiscal" ? "técnico" : personaKey === "cfo" ? "financeiro" : "estratégico"),
  }))
  const preCallMentality = buildPreCallMentality(profile, behaviorMakers as any, modules, personaKey, segment)
  const openingOpp = selectBestOpeningOpportunity(modules, segment, personaKey, profile)
  const whatsAppFlows = buildWhatsAppFlows(nome, personaKey, openingOpp)
  const personaGuide = PERSONA_GUIDES[personaKey] ?? PERSONA_GUIDES.generico

  return {
    persona:             personaKey,
    company_name:        razao,
    commercial_temp:     profile.commercial_temperature,
    recommended_channel: persona.technical_depth === "alta" ? "email" : "telefone",
    best_call_time:      personaKey === "fiscal" ? "Tarde — menor pressão operacional" : personaKey === "rh" ? "Manhã" : "Terça a quinta, 8h-9h ou 14h-15h",

    pre_call: {
      what_you_know,
      hypotheses,
      do_not_say:     [...persona.words_to_avoid, "Tem 2 minutos?", "Você teria disponibilidade?", "Posso mandar um e-mail?"],
      persona_profile: `${persona.label} — ${persona.tone}. Quer: ${persona.emotional_trigger}. Teme: ${persona.main_fear}. Confia por: ${persona.trust_signal}.`,
      authority_frame: opening.with_company_ref,
      tone_instruction: opening.tone_instruction,
    },

    call_flow: {
      opening: legalMaturity !== "none" && hasLitigation
        ? `Venho acompanhando empresas do segmento com perfil operacional e histórico tributário semelhante ao de ${nome}${topFirm ? ` — inclusive com representação de escritórios como ${topFirm.name}` : ""}. O que identifiquei não é uma revisão padrão, mas algo específico para empresas com esse nível de maturidade jurídica.`
        : opening.primary,
      with_company_ref: legalMaturity !== "none" && hasLitigation
        ? `Identifiquei que ${nome} já possui uma estrutura jurídico-tributária${hasLitigation ? ` com histórico de discussões envolvendo ${legalIntel!.themes_detected.slice(0,2).join(" e ")}` : ""}. O ponto que quero contextualizar é complementar ao que já existe — não uma revisão básica.`
        : opening.with_company_ref,
      sector_context:     competitive.sector_movement,
      competitive_angle:  competitive.competitive_angle,
      curiosity_gap:      psychology.curiosity_builder.replace(/^"|"$/g, ""),
      anchor_question:    psychology.anchor_question.replace(/^"|"$/g, ""),
      pre_empt_objection: psychology.pre_empt_objection.replace(/^"|"$/g, ""),
      cta_primary:        cta.primary.replace(/^"|"$/g, ""),
      cta_secondary:      cta.secondary.replace(/^"|"$/g, ""),
      full_script,
      flow_steps:         psychology.ideal_flow,
    },

    legal_context: {
      maturity_level:    legalMaturity,
      approach_shift:    legalIntel?.approach_shift ?? null,
      avoid_in_opening:  legalIntel?.avoid_in_opening ?? [],
      opening_modifier:  legalMaturity !== "none" && hasLitigation
        ? `Empresa com maturidade jurídica identificada — ${legalIntel!.maturity_label}. ${legalIntel!.approach_shift}`
        : null,
      primary_maker_opening: primaryEnriched?.opening_line ?? null,
    },

    objections: [
      ...CALL_CONTROL_RESPONSES.map(r => ({
        trigger:            r.trigger,
        psychological_read: OBJECTION_INTELLIGENCE.find(o => o.objection.toLowerCase().includes(r.trigger.toLowerCase().split(" ")[0]))?.psychological_read ?? "Resistência natural",
        response:           r.response,
        follow_up:          r.follow_up,
        never_say:          r.never_say,
      })),
    ],

    urgency: {
      soft:             urgency.soft_urgency,
      direct:           urgency.direct_urgency,
      retroactive_math: urgency.retroactive_math,
      sector_timing:    urgency.sector_timing,
    },

    email: {
      subject:     subject_map[personaKey] ?? subject_map.generico,
      body_formal: email_body_formal,
      body_short:  email_body_short,
      ps:          persona.key === "fiscal" ? "P.S. Posso enviar as referências jurídicas específicas antes da call."
        : persona.key === "contador" ? "P.S. Nenhum contato com o cliente sem seu conhecimento."
        : "P.S. O diagnóstico inicial é sem compromisso.",
      tone:        persona.email_tone,
    },

    whatsapp: {
      initial:      wa_initial,
      followup:     `Oi [Nome]! Só confirmando o recebimento do e-mail sobre ${nome}. Qualquer dúvida, é só chamar. Abraço`,
      post_meeting: `Oi [Nome]! Ótima conversa. Vou enviar o resumo por e-mail ainda hoje. Abraço!`,
      char_check:   hasBanned ? "⚠ Revisar — contém linguagem proibida"
        : wa_initial.length > 450 ? "⚠ Longo — considere encurtar"
        : `✓ ${wa_initial.length} chars — natural e contextual`,
    },

    smart_questions: smart_questions.slice(0, 6),
    contextual_hooks: hooks.map(h => ({ hook: h.hook, evidence: h.evidence, type: h.type })),
    call_control: CALL_CONTROL_RESPONSES,
    legal_context: legalIntel ? {
      maturity_level:    legalIntel.maturity_level,
      approach_shift:    legalIntel.approach_shift,
      avoid_in_opening:  legalIntel.avoid_in_opening,
      opening_modifier:  (legalIntel.maturity_level !== "none" && (legalIntel.findings?.length ?? 0) > 0)
        ? `Empresa com maturidade jurídica identificada — ${legalIntel.maturity_label}. ${legalIntel.approach_shift}`
        : null,
      primary_maker_opening: primaryEnriched?.opening_line ?? null,
    } : null,
    behavioral: {
      pre_call_mentality:  preCallMentality,
      whatsapp_flows:      whatsAppFlows,
      opening_opportunity: openingOpp,
      persona_guide:       personaGuide,
    },
  }
}
