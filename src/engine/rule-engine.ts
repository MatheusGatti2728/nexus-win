// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS TAX INTELLIGENCE --- Rule Engine
//
// Pipeline:
// 1. lookupMatrix(segment, regime) --- core / secondary / blocked
// 2. applyHardRules() --- eliminations based on company data
// 3. scoreSoftFactors() --- weight each passing module
// 4. computeFinalScore() --- 0---100 aggregate
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import {
  lookupMatrix,
  isBlocked,
  SEGMENT_LABELS,
  REGIME_LABELS,
} from "./tax-matrix"
import type {
  ConsultantInput,
  ModuleSlug,
  ClassifiedModules,
  Segment,
  TaxRegime,
  OperationFlag,
} from "./tax-matrix"

// --------- Company context (from Brasil API + consultant) ---------------------------------

export interface CompanyContext {
  cnpj: string
  razao_social: string
  anos_operacao: number        // drives verbas period
  porte: "micro" | "pequeno" | "medio" | "grande"
  uf: string
  faturamento_estimado?: number  // monthly R$
  folha_estimada?: number        // monthly R$
  // Consultant-provided (always wins over inferred)
  consultant: ConsultantInput
}

// --------- Result types ---------------------------------------------------------------------------------------------------------------------------------------

export interface ModuleResult {
  slug:               ModuleSlug
  name:               string
  tier:               "core" | "secondary" | "blocked"
  score:              number          // 0–100
  risk_level:         "remoto" | "possível" | "estruturante" | "baixo"
  ideal_persona:      string
  first_pitch:        string
  commercial_argument: string
  executive_summary:  string    // simple 1-sentence commercial explanation
  commercial_read:    string    // how the consultant introduces this in the call
  curiosity_trigger:  string    // short phrase to generate interest
  expected_questions: Array<{ q:string; a:string }>
  legal_basis:        string    // STJ/STF/Lei reference
  retroactive_period: string    // how many months/years
  how_to_use_in_call: string    // the specific language to use
  complexity:         "Baixa" | "Média" | "Alta"
  category:           string
  blocked_reason?:    string
  needs_review:       boolean
}

export interface RuleEngineResult {
  final_score:           number          // 0–100
  tier:                  "S" | "A" | "B" | "C" | "D"
  recommended:           ModuleResult[]  // core + secondary (ordered by score)
  rejected:              ModuleResult[]  // blocked
  classified:            ClassifiedModules
  score_explanation:     string
  data_confidence:       "high" | "medium" | "low"
  missing_for_better_scoring: string[]
}

// --------- Module catalog ---------------------------------------------------------------------------------------------------------------------------------

const MODULE_CATALOG: Record<ModuleSlug, Omit<ModuleResult, "score" | "tier" | "blocked_reason" | "needs_review">> = {
  verbas_indenizatorias: {
    slug: "verbas_indenizatorias",
    name: "INSS — Verbas Indenizatórias",
    risk_level: "remoto",
    ideal_persona: "CFO",
    first_pitch: "Empresa paga INSS sobre parcelas da folha que são juridicamente indenizatórias, não remuneratórias.",
    commercial_argument: "Período retroativo relevante. Quanto mais antiga a empresa, maior o impacto.",
    executive_summary: "Empresa recolhe INSS sobre verbas que a lei classifica como indenizatórias — férias proporcionais, aviso prévio indenizado, 1/3 adicional.",
    commercial_read: "Toda empresa com folha relevante tem verbas indenizatórias. A jurisprudência do STJ (Tema 20) consolidou que essas parcelas não integram o salário de contribuição.",
    curiosity_trigger: "Empresas do mesmo porte normalmente recuperam de 3 a 5 anos de recolhimentos — sem discussão administrativa.",
    expected_questions: [
      { q: "Isso não gera risco com a Receita?", a: "Não. O STJ pacificou o tema. O aproveitamento é via PER/DCOMP — processo administrativo, sem autuação." },
      { q: "Qual o volume estimado?", a: "Depende da folha. Com R$ 500k/mês, o impacto retroativo costuma ficar entre R$ 200k e R$ 600k." },
    ],
    legal_basis: "STJ — Tema 20 (REsp 1.230.957/RS)",
    retroactive_period: "60 meses (5 anos)",
    how_to_use_in_call: "Vocês possuem folha relevante — e toda empresa com esse perfil tem verbas indenizatórias que não deveriam compor a base do INSS. Isso é jurisprudência consolidada no STJ.",
    complexity: "Alta",
    category: "Previdenciário",
  },
  sistema_s: {
    slug: "sistema_s",
    name: "Sistema S — Limitação da Base",
    risk_level: "remoto",
    ideal_persona: "CFO",
    first_pitch: "Recolhimentos ao Sistema S acima do limite reconhecido judicialmente pelo STJ (Tema 1079).",
    commercial_argument: "Aproveitamento via PER/DCOMP — processo direto. Período de 39 meses.",
    executive_summary: "O STJ limitou as contribuições ao Sistema S a 20 salários mínimos por empregado — empresas com salários acima desse teto recolhem a maior.",
    commercial_read: "A maioria das empresas com folha relevante nunca limitou a base do Sistema S ao teto reconhecido pelo STJ no Tema 1.079.",
    curiosity_trigger: "Um ponto específico sobre a composição da folha de vocês que raramente entra no radar contábil.",
    expected_questions: [
      { q: "Isso já foi decidido definitivamente?", a: "Sim. Tema 1.079 do STJ — julgado sob recurso repetitivo. Vincula toda a Justiça Federal." },
      { q: "O prazo de compensação ainda está aberto?", a: "Sim. O crédito nasce mensalmente — os últimos 60 meses ainda estão disponíveis para compensação." },
    ],
    legal_basis: "STJ — Tema 1.079 (REsp 1.898.532/CE)",
    retroactive_period: "60 meses (5 anos)",
    how_to_use_in_call: "Há um ponto específico relacionado à composição da base de contribuições ao Sistema S — o STJ fixou um teto que a maioria das empresas do perfil de vocês nunca aproveitou sistematicamente.",
    complexity: "Baixa",
    category: "Encargos sobre Folha",
  },
  pis_cofins_folha: {
    slug: "pis_cofins_folha",
    name: "PIS/COFINS sobre Folha — Tese Estrutural",
    risk_level: "estruturante",
    ideal_persona: "CFO",
    first_pitch: "Empresas intensivas em mão de obra têm tese estrutural sobre a constitucionalidade do PIS/COFINS incidente sobre a folha.",
    commercial_argument: "Posicionamento estratégico de longo prazo. Requer análise individualizada.",

    executive_summary: "Empresas intensivas em mão de obra pagam PIS/COFINS sobre sua maior despesa — a folha. Há discussão sobre a inconstitucionalidade dessa tributação para empresas com substituição de mão de obra como atividade-fim.",
    commercial_read: "A tese é estruturante — não é uma revisão retroativa simples, mas um posicionamento estratégico de longo prazo para empresas com folha expressiva.",
    curiosity_trigger: "Para empresas onde a folha representa mais de 40% da receita, esse é o ponto com maior impacto potencial no longo prazo.",
    expected_questions: [
      { q: "Isso tem chance de prosperar?", a: "A tese está em análise no STF. Por ser estruturante, requer monitoramento — mas o impacto potencial é alto para empresas intensivas em mão de obra." },
      { q: "É diferente do Sistema S?", a: "Sim. Sistema S é sobre limite de base em contribuições já consolidadas. Esta tese questiona a própria constitucionalidade do PIS/COFINS sobre a folha — mais ampla e mais arriscada." },
    ],
    legal_basis: "STF — RE 603.624 (em análise)",
    retroactive_period: "Prospectivo — eficácia depende do julgamento",
    how_to_use_in_call: "Para empresas com folha intensa, há uma discussão estrutural sobre como o PIS/COFINS incide sobre o custo de mão de obra — é um ponto que requer acompanhamento de longo prazo, não uma revisão imediata.",
    complexity: "Alta",
    category: "PIS/COFINS",
  },
  icms_iss_acao_coletiva: {
    slug: "icms_iss_acao_coletiva",
    name: "ICMS e ISS — Base PIS/COFINS (Ação Coletiva)",
    risk_level: "remoto",
    ideal_persona: "CFO",
    first_pitch: "Exclusão do ICMS e ISS da base do PIS/COFINS via ação coletiva (Tema 69 STF).",
    commercial_argument: "Período retroativo ampliado via estrutura de ação coletiva.",
    executive_summary: "O STF decidiu que ICMS e ISS não integram a base do PIS/COFINS — a empresa tem direito de excluir esses valores retroativamente.",
    commercial_read: "O Tema 69 do STF é uma das maiores decisões tributárias da última década. Empresas que ainda não aproveitaram têm período retroativo aberto.",
    curiosity_trigger: "Decisão do STF que beneficia toda empresa tributada pelo Lucro Real — verificamos se o aproveitamento foi feito corretamente.",
    expected_questions: [
      { q: "Isso já não foi aproveitado pelo nosso contador?", a: "Muitas vezes o aproveitamento foi parcial — sem o gross-up ou sem o período completo. Vale verificar." },
      { q: "Há risco de questionamento?", a: "Nenhum. O STF decidiu em sede de repercussão geral. É um direito líquido da empresa." },
    ],
    legal_basis: "STF — Tema 69 (RE 574.706/PR)",
    retroactive_period: "60 meses (5 anos)",
    how_to_use_in_call: "Com base no perfil fiscal de vocês, o Tema 69 do STF pode ter sido aproveitado de forma incompleta — estamos falando da exclusão do ICMS e ISS da base do PIS/COFINS, com retroativo de 5 anos.",
    complexity: "Média",
    category: "PIS/COFINS",
  },
  revisao_insumos_pis_cofins: {
    slug: "revisao_insumos_pis_cofins",
    name: "PIS/COFINS — Revisão de Insumos",
    risk_level: "remoto",
    ideal_persona: "Gerente Fiscal",
    first_pitch: "Ampliação do conceito de insumo para créditos PIS/COFINS (REsp 1.221.170/PR STJ).",
    commercial_argument: "Empresas com operação industrial ou de serviços complexos têm créditos não aproveitados.",
    executive_summary: "O STJ ampliou o conceito de insumo para PIS/COFINS — empresas industriais e de serviços têm créditos não aproveitados sobre matérias-primas, embalagens e serviços ligados à produção.",
    commercial_read: "A decisão do STJ no REsp 1.221.170 é de 2018 mas a maioria das empresas industriais ainda não revisou a lista de insumos com base no novo conceito.",
    curiosity_trigger: "Uma revisão que normalmente identifica créditos que a empresa tem direito mas que não foram escriturados porque o conceito de insumo mudou.",
    expected_questions: [
      { q: "O que muda com o novo conceito?", a: "Antes: só matéria-prima direta. Depois: tudo que é essencial ou relevante ao processo produtivo — embalagens, serviços, EPIs, lubrificantes, energia." },
      { q: "Isso muda o operacional da empresa?", a: "Não. É uma revisão do passado e uma adequação futura. O processo produtivo não é alterado." },
    ],
    legal_basis: "STJ — REsp 1.221.170/PR (recursos repetitivos)",
    retroactive_period: "60 meses (5 anos)",
    how_to_use_in_call: "O STJ expandiu o conceito de insumo em 2018 — e empresas industriais como vocês normalmente têm créditos de PIS/COFINS não aproveitados sobre itens que agora se qualificam. Isso é uma revisão do passado, não uma mudança no processo.",
    complexity: "Alta",
    category: "PIS/COFINS",
  },
  icms_grossup: {
    slug: "icms_grossup",
    name: "ICMS Gross-Up — Aprofundamento Tema 69",
    risk_level: "possível",
    ideal_persona: "Gerente Fiscal",
    first_pitch: "Exclusão do ICMS calculado 'por dentro' da base PIS/COFINS — diferença entre ICMS incidente e destacado.",
    commercial_argument: "Desdobramento do Tema 69 STF para empresas que já aproveitaram a exclusão básica.",
    executive_summary: "Além da exclusão básica do ICMS da base PIS/COFINS, há um ajuste técnico (gross-up) que amplia o crédito — para empresas que já aproveitaram o Tema 69.",
    commercial_read: "O Tema 69 muitas vezes foi aproveitado sem o gross-up — a diferença entre o ICMS destacado e o ICMS incidente. É um complemento técnico ao aproveitamento já feito.",
    curiosity_trigger: "Empresas que aproveitaram o Tema 69 frequentemente deixaram uma parcela do crédito na mesa por conta do cálculo do gross-up.",
    expected_questions: [
      { q: "Isso não foi feito já quando aproveitamos o Tema 69?", a: "Na maioria das vezes, não. O gross-up é um cálculo adicional que muitas estruturas não realizaram corretamente." },
    ],
    legal_basis: "STF — Tema 69 + IN RFB 1.911/2019 (método de cálculo)",
    retroactive_period: "60 meses (5 anos)",
    how_to_use_in_call: "Para quem já aproveitou o Tema 69, existe uma análise complementar chamada gross-up que avalia se o cálculo foi feito pelo método correto — e que frequentemente identifica um diferencial não aproveitado.",
    complexity: "Alta",
    category: "PIS/COFINS",
  },
  ipi_credito_presumido_exportacao: {
    slug: "ipi_credito_presumido_exportacao",
    name: "IPI — Crédito Presumido Exportação",
    risk_level: "remoto",
    ideal_persona: "Gerente Fiscal",
    first_pitch: "Crédito presumido de IPI sobre exportações. Alíquota fixada em lei: 5,37%.",
    commercial_argument: "Segurança jurídica máxima — Lei 9.363/96. Aproveitamento via PER/DCOMP.",
    executive_summary: "Indústrias exportadoras têm direito a crédito presumido de IPI de 5,37% sobre o valor exportado — alíquota fixada em lei, sem risco de questionamento.",
    commercial_read: "A Lei 9.363/96 garante crédito presumido de IPI para quem exporta. A maioria das indústrias exportadoras nunca aproveitou sistematicamente os últimos 5 anos.",
    curiosity_trigger: "Um crédito com alíquota fixada em lei — sem litigio, sem risco, com 5 anos de retroativo disponível.",
    expected_questions: [
      { q: "Qual a alíquota exata?", a: "5,37% sobre o valor das saídas para exportação — fixada pela Instrução Normativa RFB. Não há discussão sobre a alíquota." },
      { q: "Como é o processo de aproveitamento?", a: "Via PER/DCOMP — compensação administrativa. Período médio de 6 a 12 meses para homologação." },
    ],
    legal_basis: "Lei 9.363/1996 + IN RFB 1.717/2017",
    retroactive_period: "60 meses (5 anos)",
    how_to_use_in_call: "Para indústrias que exportam, há um crédito de IPI com alíquota fixada em lei — 5,37% — que normalmente não é aproveitado sistematicamente. Com 5 anos de retroativo disponível, o impacto costuma ser relevante.",
    complexity: "Média",
    category: "IPI",
  },
  difal_pis_cofins: {
    slug: "difal_pis_cofins",
    name: "DIFAL — Base PIS/COFINS",
    risk_level: "remoto",
    ideal_persona: "CFO",
    first_pitch: "Exclusão do DIFAL da base PIS/COFINS — desdobramento do Tema 69 STF para operações interestaduais.",
    commercial_argument: "Empresas com e-commerce ou venda interestadual têm base de cálculo reduzida.",
    executive_summary: "O DIFAL recolhido nas operações interestaduais não deveria integrar a base do PIS/COFINS — tese derivada do Tema 69 STF.",
    commercial_read: "Empresas com operação interestadual relevante — especialmente e-commerce — têm potencial de crédito sobre o DIFAL que normalmente não está no radar.",
    curiosity_trigger: "Para quem vende para outros estados, há um desdobramento do Tema 69 especificamente sobre o DIFAL — ainda pouco explorado.",
    expected_questions: [
      { q: "É diferente do Tema 69 original?", a: "Sim. É um desdobramento específico para o DIFAL — que segue a mesma lógica mas exige análise separada por estado de destino." },
    ],
    legal_basis: "STF — Tema 69 (extensão ao DIFAL)",
    retroactive_period: "60 meses (5 anos)",
    how_to_use_in_call: "Para operações interestaduais, há um desdobramento específico do Tema 69 envolvendo o DIFAL — especialmente relevante para quem tem volume relevante de vendas para outros estados.",
    complexity: "Média",
    category: "ICMS/PIS/COFINS",
  },
  plurifasico_beneficio: {
    slug: "plurifasico_beneficio",
    name: "PIS/COFINS — Produtos Plurifásicos com Benefício",
    risk_level: "baixo",
    ideal_persona: "Gerente Fiscal",
    first_pitch: "Manutenção de créditos PIS/COFINS em revenda de produtos plurifásicos com benefício na saída.",
    commercial_argument: "Art. 17 Lei 11.033/2004. Requer análise NCM por NCM.",

    executive_summary: "Empresas que revendem produtos com tributação monofásica de PIS/COFINS e que possuem benefício fiscal na saída têm direito de manter os créditos de PIS/COFINS das entradas — mesmo que a saída seja isenta.",
    commercial_read: "O art. 17 da Lei 11.033/2004 garante a manutenção de créditos mesmo quando a saída tem alíquota zero. Distribuidores e varejistas que revendem produtos plurifásicos raramente aproveitam isso corretamente.",
    curiosity_trigger: "Distribuidores de produtos monofásicos frequentemente têm créditos de PIS/COFINS acumulados que não são aproveitados por interpretação equivocada da legislação.",
    expected_questions: [
      { q: "O que são produtos plurifásicos?", a: "Produtos onde o PIS/COFINS é recolhido na industria com alíquota concentrada — como combustíveis, medicamentos, bebidas, cigarros e alguns alimentos." },
      { q: "Como identificar se cabe para a empresa?", a: "Analisando o NCM dos produtos revendidos e verificando se há benefício na saída. Requer análise produto a produto." },
    ],
    legal_basis: "Art. 17 da Lei 11.033/2004 + CARF",
    retroactive_period: "60 meses (5 anos)",
    how_to_use_in_call: "Distribuidores que revendem produtos de tributação concentrada têm um ponto específico sobre manutenção de créditos que raramente está no radar da análise contábil cotidiana.",
    complexity: "Alta",
    category: "PIS/COFINS",
  },
  icms_st_pis_cofins: {
    slug: "icms_st_pis_cofins",
    name: "ICMS-ST — Exclusão da Base PIS/COFINS",
    risk_level: "remoto",
    ideal_persona: "CFO",
    first_pitch: "Exclusão do ICMS-ST embutido no preço de compra da base PIS/COFINS (Tema 1.125 STJ).",
    commercial_argument: "STJ pacificou em dez/2023. Período retroativo desde 17/03/2017.",
    executive_summary: "O STJ decidiu (Tema 1.125) que o ICMS-ST embutido no preço de compra não deve integrar a base do PIS/COFINS — empresas do varejo e atacado têm créditos retroativos.",
    commercial_read: "O Tema 1.125 é relativamente recente — decidido em 2023 — e poucos varejistas e distribuidores já aproveitaram o retroativo disponível.",
    curiosity_trigger: "Uma tese recente do STJ que afeta diretamente quem compra mercadorias com ICMS-ST embutido — e que ainda tem 5 anos de retroativo aberto.",
    expected_questions: [
      { q: "Quando o STJ decidiu isso?", a: "O Tema 1.125 foi julgado pelo STJ em 2023 sob recurso repetitivo. Por ser recente, a maioria das empresas ainda não aproveitou o período retroativo completo disponível." },
      { q: "Como identificar o ICMS-ST nas compras?", a: "O ICMS-ST está no campo específico da NF-e. Nossa análise inicial usa percentual estimado sobre o volume de compras para dimensionar o impacto antes de ir aos documentos." },
    ],
    legal_basis: "STJ — Tema 1.125 (EREsp 1.900.959)",
    retroactive_period: "60 meses (5 anos)",
    how_to_use_in_call: "O STJ decidiu em 2023 que o ICMS-ST embutido no preço de compra não integra a base do PIS/COFINS — e empresas do perfil de vocês ainda têm 5 anos de retroativo disponível para aproveitamento.",
    complexity: "Baixa",
    category: "PIS/COFINS",
  },
  ipi_atacadista: {
    slug: "ipi_atacadista",
    name: "IPI — Atacadista Não Contribuinte",
    risk_level: "remoto",
    ideal_persona: "Gerente Fiscal",
    first_pitch: "Crédito presumido de IPI sobre aquisições de atacadistas não contribuintes (Art. 227 RIPI/2010).",
    commercial_argument: "Indústrias com compras de atacadistas têm créditos sistematicamente não aproveitados.",
    executive_summary: "Indústrias que compram de atacadistas não contribuintes de IPI têm direito a crédito presumido — REsp 1.836.373 do STJ.",
    commercial_read: "Quando a indústria compra de atacadista que não é contribuinte de IPI, ela tem direito a um crédito presumido de 5,37% sobre essas compras.",
    curiosity_trigger: "Um crédito que aparece especificamente quando parte das compras vem de atacadistas — e que raramente é identificado na análise corrente.",
    expected_questions: [
      { q: "Como identificar quais fornecedores são atacadistas não contribuintes?", a: "Pela análise do CNAE dos fornecedores nas notas fiscais de entrada — processo que fazemos na análise documental." },
    ],
    legal_basis: "STJ — REsp 1.836.373/SC",
    retroactive_period: "60 meses (5 anos)",
    how_to_use_in_call: "Para indústrias com compras de atacadistas, há um crédito presumido de IPI que o STJ reconheceu especificamente para esse perfil de cadeia de fornecimento.",
    complexity: "Média",
    category: "IPI",
  },
  pis_cofins_taxa_cartao: {
    slug: "pis_cofins_taxa_cartao",
    name: "PIS/COFINS — Exclusão das Taxas de Cartão",
    risk_level: "possível",
    ideal_persona: "CFO",
    first_pitch: "Exclusão das taxas pagas a operadoras de cartão da base PIS/COFINS.",
    commercial_argument: "Empresas com alto volume de vendas em cartão pagam PIS/COFINS sobre valores que não são receita.",

    executive_summary: "A taxa cobrada pela operadora de cartão (MDR) não deveria integrar a base de cálculo do PIS/COFINS — o STJ consolidou esse entendimento nos Temas 779 e 780.",
    commercial_read: "Empresas com alto volume de vendas em cartão pagam PIS/COFINS sobre a receita bruta, incluindo a taxa que vai diretamente para a operadora — o STJ entendeu que isso é tributar receita de terceiros.",
    curiosity_trigger: "Para empresas com mais de 60% das vendas em cartão, a taxa de MDR pode representar um ponto tributário relevante que nunca foi revisado.",
    expected_questions: [
      { q: "O STJ já julgou isso?", a: "Os Temas 779 e 780 do STJ estão em processo de consolidação. O entendimento é favorável ao contribuinte, mas requer acompanhamento do status processual." },
      { q: "Como se calcula o impacto?", a: "Faturamento em cartão × MDR médio (geralmente 1,5% a 3%) × alíquota PIS/COFINS (9,25% no Lucro Real). O retroativo dos últimos 5 anos costuma ser relevante para quem tem alto volume em cartão." },
    ],
    legal_basis: "STJ — Temas 779 e 780",
    retroactive_period: "60 meses (5 anos)",
    how_to_use_in_call: "Empresas com alto volume de vendas em cartão pagam PIS/COFINS sobre a taxa da maquininha — que vai para a operadora, não para a empresa. O STJ entende que isso é tributar receita de terceiros.",
    complexity: "Média",
    category: "PIS/COFINS",
  },
  bonificacoes_descontos: {
    slug: "bonificacoes_descontos",
    name: "PIS/COFINS — Bonificações e Descontos",
    risk_level: "remoto",
    ideal_persona: "CFO",
    first_pitch: "Exclusão de bonificações e descontos incondicionais da base PIS/COFINS.",
    commercial_argument: "Empresas com política de bonificação de fornecedores têm base reduzida não aproveitada.",
    executive_summary: "Bonificações e descontos concedidos comercialmente reduzem a base de PIS/COFINS — mas muitas empresas não fazem essa dedução corretamente.",
    commercial_read: "Empresas com política comercial de descontos e bonificações têm base reduzida de PIS/COFINS que frequentemente não é aproveitada na apuração corrente.",
    curiosity_trigger: "Uma revisão específica de como bonificações e descontos são tratados na apuração do PIS/COFINS — impacto direto na base de cálculo.",
    expected_questions: [
      { q: "Isso vale para descontos financeiros também?", a: "Há distinção entre desconto comercial (reduz base) e desconto financeiro (não reduz). Nossa análise mapeia cada tipo." },
    ],
    legal_basis: "Art. 14 Lei 10.833/2003 + IN RFB 1.911/2019 + CARF",
    retroactive_period: "60 meses (5 anos)",
    how_to_use_in_call: "Empresas com política de bonificação e descontos comerciais têm base de PIS/COFINS que pode estar superestimada — especialmente quando os descontos são registrados fora da nota fiscal.",
    complexity: "Baixa",
    category: "PIS/COFINS",
  },
}

// --------- Soft factor scoring ------------------------------------------------------------------------------------------------------------------

function scoreModule(
  slug: ModuleSlug,
  tier: "core" | "secondary",
  ctx: CompanyContext,
): number {
  let base = tier === "core" ? 75 : 50

  const flags = ctx.consultant.operation_flags ?? []

  // Boost by specific signals
  if (slug === "verbas_indenizatorias") {
    if (ctx.anos_operacao >= 15) base += 15
    else if (ctx.anos_operacao >= 8) base += 8
    else if (ctx.anos_operacao < 4)  base -= 15
  }

  if (slug === "sistema_s") {
    if (flags.includes("folha_relevante")) base += 10
    if (ctx.porte === "grande") base += 8
    if (ctx.porte === "medio")  base += 4
  }

  if (slug === "pis_cofins_taxa_cartao" && flags.includes("venda_cartao"))  base += 12
  if (slug === "icms_st_pis_cofins"     && flags.includes("icms_st"))        base += 12
  if (slug === "difal_pis_cofins"        && flags.includes("ecommerce"))      base += 10
  if (slug === "difal_pis_cofins"        && flags.includes("venda_interestadual")) base += 8
  if (slug === "icms_iss_acao_coletiva"  && flags.includes("operacao_iss"))   base += 10
  if (slug === "ipi_credito_presumido_exportacao" && flags.includes("exportacao")) base += 12
  if (slug === "revisao_insumos_pis_cofins" && flags.includes("operacao_industrial")) base += 8

  // Porte boost
  if (ctx.porte === "grande") base += 5
  if (ctx.porte === "micro")  base -= 10

  // Risk penalty for poss--vel/estruturante in secondary
  const mod = MODULE_CATALOG[slug]
  if (tier === "secondary") {
    if (mod.risk_level === "possível")     base -= 5
    if (mod.risk_level === "estruturante") base -= 10
  }

  return Math.min(98, Math.max(20, base))
}

// --------- Final score (0---100) ------------------------------------------------------------------------------------------------------------------

function computeScore(recommended: ModuleResult[], regime: TaxRegime): number {
  if (recommended.length === 0) return 0
  if (regime === "simples_nacional") return Math.min(25, recommended.length * 5)

  const coreCount = recommended.filter(m => m.tier === "core").length
  const secCount  = recommended.filter(m => m.tier === "secondary").length
  const avgScore  = recommended.reduce((s, m) => s + m.score, 0) / recommended.length

  let final = avgScore
  if (coreCount >= 3) final += 8
  if (coreCount >= 5) final += 5
  if (secCount  >= 2) final += 3

  return Math.min(98, Math.round(final))
}

function scoreTier(score: number): "S" | "A" | "B" | "C" | "D" {
  if (score >= 90) return "S"
  if (score >= 70) return "A"
  if (score >= 50) return "B"
  if (score >= 30) return "C"
  return "D"
}

// --------- Main engine function ---------------------------------------------------------------------------------------------------------------

export function runRuleEngine(ctx: CompanyContext): RuleEngineResult {
  // STEP 1: Matrix lookup --- consultant data ALWAYS wins
  const classified = lookupMatrix(ctx.consultant, "consultant_override")

  // STEP 2: Build recommended modules (core + secondary, not blocked)
  const recommendedSlugs = [...classified.core, ...classified.secondary]

  const recommended: ModuleResult[] = recommendedSlugs
    .map(slug => {
      const catalog  = MODULE_CATALOG[slug]
      const tier     = classified.core.includes(slug) ? "core" : "secondary"
      const score    = scoreModule(slug, tier, ctx)
      const needs_review =
        slug === "pis_cofins_folha" ||
        slug === "plurifasico_beneficio" ||
        (slug === "icms_grossup" && tier === "secondary") ||
        (slug === "pis_cofins_taxa_cartao" && catalog.risk_level === "possível")

      return {
        ...catalog,
        tier,
        score,
        needs_review,
      }
    })
    .sort((a, b) => {
      // Core always above secondary; within same tier, sort by score
      if (a.tier !== b.tier) return a.tier === "core" ? -1 : 1
      return b.score - a.score
    })

  // STEP 3: Rejected modules
  const rejected: ModuleResult[] = classified.blocked.map(slug => ({
    ...MODULE_CATALOG[slug],
    tier:    "blocked" as const,
    score:   0,
    needs_review: false,
    blocked_reason: buildBlockedReason(slug, ctx.consultant),
  }))

  // STEP 4: Score
  const final_score = computeScore(recommended, ctx.consultant.tax_regime)
  const tier        = scoreTier(final_score)

  const missing: string[] = []
  if (!ctx.faturamento_estimado)  missing.push("Faturamento mensal estimado")
  if (!ctx.folha_estimada)        missing.push("Folha de pagamento mensal")
  if (ctx.consultant.operation_flags?.length === 0) missing.push("Flags operacionais da empresa")

  return {
    final_score,
    tier,
    recommended,
    rejected,
    classified,
    score_explanation:
      `${SEGMENT_LABELS[ctx.consultant.segment]} + ${REGIME_LABELS[ctx.consultant.tax_regime]}: ` +
      `${recommended.filter(m => m.tier === "core").length} core, ` +
      `${recommended.filter(m => m.tier === "secondary").length} secundários.`,
    data_confidence:
      ctx.faturamento_estimado && ctx.folha_estimada ? "high"
      : ctx.anos_operacao > 0 ? "medium" : "low",
    missing_for_better_scoring: missing,
  }
}

function buildBlockedReason(slug: ModuleSlug, input: ConsultantInput): string {
  const regime  = REGIME_LABELS[input.tax_regime]
  const segment = SEGMENT_LABELS[input.segment]

  const reasons: Partial<Record<ModuleSlug, string>> = {
    ipi_credito_presumido_exportacao: `Módulo industrial — não aplicável para ${segment}.`,
    ipi_atacadista:                   `Módulo industrial — não aplicável para ${segment}.`,
    icms_st_pis_cofins:               `Bloquear: empresa não é substituto tributário em ${segment}.`,
    revisao_insumos_pis_cofins:       `Não cumulativo — bloqueado para ${regime}.`,
    pis_cofins_folha:                 `Bloqueado para ${regime} — tese estrutural requer LR.`,
    bonificacoes_descontos:           `Não cumulativo — bloqueado para ${regime} ou ${segment}.`,
    plurifasico_beneficio:            `Específico para revenda varejista — não aplicável.`,
    difal_pis_cofins:                 `Sem flag de e-commerce ou venda interestadual identificada.`,
    pis_cofins_taxa_cartao:           `Baixo volume de vendas em cartão para este perfil.`,
    icms_iss_acao_coletiva:           `ISS não identificado para ${segment}.`,
  }

  return reasons[slug] ?? `Não aplicável para ${segment} + ${regime}.`
}
