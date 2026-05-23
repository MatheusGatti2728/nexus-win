// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS COPILOT --- Narrative Engine + Pain Map + Orchestrator
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { CompanyContext } from "../engine/rule-engine"
import type { ModuleResult } from "../engine/rule-engine"
import type {
  NarrativeFrame, PainMap, PersonaType, CompanySnapshot,
  CopilotOutput, PersonaPlaybookFull, ObjectionResponse
} from "./types"
import { SEGMENT_LABELS, REGIME_LABELS } from "../engine/tax-matrix"
import { buildCompanySnapshot } from "./company-snapshot"
import { PERSONA_BEHAVIORS, getPersonaBehavior } from "./persona-behavior"
import { generateConversationEntry } from "./conversation-entry"
import { buildWhatNotToSay, generateEmail, generateWhatsApp, generateFollowups } from "./communication-engines"

// --------- Narrative Engine ---------------------------------------------------------------------------------------------------------------------------

export function buildNarrativeFrame(ctx: CompanyContext): NarrativeFrame {
  const seg = ctx.consultant.segment

  const narratives: Record<typeof seg, NarrativeFrame> = {
    comercio: {
      segment: "comercio",
      core_narrative: "Empresas varejistas carregam custos tributários invisíveis ligados à própria operação — não por desatenção, mas porque estão fora do radar do trabalho contábil cotidiano. O papel do consultor não é 'recuperar' — é tornar o comportamento fiscal mais inteligente do que o da concorrência.",
      power_words: ["caixa", "margem", "operação", "eficiência", "consumidor final", "revisão"],
      avoid_words: ["recuperação", "oportunidade", "estratégia fiscal", "ganho", "crédito", "juridiquês"],
      analogies: [
        "É como revisar o contrato com a operadora de cartão — você já passou por isso antes.",
        "Assim como você revisa contratos de fornecedores todo ano, tem comportamentos tributários que merecem a mesma atenção.",
        "É uma revisão de manutenção, não uma auditoria.",
      ],
      proof_types: [
        "Casos de empresas do mesmo segmento (sem citar nomes)",
        "Referências de jurisprudência do STJ — não de advogados",
        "Estimativas baseadas em dados da operação, não inventadas",
      ],
    },
    servicos: {
      segment: "servicos",
      core_narrative: "Empresas de serviços concentram o custo na folha de pagamento — e raramente revisam o impacto tributário desse custo. A narrativa não é de recuperação, é de eficiência financeira em um setor onde cada ponto de margem conta.",
      power_words: ["folha", "encargos", "eficiência", "estrutura", "ISS", "previdenciário", "operação"],
      avoid_words: ["recuperação", "ganho garantido", "crédito tributário", "oportunidade fiscal"],
      analogies: [
        "É como revisar o plano de saúde corporativo — não muda a cobertura, só o custo.",
        "Assim como otimizar o quadro de fornecedores, há otimizações na estrutura de encargos que passam despercebidas.",
      ],
      proof_types: [
        "Referência ao STJ — Tema 1079 (Sistema S)",
        "Análise do próprio histórico de recolhimento",
        "Comparação com empresas do mesmo porte e segmento",
      ],
    },
    industria: {
      segment: "industria",
      core_narrative: "Indústrias em Lucro Real têm o sistema tributário mais complexo e mais oportunidades não aproveitadas. A narrativa é de maturidade tributária — não de recuperação. Uma indústria eficiente é aquela que aproveita o que a lei permite, não mais, não menos.",
      power_words: ["insumos", "eficiência", "exportação", "cadeia", "crédito", "IPI", "maturidade tributária"],
      avoid_words: ["recuperação", "ganho", "levantamos dinheiro", "oportunidade"],
      analogies: [
        "É como revisar o aproveitamento de energia — não muda a operação, só o custo.",
        "Assim como a indústria otimiza matéria-prima, há oportunidades de otimização tributária na mesma cadeia.",
      ],
      proof_types: [
        "Lei 9.363/96 — alíquota de 5,37% fixada em lei",
        "REsp 1.221.170/PR — conceito amplo de insumo",
        "Tema 1.125 STJ — ICMS-ST e base PIS/COFINS",
      ],
    },
  }

  return narratives[seg]
}

// --------- Pain Map ---------------------------------------------------------------------------------------------------------------------------------------------------

export function buildPainMap(ctx: CompanyContext): PainMap {
  const seg   = ctx.consultant.segment
  const reg   = ctx.consultant.tax_regime
  const flags = ctx.consultant.operation_flags ?? []

  const painsBySegment: Record<typeof seg, PainMap["top_pains"]> = {
    comercio: [
      { pain: "Margem operacional comprimida pelo custo tributário sobre vendas em cartão", intensity: flags.includes("venda_cartao") ? "alta" : "media", commercial_angle: "A margem líquida do varejo brasileiro é de 2-4%. Qualquer redução de custo tributário impacta diretamente o resultado." },
      { pain: "ICMS-ST embutido nas compras aumenta artificialmente a base do PIS/COFINS", intensity: flags.includes("icms_st") ? "alta" : "media", commercial_angle: "O STJ pacificou em 2023 que esse valor não é receita — e o período retroativo ainda está disponível." },
      { pain: "Encargos sobre folha acima do necessário em empresas com histórico longo", intensity: "media", commercial_angle: "39 meses retroativos via PER/DCOMP — processo direto sem risco." },
    ],
    servicos: [
      { pain: "Encargos previdenciários sobre parcelas indenizatórias da folha", intensity: flags.includes("folha_relevante") ? "alta" : "media", commercial_angle: "Empresas com histórico de rescisões e folha relevante têm base expressiva para revisão previdenciária." },
      { pain: "Sistema S calculado sobre base incorreta — acima do limite do STJ", intensity: "alta", commercial_angle: "Tema 1079: limite de 20 salários mínimos. Muitas empresas ainda recolhem sobre a folha total." },
      { pain: "ISS incluído na base do PIS/COFINS — questão em amadurecimento no STF", intensity: "media", commercial_angle: "Desdobramento do Tema 69 — análise individual necessária antes de movimentação." },
    ],
    industria: [
      { pain: "Créditos de IPI de exportação não aproveitados sistematicamente", intensity: flags.includes("exportacao") ? "alta" : "baixa", commercial_angle: "Alíquota de 5,37% fixada em lei. Período de 60 meses. Aproveitamento via PER/DCOMP." },
      { pain: "Insumos PIS/COFINS interpretados de forma restrita — créditos não aproveitados", intensity: "alta", commercial_angle: "STJ ampliou o conceito de insumo em 2018. A maioria das indústrias ainda não revisou com base na nova tese." },
      { pain: "ICMS Gross-Up não incluído na revisão do Tema 69", intensity: "media", commercial_angle: "Diferença entre ICMS incidente e destacado — análise técnica com risco possível (COSIT 21/2026)." },
    ],
  }

  const painLanguage: Record<PersonaType, string> = {
    cfo:      "Custo tributário não gerenciado que comprime margem sem que a empresa perceba.",
    socio:    "Dinheiro da empresa que ficou no caminho — não por falta de trabalho, mas por falta de revisão estratégica.",
    fiscal:   "Comportamento tributário que diverge da jurisprudência consolidada — risco de não aproveitamento de crédito legítimo.",
    contador: "Oportunidade complementar ao trabalho contábil cotidiano — baseada em jurisprudência recente.",
    rh:       "Encargos previdenciários calculados sobre base maior que o necessário — redução possível sem impacto nos colaboradores.",
  }

  return {
    segment:     seg,
    regime:      reg,
    top_pains:   painsBySegment[seg],
    pain_language: painLanguage,
  }
}

// --------- Objection engine ---------------------------------------------------------------------------------------------------------------------------

function buildObjections(ctx: CompanyContext, modules: ModuleResult[]): ObjectionResponse[] {
  const objections: ObjectionResponse[] = [
    // Universal objections
    {
      objection: "Já temos contador/advogado tributário.",
      response: "Perfeito. Nossa atuação é complementar — olhamos especificamente para teses de jurisprudência recente que demandam análise retroativa, o que geralmente está fora do escopo do trabalho contábil cotidiano.",
      tone: "concessive",
      follow_up: "Qual é o foco principal do escritório atual de vocês?",
      avoid: "Insinuar que o contador não fez o trabalho",
      persona: ["cfo", "socio", "fiscal"],
    },
    {
      objection: "Não tenho tempo agora.",
      response: "Entendo. Posso enviar um resumo de 1 página por e-mail — você avalia quando tiver 5 minutos. Qual é o melhor e-mail?",
      tone: "empathetic",
      follow_up: "Enviar o e-mail em até 2 horas — assunto específico, sem anexo.",
      avoid: "Insistir em marcar reunião nesse momento",
      persona: ["cfo", "socio", "fiscal", "contador", "rh"],
    },
    {
      objection: "Isso é muito arriscado.",
      response: "Entendo a cautela — ela é importante. Por isso trabalhamos apenas com teses de baixo risco jurídico. A análise prévia existe exatamente para separar o que é viável do que é especulativo para a operação específica de vocês.",
      tone: "authoritative",
      follow_up: "Qual é o maior receio em relação ao risco?",
      avoid: "Minimizar o risco — ser transparente",
      persona: ["cfo", "fiscal"],
    },
    {
      objection: "Já fizemos isso antes.",
      response: "Ótimo — isso facilita muito. Quando foi a última revisão e qual foi o escopo coberto? Pergunto porque a jurisprudência mudou bastante desde 2022-2023.",
      tone: "curious",
      follow_up: "Identificar o que foi feito e o que pode estar faltando",
      avoid: "Dizer que a revisão foi incompleta sem ter os dados",
      persona: ["cfo", "socio", "fiscal"],
    },
    // Module-specific
    {
      objection: "Meu contador já analisa o Sistema S.",
      response: "Perfeito — a questão específica é se o Tema 1079 do STJ (fixado em 2022) foi aplicado retroativamente nos 39 meses disponíveis via PER/DCOMP. Muitos escritórios ainda não fizeram essa revisão específica.",
      tone: "authoritative",
      follow_up: "O PER/DCOMP já foi protocolado?",
      avoid: "Criticar o contador",
      persona: ["cfo", "fiscal", "contador"],
      module_slug: "sistema_s",
    },
    {
      objection: "Isso já foi julgado? A taxa de cartão.",
      response: "Os Temas 779 e 780 ainda estão em discussão no STJ — é por isso que é uma tese possível, não definitiva. Trabalharíamos apenas após análise individual da operação de vocês, que define se o risco é aceitável.",
      tone: "authoritative",
      follow_up: "Qual é o volume de vendas em cartão por mês?",
      avoid: "Confirmar como tese segura quando há risco",
      persona: ["cfo", "fiscal"],
      module_slug: "pis_cofins_taxa_cartao",
    },
    {
      objection: "Já tomamos créditos de insumos.",
      response: "Ótimo. A revisão que propomos é complementar — focada nos insumos que, pela interpretação pré-2018, não eram aproveitados mas hoje têm base jurídica consolidada no REsp 1.221.170. O período retroativo ainda está disponível.",
      tone: "concessive",
      follow_up: "A revisão foi feita antes ou depois de 2018?",
      avoid: "Sugerir que os créditos atuais estão errados",
      persona: ["fiscal", "cfo"],
      module_slug: "revisao_insumos_pis_cofins",
    },
  ]

  // Add module-specific objections for recommended modules
  if (modules.some(m => m.slug === "icms_st_pis_cofins")) {
    objections.push({
      objection: "O ICMS-ST é parte da operação normal — não vejo como mudar isso.",
      response: "Concordo — a operação não muda em nada. O que muda é a base de cálculo do PIS/COFINS. O ICMS-ST já está embutido no preço que vocês pagam — a questão é se vocês calcularam PIS/COFINS sobre esse valor que não é receita de vocês.",
      tone: "curious",
      follow_up: "Como a empresa faz o cálculo atual do PIS/COFINS sobre compras com ST?",
      avoid: "Falar em 'mudança' — não muda operação",
      persona: ["cfo", "fiscal"],
      module_slug: "icms_st_pis_cofins",
    })
  }

  return objections
}

// --------- Contextual hooks ---------------------------------------------------------------------------------------------------------------------------

function buildContextualHooks(ctx: CompanyContext, snapshot: CompanySnapshot) {
  const hooks = []
  const flags = ctx.consultant.operation_flags ?? []
  const nome  = ctx.razao_social.split(" ")[0]
  const seg   = SEGMENT_LABELS[ctx.consultant.segment]

  if (flags.includes("venda_cartao")) {
    hooks.push({
      trigger: "Empresa com alto volume de vendas em cartão",
      hook: `"Percebi que vocês têm uma operação com volume relevante em cartão — e o comportamento fiscal ligado às taxas de adquirentes ainda é um ponto pouco revisado em empresas do perfil de ${nome}."`,
      segment: ["comercio" as const],
      persona: ["cfo" as const, "socio" as const],
    })
  }
  if (flags.includes("exportacao")) {
    hooks.push({
      trigger: "Empresa exportadora",
      hook: `"Empresas exportadoras com o perfil de ${nome} têm um crédito de IPI com alíquota fixada em lei — 5,37% — que muitas ainda não aproveitaram sistematicamente nos 60 meses disponíveis."`,
      segment: ["industria" as const],
      persona: ["cfo" as const, "fiscal" as const],
    })
  }
  if (ctx.anos_operacao >= 10) {
    hooks.push({
      trigger: `Empresa com mais de ${ctx.anos_operacao} anos de operação`,
      hook: `"Com ${ctx.anos_operacao} anos de operação, ${nome} provavelmente tem o maior período retroativo disponível para uma revisão estratégica — e esse é justamente o momento certo para fazer isso."`,
      segment: [ctx.consultant.segment],
      persona: ["cfo" as const, "socio" as const],
    })
  }
  if (flags.includes("folha_relevante")) {
    hooks.push({
      trigger: "Empresa com folha relevante",
      hook: `"Empresas com a estrutura de folha de ${nome} têm um recolhimento ao Sistema S que o STJ limitou em 2022 — e os 39 meses retroativos via PER/DCOMP ainda estão disponíveis para a maioria das empresas."`,
      segment: [ctx.consultant.segment],
      persona: ["cfo" as const, "rh" as const],
    })
  }

  return hooks
}

// --------- Main Copilot Orchestrator ------------------------------------------------------------------------------------------------

export function buildCopilotOutput(
  ctx:     CompanyContext,
  modules: ModuleResult[],
): CopilotOutput {
  const snapshot  = buildCompanySnapshot(ctx)
  const narrative = buildNarrativeFrame(ctx)
  const pain_map  = buildPainMap(ctx)
  const what_not  = buildWhatNotToSay()
  const objections = buildObjections(ctx, modules)
  const hooks     = buildContextualHooks(ctx, snapshot)

  // Build persona playbooks for top 3 personas
  const topPersonas: PersonaType[] = ["cfo", "socio", "fiscal"]
  const persona_playbooks: PersonaPlaybookFull[] = topPersonas.map(p => {
    const behavior = getPersonaBehavior(p)
    const entry    = generateConversationEntry(ctx, p, snapshot)
    const top_obj  = objections.filter(o => o.persona.includes(p)).slice(0, 4)

    return {
      persona:         behavior,
      entry,
      top_objections:  top_obj,
      power_questions: behavior.power_questions,
      cta: behavior.ideal_entry,
    }
  })

  const conversation_entries = topPersonas.map(p =>
    generateConversationEntry(ctx, p, snapshot)
  )

  const emails = topPersonas.map(p =>
    generateEmail(ctx, p, snapshot, modules.slice(0, 2).map(m => ({ name: m.name, first_pitch: m.first_pitch })))
  )

  const whatsapp_messages = topPersonas.map(p =>
    generateWhatsApp(ctx, p, "primeiro_contato")
  )

  const followups = generateFollowups(ctx, "cfo")

  return {
    snapshot,
    persona_behaviors: persona_playbooks,
    conversation_entries,
    objections,
    emails,
    whatsapp_messages,
    followups,
    contextual_hooks: hooks,
    pain_map,
    narrative,
    what_not_to_say: what_not,
  }
}
