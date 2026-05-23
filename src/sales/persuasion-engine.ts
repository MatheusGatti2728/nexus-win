// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Persuasion Engine (Main Output)
// Conversation Flow + Email + WhatsApp + Full Copilot Output
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { CompanyProfile }          from "../intelligence/company-profile-engine"
import type { DecisionMaker }           from "../intelligence/decision-maker-engine"
import type { PersonaLanguageProfile, PersonaKey } from "./persona-language-engine"
import type { ContextualHook }          from "./contextual-hooks"
import type { AuthorityFrame, CuriosityGap } from "./persona-language-engine"
import { PERSONA_PROFILES, buildAuthorityFrame, buildCuriosityGap } from "./persona-language-engine"
import { buildContextualHooks, buildLegalContextHook, OBJECTION_INTELLIGENCE } from "./contextual-hooks"

// --------- Conversation flow ------------------------------------------------------------------------------------------------------------------------

export interface ConversationFlow {
  // Step 1: Open
  abertura:         string    // the first 30 words
  // Step 2: Context
  contexto:         string    // why you're calling (company-specific)
  // Step 3: Curiosity
  curiosity_gap:    string    // what you found without revealing
  // Step 4: Validate
  pergunta_chave:   string    // the question that qualifies
  // Step 5: CTA
  cta_principal:    string
  cta_fallback:     string    // if they push back
  // Full assembled flow
  full_script:      string
  // Tone guide
  tone_note:        string
}

export function buildConversationFlow(
  profile:   CompanyProfile,
  maker:     DecisionMaker,
  hooks:     ContextualHook[],
  authority: AuthorityFrame,
  gap:       CuriosityGap,
  persona:   PersonaLanguageProfile,
): ConversationFlow {
  const nome    = profile.razao_social.split(" ")[0]
  const topHook = hooks[0]

  const abertura =
    `Bom dia, [Nome]. Meu nome é [Consultor]. ${authority.institutional_opener}`

  const contexto = topHook?.hook ?? authority.expertise_signal

  const curiosity_gap = gap.gap_statement

  const pergunta_chave = gap.validation_ask

  const cta_principal =
    persona.key === "fiscal" || persona.key === "contador"
      ? `Posso reservar 30 minutos para uma call técnica esta semana — sem compromisso, só para apresentar o que identifiquei especificamente sobre o perfil de vocês.`
      : `Teria 20 minutos ainda essa semana para eu apresentar o diagnóstico preliminar? Não há compromisso envolvido.`

  const cta_fallback =
    `Sem problema. Posso enviar um resumo de 1 página — você lê quando tiver 3 minutos e decide se vale uma conversa.`

  const full_script = [
    abertura,
    contexto,
    gap.mystery_element,
    pergunta_chave,
    cta_principal,
  ].join("\n\n")

  const tone_note = [
    `Tom: ${persona.tone}`,
    `Profundidade técnica: ${persona.technical_depth}`,
    `Evitar: ${persona.words_to_avoid.slice(0,3).join(", ")}`,
    `Palavras que funcionam: ${persona.words_that_work.slice(0,4).join(", ")}`,
  ].join(" · ")

  return { abertura, contexto, curiosity_gap, pergunta_chave, cta_principal, cta_fallback, full_script, tone_note }
}

// --------- Email Engine ---------------------------------------------------------------------------------------------------------------------------------------

export interface ContextualEmail {
  subject:     string
  preview:     string
  body:        string
  ps:          string
  version:     "formal" | "curta" | "pos_reuniao"
  data_used:   string[]
  tone:        string
}

export function buildContextualEmail(
  profile:  CompanyProfile,
  maker:    DecisionMaker,
  hooks:    ContextualHook[],
  authority: AuthorityFrame,
  persona:  PersonaLanguageProfile,
  modules:  Array<{ name: string; slug: string }>,
  version:  "formal" | "curta" | "pos_reuniao" = "formal",
): ContextualEmail {
  const nome  = profile.razao_social.split(" ")[0]
  const razao = profile.razao_social
  const topMod = modules[0]
  const topHook = hooks[0]

  // Subject --- specific to company, no "recupera----o tribut--ria"
  const subjects: Record<PersonaKey, string> = {
    cfo:      profile.anos_operacao >= 10
      ? `${nome} — comportamentos fiscais específicos do perfil operacional`
      : `${nome} — análise tributária complementar`,
    socio:    `${nome} — algo específico que identifiquei no perfil de vocês`,
    fiscal:   `${nome} — análise técnica complementar: ${topMod?.name?.split(" ").slice(0,3).join(" ") ?? "PIS/COFINS"}`,
    contador: `Análise técnica complementar — ${nome}`,
    rh:       `${nome} — eficiência de encargos sobre folha`,
    diretor:  `${nome} — diagnóstico tributário estratégico`,
    generico: `${nome} — algo específico sobre o perfil de vocês`,
  }

  const subject = subjects[persona.key]

  // Body by version
  const contextLine = topHook
    ? topHook.hook
    : authority.expertise_signal

  const operationRef = profile.operational_summary
    ? `Analisando o perfil público de ${razao}: ${profile.operational_summary.slice(0,120)}.`
    : `Analisando o perfil operacional de ${razao}.`

  const bodies: Record<typeof version, string> = {
    formal: `Olá, [Nome],

${operationRef}

${contextLine}

${authority.social_proof}

${topMod ? `O ponto que me chamou atenção especificamente foi algo relacionado a ${topMod.name} — que aparece com frequência nesse perfil operacional e raramente é revisado de forma sistemática.` : "Há alguns comportamentos fiscais específicos do perfil de vocês que raramente entram no radar da análise corrente."}

Não estou propondo nada ainda. Quero entender melhor a operação antes de concluir se há algo aplicável.

Teria 20 minutos ainda essa semana para uma conversa preliminar?

[Nome do Consultor]`,

    curta: `Olá, [Nome],

${contextLine}

${topMod ? `Há algo específico relacionado a ${topMod.name} que se destaca no perfil de ${nome} e que vale uma conversa rápida.` : `Identifiquei algo no perfil de ${nome} que vale uma conversa rápida.`}

Posso reservar 20 minutos?

[Nome do Consultor]`,

    pos_reuniao: `Olá, [Nome],

Obrigado pela conversa de hoje.

Conforme alinhado, seguem os pontos principais que identificamos no perfil de ${razao}:

${modules.slice(0,3).map((m,i) => `${i+1}. ${m.name}`).join("\n")}

${profile.data_gaps.length > 0 ? `\nPara refinar a análise, precisaremos de: ${profile.data_gaps.slice(0,2).join(", ")}.` : ""}

Próximo passo: [combinado na conversa].

[Nome do Consultor]`,
  }

  const ps_map: Record<PersonaKey, string> = {
    cfo:      `P.S. Nenhum documento necessário nessa etapa — o diagnóstico inicial é baseado em dados públicos e nas informações que você me passar.`,
    socio:    `P.S. O diagnóstico preliminar é gratuito e sem compromisso.`,
    fiscal:   `P.S. Posso enviar as referências jurídicas específicas antes da call se quiser avaliar tecnicamente.`,
    contador: `P.S. Nenhum contato com o cliente sem seu conhecimento e aprovação prévia.`,
    rh:       `P.S. O processo não tem nenhum impacto operacional nos colaboradores.`,
    diretor:  `P.S. Posso preparar um 1-pager executivo antes da conversa.`,
    generico: `P.S. Respondo qualquer dúvida por aqui antes de marcar qualquer coisa.`,
  }

  return {
    subject,
    preview:    `${contextLine.slice(0, 80)}…`,
    body:       bodies[version],
    ps:         version !== "pos_reuniao" ? ps_map[persona.key] : "",
    version,
    data_used:  [
      profile.anos_operacao > 0 ? `${profile.anos_operacao} anos de operação` : null,
      profile.cnae_descricao !== "A confirmar" ? profile.cnae_descricao : null,
      topHook?.evidence,
    ].filter((x): x is string => Boolean(x)),
    tone:       persona.email_tone,
  }
}

// --------- WhatsApp Engine ------------------------------------------------------------------------------------------------------------------------------

export interface ContextualWA {
  text:        string
  char_count:  number
  tone_check:  string
  stage:       "abordagem" | "followup" | "pos_reuniao"
  is_natural:  boolean   // true if it doesn't sound automated
}

const BANNED_PHRASES = ["recuperação tributária", "ganho garantido", "crédito tributário", "levantamos dinheiro", "temos uma oportunidade"]

export function buildContextualWA(
  profile:  CompanyProfile,
  maker:    DecisionMaker,
  persona:  PersonaLanguageProfile,
  hooks:    ContextualHook[],
  stage:    "abordagem" | "followup" | "pos_reuniao" = "abordagem",
): ContextualWA {
  const nome    = profile.razao_social.split(" ")[0]
  const topHook = hooks[0]

  const messages: Record<typeof stage, Partial<Record<PersonaKey, string>>> = {
    abordagem: {
      cfo: profile.anos_operacao >= 10
        ? `Oi [Nome], tudo bem? Sou [Consultor].\n\n${nome} tem ${profile.anos_operacao} anos — isso cria um período retroativo tributário expressivo que normalmente ninguém olha. Posso mandar um resumo de 1 página?\n\nAbraço`
        : topHook
        ? `Oi [Nome], tudo bem? Sou [Consultor].\n\n${topHook.hook.slice(0,100)}...\n\nPosso mandar mais detalhes?\n\nAbraço`
        : `Oi [Nome], tudo bem? Sou [Consultor].\n\nIdentifiquei algo no perfil operacional de ${nome} que vale 2 minutos da sua atenção. Posso mandar?\n\nAbraço`,

      socio: `Oi [Nome]! Sou [Consultor].\n\nEstudei o perfil de ${nome} — há algo específico do segmento que me chamou atenção e que vale uma conversa. Posso mandar um resumo?\n\nAbraço`,

      fiscal: `Oi [Nome], tudo bem? Sou [Consultor], especialista em ${hooks.find(h=>h.type==="operacao")?.type ?? "revisão tributária estratégica"}.\n\nHá algo técnico específico do perfil de ${nome} que queria alinhar com você. Tem 2 minutos para uma call?\n\nAbraço`,

      contador: `Oi [Nome]! Sou [Consultor].\n\nIdentifiquei algo técnico complementar no perfil de um cliente que queria alinhar com você antes de qualquer contato. Podemos falar 10 minutos?\n\nAbraço`,

      generico: `Oi [Nome], tudo bem? Sou [Consultor].\n\nAnalisei o perfil de ${nome} e há algo específico que vale uma conversa rápida. Posso mandar um resumo?\n\nAbraço`,
    },

    followup: {
      cfo:      `Oi [Nome]! Só confirmando o recebimento do e-mail sobre ${nome}. Qualquer dúvida é só chamar.`,
      socio:    `Oi [Nome]! Passou meu e-mail? Quando tiver 5 minutos, vale a leitura — específico para o perfil de vocês.`,
      fiscal:   `Oi [Nome]! Confirmando o recebimento do e-mail técnico. Posso enviar as referências jurídicas se quiser avaliar antes.`,
      contador: `Oi [Nome]! Confirmando o recebimento. Aguardo quando tiver disponibilidade.`,
      generico: `Oi [Nome]! Só confirmando o e-mail. Qualquer dúvida é só falar.`,
    },

    pos_reuniao: {
      cfo:      `Oi [Nome]! Ótima conversa hoje. Vou enviar o resumo que combinamos por e-mail ainda hoje. Abraço!`,
      socio:    `Oi [Nome]! Ótimo papo. Vou formalizar tudo por e-mail. Qualquer dúvida, é só chamar!`,
      fiscal:   `Oi [Nome]! Ótima troca técnica. Vou enviar as referências e o resumo por e-mail ainda hoje.`,
      contador: `Oi [Nome]! Ótima conversa. Vou formalizar a proposta de trabalho conjunto por e-mail.`,
      generico: `Oi [Nome]! Ótimo papo. Envio o resumo por e-mail logo mais. Abraço!`,
    },
  }

  const personaMsg = messages[stage][persona.key] ?? messages[stage].generico ?? `Oi [Nome]! Sou [Consultor]. Identifiquei algo no perfil de ${nome} — posso mandar um resumo?\n\nAbraço`
  const hasBanned = BANNED_PHRASES.some(b => personaMsg.toLowerCase().includes(b))

  return {
    text:       personaMsg,
    char_count: personaMsg.length,
    tone_check: hasBanned ? "⚠ Contém frase banida — revisar antes de enviar"
      : personaMsg.length > 450 ? "⚠ Mensagem longa para WhatsApp — considere encurtar"
      : "✓ Natural e contextual",
    stage,
    is_natural: !hasBanned && personaMsg.length <= 450,
  }
}

// --------- Main Persuasion Engine ---------------------------------------------------------------------------------------------------------

export interface PersuasionOutput {
  // Context
  persona_profile:    PersonaLanguageProfile
  authority_frame:    AuthorityFrame
  curiosity_gap:      CuriosityGap
  contextual_hooks:   ContextualHook[]
  // Outputs
  conversation_flow:  ConversationFlow
  email:              ContextualEmail
  email_curta:        ContextualEmail
  email_pos_reuniao:  ContextualEmail
  wa_abordagem:       ContextualWA
  wa_followup:        ContextualWA
  wa_pos_reuniao:     ContextualWA
  // Objections
  top_objections:     typeof OBJECTION_INTELLIGENCE
  // Meta
  recommended_channel: "telefone" | "email" | "whatsapp" | "linkedin"
  best_time_to_call:   string
}

export function buildPersuasionOutput(
  profile:   CompanyProfile,
  makers:    DecisionMaker[],
  modules:   Array<{ name: string; slug: string; score: number }>,
  newsSignals: Array<{ title: string; tags: string[]; commercial_hook: string }>,
  legalContext?: { hasLitigation: boolean; recurringThemes: string[] },
): PersuasionOutput {
  // Select best persona
  const primaryMaker   = makers.find(m => m.is_primary_target) ?? makers[0]
  const personaKeyRaw  = primaryMaker?.preferred_language === "técnico" ? "fiscal"
    : primaryMaker?.preferred_language === "estratégico" ? "socio"
    : primaryMaker?.preferred_language === "financeiro" ? "cfo"
    : "cfo"
  const personaKey     = personaKeyRaw as PersonaKey
  const persona        = PERSONA_PROFILES[personaKey]

  // Build components
  const authority  = buildAuthorityFrame(profile, persona)
  const gap        = buildCuriosityGap(profile, persona)
  const hooks      = buildContextualHooks(profile, newsSignals)
  const flow       = buildConversationFlow(profile, primaryMaker, hooks, authority, gap, persona)

  // Emails
  const email           = buildContextualEmail(profile, primaryMaker, hooks, authority, persona, modules, "formal")
  const email_curta     = buildContextualEmail(profile, primaryMaker, hooks, authority, persona, modules, "curta")
  const email_pos       = buildContextualEmail(profile, primaryMaker, hooks, authority, persona, modules, "pos_reuniao")

  // WhatsApp
  const wa_ab  = buildContextualWA(profile, primaryMaker, persona, hooks, "abordagem")
  const wa_fol = buildContextualWA(profile, primaryMaker, persona, hooks, "followup")
  const wa_pos = buildContextualWA(profile, primaryMaker, persona, hooks, "pos_reuniao")

  // Channel recommendation
  const channel: PersuasionOutput["recommended_channel"] =
    persona.technical_depth === "alta" ? "email"
    : profile.commercial_temperature === "muito_quente" ? "telefone"
    : "telefone"

  return {
    persona_profile:     persona,
    authority_frame:     authority,
    curiosity_gap:       gap,
    contextual_hooks:    hooks,
    conversation_flow:   flow,
    email,
    email_curta,
    email_pos_reuniao:   email_pos,
    wa_abordagem:        wa_ab,
    wa_followup:         wa_fol,
    wa_pos_reuniao:      wa_pos,
    top_objections:      OBJECTION_INTELLIGENCE.slice(0, 4),
    recommended_channel: channel,
    best_time_to_call:   personaKey === "fiscal" ? "Tarde — menor pressão operacional"
      : personaKey === "rh" ? "Manhã — antes das demandas operacionais"
      : "Terça a quinta, 8h-9h ou 14h-15h",
  }
}
