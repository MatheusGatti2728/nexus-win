// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Timing Intelligence Engine
//
// Detects events that signal the RIGHT MOMENT to approach a company.
// A consultant who calls at the right time demonstrates they monitor
// the market --- not that they're just trying to sell.
//
// Signal sources: Google News, QSA changes, CNPJ public data
//
// Temperature scale:
//   QUENTE    --- act now, event happened in last 30 days
//   MORNA     --- relevant event, last 90 days
//   FRIA      --- monitor, no recent event
//   MONITORAR --- company exists but no timing signal found
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

export type TimingTemperature = "quente" | "morna" | "fria" | "monitorar"

export type TimingEventType =
  | "expansao"           // new branch, new state, new market
  | "mudanca_societaria" // new partner, exit, M&A
  | "contratacao"        // hiring spree = growth = more folha
  | "obra_investimento"  // construction, capex
  | "autuacao_fiscal"    // tax notice = they need help NOW
  | "mudanca_regime"     // lucro real change = new complexity
  | "exportacao_nova"    // new export = new modules
  | "certificacao"       // ISO, compliance push
  | "captacao_recursos"  // funding, financing
  | "crise_judicial"     // labor or tax court case
  | "premio_ranking"     // awards = growth signal

export interface TimingEvent {
  type:            TimingEventType
  title:           string         // what happened
  date_detected:   string         // when we found it
  source:          string         // where we found it
  evidence:        string         // the snippet/quote
  days_ago:        number         // how recent
  temperature:     TimingTemperature
  why_relevant:    string         // commercial relevance
  opening_hook:    string         // how to USE this in the call
  urgency_note:    string         // why NOW is the right time
}

export interface TimingIntelligence {
  temperature:        TimingTemperature
  temperature_label:  string
  temperature_reason: string
  events:             TimingEvent[]
  top_event:          TimingEvent | null
  opening_hook:       string        // best hook for the call
  timing_advice:      string        // when/how to approach
  monitor_signals:    string[]      // what to watch for
  searched_at:        string
  queries_used:       string[]
}

// --------- Event pattern detectors ---------------------------------------------------------------------------------------------------

const EVENT_PATTERNS: Array<{
  type:     TimingEventType
  patterns: RegExp[]
  temp:     (daysAgo: number) => TimingTemperature
  why:      string
  hook:     (title: string, company: string) => string
  urgency:  string
}> = [
  {
    type: "expansao",
    patterns: [
      /nova\s+(?:filial|unidade|loja|planta|sede)/i,
      /inaugura(?:ção|cao|r)?/i,
      /expan(?:são|sao|de|dir)/i,
      /nova\s+opera(?:ção|cao)/i,
      /enter[s]?\s+(?:new\s+)?market/i,
      /abre\s+(?:nova|novo)/i,
      /enters?\s+new\s+state/i,
    ],
    temp: (d) => d <= 30 ? "quente" : d <= 90 ? "morna" : "fria",
    why: "Expansão gera novas obrigações tributárias — ICMS interestadual, novos CNAEs, mais folha. Momento ideal para estruturar antes da complexidade crescer.",
    hook: (t, c) => `Vi que ${c} está em expansão${t.toLowerCase().includes("filial") ? " com nova filial" : ""}. Quando uma empresa cresce assim, a estrutura tributária precisa acompanhar — especialmente em operações interestaduais.`,
    urgency: "Aborde antes que a estrutura tributária da nova operação esteja consolidada — é o momento onde há maior abertura para revisão.",
  },
  {
    type: "mudanca_societaria",
    patterns: [
      /novo\s+(?:sócio|socio|acionista|administrador)/i,
      /altera(?:ção|cao)\s+(?:social|societária|societaria)/i,
      /fusão|fusao|aquisição|aquisicao|merger|acquisition/i,
      /saída\s+de\s+sócio/i,
      /ingresso\s+de\s+(?:sócio|investidor)/i,
    ],
    temp: (d) => d <= 30 ? "quente" : d <= 60 ? "morna" : "fria",
    why: "Mudança societária é o momento em que o novo decisor está avaliando toda a estrutura da empresa. Janela de abertura raramente repetida.",
    hook: (t, c) => `Identifiquei uma alteração societária recente em ${c}. Em momentos como esse, novos gestores costumam querer revisar a estrutura tributária — é o timing mais favorável.`,
    urgency: "A janela pós-mudança societária dura em média 60-90 dias antes do novo gestor consolidar sua agenda. Agir agora.",
  },
  {
    type: "contratacao",
    patterns: [
      /contrata(?:ndo|ção|cao|r\s+profissionais)/i,
      /vagas?\s+abertas?/i,
      /we.?re?\s+hiring/i,
      /oportunidades?\s+de\s+emprego/i,
      /crescimento\s+de\s+equipe/i,
      /seleção\s+de\s+talentos/i,
    ],
    temp: (d) => d <= 45 ? "quente" : d <= 90 ? "morna" : "fria",
    why: "Contratação intensa = folha crescente = maior exposição a Sistema S e Verbas Indenizatórias. Quanto maior a folha, maior o retroativo disponível.",
    hook: (t, c) => `${c} está em fase de contratação ativa. Empresas em expansão de folha normalmente têm pontos sobre Sistema S e encargos que merecem atenção antes de consolidar a nova estrutura.`,
    urgency: "Cada nova contratação aumenta o potencial retroativo. Quanto antes a revisão, maior o período recuperável.",
  },
  {
    type: "autuacao_fiscal",
    patterns: [
      /autu(?:ação|acao|ada)\s+(?:pela|da)\s+(?:receita|fazenda|sefaz)/i,
      /infração\s+fiscal/i,
      /auto\s+de\s+infração/i,
      /notificação\s+fiscal/i,
      /execução\s+fiscal/i,
      /dívida\s+ativa/i,
    ],
    temp: (d) => d <= 30 ? "quente" : d <= 90 ? "morna" : "fria",
    why: "Autuação fiscal = empresa já está no radar da Receita e provavelmente precisará de estruturação tributária defensiva urgente.",
    hook: (t, c) => `Identifiquei um evento fiscal recente envolvendo ${c}. Em situações assim, a empresa normalmente precisa de uma visão estratégica complementar ao que o contador já faz no dia a dia.`,
    urgency: "Urgência alta — empresa com autuação ativa está mais receptiva a buscar alternativas e revisão de estrutura.",
  },
  {
    type: "captacao_recursos",
    patterns: [
      /capta(?:ção|cao|r)\s+(?:de\s+)?(?:recursos|investimento)/i,
      /aportes?\s+(?:de\s+)?(?:capital|investimento)/i,
      /rodada\s+(?:de\s+investimento|seed|série)/i,
      /financiamento\s+(?:obtido|aprovado|bndes|findo)/i,
      /recebe(?:u)?\s+investimento/i,
    ],
    temp: (d) => d <= 30 ? "quente" : d <= 90 ? "morna" : "fria",
    why: "Captação de recursos significa crescimento planejado — novo investidor geralmente exige due diligence tributária e governança fiscal estruturada.",
    hook: (t, c) => `${c} captou recursos recentemente. Empresas nessa fase geralmente precisam estruturar a governança tributária para atender exigências dos investidores.`,
    urgency: "Investidores exigem transparência tributária — janela para estruturação é imediatamente após a captação.",
  },
  {
    type: "obra_investimento",
    patterns: [
      /obra\s+(?:de\s+)?(?:ampliação|construção|expansão)/i,
      /nova\s+(?:planta|fábrica|galpão|sede)/i,
      /investimento\s+em\s+infraestrutura/i,
      /capex\b/i,
      /construção\s+(?:de\s+)?(?:nova|novo)/i,
    ],
    temp: (d) => d <= 60 ? "quente" : d <= 120 ? "morna" : "fria",
    why: "Obra de expansão = RET, créditos de ICMS sobre materiais, INSS construção. Momento de estruturação antes de consolidar o investimento.",
    hook: (t, c) => `${c} está investindo em expansão física. Há pontos tributários específicos sobre obras e construção que merecem atenção antes de concluir.`,
    urgency: "Créditos sobre construção precisam ser estruturados antes do início da obra para não perder o aproveitamento.",
  },
  {
    type: "premio_ranking",
    patterns: [
      /melhor\s+empresa/i,
      /prêmio\s+(?:de\s+)?(?:gestão|excelência|inovação)/i,
      /ranking\s+(?:das\s+)?(?:melhores|maiores)/i,
      /certificação\s+(?:iso|great\s+place|sbq)/i,
      /reconhecimento\s+(?:de\s+)?(?:mercado|setor)/i,
    ],
    temp: (d) => d <= 60 ? "morna" : "fria",
    why: "Empresas premiadas têm perfil de governança elevado — mais abertura para revisão tributária técnica e estruturada.",
    hook: (t, c) => `Vi que ${c} foi reconhecida recentemente no setor. Empresas com esse perfil de governança costumam ter abertura para análises tributárias estratégicas complementares.`,
    urgency: "Aborde como análise estratégica — alinha com o perfil de governança da empresa.",
  },
  {
    type: "exportacao_nova",
    patterns: [
      /inicia\s+(?:exportação|exportacao|exportações)/i,
      /primeiro\s+(?:embarque|contêiner|exportação)/i,
      /acessa\s+mercado\s+(?:externo|internacional)/i,
      /passa\s+a\s+exportar/i,
    ],
    temp: (d) => d <= 30 ? "quente" : d <= 90 ? "morna" : "fria",
    why: "Início de exportação abre crédito presumido de IPI (5,37%) e imunidade PIS/COFINS — se não estruturado desde o início, perde retroativo.",
    hook: (t, c) => `${c} iniciou operações de exportação recentemente. Empresas que começam a exportar têm um crédito presumido de IPI disponível que raramente é aproveitado desde o primeiro embarque.`,
    urgency: "Cada mês sem estruturar o crédito presumido é retroativo perdido. Urgência alta.",
  },
]

// --------- News search for timing events ---------------------------------------------------------------------------------

async function searchTimingEvents(
  razao_social: string,
  nome_fantasia: string | null | undefined,
  cnpj:          string,
): Promise<{ events: TimingEvent[]; queries: string[] }> {
  const events: TimingEvent[] = []
  const queries: string[] = []
  const now = new Date()

  const companyName = nome_fantasia?.trim() || razao_social.split(" ").slice(0, 4).join(" ")
  const shortName   = companyName.split(" ").slice(0, 3).join(" ")

  // Build targeted news queries
  const searchQueries = [
    `"${shortName}" expansão OR inauguração OR filial OR contratação`,
    `"${shortName}" autuação OR fiscal OR receita federal OR execução`,
    `"${shortName}" investimento OR captação OR fusão OR aquisição`,
    `"${shortName}" crescimento OR obra OR nova unidade`,
  ]

  for (const query of searchQueries) {
    try {
      queries.push(query)
      const q   = encodeURIComponent(query)
      const url = `https://news.google.com/rss/search?q=${q}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
      const res = await fetch(url, { signal: AbortSignal.timeout(3_000) })
      if (!res.ok) continue

      const xml   = await res.text()
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1])

      for (const item of items.slice(0, 5)) {
        const title   = (item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "")
          .replace(/<!?\[CDATA\[|\]\]>/g, "").trim()
        const pubDate = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "").trim()
        const link    = (item.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "").trim()
        const desc    = (item.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "")
          .replace(/<!?\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").trim()

        // Must mention the company
        const combined = `${title} ${desc}`.toLowerCase()
        if (!combined.includes(shortName.toLowerCase().split(" ")[0].toLowerCase())) continue

        // Calculate days ago
        let daysAgo = 999
        if (pubDate) {
          const parsed = new Date(pubDate)
          if (!isNaN(parsed.getTime())) {
            daysAgo = Math.floor((now.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24))
          }
        }

        // Check each event pattern
        for (const ep of EVENT_PATTERNS) {
          const matches = ep.patterns.some(p => p.test(title) || p.test(desc))
          if (!matches) continue

          // Avoid duplicates of same type
          if (events.some(e => e.type === ep.type && Math.abs(e.days_ago - daysAgo) < 5)) continue

          const temperature = ep.temp(daysAgo)

          events.push({
            type:          ep.type,
            title:         title.slice(0, 200),
            date_detected: new Date().toISOString(),
            source:        "Google News",
            evidence:      title.slice(0, 180),
            days_ago:      daysAgo,
            temperature,
            why_relevant:  ep.why,
            opening_hook:  ep.hook(title, companyName),
            urgency_note:  ep.urgency,
          })
          break
        }

        if (events.length >= 8) break
      }
    } catch {
      // non-blocking
    }
    if (events.length >= 8) break
  }

  // Sort: hottest and most recent first
  return {
    events: events.sort((a, b) => {
      const tempScore: Record<TimingTemperature, number> = { quente: 3, morna: 2, fria: 1, monitorar: 0 }
      if (tempScore[b.temperature] !== tempScore[a.temperature]) return tempScore[b.temperature] - tempScore[a.temperature]
      return a.days_ago - b.days_ago
    }),
    queries,
  }
}

// --------- Main engine ---------------------------------------------------------------------------------------------------------------------------------------

// Improved word1 extraction --- picks the most specific identifying word
function extractCompanyWord(razao_social: string, nome_fantasia?: string | null): string {
  const GENERIC = new Set([
    "SUPERMERCADO","SUPERMERCADOS","TRANSPORTE","TRANSPORTES","FARMACIA","FARMACIAS",
    "CONSTRUTORA","CONSTRUTORAS","HOSPITAL","HOSPITAIS","TECNOLOGIA","CLINICA","CLINICAS",
    "COMERCIAL","DISTRIBUIDORA","DISTRIBUIDORES","HOLDING","INVESTIMENTOS","PARTICIPACOES",
    "SOLUCOES","SOLUCAO","SERVICOS","SERVICO","INDUSTRIAS","INDUSTRIA","SISTEMAS","SISTEMA",
    "INFORMATICA","CONSULTORIA","ASSESSORIA","ENGENHARIA","CONSTRUCAO","EMPREENDIMENTOS",
    "INCORPORADORA","LOGISTICA","ALIMENTOS","VEICULOS","SAUDE","EDUCACAO","ESCOLA",
    "AGROPECUARIA","AGRO","COMERCIO","COMERCIOS","LTDA","SA","ME","EPP","EIRELI",
    "E","DE","DO","DA","DOS","DAS","EM","COM","PARA","POR","OU",
  ])
  // Use nome_fantasia when available --- it's the commercial name people search
  const source = (nome_fantasia && nome_fantasia.trim().length > 2)
    ? nome_fantasia.trim().toUpperCase()
    : razao_social.toUpperCase()
  const parts = source.split(/\s+/)
  for (const p of parts) {
    const clean = p.replace(/[.,;:]/g, "")
    if (clean.length >= 2 && !GENERIC.has(clean)) return clean
  }
  return parts[0] ?? razao_social.slice(0, 6).toUpperCase()
}


export async function buildTimingIntelligence(
  razao_social:  string,
  nome_fantasia: string | null | undefined,
  cnpj:          string,
  uf:            string,
  web_enrichment?: { vagas_abertas?: any[]; noticias?: any[] } | null,
  structural_data?: { data_abertura?: string; capital_social?: number; porte?: string },
): Promise<TimingIntelligence> {
  const now = new Date().toISOString()

  const { events, queries } = await searchTimingEvents(razao_social, nome_fantasia, cnpj)

  // Merge timing events from web enrichment (vagas + noticias found via DDG/Indeed)
  const webEvents: TimingEvent[] = []

  // Convert vagas abertas to timing events
  for (const vaga of (web_enrichment?.vagas_abertas ?? []).slice(0, 3)) {
  try {

    webEvents.push({
      type:          "contratacao",
      title:         `Vaga aberta: ${vaga.titulo}`,
      date_detected: now,
      source:        vaga.fonte ?? "web",
      evidence:      vaga.titulo,
      days_ago:      30,  // assume recent if found
      temperature:   "quente",
      why_relevant:  vaga.signal ?? "Empresa em fase de contratacao — crescimento ativo.",
      opening_hook:  `Vi que ${razao_social.split(" ")[0]} esta contratando ativamente para ${vaga.area}. Empresas em expansao de equipe frequentemente precisam organizar melhor a estrutura tributaria antes de escalar.`,
      urgency_note:  "Contratacao ativa = folha crescente = potencial retroativo de Sistema S e verbas.",
    })
  
  } catch (err) {
    return {
      temperature: "fria", temperature_label: "Neutro",
      temperature_reason: "Analise de timing nao executada.",
      events: [], queries: [], sector_context: null,
      opening_hook: null, searched_at: new Date().toISOString()
    }
  }
}

  // Convert noticias to timing events
  for (const noticia of (web_enrichment?.noticias ?? []).filter((n: any) => n.tipo !== "outro").slice(0, 2)) {
    const tipo = noticia.tipo === "expansao" ? "expansao"
      : noticia.tipo === "premiacao" ? "premio_ranking"
      : noticia.tipo === "autuacao" ? "autuacao_fiscal"
      : "expansao"
    webEvents.push({
      type:          tipo as TimingEventType,
      title:         noticia.titulo,
      date_detected: now,
      source:        noticia.fonte ?? "web",
      evidence:      noticia.resumo ?? noticia.titulo,
      days_ago:      noticia.dias_atras ?? 60,
      temperature:   noticia.temperatura ?? "morna",
      why_relevant:  "Sinal de movimentacao identificado via pesquisa web.",
      opening_hook:  `Identifiquei uma movimentacao recente de ${razao_social.split(" ")[0]} — ${noticia.titulo.slice(0, 80)}. Vale uma conversa sobre como isso impacta a estrutura tributaria.`,
      urgency_note:  "Evento recente aumenta receptividade a abordagem contextual.",
    })
  }

  // Merge: web events first (more concrete), then news events
  const allEvents = [...webEvents, ...events]
    .sort((a, b) => {
      const tempScore: Record<TimingTemperature, number> = { quente: 3, morna: 2, fria: 1, monitorar: 0 }
      if (tempScore[b.temperature] !== tempScore[a.temperature]) return tempScore[b.temperature] - tempScore[a.temperature]
      return a.days_ago - b.days_ago
    })
    .slice(0, 8)

  // Determine overall temperature
  const tempScore: Record<TimingTemperature, number> = { quente: 3, morna: 2, fria: 1, monitorar: 0 }
  const topEvent = allEvents.length > 0 ? allEvents[0] : null
  const temperature: TimingTemperature =
    topEvent ? topEvent.temperature
    : "monitorar"

  const tempLabels: Record<TimingTemperature, string> = {
    quente:    "Momento quente — abordar agora",
    morna:     "Momento relevante — abordar essa semana",
    fria:      "Sem gatilho recente — abordagem padrão",
    monitorar: "Sem sinais de timing — monitorar",
  }

  const tempReasons: Record<TimingTemperature, string> = {
    quente:    `Evento relevante identificado nos últimos ${topEvent?.days_ago ?? 0} dias — janela de abertura ativa.`,
    morna:     `Evento identificado há ${topEvent?.days_ago ?? 0} dias — ainda dentro da janela de oportunidade.`,
    fria:      "Nenhum gatilho recente identificado. Abordagem padrão recomendada.",
    monitorar: "Empresa sem sinais de timing. Cadastrar para monitoramento futuro.",
  }

  // Build opening hook from top event
  const openingHook = topEvent?.opening_hook
    ?? `Tenho acompanhado o mercado do segmento de ${razao_social.split(" ")[0]} e identifiquei alguns pontos que valem uma conversa rápida.`

  // Timing advice
  const timingAdvice: Record<TimingTemperature, string> = {
    quente:    "Contatar esta semana — o gatilho está fresco e a receptividade tende a ser alta. Use o evento como contexto de abertura, não como argumento de venda.",
    morna:     "Contatar nos próximos 7-10 dias. O evento ainda é recente o suficiente para ser um contexto válido de abertura.",
    fria:      "Sem urgência de timing. Priorizar empresas com gatilhos ativos. Manter no radar para monitoramento.",
    monitorar: "Adicionar ao pipeline de monitoramento. Aguardar evento de timing antes de abordar com contexto específico.",
  }

  // Monitor signals --- what to watch for in the future
  const monitorSignals = [
    "Abertura de nova filial ou alteração de endereço no CNPJ",
    "Mudança no QSA — entrada ou saída de sócio",
    "Contratações abertas no LinkedIn",
    "Notícias de expansão, M&A ou captação",
    "Autuação ou execução fiscal",
  ]

  return {
    temperature,
    temperature_label:  tempLabels[temperature],
    temperature_reason: tempReasons[temperature],
    events:             allEvents,
    top_event:          topEvent,
    opening_hook:       openingHook,
    timing_advice:      timingAdvice[temperature],
    monitor_signals:    monitorSignals,
    searched_at:        now,
    queries_used:       queries,
  }
}
