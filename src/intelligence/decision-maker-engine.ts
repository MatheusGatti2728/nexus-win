// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Decision Maker Engine + Behavior Engine
//
// Identifies who decides, how they think, and how to approach them.
// Sources: QSA (Receita Federal), manual input, inferred by role.
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { Segment } from "../engine/tax-matrix"
import type { TaxMaturity } from "./company-profile-engine"

// --------- Decision maker ---------------------------------------------------------------------------------------------------------------------------------

export type DecisionPower   = "final" | "influencer" | "gatekeeper" | "champion"
export type TechLevel       = "baixo" | "medio" | "alto"
export type ResistanceLevel = "baixa" | "media" | "alta"
export type PreferredChannel = "telefone" | "whatsapp" | "email" | "linkedin"

export interface DecisionMaker {
  name:               string
  probable_role:      string
  decision_power:     DecisionPower
  technical_level:    TechLevel
  preferred_language: string    // "financeiro", "técnico", "estratégico", "operacional"
  expected_pain:      string
  resistance_level:   ResistanceLevel
  best_approach:      string    // opening strategy
  avoid_topics:       string[]
  suggested_modules:  string[]  // which tax modules resonate with this persona
  source:             string
  confidence:         "low" | "medium" | "high"
  linkedin_url?:      string
  notes?:             string
  is_primary_target:  boolean
}

// --------- Persona behavior profiles ------------------------------------------------------------------------------------------------

export interface PersonaBehavior {
  role_label:         string
  decision_power:     DecisionPower
  technical_level:    TechLevel
  preferred_language: string
  wants:              string[]
  fears:              string[]
  trust_builders:     string[]
  trust_breakers:     string[]
  expected_pain:      string
  resistance_level:   ResistanceLevel
  best_opening:       string
  best_cta:           string
  avoid_topics:       string[]
  suggested_modules:  string[]
  call_timing:        string
}

const PERSONA_PROFILES: Record<string, PersonaBehavior> = {
  cfo: {
    role_label:         "CFO / Diretor Financeiro",
    decision_power:     "final",
    technical_level:    "medio",
    preferred_language: "financeiro",
    wants:              ["Caixa e previsibilidade", "ROI mensurável", "Risco controlado", "Eficiência operacional"],
    fears:              ["Surpresa tributária", "Comprometimento sem análise", "Promessa não cumprida"],
    trust_builders:     ["Dados concretos antes de proposta", "Referência de empresas similares", "Análise prévia sem compromisso"],
    trust_breakers:     ["Juridiquês no primeiro contato", "Urgência artificial", "'Ganho garantido'"],
    expected_pain:      "Pressão de margem e custo tributário não gerenciado",
    resistance_level:   "media",
    best_opening:       "Contextualizar o segmento antes de mencionar oportunidade. Demonstrar que conhece a operação.",
    best_cta:           "20 minutos para diagnóstico preliminar sem compromisso",
    avoid_topics:       ["Honorários no primeiro contato", "Juridiquês", "Urgência de prazo"],
    suggested_modules:  ["sistema_s", "icms_st_pis_cofins", "ipi_credito_presumido_exportacao"],
    call_timing:        "Terça a quinta, 8h-9h ou 14h-15h",
  },
  socio: {
    role_label:         "Sócio / Proprietário",
    decision_power:     "final",
    technical_level:    "baixo",
    preferred_language: "estratégico",
    wants:              ["Resultado financeiro direto", "Vantagem competitiva", "Crescimento", "Decisão simples"],
    fears:              ["Complicação desnecessária", "Entrega de dados a estranhos", "Promessa que vira problema"],
    trust_builders:     ["Referência pessoal", "Clareza e velocidade", "Falar em resultado, não processo"],
    trust_breakers:     ["Excesso técnico", "Parecer vendedor, não consultor", "Não responder perguntas básicas do setor"],
    expected_pain:      "Não saber de oportunidades que concorrentes aproveitam",
    resistance_level:   "baixa",
    best_opening:       "Referência de empresa similar. Falar em dinheiro da empresa que pode estar sendo deixado para trás.",
    best_cta:           "Reunião de 20 minutos com o CFO para diagnóstico gratuito",
    avoid_topics:       ["Detalhes técnicos jurídicos", "Valorar antes de qualificação"],
    suggested_modules:  ["verbas_indenizatorias", "sistema_s", "icms_st_pis_cofins"],
    call_timing:        "Final da manhã, antes das reuniões internas",
  },
  fiscal: {
    role_label:         "Responsável Fiscal / Tributário",
    decision_power:     "influencer",
    technical_level:    "alto",
    preferred_language: "técnico",
    wants:              ["Base jurídica sólida", "Profundidade técnica", "Segurança e compliance", "Ser reconhecido como especialista"],
    fears:              ["Ser substituído ou questionado", "Tese sem fundamento", "Risco que cai no colo dele"],
    trust_builders:     ["Citar legislação corretamente", "Posicionar como complementar", "Perguntar antes de concluir"],
    trust_breakers:     ["'Seu contador não viu isso'", "Simplificar demais", "Linguagem comercial"],
    expected_pain:      "Sobrecarga de obrigações — revisões estratégicas ficam para depois",
    resistance_level:   "alta",
    best_opening:       "Técnica imediata — referencial jurídico na abertura. Tratar como especialista.",
    best_cta:           "Call técnica de 30 minutos para apresentar diagnóstico com referências jurídicas",
    avoid_topics:       ["Tom comercial agressivo", "Simplificar a norma", "Insinuar erro"],
    suggested_modules:  ["revisao_insumos_pis_cofins", "icms_grossup", "ipi_credito_presumido_exportacao"],
    call_timing:        "Tarde — menor pressão operacional",
  },
  contador: {
    role_label:         "Contador / Escritório Contábil",
    decision_power:     "gatekeeper",
    technical_level:    "alto",
    preferred_language: "técnico",
    wants:              ["Complementariedade", "Reputação protegida", "Profundidade técnica"],
    fears:              ["Perder o cliente", "Parecer que não viu algo óbvio", "Risco que cai no cliente"],
    trust_builders:     ["Parceria — nunca concorrência", "Garantir que o cliente não é abordado sem ele", "Oferecer análise conjunta"],
    trust_breakers:     ["Abordar o cliente sem avisar", "Insinuar que não viu algo", "Honorários diretos com o cliente"],
    expected_pain:      "Trabalho adicional sem estrutura adequada",
    resistance_level:   "alta",
    best_opening:       "Parceiro técnico especializado. Colaboração, não concorrência.",
    best_cta:           "Call técnica conjunta para análise complementar",
    avoid_topics:       ["'Seu cliente não sabe disso'", "Abordar o cliente antes"],
    suggested_modules:  ["sistema_s", "verbas_indenizatorias"],
    call_timing:        "Fora do período de fechamento — segunda ou tarde",
  },
  rh: {
    role_label:         "RH / Recursos Humanos",
    decision_power:     "influencer",
    technical_level:    "baixo",
    preferred_language: "operacional",
    wants:              ["Processo simples", "Compliance", "Sem impacto nos colaboradores"],
    fears:              ["Gerar expectativa nos funcionários", "Responsabilidade por algo errado", "Processo burocrático"],
    trust_builders:     ["Mostrar que é simples e não afeta o dia a dia", "Ter aprovação do CFO/sócio"],
    trust_breakers:     ["Termos tributários técnicos", "Parecer que gera trabalho extra"],
    expected_pain:      "Sobrecarga de processos — não quer mais trabalho",
    resistance_level:   "baixa",
    best_opening:       "Encargos sobre folha — impacto que beneficia a empresa sem afetar colaboradores.",
    best_cta:           "Resumo por e-mail para apresentação interna",
    avoid_topics:       ["Juridiquês", "Complexidade", "Mudança de processo"],
    suggested_modules:  ["sistema_s", "verbas_indenizatorias"],
    call_timing:        "Manhã — antes das demandas operacionais",
  },
}

// --------- Build decision makers from sources ------------------------------------------------------------------

export interface DecisionMakerInput {
  qsa?:         Array<{ nome: string; qualificacao?: string }>
  segment:      Segment
  tax_maturity: TaxMaturity
  manual_name?:  string
  manual_role?:  string
  manual_url?:   string
  extra_paste?:  string
}

function roleToPersonaKey(qualificacao: string): string {
  const q = qualificacao.toLowerCase()
  if (/cfo|financeiro|controller|tesoureiro/.test(q)) return "cfo"
  if (/sócio|proprietário|administrador/.test(q))     return "socio"
  if (/fiscal|tributário|contab/.test(q))             return "fiscal"
  if (/rh|recursos humanos|pessoal/.test(q))          return "rh"
  return "cfo" // default — CFO is most common target
}

export function buildDecisionMakers(input: DecisionMakerInput): DecisionMaker[] {
  const makers: DecisionMaker[] = []

  // From QSA (Receita Federal --- highest confidence)
  if (input.qsa?.length) {
    for (const q of input.qsa) {
      const personaKey = roleToPersonaKey(q.qualificacao ?? "")
      const behavior   = PERSONA_PROFILES[personaKey]
      makers.push({
        name:               q.nome,
        probable_role:      q.qualificacao || behavior.role_label,
        decision_power:     behavior.decision_power,
        technical_level:    behavior.technical_level,
        preferred_language: behavior.preferred_language,
        expected_pain:      behavior.expected_pain,
        resistance_level:   behavior.resistance_level,
        best_approach:      behavior.best_opening,
        avoid_topics:       behavior.avoid_topics,
        suggested_modules:  behavior.suggested_modules,
        source:             "Receita Federal (QSA)",
        confidence:         "high",
        is_primary_target:  true,
      })
    }
  }

  // From manual input
  if (input.manual_name && input.manual_role) {
    const personaKey = roleToPersonaKey(input.manual_role)
    const behavior   = PERSONA_PROFILES[personaKey]
    makers.push({
      name:               input.manual_name,
      probable_role:      input.manual_role,
      decision_power:     behavior.decision_power,
      technical_level:    behavior.technical_level,
      preferred_language: behavior.preferred_language,
      expected_pain:      behavior.expected_pain,
      resistance_level:   behavior.resistance_level,
      best_approach:      behavior.best_opening,
      avoid_topics:       behavior.avoid_topics,
      suggested_modules:  behavior.suggested_modules,
      source:             "Input manual",
      confidence:         "medium",
      linkedin_url:       input.manual_url,
      is_primary_target:  true,
    })
  }

  // From pasted text (multi-line LinkedIn paste)
  if (input.extra_paste) {
    const lines = input.extra_paste.split("\n").filter(l => l.trim().length > 3)
    for (const line of lines.slice(0, 5)) {
      const parts = line.split(/[-–|,]/).map(s => s.trim())
      if (parts.length >= 2 && parts[0].length > 2) {
        const personaKey = roleToPersonaKey(parts[1] ?? "")
        const behavior   = PERSONA_PROFILES[personaKey]
        const isTarget   = Object.keys(PERSONA_PROFILES).some(k => PERSONA_PROFILES[k].role_label.toLowerCase().includes(parts[1].toLowerCase().split(" ")[0]))
        makers.push({
          name:               parts[0],
          probable_role:      parts[1],
          decision_power:     behavior.decision_power,
          technical_level:    behavior.technical_level,
          preferred_language: behavior.preferred_language,
          expected_pain:      behavior.expected_pain,
          resistance_level:   behavior.resistance_level,
          best_approach:      behavior.best_opening,
          avoid_topics:       behavior.avoid_topics,
          suggested_modules:  behavior.suggested_modules,
          source:             "Input manual (paste)",
          confidence:         "medium",
          is_primary_target:  isTarget,
        })
      }
    }
  }

  // If no maker found --- infer primary target from segment
  if (makers.length === 0) {
    const defaultKey = input.segment === "servicos" ? "cfo" : input.segment === "industria" ? "fiscal" : "cfo"
    const behavior   = PERSONA_PROFILES[defaultKey]
    makers.push({
      name:               "Decisor a identificar",
      probable_role:      behavior.role_label,
      decision_power:     behavior.decision_power,
      technical_level:    behavior.technical_level,
      preferred_language: behavior.preferred_language,
      expected_pain:      behavior.expected_pain,
      resistance_level:   behavior.resistance_level,
      best_approach:      behavior.best_opening,
      avoid_topics:       behavior.avoid_topics,
      suggested_modules:  behavior.suggested_modules,
      source:             "Inferido por segmento",
      confidence:         "low",
      is_primary_target:  true,
    })
  }

  return makers
}

export function getPersonaBehavior(roleKey: string): PersonaBehavior {
  return PERSONA_PROFILES[roleKey] ?? PERSONA_PROFILES.cfo
}

export { PERSONA_PROFILES }
