// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Decision Maker Intelligence Engine v2
//
// Enriches QSA + manual input into full decision maker profiles.
// Extracts person signals from news, site, and LinkedIn paste.
// RULE: Never invent. Never sound invasive. Institutional intelligence.
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { Segment } from "../engine/tax-matrix"
import type { LegalMaturityLevel } from "./legal-intelligence-engine"

// --------- Types ------------------------------------------------------------------------------------------------------------------------------------------------------------

export type PersonProfile = "tecnico" | "executivo" | "politico" | "operacional" | "controlador" | "conservador" | "inovador"
export type SeniorityLevel = "c_suite" | "diretor" | "gerente" | "coordenador" | "analista" | "indefinido"

export interface EnrichedDecisionMaker {
  // Identity
  name:              string
  role:              string
  seniority:         SeniorityLevel
  // Profile
  person_profile:    PersonProfile[]
  technical_level:   "baixo" | "medio" | "alto"
  decision_power:    "final" | "influencer" | "gatekeeper" | "champion"
  // Contact
  linkedin_url?:     string
  phone?:            string
  email?:            string
  // Source
  source:            string
  confidence:        "low" | "medium" | "high"
  is_primary_target: boolean
  // Copilot
  best_approach:     string
  opening_line:      string
  avoid:             string[]
  pain_point:        string
  trust_signal:      string
  // Signals
  person_signals:    PersonSignal[]
  notes?:            string
}

export interface PersonSignal {
  type:       "novo_cargo" | "expansao_time" | "contratacao" | "evento" | "publicacao" | "mudanca"
  title:      string
  source:     string
  confidence: "low" | "medium"
  date?:      string
}

// --------- Role classification ------------------------------------------------------------------------------------------------------------------

function classifyRole(roleText: string): {
  seniority:       SeniorityLevel
  technical_level: "baixo"|"medio"|"alto"
  decision_power:  "final"|"influencer"|"gatekeeper"|"champion"
  profiles:        PersonProfile[]
  pain_point:      string
  trust_signal:    string
  avoid:           string[]
} {
  const r = roleText.toLowerCase()

  if (/cfo|diretor financeiro|vp finance|chief financial/.test(r)) return {
    seniority:"c_suite", technical_level:"medio", decision_power:"final",
    profiles:["executivo","controlador"],
    pain_point:"Pressão de margem, custo tributário, previsibilidade de caixa",
    trust_signal:"Dados concretos sobre empresas similares antes de proposta",
    avoid:["juridiquês","urgência artificial","promessa de retorno sem análise"],
  }
  if (/ceo|presidente|sócio|proprietário|administrador/.test(r)) return {
    seniority:"c_suite", technical_level:"baixo", decision_power:"final",
    profiles:["executivo","inovador"],
    pain_point:"Competitividade, caixa, resultado estratégico",
    trust_signal:"Referência de empresa similar e clareza de impacto",
    avoid:["excesso técnico","juridiquês","detalhes operacionais"],
  }
  if (/controller|controlling|controladoria/.test(r)) return {
    seniority:"diretor", technical_level:"alto", decision_power:"influencer",
    profiles:["controlador","tecnico"],
    pain_point:"Qualidade dos dados, compliance, gestão de risco tributário",
    trust_signal:"Profundidade técnica e metodologia clara",
    avoid:["promessa sem análise","simplificar processo"],
  }
  if (/fiscal|tributário|tax|tribut/.test(r)) return {
    seniority:"gerente", technical_level:"alto", decision_power:"influencer",
    profiles:["tecnico","conservador"],
    pain_point:"Risco de autuação, tese sem fundamento, escopo fora do corrente",
    trust_signal:"Citar jurisprudência correta na abertura",
    avoid:["'fácil'","'simples'","'garantido'","insinuar que não viu"],
  }
  if (/financeiro|finance|gerente fin/.test(r)) return {
    seniority:"gerente", technical_level:"medio", decision_power:"influencer",
    profiles:["operacional","controlador"],
    pain_point:"Fluxo de caixa, previsibilidade, relatórios para diretoria",
    trust_signal:"Impacto financeiro quantificável e claro",
    avoid:["excesso de detalhes jurídicos","jargão tributário"],
  }
  if (/contador|contabilidade|contábil/.test(r)) return {
    seniority:"gerente", technical_level:"alto", decision_power:"gatekeeper",
    profiles:["tecnico","conservador"],
    pain_point:"Ser substituído, gerar problema para o cliente, compliance",
    trust_signal:"Parceria explícita desde o início — complementariedade",
    avoid:["'seu cliente não sabe'","contato com cliente sem aviso"],
  }
  if (/rh|recursos humanos|people/.test(r)) return {
    seniority:"gerente", technical_level:"baixo", decision_power:"influencer",
    profiles:["operacional"],
    pain_point:"Simplicidade e ausência de impacto nos colaboradores",
    trust_signal:"Aprovação interna do CFO/sócio antes de envolver RH",
    avoid:["encargos","folha","previdenciário no primeiro contato"],
  }
  if (/jurídico|advogado|legal|counsel/.test(r)) return {
    seniority:"gerente", technical_level:"alto", decision_power:"gatekeeper",
    profiles:["tecnico","politico"],
    pain_point:"Risco legal, aprovação de tese, qualidade do fundamento",
    trust_signal:"Referência STJ/TRF específica e raciocínio técnico sólido",
    avoid:["'simples'","'sem risco'","pressão comercial"],
  }
  return {
    seniority:"indefinido", technical_level:"medio", decision_power:"influencer",
    profiles:["operacional"],
    pain_point:"Entender do que se trata antes de qualquer compromisso",
    trust_signal:"Especificidade imediata sobre a empresa",
    avoid:["genérico","'oportunidade tributária' como abertura"],
  }
}

function buildOpeningLine(maker: { name:string; role:string; seniority:SeniorityLevel }, company_name: string, legal_maturity: LegalMaturityLevel): string {
  const nome    = company_name.split(" ")[0]
  const r       = maker.role.toLowerCase()
  const firstName = maker.name !== "Decisor a identificar" ? maker.name.split(" ")[0] : "[Nome]"

  if (legal_maturity === "high" || legal_maturity === "elite") {
    if (/fiscal|tributário|tax/.test(r)) {
      return `Bom dia, ${firstName}. Tenho acompanhado algumas movimentações tributárias em empresas do setor e identifiquei algo específico no perfil de ${nome} que vai além do que normalmente está no radar da equipe fiscal — queria contextualizar diretamente com você por ser o ponto técnico certo.`
    }
    return `Bom dia, ${firstName}. Venho acompanhando empresas com histórico jurídico-tributário semelhante ao de ${nome} e identifiquei algo específico — não seria uma revisão padrão, mas uma frente complementar ao que já existe.`
  }

  if (/cfo|diretor financeiro/.test(r)) {
    return `Bom dia, ${firstName}. Tenho acompanhado movimentações tributárias em empresas do segmento de ${nome} que estão gerando impacto direto no resultado — e identifiquei algo específico no perfil de vocês que vale 15 minutos.`
  }
  if (/sócio|presidente|ceo/.test(r)) {
    return `Bom dia, ${firstName}. Venho acompanhando o setor de vocês e identifiquei algo específico no perfil de ${nome} que empresas similares já começaram a mapear. Vale uma conversa rápida?`
  }
  if (/contador/.test(r)) {
    return `Bom dia, ${firstName}. Tenho um tema técnico complementar ao que vocês já fazem em ${nome} — queria alinhar com você antes de qualquer passo.`
  }
  return `Bom dia, ${firstName}. Tenho acompanhado empresas do segmento de ${nome} e identifiquei algo específico no perfil de vocês que vale 15 minutos.`
}

// --------- Main builder ---------------------------------------------------------------------------------------------------------------------------------------

export interface BuildDMInput {
  qsa?:            Array<{ nome: string; qualificacao?: string }>
  segment:         Segment
  legal_maturity:  LegalMaturityLevel
  company_name:    string
  manual_name?:    string
  manual_role?:    string
  manual_linkedin?: string
  manual_notes?:   string
  extra_paste?:    string
  news_signals?:   PersonSignal[]
}

export function buildEnrichedDecisionMakers(input: BuildDMInput): EnrichedDecisionMaker[] {
  const makers: EnrichedDecisionMaker[] = []

  // From QSA (Receita Federal --- highest confidence)
  if (input.qsa?.length) {
    for (const q of input.qsa.filter(q => q.nome)) {
      const profile = classifyRole(q.qualificacao ?? "sócio administrador")
      const maker: EnrichedDecisionMaker = {
        name:              q.nome,
        role:              q.qualificacao || "Sócio / Administrador",
        seniority:         profile.seniority,
        person_profile:    profile.profiles,
        technical_level:   profile.technical_level,
        decision_power:    profile.decision_power,
        source:            "Receita Federal (QSA)",
        confidence:        "high",
        is_primary_target: true,
        best_approach:     profile.trust_signal,
        opening_line:      buildOpeningLine({ name:q.nome, role:q.qualificacao??"sócio", seniority:profile.seniority }, input.company_name, input.legal_maturity),
        avoid:             profile.avoid,
        pain_point:        profile.pain_point,
        trust_signal:      profile.trust_signal,
        person_signals:    input.news_signals ?? [],
      }
      makers.push(maker)
    }
  }

  // From manual input
  if (input.manual_name && input.manual_name.length > 2) {
    const role    = input.manual_role ?? "Cargo não informado"
    const profile = classifyRole(role)
    makers.push({
      name:              input.manual_name,
      role,
      seniority:         profile.seniority,
      person_profile:    profile.profiles,
      technical_level:   profile.technical_level,
      decision_power:    profile.decision_power,
      linkedin_url:      input.manual_linkedin,
      source:            "Input manual",
      confidence:        "medium",
      is_primary_target: true,
      best_approach:     profile.trust_signal,
      opening_line:      buildOpeningLine({ name:input.manual_name, role, seniority:profile.seniority }, input.company_name, input.legal_maturity),
      avoid:             profile.avoid,
      pain_point:        profile.pain_point,
      trust_signal:      profile.trust_signal,
      person_signals:    [],
      notes:             input.manual_notes,
    })
  }

  // From multi-line paste (LinkedIn format: "Nome --- Cargo")
  if (input.extra_paste) {
    const lines = input.extra_paste.split("\n").filter(l => l.trim().length > 3)
    for (const line of lines.slice(0, 8)) {
      const parts = line.split(/[-–|,·]/).map(s => s.trim())
      if (parts.length >= 2 && parts[0].length > 2) {
        const role    = parts.slice(1).join(" ").trim()
        const profile = classifyRole(role)
        const isDup   = makers.some(m => m.name.toLowerCase() === parts[0].toLowerCase())
        if (!isDup) {
          makers.push({
            name:              parts[0],
            role,
            seniority:         profile.seniority,
            person_profile:    profile.profiles,
            technical_level:   profile.technical_level,
            decision_power:    profile.decision_power,
            source:            "LinkedIn (paste manual)",
            confidence:        "medium",
            is_primary_target: ["c_suite","diretor"].includes(profile.seniority),
            best_approach:     profile.trust_signal,
            opening_line:      buildOpeningLine({ name:parts[0], role, seniority:profile.seniority }, input.company_name, input.legal_maturity),
            avoid:             profile.avoid,
            pain_point:        profile.pain_point,
            trust_signal:      profile.trust_signal,
            person_signals:    [],
          })
        }
      }
    }
  }

  // Fallback: infer from segment
  if (makers.length === 0) {
    const defaultRole = input.segment === "servicos" ? "CFO / Diretor Financeiro"
      : input.segment === "industria" ? "Responsável Fiscal / Tributário"
      : "CFO / Financeiro"
    const profile = classifyRole(defaultRole)
    makers.push({
      name:              "Decisor a identificar",
      role:              defaultRole,
      seniority:         "gerente",
      person_profile:    profile.profiles,
      technical_level:   profile.technical_level,
      decision_power:    "influencer",
      source:            "Inferido por segmento",
      confidence:        "low",
      is_primary_target: true,
      best_approach:     profile.trust_signal,
      opening_line:      buildOpeningLine({ name:"[Nome]", role:defaultRole, seniority:"gerente" }, input.company_name, input.legal_maturity),
      avoid:             profile.avoid,
      pain_point:        profile.pain_point,
      trust_signal:      profile.trust_signal,
      person_signals:    [],
    })
  }

  // Sort: primary targets first, then by confidence
  return makers.sort((a, b) => {
    if (a.is_primary_target && !b.is_primary_target) return -1
    if (!a.is_primary_target && b.is_primary_target) return 1
    const cRank = { high:3, medium:2, low:1 }
    return cRank[b.confidence] - cRank[a.confidence]
  })
}

// --------- Primary target selector ------------------------------------------------------------------------------------------------------

export function selectPrimaryTarget(makers: EnrichedDecisionMaker[]): EnrichedDecisionMaker {
  // Prefer c_suite with decision power "final"
  const cSuite = makers.filter(m => m.seniority === "c_suite" && m.decision_power === "final")
  if (cSuite.length > 0) return cSuite[0]
  // Then director-level
  const directors = makers.filter(m => m.seniority === "diretor")
  if (directors.length > 0) return directors[0]
  return makers[0]
}
