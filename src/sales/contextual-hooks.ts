// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Contextual Hooks + Legal Context Engine + Objection Intelligence
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { CompanyProfile }       from "../intelligence/company-profile-engine"
import type { PersonaLanguageProfile } from "./persona-language-engine"

// --------- Contextual Hooks ---------------------------------------------------------------------------------------------------------------------------
// Industry-specific, operation-specific, news-specific hooks.
// Never generic. Never "I have a tax opportunity."

export interface ContextualHook {
  hook:        string     // the actual hook statement
  type:        "operacao" | "expansao" | "exportacao" | "ecommerce" | "juridico" | "setor" | "timing" | "maturidade"
  evidence:    string     // what data point generated this hook
  confidence:  "low" | "medium" | "high"
  transition:  string     // how to move from hook to next step
}

const SECTOR_NARRATIVES: Record<string, string> = {
  supermercado:  "Tenho acompanhado algumas movimentações do setor supermercadista — principalmente pressão de margem e revisão da estrutura fiscal ligada à cadeia monofásica e ST. Algumas empresas do perfil começaram a revisitar isso recentemente.",
  industria:     "Identifiquei que vocês possuem uma operação industrial relativamente estruturada. Empresas nesse perfil normalmente acumulam pontos tributários extremamente específicos que nem sempre entram no radar operacional do dia a dia.",
  comercio:      "Tenho acompanhado o comportamento fiscal de empresas do varejo — especialmente a interface entre ICMS-ST nas compras e a base de PIS/COFINS. Há uma decisão recente do STJ que mudou bastante esse cenário.",
  servicos:      "Empresas de serviços com folha relevante têm revisitado a interface entre encargos previdenciários e a jurisprudência mais recente do STJ — não é algo que entra no escopo do trabalho contábil cotidiano.",
  exportacao:    "Identifiquei que vocês possuem uma operação com mercado externo. Há um crédito de IPI com alíquota fixada em lei que muito poucos exportadores aproveitam sistematicamente — e que tem período retroativo aberto.",
  ecommerce:     "Identifiquei uma operação de e-commerce. As movimentações interestaduais criam implicações tributárias específicas — DIFAL e base de PIS/COFINS — que raramente são revisadas nesse modelo de operação.",
  logistica:     "Empresas com operação logística relevante têm características tributárias muito específicas na interface entre ICMS nas transferências e base de contribuições. É uma área que normalmente fica fora do escopo da contabilidade cotidiana.",
}

export function buildContextualHooks(
  profile:     CompanyProfile,
  newsSignals: Array<{ title: string; tags: string[]; commercial_hook: string }>,
): ContextualHook[] {
  const hooks: ContextualHook[] = []
  const nome = profile.razao_social.split(" ")[0]

  // 1. Operation-based hook (strongest --- uses real CNAE data)
  const cnae = profile.cnae_descricao.toLowerCase()
  if (profile.has_industry) {
    hooks.push({ hook: SECTOR_NARRATIVES.industria.replace("vocês", nome), type: "operacao", evidence: `CNAE: ${profile.cnae_descricao}`, confidence: "high", transition: `Antes de qualquer análise, queria entender melhor como vocês organizam ${nome} operacionalmente.` })
  }
  if (profile.has_export) {
    hooks.push({ hook: SECTOR_NARRATIVES.exportacao, type: "exportacao", evidence: "Sinal de exportação identificado", confidence: "medium", transition: "Vocês exportam diretamente ou via trading? Isso define o tipo de análise." })
  }
  if (profile.has_ecommerce) {
    hooks.push({ hook: SECTOR_NARRATIVES.ecommerce, type: "ecommerce", evidence: "Canal digital identificado", confidence: "medium", transition: "Qual o volume de vendas interestaduais hoje?" })
  }
  if (cnae.includes("supermercado") || cnae.includes("alimento")) {
    hooks.push({ hook: SECTOR_NARRATIVES.supermercado, type: "setor", evidence: `CNAE: ${profile.cnae_descricao}`, confidence: "high", transition: "Vocês adquirem com ICMS-ST de forma relevante?" })
  }
  if (profile.has_logistics) {
    hooks.push({ hook: SECTOR_NARRATIVES.logistica, type: "operacao", evidence: "Logística identificada", confidence: "medium", transition: "Como está estruturada a operação de distribuição de vocês?" })
  }

  // 2. Expansion hook (news-based)
  const expansionNews = newsSignals.find(n => n.tags.includes("expansão"))
  if (expansionNews) {
    hooks.push({
      hook: `Vi que ${nome} vem expandindo a operação nos últimos tempos. Normalmente nesse momento a complexidade tributária cresce muito mais rápido do que os controles internos conseguem acompanhar.`,
      type: "expansao",
      evidence: `Notícia: "${expansionNews.title.slice(0,60)}"`,
      confidence: "medium",
      transition: "Como está a estrutura fiscal de vocês para suportar esse crescimento?",
    })
  }

  // 3. Age-based timing hook
  if (profile.anos_operacao >= 15) {
    hooks.push({
      hook: `${nome} tem ${profile.anos_operacao} anos de operação — e isso cria um período retroativo tributário expressivo que, na maioria das empresas, nunca foi revisado estrategicamente. Não porque não existia — mas porque está fora do radar do trabalho contábil cotidiano.`,
      type: "timing",
      evidence: `${profile.anos_operacao} anos (Receita Federal)`,
      confidence: "high",
      transition: "Em algum momento já fizeram uma revisão tributária retroativa específica?",
    })
  }

  // 4. Sector timing (jurisprud--ncia)
  hooks.push({
    hook: `Há decisões recentes do STJ que mudaram a interpretação de alguns comportamentos fiscais específicos do perfil de ${nome}. O timing importa porque o período retroativo disponível vai prescrevendo mensalmente.`,
    type: "timing",
    evidence: "Jurisprudência STJ 2023-2024",
    confidence: "medium",
    transition: "Vocês acompanham jurisprudência tributária ou deixam isso para apoio externo?",
  })

  return hooks.slice(0, 4)
}

// --------- Legal Context Engine ---------------------------------------------------------------------------------------------------------------

export interface LegalContextHook {
  acknowledge:  string    // acknowledge the existing legal maturity
  redirect:     string    // pivot to something new/complementary
  probe:        string    // question to understand what's been done
}

export function buildLegalContextHook(
  hasLitigation:   boolean,
  recurringThemes: string[],
  companyName:     string,
): LegalContextHook {
  const nome = companyName.split(" ")[0]

  if (!hasLitigation) {
    return {
      acknowledge: `${nome} aparenta não ter histórico litigioso tributário relevante — o que na verdade abre espaço para uma abordagem mais ampla.`,
      redirect:    "O foco seria em revisões não judicializadas — o que costuma ser mais rápido e com menor custo.",
      probe:       "Há algum tema tributário que vocês já avaliaram e decidiram não mover?",
    }
  }

  const themes = recurringThemes.slice(0, 2).join(" e ")
  return {
    acknowledge: `Percebi que ${nome} já possui uma maturidade tributária relativamente estruturada${themes ? `, inclusive com discussões envolvendo ${themes}` : ""}.`,
    redirect:    "O ponto que me chamou atenção foi especificamente uma frente complementar — que normalmente não está coberta mesmo quando há estrutura jurídica ativa.",
    probe:       "O que está sendo movido hoje cobre revisão retroativa do período completo disponível?",
  }
}

// --------- Objection Intelligence ---------------------------------------------------------------------------------------------------------

export interface ObjectionResponse {
  objection:          string
  psychological_read: string   // what's really going on
  real_reason:        string   // the actual concern behind the words
  short_response:     string   // 1-2 sentences max
  long_response:      string   // full response with context
  return_question:    string   // question to re-engage
  alternative_route:  string   // if they still push back
  persona_variants:   Record<string, string>   // persona-specific versions
}

export const OBJECTION_INTELLIGENCE: ObjectionResponse[] = [
  {
    objection:          "Já temos contador / advogado tributário.",
    psychological_read: "Proteção do status quo. Não quer criar conflito com parceiros atuais.",
    real_reason:        "Medo de fazer o contador parecer incompetente ou de perder parceiros confiáveis.",
    short_response:     "Perfeito. Normalmente atuamos em conjunto com estruturas já consolidadas — é complementar, não substitutivo.",
    long_response:      "Perfeito. Inclusive o modelo que trabalhamos é sempre junto com a estrutura existente — nunca separado. O tipo de análise que fazemos é extremamente específico e trata de teses de jurisprudência recente que geralmente ficam fora do escopo do trabalho contábil e jurídico cotidiano. Hoje, o foco do trabalho de vocês é mais voltado para obrigações correntes ou já há análise retroativa sistemática?",
    return_question:    "Hoje o escritório de vocês atua também com revisão tributária retroativa ou o foco é mais compliance e obrigações correntes?",
    alternative_route:  "Posso preparar um resumo técnico de 1 página para você avaliar junto com o escritório — sem compromisso. Se eles já cobriram, ótimo. Se não, abre uma conversa interna.",
    persona_variants: {
      cfo:      "Perfeito. Trabalhamos complementarmente à estrutura existente. Hoje a análise retroativa de PIS/COFINS e encargos está dentro do escopo do escritório de vocês?",
      fiscal:   "Ótimo. Atuamos de forma complementar — o foco aqui é jurisprudência STJ recente que normalmente não está no escopo da rotina fiscal. Posso enviar as referências técnicas?",
      contador: "Perfeito. O modelo é parceria — nunca concorrência. O ponto que quero apresentar é complementar ao trabalho de vocês, não substitutivo.",
    },
  },
  {
    objection:          "Manda por e-mail.",
    psychological_read: "Fuga educada. Não quer se comprometer agora mas não quer ser rude.",
    real_reason:        "Não entendeu o valor ainda. Precisa de mais contexto para priorizar.",
    short_response:     "Claro. Antes de escrever — me deixa entender uma coisa: já fizeram revisão tributária retroativa nos últimos 3 anos? Depende disso o que faz mais sentido enviar.",
    long_response:      "Claro, sem problema. Antes de escrever queria entender uma coisa — o conteúdo do e-mail muda bastante dependendo do que já foi analisado. Vocês já fizeram alguma revisão tributária retroativa nos últimos 3 anos? Quero enviar algo que seja realmente relevante, não um conteúdo genérico.",
    return_question:    "Qual o melhor e-mail e para quem eu direciono — você mesmo ou tem alguém da área fiscal que avalia isso primeiro?",
    alternative_route:  "Posso enviar um resumo de 1 página com o que identifiquei especificamente sobre o perfil de vocês. Leva 3 minutos para ler e dá para avaliar se vale 20 minutos de conversa.",
    persona_variants: {
      cfo:    "Claro. Para personalizar o que envio — vocês já fizeram alguma análise retroativa de encargos e créditos nos últimos 3 anos?",
      socio:  "Claro. Para enviar algo relevante e não genérico — me conta: o contador de vocês faz revisão tributária retroativa ou o foco é mais dia a dia?",
      fiscal: "Claro. Posso enviar junto as referências jurídicas específicas. Para direcionar melhor — o tema é PIS/COFINS ou encargos previdenciários que faz mais sentido para vocês agora?",
    },
  },
  {
    objection:          "Não tenho tempo agora.",
    psychological_read: "Genuinamente ocupado ou quer uma saída rápida.",
    real_reason:        "Não viu valor suficiente para priorizar — ou realmente tem outra coisa urgente.",
    short_response:     "Entendo. Posso enviar um resumo de 1 página — você lê quando tiver 3 minutos e decide se vale 20 minutos de conversa.",
    long_response:      "Entendo completamente. Não vou tomar mais tempo agora. Posso enviar um resumo em PDF com o que identifiquei especificamente sobre o perfil de vocês — são 3 minutos de leitura. Se fizer sentido, a gente marca 20 minutos quando você tiver disponibilidade. Qual o melhor e-mail?",
    return_question:    "Qual o melhor horário da sua semana para uma conversa de 20 minutos?",
    alternative_route:  "Sem problema. Deixo o contato em aberto. Quando tiver uma janela, pode me chamar no WhatsApp que a gente agenda.",
    persona_variants: {
      cfo: "Sem problema. Envio um resumo de 1 página com os números preliminares — você avalia quando tiver espaço.",
    },
  },
  {
    objection:          "Já analisamos isso e não se aplica.",
    psychological_read: "Defensividade — pode ter analisado de forma incompleta ou estar protegendo decisão anterior.",
    real_reason:        "Ou realmente analisaram, ou estão protegendo status quo sem saber o escopo real.",
    short_response:     "Entendo. Qual foi o escopo da análise? Pergunto porque o que identificamos é específico — e às vezes a análise anterior não cobriu o período completo ou o tema exato.",
    long_response:      "Entendo. A análise anterior foi feita por um especialista externo ou internamente? Pergunto porque há casos onde a análise cobre uma tese mas não outra dentro do mesmo tema — e o que identificamos é bastante específico quanto ao período e ao comportamento fiscal analisado. Se já foi feito, ótimo — só quero confirmar que o escopo cobre o que estou vendo aqui.",
    return_question:    "O escopo da análise anterior incluiu revisão retroativa dos últimos 5 anos ou foi prospectivo?",
    alternative_route:  "Se puder me confirmar qual foi o tema e o período coberto, consigo dizer se o que vejo aqui já está dentro ou é algo diferente.",
    persona_variants: {
      fiscal: "Qual foi o tema específico que foi analisado? Pergunto porque o que identifiquei é bastante pontual — pode ser complementar ao que já foi feito.",
    },
  },
  {
    objection:          "Não é prioridade agora.",
    psychological_read: "Genuíno ou falta de urgência percebida.",
    real_reason:        "Não entendeu o custo de não agir — ou há pressões internas mais urgentes.",
    short_response:     "Entendo. Só destaco que o período retroativo disponível vai prescrevendo mensalmente — não é urgência artificial, é simplesmente como funciona tributariamente.",
    long_response:      "Entendo. O que quero deixar claro — sem pressão — é que o período retroativo disponível para análise vai prescrevendo continuamente. Não é uma urgência que crio artificialmente — é simplesmente como funciona o sistema tributário. Hoje vocês têm X anos disponíveis para revisão. Em 12 meses, terão X-1. A decisão de agora ou depois tem impacto real no potencial.",
    return_question:    "Quando faria mais sentido revisar isso — existe algum gatilho interno que tornaria isso prioridade?",
    alternative_route:  "Sem problema. Deixo o contato aberto. Em quanto tempo seria natural revisitar esse tema para vocês?",
    persona_variants: {
      cfo:   "Entendo. Só pontuo que cada mês que passa fecha um mês de período retroativo. Não é pressão — é matemática tributária.",
      socio: "Entendo. É que enquanto isso não vira prioridade, o período retroativo disponível vai diminuindo. Posso enviar um resumo do impacto estimado para você ter a referência?",
    },
  },
  {
    objection:          "Me passa mais informações antes.",
    psychological_read: "Interesse real mas não quer se comprometer sem ver mais.",
    real_reason:        "Precisa de mais contexto para justificar o tempo de reunião internamente.",
    short_response:     "Claro. Prefiro enviar algo personalizado — para isso, preciso entender uma coisa sobre a operação de vocês.",
    long_response:      "Claro. Só peço 1 minuto para entender melhor a operação — o que envio muda bastante dependendo do perfil específico. Vocês operam com venda direta ou têm distribuição? Isso me ajuda a personalizar o que envio para ser realmente relevante.",
    return_question:    "Qual o aspecto que você mais quer entender antes de decidir se vale uma conversa?",
    alternative_route:  "Posso enviar o resumo técnico de 1 página com o que identifiquei. Se quiser mais profundidade depois, a gente marca 30 minutos técnicos.",
    persona_variants: {},
  },
]

export function findObjectionResponse(
  objectionText: string,
  personaKey?:   string,
): ObjectionResponse | null {
  const lc = objectionText.toLowerCase()
  const match = OBJECTION_INTELLIGENCE.find(obj =>
    lc.includes(obj.objection.split(" ").slice(0, 3).join(" ").toLowerCase()) ||
    ((lc.includes("email") || lc.includes("e-mail")) && obj.objection.includes("e-mail")) ||
    (lc.includes("tempo") && obj.objection.includes("tempo")) ||
    (lc.includes("contador") && obj.objection.includes("contador")) ||
    (lc.includes("prioridade") && obj.objection.includes("prioridade"))
  )

  if (!match) return null
  if (personaKey && match.persona_variants[personaKey]) {
    return { ...match, short_response: match.persona_variants[personaKey] }
  }
  return match
}
