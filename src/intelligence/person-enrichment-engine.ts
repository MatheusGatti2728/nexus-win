// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// AXIOM -- Person Enrichment Engine
//
// Strategic Commercial Intelligence -- not a pitch generator.
// Inspired by: Apollo, Clay, Clearbit, ZoomInfo, Cognism.
//
// This engine enriches a person's profile from public sources.
// It NEVER invents data. It NEVER generates pitch scripts.
// It produces: relational intelligence for the consultant.
//
// The question it answers:
// "Who is this person inside the company and how should we approach them?"
//
// Sources (all public, no auth required):
//   1. Google search (site:linkedin.com, site:empresa.com.br)
//   2. LinkedIn public profiles via Google indexing
//   3. Company website mentions
//   4. News and press releases
//   5. Event participation (conferences, webinars)
//   6. Escavador public records
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

export type SeniorityLevel =
  | "c_suite"      // CEO, CFO, CTO, President
  | "vp"           // VP, Head
  | "diretor"      // Director
  | "gerente"      // Manager
  | "coordenador"  // Coordinator
  | "analista"     // Analyst
  | "indefinido"

export type PersonProfile =
  | "tecnico"       // data-driven, analytical, likes numbers
  | "executivo"     // strategic, results-focused, time-sensitive
  | "conservador"   // risk-averse, process-oriented, slow to decide
  | "controlador"   // compliance-focused, detail-oriented
  | "inovador"      // open to change, growth-focused
  | "operacional"   // day-to-day focus, tactical
  | "politico"      // relationship-driven, image-conscious

export type DecisionPower =
  | "decisor_final"    // signs the contract
  | "influenciador"    // shapes the decision strongly
  | "gatekeeper"       // filters access to decision maker
  | "champion"         // internal advocate
  | "executor"         // implements, does not decide

export type RelationshipApproach =
  | "analitica"        // lead with data and evidence
  | "executiva"        // lead with strategic impact and numbers
  | "tecnica"          // lead with technical depth and compliance
  | "relacional"       // lead with context and partnership
  | "cautelosa"        // very low pressure, educational tone

export interface PersonChannel {
  type:        "linkedin" | "email" | "telefone" | "whatsapp" | "site" | "instagram" | "twitter"
  value:       string
  confidence:  "high" | "medium" | "low"
  source:      string
  verified:    boolean
}

export interface PersonSignal {
  type:        "mudanca_cargo" | "promocao" | "evento" | "publicacao" | "entrevista" | "conquista"
  title:       string
  evidence:    string
  source:      string
  date?:       string
  relevance:   string   // why this matters commercially
}

export interface EnrichedPerson {
  // Core identity
  name:              string
  role:              string
  seniority:         SeniorityLevel
  area:              string       // "financeiro" | "fiscal" | "gestao" | "operacoes"

  // Profile intelligence
  profiles:          PersonProfile[]
  decision_power:    DecisionPower
  technical_level:   "baixo" | "medio" | "alto"
  influence_score:   number       // 0-10

  // Background (when found)
  time_at_company?:  string       // "3+ anos", "recente (<1 ano)"
  prior_experience?: string       // "background em Big Four", "ex-varejo"
  education?:        string

  // Channels found
  channels:          PersonChannel[]
  linkedin_url?:     string       // direct URL if found
  email_probable?:   string       // inferred from domain pattern

  // Relational intelligence -- the key value
  best_approach:     RelationshipApproach
  approach_rationale: string      // WHY this approach, not just what
  opening_context:   string       // what context to use (not a script)
  avoid:             string[]     // what NOT to do with this person
  pain_points:       string[]     // their likely pain points
  trust_builders:    string[]     // what builds credibility with them

  // Confidence
  source:            string
  confidence:        "high" | "medium" | "low"
  is_primary_target: boolean
  enriched_at:       string

  // Signals (if any activity found)
  signals:           PersonSignal[]
}

// --------- Role classification --- relational intelligence ------------------------------------

export function classifyPerson(roleText: string, companyContext?: {
  cnae?: string
  regime?: string
  sector?: string
}): {
  seniority:          SeniorityLevel
  area:               string
  profiles:           PersonProfile[]
  decision_power:     DecisionPower
  technical_level:    "baixo" | "medio" | "alto"
  influence_score:    number
  best_approach:      RelationshipApproach
  approach_rationale: string
  pain_points:        string[]
  trust_builders:     string[]
  avoid:              string[]
} {
  const r = roleText.toLowerCase()

  // CFO / Diretor Financeiro
  if (/\bcfo\b|diretor\s+financeiro|vp\s+financeiro|chief\s+financial/.test(r)) return {
    seniority:          "c_suite",
    area:               "financeiro",
    profiles:           ["executivo", "controlador"],
    decision_power:     "decisor_final",
    technical_level:    "medio",
    influence_score:    9,
    best_approach:      "executiva",
    approach_rationale: "CFO pensa em impacto no P&L e previsibilidade. Nao tem paciencia para juridiques. Quer numero e prazo.",
    pain_points:        [
      "Pressao de margem e reducao de custo tributario",
      "Imprevisibilidade no planejamento fiscal",
      "Risco de contingencia tributaria nao mapeada",
    ],
    trust_builders:     [
      "Apresentar caso similar de empresa do mesmo setor com resultado quantificado",
      "Chegar com analise feita, nao com proposta",
      "Respeitar o tempo dele -- maximo 15 min na primeira conversa",
    ],
    avoid:              ["juridiques", "urgencia artificial", "promessa sem evidencia", "detalhes processuais"],
  }

  // Diretor Fiscal / Tax Director
  if (/diretor\s+fiscal|tax\s+director|head\s+fiscal|head\s+tributario/.test(r)) return {
    seniority:          "diretor",
    area:               "fiscal",
    profiles:           ["tecnico", "controlador", "conservador"],
    decision_power:     "influenciador",
    technical_level:    "alto",
    influence_score:    8,
    best_approach:      "tecnica",
    approach_rationale: "Diretor Fiscal e o guardiao tecnico. Precisa entender o fundamento juridico antes de abrir porta. Nao aceita superficialidade.",
    pain_points:        [
      "Estar atualizado com jurisprudencia tributaria em evolucao",
      "Defender posicoes tecnicas perante a Receita Federal",
      "Identificar oportunidades antes do prazo prescricional",
    ],
    trust_builders:     [
      "Citar a fundamentacao juridica correta antes de qualquer numero",
      "Mostrar conhecimento sobre o contexto especifico do setor",
      "Trazer algo que ele ainda nao sabia -- ser util antes de ser comercial",
    ],
    avoid:              ["simplificacao excessiva", "urgencia", "focar em valor antes de fundamento"],
  }

  // Controller / Controladoria
  if (/controller|controlling|controladoria/.test(r)) return {
    seniority:          "gerente",
    area:               "financeiro",
    profiles:           ["tecnico", "controlador"],
    decision_power:     "influenciador",
    technical_level:    "alto",
    influence_score:    7,
    best_approach:      "analitica",
    approach_rationale: "Controller quer dados, metodologia e impacto no DRE. Abordagem analitica com evidencia quantitativa.",
    pain_points:        [
      "Acuracia do DRE e impacto tributario no resultado",
      "Contingencias e provisoes fiscais nao mapeadas",
      "Eficiencia operacional do processo tributario",
    ],
    trust_builders:     [
      "Demonstrar como o calculo afeta o EBITDA",
      "Apresentar metodologia, nao so conclusao",
      "Referencia de auditor ou Big Four validando o tema",
    ],
    avoid:              ["generalizacoes", "promessa de recuperacao rapida", "foco em volume sem metodologia"],
  }

  // CEO / Presidente / S--cio
  if (/\bceo\b|presidente|socio[-\s]?administrador|proprietario|fundador/.test(r)) return {
    seniority:          "c_suite",
    area:               "gestao",
    profiles:           ["executivo", "inovador"],
    decision_power:     "decisor_final",
    technical_level:    "baixo",
    influence_score:    10,
    best_approach:      "executiva",
    approach_rationale: "Socio-proprietario pensa em competitividade e resultado. Quer saber o impacto no negocio, nao os detalhes tecnicos.",
    pain_points:        [
      "Competitividade de custos versus concorrentes",
      "Caixa e eficiencia operacional geral",
      "Risco juridico-tributario nao mapeado que possa virar problema",
    ],
    trust_builders:     [
      "Referencia de socio de empresa similar que passou pelo processo",
      "Numero claro de impacto estimado antes de qualquer proposta",
      "Demonstrar que entende o negocio, nao so o tributario",
    ],
    avoid:              ["excesso tecnico", "juridiques", "detalhes processuais em abertura", "multiplos temas ao mesmo tempo"],
  }

  // Respons--vel Financeiro / Gerente Financeiro
  if (/respons[aá]vel\s+financeiro|gerente\s+financeiro|coordenador\s+financeiro/.test(r)) return {
    seniority:          "gerente",
    area:               "financeiro",
    profiles:           ["operacional", "controlador"],
    decision_power:     "gatekeeper",
    technical_level:    "medio",
    influence_score:    6,
    best_approach:      "relacional",
    approach_rationale: "Gerente Financeiro e frequentemente gatekeeper -- precisa validar internamente antes de escalar. Abordagem relacional e educacional.",
    pain_points:        [
      "Volume de obrigacoes e complexidade do dia a dia fiscal",
      "Pressao para reducao de custo tributario",
      "Falta de tempo para analise estrategica -- foco no operacional",
    ],
    trust_builders:     [
      "Ser educativo sem ser condescendente",
      "Ajudar a construir o caso interno para apresentar ao superior",
      "Mostrar que o processo e simples e de baixo risco operacional",
    ],
    avoid:              ["pressao para decisao rapida", "linguagem muito tecnica ou muito executiva", "ir por cima sem permissao"],
  }

  // Respons--vel Fiscal
  if (/respons[aá]vel\s+fiscal|gerente\s+fiscal|coordenador\s+fiscal/.test(r)) return {
    seniority:          "gerente",
    area:               "fiscal",
    profiles:           ["tecnico", "conservador"],
    decision_power:     "influenciador",
    technical_level:    "alto",
    influence_score:    6,
    best_approach:      "tecnica",
    approach_rationale: "Responsavel Fiscal e conservador por natureza -- o trabalho dele e evitar problema, nao criar. Abordagem tecnica e cautelosa.",
    pain_points:        [
      "Complexidade crescente da legislacao tributaria",
      "Risco de autuacao e necessidade de posicao defensiva",
      "Oportunidades dentro do compliance vigente",
    ],
    trust_builders:     [
      "Fundamento juridico solido antes de qualquer numero",
      "Demonstrar que a tese esta dentro do compliance -- nao e planejamento agressivo",
      "Trazer jurisprudencia recente do STJ/STF",
    ],
    avoid:              ["planejamento agressivo", "urgencia", "comparacoes simplistas", "promessa de resultado sem analise caso a caso"],
  }

  // Socio generico (QSA)
  if (/s[oó]cio|socio/.test(r)) return {
    seniority:          "c_suite",
    area:               "gestao",
    profiles:           ["executivo"],
    decision_power:     "decisor_final",
    technical_level:    "baixo",
    influence_score:    8,
    best_approach:      "executiva",
    approach_rationale: "Socio pensa em resultado do negocio. Abordagem executiva com foco em impacto financeiro.",
    pain_points:        ["Resultado e competitividade", "Custo e eficiencia", "Risco nao mapeado"],
    trust_builders:     ["Referencia de par", "Numero claro de impacto", "Processo simples e sem risco"],
    avoid:              ["excesso tecnico", "juridiques", "multiplos temas"],
  }

  // Default
  return {
    seniority:          "indefinido",
    area:               "indefinido",
    profiles:           ["operacional"],
    decision_power:     "influenciador",
    technical_level:    "medio",
    influence_score:    5,
    best_approach:      "relacional",
    approach_rationale: "Cargo nao identificado com precisao -- abordagem relacional e educacional como padrao.",
    pain_points:        ["Complexidade tributaria do dia a dia", "Oportunidades nao mapeadas"],
    trust_builders:     ["Clareza e objetividade", "Prova de resultado em empresa similar"],
    avoid:              ["urgencia", "pressao comercial"],
  }
}

// --------- Infer email from company domain ---------------------------------------------------------------------------

export function inferEmail(name: string, website: string | undefined): string | undefined {
  // Only infer when we have a confirmed website domain
  if (!website || website.trim() === "") return undefined
  // Skip common hosting domains that aren't company-specific
  const SKIP_DOMAINS = ["gmail.com","hotmail.com","yahoo.com","outlook.com","uol.com.br","bol.com.br","terra.com.br","ig.com.br"]
  const domain = website.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*/, "").trim()
  if (SKIP_DOMAINS.some(d => domain.includes(d))) return undefined
  if (!domain || domain.length < 4) return undefined

  const parts = name.trim().split(/\s+/)
  if (parts.length < 2) return undefined

  const first = parts[0].toLowerCase().replace(/[^a-z]/g, "")
  const last  = parts[parts.length - 1].toLowerCase().replace(/[^a-z]/g, "")

  // Common patterns in Brazilian companies
  return `${first}.${last}@${domain}`
}

// --------- Main: build enriched person from available data ---------------------------

export function buildEnrichedPerson(
  name:        string,
  role:        string,
  source:      string,
  confidence:  "high" | "medium" | "low",
  company:     string,
  website?:    string,
  linkedInUrl?: string,
  extraChannels?: PersonChannel[],
  signals?:    PersonSignal[],
): EnrichedPerson {
  const classification = classifyPerson(role)
  const emailProbable  = inferEmail(name, website)

  const channels: PersonChannel[] = [
    ...(linkedInUrl ? [{
      type:       "linkedin" as const,
      value:      linkedInUrl,
      confidence: "medium" as const,
      source:     "Google / LinkedIn",
      verified:   false,
    }] : []),
    ...(emailProbable ? [{
      type:       "email" as const,
      value:      emailProbable,
      confidence: "low" as const,
      source:     "Inferido por padrao de dominio",
      verified:   false,
    }] : []),
    ...(extraChannels ?? []),
  ]

  return {
    name,
    role,
    seniority:          classification.seniority,
    area:               classification.area,
    profiles:           classification.profiles,
    decision_power:     classification.decision_power,
    technical_level:    classification.technical_level,
    influence_score:    classification.influence_score,
    channels,
    linkedin_url:       linkedInUrl,
    email_probable:     emailProbable,
    best_approach:      classification.best_approach,
    approach_rationale: classification.approach_rationale,
    opening_context:    "",  // empty -- NO auto-generated pitch
    avoid:              classification.avoid,
    pain_points:        classification.pain_points,
    trust_builders:     classification.trust_builders,
    source,
    confidence,
    is_primary_target:  ["c_suite", "vp", "diretor"].includes(classification.seniority),
    enriched_at:        new Date().toISOString(),
    signals:            signals ?? [],
  }
}
