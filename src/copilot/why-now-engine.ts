// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Why Now Engine + Contextual Pitch Engine
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { CopilotContext } from "./context-builder"
import type { CompanyIntelligence } from "../enrichment/types"

// --------- Why Now Engine ---------------------------------------------------------------------------------------------------------------------------------

export interface WhyNowReason {
  reason:    string
  type:      "age" | "news" | "regime" | "operation" | "jurisprudence" | "timing"
  strength:  "strong" | "medium" | "soft"
  source?:   string        // never undefined for facts
}

export interface WhyNowOutput {
  reasons:    WhyNowReason[]
  headline:   string        // 1-sentence summary of why now
  urgency:    "alta" | "media" | "baixa"
}

export function buildWhyNow(ctx: CopilotContext, intelligence?: CompanyIntelligence | null): WhyNowOutput {
  const reasons: WhyNowReason[] = []
  const nome = ctx.company_name.split(" ")[0]

  // 1. Company age --- retroactive period
  if (ctx.anos_operacao >= 15) {
    reasons.push({
      reason:   `${nome} tem ${ctx.anos_operacao} anos de operação — o período retroativo disponível para revisão tributária está próximo do máximo possível.`,
      type:     "age",
      strength: "strong",
      source:   "Receita Federal",
    })
  } else if (ctx.anos_operacao >= 8) {
    reasons.push({
      reason:   `Com ${ctx.anos_operacao} anos de operação, ${nome} acumula histórico relevante para uma primeira revisão tributária estratégica.`,
      type:     "age",
      strength: "medium",
      source:   "Receita Federal",
    })
  }

  // 2. Public news signals (only real news --- never invented)
  const newsSignals = intelligence?.public_signals.filter(s => s.source === "Google News") ?? []
  for (const s of newsSignals.slice(0, 2)) {
    if (s.commercial_hook) {
      reasons.push({
        reason:   s.commercial_hook,
        type:     "news",
        strength: "medium",
        source:   "Google News",
      })
    }
  }

  // 3. Regime timing
  if (ctx.regime_label === "Lucro Real") {
    reasons.push({
      reason:   `Empresas no Lucro Real têm janelas retroativas de PIS/COFINS (60-96 meses) que se renovam continuamente — cada mês sem revisão é período que pode prescrever.`,
      type:     "regime",
      strength: "medium",
    })
  }

  // 4. Operation-specific
  const ops = ctx.operational_signals.map(s => s.text)
  if (ops.some(o => o.toLowerCase().includes("cartão"))) {
    reasons.push({
      reason:   `O volume em cartão cria um fluxo mensal de PIS/COFINS sobre taxas de adquirentes. Cada mês sem revisão é período que pode prescrever.`,
      type:     "operation",
      strength: "strong",
      source:   "Informado pelo consultor",
    })
  }
  if (ops.some(o => o.toLowerCase().includes("exporta"))) {
    reasons.push({
      reason:   `O crédito presumido de IPI exportação (5,37%) tem período retroativo de 60 meses — quanto mais tempo sem aproveitar, menor o período disponível.`,
      type:     "operation",
      strength: "strong",
      source:   "Informado pelo consultor",
    })
  }

  // 5. Jurisprudence timing
  if (ctx.segment_label === "Comércio") {
    reasons.push({
      reason:   `O Tema 1.125 STJ (ICMS-ST na base PIS/COFINS) foi pacificado em dezembro/2023 — empresas ainda têm o período retroativo completo desde 2017 disponível.`,
      type:     "jurisprudence",
      strength: "strong",
    })
  }
  if (ctx.segment_label === "Indústria") {
    reasons.push({
      reason:   `O conceito ampliado de insumo (REsp 1.221.170) foi fixado em 2018 — indústrias que ainda não revisaram seus EFD-Contribuições têm até 5 anos retroativos disponíveis.`,
      type:     "jurisprudence",
      strength: "medium",
    })
  }

  // 6. Reforma tribut--ria (always relevant in 2025-2026)
  reasons.push({
    reason:   `Com a transição da Reforma Tributária em curso, muitas empresas estão revisando a estrutura fiscal — é o momento ideal para identificar créditos antes da migração para o novo regime.`,
    type:     "timing",
    strength: "soft",
  })

  const topStrong = reasons.filter(r => r.strength === "strong")
  const headline = topStrong.length > 0
    ? topStrong[0].reason.slice(0, 120)
    : reasons[0]?.reason.slice(0, 120) ?? "Momento adequado para revisão tributária estratégica."

  const urgency: "alta" | "media" | "baixa" =
    topStrong.length >= 2 ? "alta"
    : reasons.filter(r => r.strength !== "soft").length >= 2 ? "media"
    : "baixa"

  return {
    reasons: reasons.slice(0, 5),
    headline,
    urgency,
  }
}

// --------- Contextual Pitch Engine ------------------------------------------------------------------------------------------------------

export interface ContextualPitch {
  opening:        string    // contextual, real data, never generic
  context_bridge: string    // connects company data to opportunity
  core_argument:  string    // the main commercial argument
  validation_ask: string    // the validation question
  transition:     string    // transition to meeting request
  full_pitch:     string    // assembled full pitch (3-4 sentences)
  fallback_pitch: string    // if all enrichment fails
}

export function buildContextualPitch(ctx: CopilotContext): ContextualPitch {
  const nome = ctx.company_name.split(" ")[0]
  const seg  = ctx.segment_label
  const reg  = ctx.regime_label

  // Build opening from best available fact
  const bestFact = ctx.company_facts.find(f => f.confidence === "high" && f.type === "fact")
  const topOp    = ctx.tax_opportunities[0]

  // Opening: contextual --- uses real data if available
  let opening: string
  if (ctx.anos_operacao >= 10 && ctx.has_enrichment) {
    opening = `Analisando o perfil público de ${nome}, vejo que a empresa tem ${ctx.anos_operacao} anos de operação como ${seg.toLowerCase()} no ${reg}.`
  } else if (ctx.operational_signals.length > 0) {
    const sig = ctx.operational_signals[0].text
    opening = `Identificamos no perfil de ${nome} um sinal operacional relevante: ${sig.toLowerCase()}.`
  } else {
    opening = `Temos trabalhado com empresas de ${seg.toLowerCase()} no ${reg} — e o perfil de ${nome} apresenta características que merecem atenção.`
  }

  // Context bridge: connects data to opportunity
  let context_bridge: string
  if (ctx.commercial_hooks.length > 0) {
    // Strip quotes if present
    context_bridge = ctx.commercial_hooks[0].replace(/^"|"$/g, "")
  } else if (topOp) {
    context_bridge = `Para empresas com esse perfil, a oportunidade mais frequente está em ${topOp.name.toLowerCase()} — ${topOp.pitch}`
  } else {
    context_bridge = `Empresas com esse perfil geralmente têm frentes de revisão tributária que não passaram pelo radar do trabalho contábil cotidiano.`
  }

  // Core argument
  const core_argument = topOp
    ? `A abordagem não começa por recuperação genérica, mas por ${topOp.name} — que tem base jurídica ${topOp.risk === "remoto" ? "sólida" : "em amadurecimento"} e aplicação direta ao perfil de ${nome}.`
    : `A análise que propomos é complementar ao trabalho já existente — focada em jurisprudência recente que ainda não chegou na maioria das empresas do setor.`

  // Validation ask
  const validation_ask = ctx.recommended_questions[0]
    ?? `Vocês já realizaram alguma revisão tributária estratégica nos últimos 3 anos?`

  // Transition
  const transition = `Para trazer uma estimativa preliminar do potencial específico para ${nome}, precisaria de 20 minutos com ${ctx.decision_makers.find(dm => dm.is_target)?.title ?? "o responsável financeiro"}.`

  // Full assembled pitch
  const full_pitch = [opening, context_bridge, core_argument, validation_ask].join(" ")

  // Fallback (no enrichment)
  const fallback_pitch = `Temos trabalhado com empresas de ${seg.toLowerCase()} no ${reg} e identificamos comportamentos fiscais específicos desse perfil que raramente são revisados. Faz sentido validarmos se ${nome} já passou por uma revisão estratégica recentemente?`

  return {
    opening,
    context_bridge,
    core_argument,
    validation_ask,
    transition,
    full_pitch: ctx.has_enrichment ? full_pitch : fallback_pitch,
    fallback_pitch,
  }
}
