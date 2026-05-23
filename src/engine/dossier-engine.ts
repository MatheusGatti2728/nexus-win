// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS TAX INTELLIGENCE --- Dossier Engine
//
// Transforms raw Rule Engine output into a full strategic dossier:
// - Company Intelligence
// - Strategic Reading
// - Contextualized Modules (why_it_fits_this_company)
// - Persona Playbooks (call scripts, objections, CTAs)
// - Meeting Questions
// - Next Steps
//
// RULE: Never invent data. Missing = "informa----o a confirmar".
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { CompanyContext, ModuleResult, RuleEngineResult } from "./rule-engine"
import type { Segment, TaxRegime } from "./tax-matrix"
import { SEGMENT_LABELS, REGIME_LABELS } from "./tax-matrix"

// --------- Company Intelligence ---------------------------------------------------------------------------------------------------------------

export interface CompanyIntelligence {
  razao_social:       string
  cnpj_formatted:     string
  situacao_cadastral: string
  data_abertura:      string
  idade_empresa:      string
  cidade_uf:          string
  cnae_principal:     string
  cnaes_secundarios:  string[]
  natureza_juridica:  string
  capital_social:     string
  socios:             string[]
  segmento_consultor: string
  regime_consultor:   string
  subsegmento?:       string
  flags_operacionais: string[]
  dados_ausentes:     string[]
  faturamento_estimado: string
  folha_estimada:     string
}

// --------- Contextualized module ------------------------------------------------------------------------------------------------------------

export interface ContextualizedModule {
  module_name:               string
  module_slug:               string
  priority:                  "core" | "secondary"
  score:                     number
  risk_level:                string
  why_it_fits_this_company:  string   // company-specific, never generic
  company_specific_signals:  string[]
  opportunity_summary:       string
  probable_pain:             string
  strategic_angle:           string
  ideal_personas:            string[]
  first_pitch:               string
  validation_questions:      string[]
  documents_to_request:      string[]
  risk_notes:                string[]
  objections: Array<{ objection: string; response: string }>
}

// --------- Persona playbook ---------------------------------------------------------------------------------------------------------------------------

export interface PersonaPlaybook {
  persona:             string
  objective:           string
  mindset:             string
  main_pain:           string
  language_style:      string
  opening_script:      string
  full_call_flow:      string[]
  opportunity_hooks:   string[]
  strategic_questions: string[]
  likely_objections:   Array<{ objection: string; response: string }>
  what_to_avoid:       string[]
  meeting_cta:         string
}

// --------- Full strategic dossier ---------------------------------------------------------------------------------------------------------

export interface StrategicDossier {
  company_intelligence:      CompanyIntelligence
  strategic_reading:         string
  contextualized_modules:    ContextualizedModule[]
  rejected_summary:          Array<{ name: string; reason: string }>
  persona_playbooks:         PersonaPlaybook[]
  meeting_questions:         string[]
  next_steps:                string[]
  disclaimer:                string
}

// --------- Helpers ------------------------------------------------------------------------------------------------------------------------------------------------------

const CONFIRM = "informação a confirmar"

function fmt_brl(n?: number): string {
  if (!n) return CONFIRM
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M/mês`
  if (n >= 1_000)     return `R$ ${Math.round(n / 1_000)}k/mês`
  return `R$ ${n.toLocaleString("pt-BR")}/mês`
}

function empresa_anos(anos: number): string {
  if (anos === 0) return CONFIRM
  if (anos === 1) return "1 ano de operação"
  return `${anos} anos de operação`
}

// --------- Company Intelligence builder ------------------------------------------------------------------------------------

function buildCompanyIntelligence(ctx: CompanyContext): CompanyIntelligence {
  const flags   = ctx.consultant.operation_flags ?? []
  const missing: string[] = []

  if (!ctx.faturamento_estimado) missing.push("Faturamento mensal")
  if (!ctx.folha_estimada)       missing.push("Folha de pagamento")
  if (flags.length === 0)        missing.push("Flags operacionais da empresa")

  return {
    razao_social:       ctx.razao_social,
    cnpj_formatted:     ctx.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5"),
    situacao_cadastral: "Ativa",
    data_abertura:      ctx.anos_operacao > 0 ? `há ${empresa_anos(ctx.anos_operacao)}` : CONFIRM,
    idade_empresa:      empresa_anos(ctx.anos_operacao),
    cidade_uf:          ctx.uf ? `${ctx.uf}` : CONFIRM,
    cnae_principal:     CONFIRM,
    cnaes_secundarios:  [],
    natureza_juridica:  CONFIRM,
    capital_social:     CONFIRM,
    socios:             [],
    segmento_consultor: SEGMENT_LABELS[ctx.consultant.segment],
    regime_consultor:   REGIME_LABELS[ctx.consultant.tax_regime],
    subsegmento:        ctx.consultant.subsegment,
    flags_operacionais: flags,
    dados_ausentes:     missing,
    faturamento_estimado: fmt_brl(ctx.faturamento_estimado),
    folha_estimada:     fmt_brl(ctx.folha_estimada),
  }
}

// --------- Per-module contextualization ------------------------------------------------------------------------------------

interface ModuleContext {
  why:       string
  signals:   string[]
  pain:      string
  angle:     string
  personas:  string[]
  questions: string[]
  docs:      string[]
  risks:     string[]
  objections: Array<{ objection: string; response: string }>
}

function contextualizeModule(
  m:   ModuleResult,
  ctx: CompanyContext,
): ModuleContext {
  const seg   = ctx.consultant.segment
  const reg   = ctx.consultant.tax_regime
  const flags = ctx.consultant.operation_flags ?? []
  const anos  = ctx.anos_operacao
  const porte = ctx.porte
  const fat   = ctx.faturamento_estimado
  const folha = ctx.folha_estimada
  const nome  = ctx.razao_social.split(" ")[0]  // first word for natural language

  const segLabel = SEGMENT_LABELS[seg]
  const regLabel = REGIME_LABELS[reg]

  switch (m.slug) {

    case "icms_st_pis_cofins":
      return {
        why: `${nome} foi classificada como ${segLabel} no ${regLabel}. Empresas desse perfil adquirem mercadorias com ICMS-ST embutido no preço de compra. O STJ pacificou em dezembro/2023 (Tema 1.125) que esse valor não deve integrar a base do PIS/COFINS — portanto há crédito retroativo desde 17/03/2017.`,
        signals: ["Comércio em LR adquire com ST sistematicamente", flags.includes("icms_st") ? "Flag ICMS-ST confirmada pelo consultor" : "Segmento compatível com ST"].filter(Boolean),
        pain: "A empresa provavelmente nunca revisou a base de PIS/COFINS para excluir o ST embutido nas compras — é um custo invisível.",
        angle: "Apresentar como revisão silenciosa de base de cálculo, não como recuperação. O mercado ainda não priorizou isso.",
        personas: ["CFO", "Gerente Fiscal"],
        questions: ["Qual o percentual de compras com ICMS-ST?", "A empresa já realizou revisão do ICMS-ST desde 2017?", "Há fornecedores substitutos relevantes na cadeia?"],
        docs: ["EFD-ICMS/IPI dos últimos 5 anos", "Notas fiscais de entrada com ICMS-ST", "DCTF"],
        risks: ["Risco remoto — Tema 1.125 STJ pacificado. Aproveitamento via PER/DCOMP após análise."],
        objections: [
          { objection: "Meu contador já analisa PIS/COFINS.", response: "Essa revisão específica — o ICMS-ST da compra — requer EFD-ICMS cruzada com EFD-Contribuições e é posterior a dezembro/2023. A maioria dos escritórios ainda não fez isso." },
          { objection: "Já analisamos isso internamente.", response: "A decisão do Tema 1.125 é de dezembro/2023. Se a revisão foi anterior, o período mais relevante pode não ter sido coberto." },
          { objection: "Isso é arriscado?", response: "Risco remoto. O STJ pacificou esse entendimento em 2023. Aproveitamento é via PER/DCOMP administrativo — sem necessidade de ação judicial." },
        ],
      }

    case "pis_cofins_taxa_cartao":
      return {
        why: `${nome} opera no ${segLabel} com provável alto volume de vendas em cartão${flags.includes("venda_cartao") ? " — confirmado pelo consultor" : ""}. Empresas nesse perfil recolhem PIS e Cofins sobre as taxas das operadoras como se fossem receita própria, mas esse valor nunca chega ao caixa da empresa.`,
        signals: [flags.includes("venda_cartao") ? "Flag de venda em cartão confirmada" : "Segmento com alto índice de vendas em cartão", porte !== "micro" ? `Porte ${porte} — volume relevante` : ""].filter(Boolean),
        pain: "A empresa paga mensalmente tributos sobre dinheiro que fica nas operadoras de cartão. É uma distorção de base de cálculo que acumula silenciosamente.",
        angle: "Não apresentar como 'recuperação' — apresentar como correção de base de cálculo. A empresa nunca deveria ter pago PIS/COFINS sobre esse valor.",
        personas: ["CFO", "Sócio"],
        questions: ["Qual o percentual de vendas em cartão no faturamento?", "Quais operadoras são utilizadas e qual a taxa média?", "Há análise histórica dos valores pagos às operadoras?"],
        docs: ["Extrato de operadoras de cartão (60 meses)", "DCTF / EFD-Contribuições", "DRE dos últimos 5 anos"],
        risks: ["Risco POSSÍVEL — RFB tem entendimento contrário (Temas 779/780 STJ). Análise individual obrigatória antes de qualquer movimentação. Nunca apresentar como certeza."],
        objections: [
          { objection: "Isso já foi julgado?", response: "Os Temas 779 e 780 ainda estão em discussão no STJ. É uma tese possível, não definitiva — por isso a análise individual é obrigatória antes de qualquer passo." },
          { objection: "A taxa de cartão faz parte do custo da operação.", response: "Exatamente. É um custo operacional — não receita. A questão é que o Fisco tributa como se fosse receita, o que gera uma distorção que pode ser questionada." },
          { objection: "Nosso jurídico não aprova.", response: "Faz sentido cautela. A análise prévia é exatamente para o jurídico avaliar o risco específico da operação de vocês. Não propomos nada sem essa análise." },
        ],
      }

    case "verbas_indenizatorias":
      return {
        why: `${nome} tem ${empresa_anos(anos)}${folha ? ` e folha estimada de ${fmt_brl(folha)}` : ""}. Empresas com mais de ${anos >= 8 ? "8" : "5"} anos de operação${folha ? " e folha relevante" : ""} acumulam volume significativo de INSS pago sobre parcelas indenizatórias (aviso prévio, férias proporcionais, 13º proporcional etc.) que, por lei, não deveriam compor a base previdenciária.`,
        signals: [`${empresa_anos(anos)} de operação${anos >= 10 ? " — período estendido disponível" : ""}`, folha ? `Folha estimada: ${fmt_brl(folha)}` : "Folha relevante necessária para confirmar escala"].filter(Boolean),
        pain: "A empresa provavelmente pagou INSS patronal sobre parcelas rescisórias e verbas que a legislação e jurisprudência reconhecem como indenizatórias. Esse valor pertence à empresa.",
        angle: `Apresentar como revisão previdenciária histórica — não como ação judicial. ${anos >= 15 ? "Com " + anos + " anos de operação, o impacto pode ser expressivo." : ""}`,
        personas: ["CFO", "Sócio", "RH"],
        questions: ["A empresa realizou revisão previdenciária histórica nos últimos 5 anos?", "Qual o histórico de rescisões nos últimos anos?", "Há ação coletiva identificada para o segmento?"],
        docs: ["GFIP dos últimos 5 anos", "Folhas de pagamento e rescisões", "Contrato social e histórico de funcionários"],
        risks: ["Risco remoto. Jurisprudência favorável consolidada. Análise individualizada por período."],
        objections: [
          { objection: "Já analisamos previdenciário.", response: "A análise previdenciária padrão geralmente não cobre verbas indenizatórias de forma retroativa e estruturada. Qual foi o período coberto na última revisão?" },
          { objection: "Isso dá problema com a Receita?", response: "Não. O aproveitamento é via PER/DCOMP — processo administrativo com fundamento em jurisprudência consolidada. Sem risco de auto de infração quando bem documentado." },
          { objection: "Meu RH já cuida disso.", response: "O RH gerencia a folha atual. Essa revisão olha para o passado e identifica o que foi pago a mais — é um trabalho técnico tributário, não operacional." },
        ],
      }

    case "sistema_s":
      return {
        why: `${nome} recolhe contribuições ao Sistema S sobre a folha de pagamento${folha ? ` (estimada em ${fmt_brl(folha)})` : ""}. O STJ fixou no Tema 1079 que essas contribuições são devidas apenas sobre os primeiros 20 salários mínimos da folha. Se o recolhimento foi feito sobre a totalidade sem esse limite, há crédito retroativo de 39 meses via PER/DCOMP.`,
        signals: [folha ? `Folha estimada: ${fmt_brl(folha)}` : "Folha confirmada necessária", flags.includes("folha_relevante") ? "Flag de folha relevante confirmada" : ""].filter(Boolean),
        pain: "A empresa provavelmente contribuiu ao Sistema S sem aplicar o limite de 20 salários mínimos — um recolhimento a maior que pode ser recuperado administrativamente.",
        angle: "Processo direto via PER/DCOMP. Sem necessidade de ação judicial. Baixa complexidade operacional para o cliente.",
        personas: ["CFO", "Contador"],
        questions: ["A empresa aplica o limite de 20 salários mínimos no recolhimento do Sistema S?", "Há GFIP disponível para os últimos 39 meses?", "Qual o escritório contábil responsável pela folha?"],
        docs: ["GFIPs dos últimos 39 meses", "Guias de recolhimento do Sistema S", "Folha de pagamento histórica"],
        risks: ["Risco remoto. STJ fixou Tema 1079 em 2022. Aproveitamento via PER/DCOMP sem necessidade de ação judicial."],
        objections: [
          { objection: "Meu contador já vê isso.", response: "O Tema 1079 foi fixado pelo STJ em 2022. Muitos escritórios ainda não fizeram a revisão retroativa dos 39 meses disponíveis. Vale confirmar se o PER/DCOMP já foi protocolado." },
          { objection: "Isso dá problema?", response: "Nenhum. É um direito reconhecido pelo próprio STJ — aproveitamento via processo administrativo padrão da Receita Federal." },
          { objection: "O valor compensa?", response: "Depende da folha histórica. Para folhas acima de R$ 200k/mês, o impacto costuma ser relevante. Por isso fazemos primeiro uma estimativa rápida antes de qualquer comprometimento." },
        ],
      }

    case "ipi_credito_presumido_exportacao":
      return {
        why: `${nome} é uma empresa ${segLabel.toLowerCase()}${flags.includes("exportacao") ? " com operação de exportação identificada pelo consultor" : ""}. A Lei 9.363/96 criou um crédito presumido de IPI de 5,37% sobre o faturamento exportado — alíquota fixada em lei, sem discricionariedade. É um dos créditos tributários de maior segurança jurídica disponíveis para indústrias exportadoras.`,
        signals: [flags.includes("exportacao") ? "Operação exportadora confirmada pelo consultor" : "Segmento industrial com potencial exportador", "Alíquota de 5,37% fixada pela Lei 9.363/96 — sem risco de questionamento"],
        pain: "A empresa provavelmente não aproveitou sistematicamente o crédito presumido de IPI sobre exportações ou não otimizou o período disponível.",
        angle: "Apresentar pela segurança jurídica, não pelo valor. Alíquota em lei, aproveitamento via PER/DCOMP. É a tese de menor risco disponível para indústrias.",
        personas: ["Gerente Fiscal", "CFO"],
        questions: ["Qual o percentual do faturamento destinado à exportação?", "O crédito presumido de IPI foi aproveitado nos últimos 60 meses?", "Qual o mix de produtos exportados?"],
        docs: ["DDE (Declarações de Exportação)", "DRE segmentada por mercado", "EFD-Contribuições", "NF-e de exportação"],
        risks: ["Risco remoto. Lei 9.363/96 + IN SRF 419/2004. Alíquota de 5,37% fixada — não existe debate sobre o percentual."],
        objections: [
          { objection: "Já tomamos crédito de IPI.", response: "O crédito presumido de exportação é específico — distinto dos créditos ordinários de IPI. É calculado sobre o faturamento exportado com alíquota de 5,37% definida em lei. Muitas empresas aproveitam parcialmente ou não revisam o período completo de 60 meses." },
          { objection: "Nosso fiscal já revisa.", response: "Correto. O que propomos é uma revisão complementar dos 60 meses disponíveis para garantir que nada ficou de fora. Muitas vezes o cálculo não é feito sobre o período completo." },
        ],
      }

    case "revisao_insumos_pis_cofins":
      return {
        why: `${nome} opera como ${segLabel.toLowerCase()} em ${regLabel}. O STJ fixou no REsp 1.221.170/PR que o conceito de insumo para PIS/COFINS é amplo — abrange todo bem ou serviço essencial ou relevante para a atividade. Empresas ${segLabel.toLowerCase()} em LR sistematicamente deixam créditos não aproveitados por interpretação restritiva.`,
        signals: [flags.includes("operacao_industrial") ? "Operação industrial confirmada" : `${segLabel} em LR — perfil com créditos de insumos subaproveitados`, "Conceito amplo fixado pelo STJ em 2018"].filter(Boolean),
        pain: "A empresa provavelmente interpreta insumo de forma restrita e deixa créditos de PIS/COFINS em bens e serviços que poderiam ser aproveitados.",
        angle: "Apresentar como eficiência fiscal — não recuperação. O foco é garantir que o crédito corrente está sendo aproveitado, além do retroativo.",
        personas: ["Gerente Fiscal", "CFO"],
        questions: ["Qual o critério atual para tomada de crédito de PIS/COFINS?", "Há análise do EFD-Contribuições com mapeamento de insumos?", "A empresa tem alvará/licença específica de operação que caracteriza essencialidade?"],
        docs: ["EFD-Contribuições dos últimos 5 anos", "LALUR / LACS", "Contratos de fornecimento", "Planilha de custos operacionais"],
        risks: ["Risco remoto. STJ fixou tese no REsp 1.221.170/PR (leading case). Aproveitamento requer análise NCM por NCM do EFD-Contribuições."],
        objections: [
          { objection: "Já tomamos créditos.", response: "A maioria das empresas toma os créditos mais óbvios. A revisão de insumos mapeia o que não foi tomado — especialmente serviços e bens que não parecem 'insumo' à primeira vista mas são essenciais para a operação." },
          { objection: "Isso é muito subjetivo.", response: "Há critérios objetivos fixados pelo STJ: essencialidade e relevância para a atividade. A análise é item a item — não é uma tese genérica." },
          { objection: "Nosso fiscal já revisa.", response: "Faz sentido. O que propomos é uma segunda opinião específica sobre o período retroativo — não para substituir o fiscal, mas para garantir que nada ficou de fora." },
        ],
      }

    case "icms_iss_acao_coletiva":
      return {
        why: `${nome} é uma empresa de ${segLabel.toLowerCase()} — setor que paga ISS sobre serviços${flags.includes("operacao_iss") ? " (confirmado pelo consultor)" : ""}. O Tema 69 STF garantiu a exclusão do ICMS da base do PIS/COFINS, e há desdobramentos para ISS. Via ação coletiva, é possível acessar período retroativo ampliado.`,
        signals: [flags.includes("operacao_iss") ? "Operação com ISS confirmada" : "Segmento de serviços com incidência de ISS", "Tema 69 STF — base jurídica consolidada para ICMS; ISS em amadurecimento"].filter(Boolean),
        pain: "A empresa provavelmente incluiu o ISS na base do PIS/COFINS historicamente — um valor que não deveria compor a base de tributos federais.",
        angle: "Apresentar primeiro pelo ICMS (base sólida), depois pelo ISS como extensão natural. Via ação coletiva o período retroativo é maior.",
        personas: ["CFO", "Sócio"],
        questions: ["A empresa já aproveitou a exclusão do ICMS da base PIS/COFINS?", "Qual o volume de ISS recolhido mensalmente?", "Há ação coletiva identificada para o setor?"],
        docs: ["GIAs e DCTF", "Notas fiscais de serviços", "Guias de ISS"],
        risks: ["ICMS: risco remoto — Tema 69 STF. ISS: risco possível — Tema 118 STF em julgamento. Separar cálculo ICMS e ISS."],
        objections: [
          { objection: "Já fizemos a exclusão do ICMS.", response: "Ótimo. O que falta é verificar se o ISS também foi tratado e se o período máximo foi aproveitado via ação coletiva — o prazo retroativo na ação coletiva pode ser maior." },
          { objection: "Isso parece muito litigioso.", response: "A parte do ICMS é risco remoto — STF já decidiu. O ISS é mais recente. Por isso analisamos separadamente e apresentamos apenas o que tem fundamento sólido." },
        ],
      }

    case "pis_cofins_folha":
      return {
        why: `${nome} é uma empresa ${segLabel.toLowerCase()} de serviços${folha ? ` com folha estimada em ${fmt_brl(folha)}` : ""}, o que caracteriza negócio intensivo em mão de obra. A tese estrutural questiona a constitucionalidade do PIS/COFINS sobre folha — tema ainda em amadurecimento jurisprudencial, mas relevante para posicionamento estratégico.`,
        signals: [flags.includes("folha_relevante") ? "Folha relevante confirmada" : "Serviços com alta proporção folha/receita", "Tese estrutural de longo prazo"].filter(Boolean),
        pain: "Empresas intensivas em folha pagam PIS/COFINS sobre sua maior despesa — há questionamento da constitucionalidade dessa tributação.",
        angle: "Apresentar como posicionamento de longo prazo, não recuperação imediata. Não prometer resultado — tese em amadurecimento.",
        personas: ["CFO", "Sócio"],
        questions: ["Qual é a proporção folha/faturamento?", "A empresa já avaliou a tese de folha com advogado tributário?"],
        docs: ["DRE", "Folhas de pagamento", "DCTF"],
        risks: ["Risco ESTRUTURANTE. Não apresentar como recuperação. Apenas posicionamento estratégico. Não há jurisprudência consolidada."],
        objections: [
          { objection: "Isso é muito arriscado.", response: "Concordo com a cautela. Por isso não apresentamos como recuperação — é um posicionamento estratégico para eventual aproveitamento futuro. O debate ainda está em curso." },
        ],
      }

    case "icms_grossup":
      return {
        why: `${nome} operou no mercado com ${regLabel} e ${segLabel.toLowerCase()}. O Gross-Up do ICMS — diferença entre o ICMS incidente e o destacado na nota — é um desdobramento do Tema 69 STF que beneficia empresas que já aproveitaram a exclusão básica do ICMS.`,
        signals: ["Desdobramento do Tema 69 STF", "COSIT 21/2026 — RFB tem entendimento desfavorável: mencionar proativamente"],
        pain: "Empresas que já fizeram a exclusão do ICMS básico podem ter deixado o Gross-Up fora do cálculo — é uma diferença técnica entre o ICMS destacado e o efetivamente incidente.",
        angle: "Apresentar com transparência total sobre o risco — COSIT 21/2026 é desfavorável. Só indicar para empresas com capacidade técnica e jurídica para suportar o risco.",
        personas: ["Gerente Fiscal"],
        questions: ["A empresa já aproveitou a exclusão básica do ICMS da base PIS/COFINS?", "O departamento jurídico avaliou o Gross-Up?"],
        docs: ["Cálculo da exclusão do ICMS já realizada", "GIAs"],
        risks: ["Risco POSSÍVEL — COSIT 21/2026: RFB publicou entendimento desfavorável. NUNCA apresentar sem mencionar esse risco proativamente."],
        objections: [
          { objection: "A RFB não concordou com isso.", response: "Correto — a COSIT 21/2026 é desfavorável. Por isso é fundamental análise jurídica individualizada antes de qualquer movimentação. Mencionamos isso como contexto — a decisão de prosseguir é do jurídico da empresa." },
        ],
      }

    case "difal_pis_cofins":
      return {
        why: `${nome} opera com${flags.includes("ecommerce") ? " e-commerce" : ""}${flags.includes("venda_interestadual") ? " venda interestadual" : ""}${flags.includes("ecommerce") && flags.includes("venda_interestadual") ? " e" : ""} — operações sujeitas ao DIFAL. O DIFAL é um desdobramento do Tema 69 STF: assim como o ICMS, o DIFAL não deveria compor a base do PIS/COFINS.`,
        signals: [flags.includes("ecommerce") ? "E-commerce identificado" : "", flags.includes("venda_interestadual") ? "Venda interestadual identificada" : ""].filter(Boolean),
        pain: "A empresa inclui o DIFAL na base do PIS/COFINS nas operações interestaduais — um valor que é transferência tributária, não receita.",
        angle: "Apresentar como extensão natural do Tema 69. Quem já fez a exclusão do ICMS, o DIFAL é o próximo passo lógico.",
        personas: ["Gerente Fiscal", "CFO"],
        questions: ["Qual o volume de vendas interestaduais?", "A empresa já fez a exclusão do ICMS da base PIS/COFINS?"],
        docs: ["EFD-Contribuições", "GIAs interestaduais", "Notas fiscais interestaduais"],
        risks: ["Risco remoto. Desdobramento do Tema 69 STF."],
        objections: [
          { objection: "Já fizemos o Tema 69.", response: "O DIFAL é um passo adicional — não está automaticamente incluído na exclusão básica. Requer análise das operações interestaduais especificamente." },
        ],
      }

    case "bonificacoes_descontos":
      return {
        why: `${nome} é um ${segLabel.toLowerCase()} que provavelmente pratica política de bonificações ou recebe descontos incondicionais de fornecedores. Esses valores, por não serem receita, não deveriam compor a base do PIS/COFINS — mas sistematicamente são incluídos.`,
        signals: [flags.includes("operacao_varejista") ? "Operação varejista com política de bonificações identificada" : "Segmento comercial com potencial de bonificações", "CARF tem precedentes favoráveis"].filter(Boolean),
        pain: "A empresa provavelmente inclui bonificações recebidas na base do PIS/COFINS — valores que são ajustes de preço, não receita de venda.",
        angle: "Governança documental é o ponto crítico. O desconto incondicional precisa estar formalizado para ser aproveitado.",
        personas: ["CFO", "Gerente Fiscal"],
        questions: ["A empresa pratica ou recebe bonificações ou descontos incondicionais relevantes?", "Como essas bonificações são contabilizadas?", "Há formalização contratual das bonificações?"],
        docs: ["Contratos de fornecimento com cláusula de bonificação", "Notas fiscais de bonificação", "EFD-Contribuições"],
        risks: ["Risco remoto. Exige documentação formal dos descontos incondicionais. Sem essa governança, o aproveitamento é questionável."],
        objections: [
          { objection: "As bonificações fazem parte da nossa negociação normal.", response: "Exatamente — por isso não são receita. A questão é formalizar esse entendimento contratualmente para respaldar a exclusão da base do PIS/COFINS." },
        ],
      }

    case "plurifasico_beneficio":
      return {
        why: `${nome} opera no ${segLabel.toLowerCase()} com provável mix de produtos plurifásicos. O art. 17 da Lei 11.033/2004 permite manutenção de créditos PIS/COFINS mesmo na revenda de produtos tributados na saída com alíquota zero — um benefício sistematicamente não aproveitado pelo varejo.`,
        signals: ["Comércio varejista com mix de produtos diverso", "Requer análise NCM por NCM — não é genérico"],
        pain: "A empresa provavelmente perde créditos de PIS/COFINS na entrada porque não percebe o direito de manutenção mesmo com alíquota zero na saída.",
        angle: "Abordar apenas após análise NCM. Apresentar como otimização corrente, não recuperação retroativa genérica.",
        personas: ["Gerente Fiscal"],
        questions: ["Qual o mix de NCMs principais?", "A empresa já mapeou quais produtos são plurifásicos?", "Há análise do EFD-Contribuições por NCM?"],
        docs: ["EFD-Contribuições com abertura por NCM", "Lista de NCMs principais"],
        risks: ["NUNCA apresentar sem análise NCM por NCM. Risco de confusão com monofásicos. Requer validação técnica obrigatória."],
        objections: [
          { objection: "Nosso fiscal já revisa os créditos.", response: "Essa análise específica — manutenção de crédito em plurifásico — é técnica e requer mapeamento NCM a NCM. É diferente da revisão corrente de créditos." },
        ],
      }

    case "ipi_atacadista":
      return {
        why: `${nome} é uma empresa ${segLabel.toLowerCase()} que provavelmente adquire de atacadistas não contribuintes de IPI. O Art. 227 do RIPI/2010 permite crédito presumido de IPI sobre essas aquisições — um crédito que a maioria das indústrias não aproveita sistematicamente.`,
        signals: [flags.includes("operacao_industrial") ? "Operação industrial confirmada" : "Perfil industrial com aquisição de atacadistas"],
        pain: "A empresa provavelmente adquire insumos de atacadistas sem aproveitar o crédito presumido de IPI — um crédito que existe exatamente para compensar a não-incidência no atacadista.",
        angle: "Apresentar pelo valor do crédito corrente, além do retroativo. É uma oportunidade recorrente, não pontual.",
        personas: ["Gerente Fiscal", "CFO"],
        questions: ["Quais fornecedores são atacadistas não contribuintes de IPI?", "O crédito presumido de IPI é aproveitado sistematicamente?", "Qual o volume de compras de atacadistas?"],
        docs: ["Cadastro de fornecedores com CNAE e porte", "Notas fiscais de entrada de atacadistas", "EFD-ICMS/IPI"],
        risks: ["Risco remoto. Art. 227 RIPI/2010. Requer identificação dos fornecedores atacadistas."],
        objections: [
          { objection: "Já tomamos crédito de IPI.", response: "O crédito presumido de atacadista é específico — distinto dos créditos de IPI sobre insumos. Requer identificação dos fornecedores atacadistas não contribuintes e cálculo separado." },
        ],
      }

    default:
      return {
        why: `Módulo aplicável para ${SEGMENT_LABELS[seg]} em ${REGIME_LABELS[reg]}.`,
        signals: [`Perfil: ${SEGMENT_LABELS[seg]} + ${REGIME_LABELS[reg]}`],
        pain: "Oportunidade a confirmar com dados específicos da empresa.",
        angle: "Abordar após confirmação dos dados operacionais.",
        personas: ["CFO"],
        questions: ["Qual o histórico tributário da empresa?"],
        docs: ["Documentação fiscal dos últimos 5 anos"],
        risks: [m.risk_level !== "remoto" ? `Risco ${m.risk_level} — análise individual obrigatória.` : "Risco remoto."],
        objections: [],
      }
  }
}

// --------- Persona playbooks ------------------------------------------------------------------------------------------------------------------------

function buildPersonaPlaybooks(
  ctx:     CompanyContext,
  modules: ModuleResult[],
): PersonaPlaybook[] {
  const seg   = SEGMENT_LABELS[ctx.consultant.segment]
  const reg   = REGIME_LABELS[ctx.consultant.tax_regime]
  const nome  = ctx.razao_social
  const coreM = modules.filter(m => m.tier === "core").slice(0, 2)
  const hook  = coreM.map(m => m.name).join(" e ") || "revisão tributária"

  const playbooks: PersonaPlaybook[] = []

  // ------ CFO ------------------------------------------------------------------------------------------------------------------------------------------------------------------
  playbooks.push({
    persona: "CFO / Responsável Financeiro",
    objective: "Agendar diagnóstico de 20 minutos para apresentar potencial de revisão",
    mindset: "Orientado a resultado financeiro. Cético com promessas. Valoriza dados e referências jurídicas sólidas.",
    main_pain: "Pressão de margem e busca por eficiência financeira sem aumentar risco fiscal.",
    language_style: "Financeiro e objetivo. Evitar juridiquês. Usar números e percentuais.",
    opening_script: `Bom dia, [Nome]. Meu nome é [Consultor], da [Empresa]. Trabalho com revisão tributária estratégica para empresas de ${seg} no ${reg} — e identificamos no perfil de ${nome} oportunidades que empresas similares ainda não revisaram. Tenho 2 minutos agora?`,
    full_call_flow: [
      "ABERTURA: Identificar-se e contextualizar brevemente o perfil da empresa",
      `CONTEXTUALIZAÇÃO: 'Trabalhamos com empresas de ${seg} no ${reg} que acumulam créditos tributários não aproveitados por interpretação restritiva.'`,
      `CRIAÇÃO DE DOR: 'Para empresas com o perfil de ${nome}, a oportunidade mais comum é ${hook}.'`,
      "CONEXÃO: 'Fizemos uma análise preliminar do perfil público de vocês e identificamos sinais que merecem ser analisados com mais profundidade.'",
      "VALIDAÇÃO: 'Antes de qualquer estimativa — quanto representam, aproximadamente, o faturamento mensal e a folha de vocês?'",
      "AUTORIDADE: 'Realizamos esse tipo de análise para empresas similares no setor — com base jurídica consolidada, não teses de alto risco.'",
      "TRANSIÇÃO: 'Para trazer uma estimativa mais precisa do potencial para vocês, precisaria de 20 minutos com você ou com o responsável fiscal.'",
      "CTA: 'Semana que vem você tem disponibilidade para uma conversa rápida?'",
      "FALLBACK: 'Entendo que está corrido. Posso enviar um resumo por e-mail com o que identificamos — e você avalia se faz sentido conversar?'",
    ],
    opportunity_hooks: coreM.map(m => `${m.name}: ${m.first_pitch}`),
    strategic_questions: ["Qual o faturamento mensal aproximado?", "Há revisão tributária periódica?", "Quem é o responsável fiscal da empresa?"],
    likely_objections: [
      { objection: "Já temos contador/advogado tributário.", response: "Ótimo. Nossa análise é complementar — olhamos especificamente para oportunidades de revisão que escritórios de rotina geralmente não cobrem por não ser o foco deles." },
      { objection: "Não tenho tempo agora.", response: "Entendo. Posso enviar um resumo de 1 página com o que identificamos — você avalia quando tiver 5 minutos. Qual e-mail?" },
      { objection: "Isso é muito arriscado.", response: "Trabalhamos apenas com teses de baixo risco jurídico — aproveitamento via PER/DCOMP, sem ação judicial. A análise prévia exatamente define o que é viável para vocês." },
    ],
    what_to_avoid: ["Prometer valores antes de ter dados", "Usar termos como 'recuperação garantida'", "Falar em percentuais de honorário na primeira ligação", "Juridiquês no primeiro contato"],
    meeting_cta: "20 minutos para apresentar diagnóstico preliminar e estimativa de potencial",
  })

  // ------ S--cio ---------------------------------------------------------------------------------------------------------------------------------------------------------------
  playbooks.push({
    persona: "Sócio / Proprietário",
    objective: "Criar interesse estratégico e conectar ao CFO ou responsável fiscal",
    mindset: "Visão de dono. Pensa em resultado da empresa. Delega detalhes técnicos mas decide estrategicamente.",
    main_pain: "Não saber de oportunidades que concorrentes podem estar aproveitando.",
    language_style: "Estratégico e direto. Sem detalhes técnicos. Foco em resultado e diferencial.",
    opening_script: `Bom dia, [Nome]. Tenho 1 minuto? Identificamos no perfil de ${nome} oportunidades tributárias que empresas similares estão aproveitando — e que normalmente não passam pelo radar do contador padrão.`,
    full_call_flow: [
      "ABERTURA: Direto e objetivo — valor antes de detalhes",
      `POSICIONAMENTO: 'Trabalhamos com recuperação de créditos tributários para ${seg} no ${reg}.'`,
      "HOOK: 'A maioria das empresas do setor tem créditos acumulados que nunca foram revisados — é dinheiro que pertence à empresa.'",
      "CONEXÃO: 'Em uma análise rápida do perfil público de vocês, identificamos alguns sinais que merecem atenção.'",
      "DELEGAÇÃO: 'Seria melhor conversar com você diretamente ou com o responsável financeiro da empresa?'",
      "CTA: 'Posso agendar 20 minutos com você e o CFO para apresentar o diagnóstico?'",
    ],
    opportunity_hooks: ["Oportunidades que concorrentes já estão aproveitando", "Dinheiro que pertence à empresa mas que nunca foi revisado"],
    strategic_questions: ["Quem é o responsável financeiro/fiscal da empresa?", "A empresa já realizou revisão tributária estratégica nos últimos anos?"],
    likely_objections: [
      { objection: "Meu contador cuida disso.", response: "Contadores gerais cuidam do dia a dia fiscal. O que identificamos é uma análise estratégica de oportunidades históricas — diferente do trabalho cotidiano do contador." },
      { objection: "Não tenho interesse.", response: "Entendo. Se mudar de ideia, o diagnóstico inicial é gratuito e sem compromisso. Posso deixar meu contato?" },
    ],
    what_to_avoid: ["Detalhes técnicos jurídicos", "Valorar antes de qualificação", "Ser insistente se houver recusa clara"],
    meeting_cta: "Reunião de 20 minutos com o CFO para diagnóstico gratuito",
  })

  // ------ Gerente Fiscal ------------------------------------------------------------------------------------------------------------------------------------
  if (modules.some(m => ["revisao_insumos_pis_cofins","ipi_credito_presumido_exportacao","ipi_atacadista","icms_grossup","plurifasico_beneficio"].includes(m.slug))) {
    playbooks.push({
      persona: "Gerente / Responsável Fiscal",
      objective: "Qualificar dados técnicos e obter documentação para diagnóstico",
      mindset: "Técnico e criterioso. Preocupado com risco e conformidade. Valoriza argumentos jurídicos sólidos.",
      main_pain: "Sobrecarga de obrigações acessórias — revisões estratégicas ficam para depois.",
      language_style: "Técnico-jurídico. Pode usar termos específicos. Referenciar a legislação.",
      opening_script: `Bom dia, [Nome]. Sou [Consultor], especialista em revisão de PIS/COFINS para ${seg}. Identificamos no perfil de ${nome} oportunidades relacionadas a ${hook} que gostaríamos de discutir tecnicamente.`,
      full_call_flow: [
        "ABERTURA: Técnica — referencial jurídico imediato",
        "VALIDAÇÃO TÉCNICA: Confirmar se a empresa já realizou revisão específica",
        "QUALIFICAÇÃO: Entender o ERP, escritório contábil e histórico de revisões",
        "PROPOSTA: Oferecer análise técnica complementar sem comprometimento",
        "CTA: Solicitar EFD-Contribuições anonimizada para estimativa",
      ],
      opportunity_hooks: coreM.filter(m => m.complexity !== "Baixa").map(m => `${m.name}: base jurídica ${m.risk_level}`),
      strategic_questions: ["Qual ERP a empresa usa?", "A revisão de insumos foi feita no últimos 5 anos?", "Quem é o escritório tributário de referência?"],
      likely_objections: [
        { objection: "Nosso fiscal já analisa.", response: "Com certeza. O que propomos é uma segunda opinião técnica específica para as teses que identificamos — sem custo inicial. Se já estiver feito, ótimo." },
        { objection: "Isso requer muito documentos.", response: "Para o diagnóstico inicial, precisamos apenas de dados anonimizados do EFD-Contribuições. Não precisa de CNPJ, razão social, nem dados sigilosos nessa fase." },
      ],
      what_to_avoid: ["Apresentar teses sem fundamento", "Subestimar o conhecimento técnico do interlocutor", "Prometer prazos sem ter os dados"],
      meeting_cta: "Call técnica de 30 minutos para apresentar diagnóstico com base jurídica detalhada",
    })
  }

  return playbooks
}

// --------- Strategic reading ------------------------------------------------------------------------------------------------------------------------

function buildStrategicReading(ctx: CompanyContext, result: RuleEngineResult): string {
  const seg   = SEGMENT_LABELS[ctx.consultant.segment]
  const reg   = REGIME_LABELS[ctx.consultant.tax_regime]
  const flags = ctx.consultant.operation_flags ?? []
  const anos  = ctx.anos_operacao
  const core  = result.recommended.filter(m => m.tier === "core")
  const sec   = result.recommended.filter(m => m.tier === "secondary")

  const perfil = ctx.consultant.tax_regime === "simples_nacional"
    ? `Empresa optante pelo Simples Nacional — regime que consolida tributos e exclui as principais teses de revisão PIS/COFINS não-cumulativo. O potencial de revisão tributária é limitado nesse perfil.`
    : `Trata-se de uma empresa de ${seg.toLowerCase()} no ${reg}, com ${anos > 0 ? `${anos} anos de operação` : "tempo de operação a confirmar"}${ctx.porte ? `, porte ${ctx.porte}` : ""}${ctx.uf ? `, sediada em ${ctx.uf}` : ""}.`

  const oportunidades = core.length > 0
    ? `A matriz tributária ${seg} + ${reg} indica ${core.length} oportunidades core — com maior probabilidade de aderência para esse perfil: ${core.map(m => m.name).join(", ")}. ${sec.length > 0 ? `Há ainda ${sec.length} oportunidades secundárias condicionadas a confirmação de dados operacionais.` : ""}`
    : `Nenhuma oportunidade core identificada para esse perfil. O Simples Nacional bloqueia as principais teses de PIS/COFINS.`

  const flags_text = flags.length > 0
    ? `Flags operacionais informadas pelo consultor: ${flags.join(", ")} — utilizadas para refinamento das recomendações.`
    : `Nenhuma flag operacional informada — as recomendações são baseadas exclusivamente na matriz de segmento e regime.`

  const abordagem = ctx.consultant.tax_regime === "simples_nacional"
    ? `A abordagem mais adequada para Simples Nacional é monitorar crescimento e possível mudança de regime.`
    : core.length > 0
    ? `A abordagem deve começar pelos módulos core — especialmente ${core[0]?.name}. ${ctx.faturamento_estimado ? `Com faturamento estimado de ${fmt_brl(ctx.faturamento_estimado)}, o impacto financeiro pode ser relevante.` : "Confirmar o faturamento para estimar o potencial financeiro."} A persona ideal para a abertura é ${result.recommended[0]?.ideal_persona ?? "CFO"}.`
    : `Revisitar em caso de mudança de regime ou crescimento da operação.`

  const gaps = result.missing_for_better_scoring.length > 0
    ? `Informações pendentes para refinar a análise: ${result.missing_for_better_scoring.join(", ")}.`
    : ""

  return [perfil, oportunidades, flags_text, abordagem, gaps].filter(Boolean).join(" ")
}

// --------- Meeting questions ------------------------------------------------------------------------------------------------------------------------

function buildMeetingQuestions(ctx: CompanyContext, modules: ModuleResult[]): string[] {
  const flags = ctx.consultant.operation_flags ?? []
  const q: string[] = [
    `Confirmar regime tributário: ${REGIME_LABELS[ctx.consultant.tax_regime]}?`,
    !ctx.faturamento_estimado ? "Qual o faturamento mensal aproximado?" : null,
    !ctx.folha_estimada ? "Qual o valor da folha de pagamento mensal?" : null,
    "A empresa realizou revisão tributária estratégica nos últimos 3 anos?",
    "Quem é o escritório contábil/tributário de referência?",
  ]
  if (modules.some(m => m.slug === "icms_st_pis_cofins"))
    q.push("Qual o percentual de compras com ICMS-ST embutido?")
  if (modules.some(m => m.slug === "pis_cofins_taxa_cartao"))
    q.push("Qual o percentual de vendas em cartão no faturamento?")
  if (modules.some(m => m.slug === "verbas_indenizatorias"))
    q.push("Qual o histórico de rescisões nos últimos 5 anos?")
  if (modules.some(m => m.slug === "ipi_credito_presumido_exportacao"))
    q.push("Qual o percentual do faturamento destinado à exportação?")
  if (!flags.includes("icms_st") && ctx.consultant.segment === "comercio")
    q.push("A empresa adquire mercadorias com ICMS-ST embutido?")
  return q.filter((x): x is string => Boolean(x))
}

// --------- Main builder ---------------------------------------------------------------------------------------------------------------------------------------

export function buildStrategicDossier(
  ctx:    CompanyContext,
  result: RuleEngineResult,
): StrategicDossier {
  const ci = buildCompanyIntelligence(ctx)

  const contextualized: ContextualizedModule[] = result.recommended.map(m => {
    const mc = contextualizeModule(m, ctx)
    return {
      module_name:               m.name,
      module_slug:               m.slug,
      priority:                  m.tier as "core" | "secondary",
      score:                     m.score,
      risk_level:                m.risk_level,
      why_it_fits_this_company:  mc.why,
      company_specific_signals:  mc.signals,
      opportunity_summary:       m.first_pitch,
      probable_pain:             mc.pain,
      strategic_angle:           mc.angle,
      ideal_personas:            mc.personas,
      first_pitch:               m.first_pitch,
      validation_questions:      mc.questions,
      documents_to_request:      mc.docs,
      risk_notes:                mc.risks,
      objections:                mc.objections,
    }
  })

  const rejected_summary = result.rejected.map(m => ({
    name:   m.name,
    reason: m.blocked_reason ?? `Não aplicável para ${SEGMENT_LABELS[ctx.consultant.segment]} + ${REGIME_LABELS[ctx.consultant.tax_regime]}.`,
  }))

  const playbooks = buildPersonaPlaybooks(ctx, result.recommended)
  const strategic = buildStrategicReading(ctx, result)
  const questions = buildMeetingQuestions(ctx, result.recommended)

  return {
    company_intelligence:   ci,
    strategic_reading:      strategic,
    contextualized_modules: contextualized,
    rejected_summary,
    persona_playbooks:      playbooks,
    meeting_questions:      questions,
    next_steps: [
      `D+0: ${result.recommended.length > 0 ? `Cold call para ${playbooks[0]?.persona ?? "CFO"} com foco em ${contextualized[0]?.module_name ?? "revisão tributária"}` : "Registrar perfil e monitorar mudança de regime"}`,
      "D+3: Enviar resumo executivo de 1 página por e-mail",
      "D+7: Follow-up e qualificação de dados operacionais",
      result.missing_for_better_scoring.length > 0
        ? `D+14: Confirmar: ${result.missing_for_better_scoring.slice(0, 2).join(", ")}`
        : "D+14: Proposta de diagnóstico completo",
    ],
    disclaimer: "Estimativas preliminares para fins comerciais. Sujeitas à validação documental. Não constituem parecer jurídico.",
  }
}
