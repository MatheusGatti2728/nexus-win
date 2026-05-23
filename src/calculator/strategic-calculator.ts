// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Strategic Financial Calculator
//
// Deterministic calculations for:
// 1. Sistema S (Tema 1079 STJ)
// 2. PIS/COFINS Taxa Operadora de Cart--o (Temas 779/780)
// 3. IPI Atacadista N--o Contribuinte (REsp 1.836.373)
//
// RULES:
// - No LLM. All calculations are deterministic.
// - Show formula, premises, limitations.
// - Always add disclaimer.
// - Confidence tied to input quality.
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

export interface FinancialRange {
  conservador:  number   // 70% of probable
  provavel:     number   // base calculation
  otimista:     number   // 130% of probable
}

export interface CalculationResult {
  module_slug:      string
  module_name:      string
  monthly_impact:   FinancialRange | null   // null when inputs missing
  retroativo_5y:    FinancialRange | null   // 60 months
  confidence:       "low" | "medium" | "high"
  formula:          string
  premises:         string[]
  limitations:      string[]
  disclaimer:       string
  inputs_used:      Record<string, number | string>
  missing_inputs:   string[]
  show_to_client:   boolean   // false for high-risk modules
}

const DISCLAIMER = "Estimativa preliminar sujeita à validação documental. Valores reais dependem de análise detalhada dos documentos fiscais e contábeis da empresa."

// --------- Helper ---------------------------------------------------------------------------------------------------------------------------------------------------------

function range(base: number): FinancialRange {
  return { conservador: Math.round(base * 0.70), provavel: Math.round(base), otimista: Math.round(base * 1.30) }
}

function fmtBRL(n: number): string {
  return n >= 1_000_000 ? `R$ ${(n/1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `R$ ${Math.round(n/1_000)}k`
    : `R$ ${n}`
}

// --------- 1. Sistema S ---------------------------------------------------------------------------------------------------------------------------------------
// Base legal: Tema 1.079 STJ --- limita----o das contribui----es ao Sistema S
// ao teto de 20 sal--rios m--nimos por empregado.
// Empresas com sal--rios m--dios altos e muitos funcion--rios pagam excedente.

export interface SistemaSInput {
  folha_mensal_bruta: number   // total folha R$
  num_funcionarios?: number    // optional
}

export function calcSistemaS(input: SistemaSInput): CalculationResult {
  const missing: string[] = []
  if (!input.folha_mensal_bruta || input.folha_mensal_bruta <= 0) missing.push("Folha mensal bruta (R$)")

  if (missing.length > 0) {
    return {
      module_slug: "sistema_s", module_name: "Sistema S -- Limitacao de Base",
      monthly_impact: null, retroativo_5y: null,
      confidence: "low", formula: "MAX(0, folha - 20xSM) x 5,8%",
      premises: ["Requer folha mensal bruta"],
      limitations: ["Calculo nao disponivel sem dados de folha"],
      disclaimer: DISCLAIMER, inputs_used: {}, missing_inputs: missing, show_to_client: true,
    }
  }

  // Tema 1.079 STJ: base do Sistema S limitada a 20 salarios minimos (total da folha)
  // Qualquer folha acima de R$30.360/mes gera excedente a recuperar
  const ALIQUOTA_SS  = 0.058          // SESI + SENAI + SESC + SENAC combined
  const SM_2025      = 1_518
  const TETO_FOLHA   = SM_2025 * 20  // R$ 30.360 -- teto da base de calculo

  const excedente_mensal = Math.max(0, input.folha_mensal_bruta - TETO_FOLHA)
  const monthly_base     = excedente_mensal * ALIQUOTA_SS
  const retroativo       = monthly_base * 60

  const hasImpact = monthly_base > 10

  return {
    module_slug:    "sistema_s",
    module_name:    "Sistema S -- Limitacao de Base (Tema 1.079 STJ)",
    monthly_impact: hasImpact ? range(monthly_base) : null,
    retroativo_5y:  hasImpact ? range(retroativo)   : null,
    confidence:     "medium",
    formula:        `Excedente = MAX(0, R$ ${fmtBRL(input.folha_mensal_bruta)} - R$ ${fmtBRL(TETO_FOLHA)}) x 5,8% x 60 meses`,
    premises: [
      `Folha mensal bruta: ${fmtBRL(input.folha_mensal_bruta)}`,
      `Teto legal (20 x SM R$ 1.518): ${fmtBRL(TETO_FOLHA)}`,
      `Excedente mensal: ${fmtBRL(excedente_mensal)}`,
      `Aliquota Sistema S (SESI+SENAI+SESC+SENAC): 5,8%`,
      `Impacto mensal estimado: ${fmtBRL(monthly_base)}`,
    ],
    limitations: [
      "Considera aliquota combinada de 5,8% (pode variar por CNAE e atividade)",
      "Calculo baseado na folha total -- analise por empregado pode variar",
      "Nao inclui RAT/FAP nem contribuicoes previdenciarias principais",
      "Tese em consolidacao no STJ -- verificar situacao processual atual",
    ],
    disclaimer:     DISCLAIMER,
    inputs_used:    { folha_mensal: input.folha_mensal_bruta, teto: TETO_FOLHA },
    missing_inputs: [],
    show_to_client: true,
  }
}

// --------- 2. PIS/COFINS Taxa Operadora de Cart--o ------------------------------------------------------
// Base legal: Temas 779/780 STJ + REsp 1.836.373
// Taxa da maquininha (MDR) n--o deveria compor base PIS/COFINS.
// Al--quota PIS/COFINS n--o-cumulativo: 9,25%

export interface TaxaCartaoInput {
  faturamento_mensal:   number    // total faturamento R$
  percentual_cartao:    number    // % vendas em cartão (0-100)
  taxa_media_mdr?:      number    // % MDR médio (default 1,8%)
  regime:               "lucro_real" | "lucro_presumido" | "simples_nacional"
}

export function calcTaxaCartao(input: TaxaCartaoInput): CalculationResult {
  const missing: string[] = []
  if (!input.faturamento_mensal || input.faturamento_mensal <= 0) missing.push("Faturamento mensal (R$)")
  if (!input.percentual_cartao  || input.percentual_cartao  <= 0) missing.push("Percentual de vendas em cartão (%)")

  if (missing.length > 0 || input.regime === "simples_nacional") {
    return {
      module_slug: "pis_cofins_taxa_cartao", module_name: "PIS/COFINS — Taxas de Cartão",
      monthly_impact: null, retroativo_5y: null,
      confidence: "low",
      formula: "faturamento_cartao × MDR% × 9,25%",
      premises: input.regime === "simples_nacional" ? ["Não aplicável ao Simples Nacional"] : ["Requer faturamento e percentual em cartão"],
      limitations: [], disclaimer: DISCLAIMER,
      inputs_used: {}, missing_inputs: missing,
      show_to_client: input.regime !== "simples_nacional",
    }
  }

  const ALIQUOTA_PIS_COFINS = input.regime === "lucro_real" ? 0.0925 : 0.0365
  const MDR = (input.taxa_media_mdr ?? 1.8) / 100
  const vendas_cartao   = input.faturamento_mensal * (input.percentual_cartao / 100)
  const taxa_total      = vendas_cartao * MDR
  const monthly_base    = taxa_total * ALIQUOTA_PIS_COFINS
  const retroativo      = monthly_base * 60

  return {
    module_slug:    "pis_cofins_taxa_cartao",
    module_name:    "PIS/COFINS — Exclusão das Taxas de Cartão (Temas 779/780)",
    monthly_impact: monthly_base > 50 ? range(monthly_base) : null,
    retroativo_5y:  retroativo   > 50 ? range(retroativo)  : null,
    confidence:     input.taxa_media_mdr ? "medium" : "low",
    formula:        `faturamento_cartão (${fmtBRL(vendas_cartao)}) × MDR (${(MDR*100).toFixed(1)}%) × ${(ALIQUOTA_PIS_COFINS*100).toFixed(2)}% PIS/COFINS`,
    premises:       [
      `Faturamento mensal: ${fmtBRL(input.faturamento_mensal)}`,
      `Vendas em cartão: ${input.percentual_cartao}% = ${fmtBRL(vendas_cartao)}`,
      `MDR médio: ${(MDR*100).toFixed(1)}%`,
      `Alíquota PIS/COFINS (${input.regime}): ${(ALIQUOTA_PIS_COFINS*100).toFixed(2)}%`,
    ],
    limitations:    [
      "Tema 779/780 ainda em discussão no STJ — risco POSSÍVEL",
      "MDR varia por bandeira e volume — impacta cálculo",
      "Requer extrato detalhado de adquirentes para cálculo preciso",
    ],
    disclaimer:     DISCLAIMER,
    inputs_used:    { faturamento_mensal: input.faturamento_mensal, percentual_cartao: input.percentual_cartao },
    missing_inputs: [],
    show_to_client: true,  // but must present risk first
  }
}

// --------- 3. IPI Atacadista N--o Contribuinte ------------------------------------------------------------------
// Base legal: REsp 1.836.373 STJ
// Ind--stria que adquire de atacadista (n--o contribuinte IPI)
// pode requerer cr--dito presumido de IPI sobre as entradas.
// Al--quota fixada: 5,37% sobre valor das entradas de atacadistas.

export interface IPIAtacadistaInput {
  compras_mensais_total:        number    // total compras R$
  percentual_atacadista?:       number    // % de atacadistas (default 30%)
}

export function calcIPIAtacadista(input: IPIAtacadistaInput): CalculationResult {
  const missing: string[] = []
  if (!input.compras_mensais_total || input.compras_mensais_total <= 0) missing.push("Compras mensais totais (R$)")

  if (missing.length > 0) {
    return {
      module_slug: "ipi_atacadista", module_name: "IPI Atacadista Não Contribuinte",
      monthly_impact: null, retroativo_5y: null, confidence: "low",
      formula: "compras_atacadistas × 5,37%",
      premises: ["Requer valor total de compras mensais"],
      limitations: [], disclaimer: DISCLAIMER,
      inputs_used: {}, missing_inputs: missing, show_to_client: true,
    }
  }

  const ALIQUOTA_PRESUMIDA = 0.0537
  const pctAtac    = (input.percentual_atacadista ?? 30) / 100
  const compras    = input.compras_mensais_total * pctAtac
  const monthly_base   = compras * ALIQUOTA_PRESUMIDA
  const retroativo = monthly_base * 60

  return {
    module_slug:    "ipi_atacadista",
    module_name:    "IPI — Crédito Presumido Atacadista (REsp 1.836.373)",
    monthly_impact: monthly_base > 50 ? range(monthly_base) : null,
    retroativo_5y:  retroativo   > 50 ? range(retroativo)  : null,
    confidence:     input.percentual_atacadista ? "medium" : "low",
    formula:        `compras_atacadistas (${fmtBRL(compras)}) × 5,37% alíquota presumida`,
    premises:       [
      `Compras mensais totais: ${fmtBRL(input.compras_mensais_total)}`,
      `Percentual de atacadistas: ${((pctAtac)*100).toFixed(0)}%`,
      `Compras de atacadistas: ${fmtBRL(compras)}`,
      `Alíquota presumida IPI: 5,37% (fixada em lei)`,
    ],
    limitations:    [
      "Restrito a indústrias que adquirem de atacadistas não contribuintes de IPI",
      "Requer análise das notas fiscais de entrada",
      "Percentual real de atacadistas pode diferir do estimado",
      "Sujeito à conformidade do RIPI",
    ],
    disclaimer:     DISCLAIMER,
    inputs_used:    { compras_mensais: input.compras_mensais_total, pct_atacadista: pctAtac * 100 },
    missing_inputs: [],
    show_to_client: true,
  }
}

// --------- Orchestrator ---------------------------------------------------------------------------------------------------------------------------------------

export interface CalculatorInput {
  folha_mensal?:          number
  num_funcionarios?:      number
  faturamento_mensal?:    number
  percentual_cartao?:     number
  taxa_mdr?:              number
  compras_mensais?:       number
  percentual_atacadista?: number
  regime:                 "lucro_real" | "lucro_presumido" | "simples_nacional"
  segment:                "servicos" | "comercio" | "industria"
}

export function runStrategicCalculator(input: CalculatorInput): CalculationResult[] {
  const results: CalculationResult[] = []

  // Sistema S --- all segments with folha
  results.push(calcSistemaS({
    folha_mensal_bruta: input.folha_mensal ?? 0,
    num_funcionarios:   input.num_funcionarios,
  }))

  // Taxa cart--o --- comercio or servicos
  if (input.segment !== "industria" || (input.percentual_cartao ?? 0) > 0) {
    results.push(calcTaxaCartao({
      faturamento_mensal: input.faturamento_mensal ?? 0,
      percentual_cartao:  input.percentual_cartao ?? 0,
      taxa_media_mdr:     input.taxa_mdr,
      regime:             input.regime,
    }))
  }

  // IPI atacadista --- industria only
  if (input.segment === "industria") {
    results.push(calcIPIAtacadista({
      compras_mensais_total:  input.compras_mensais ?? (input.faturamento_mensal ? input.faturamento_mensal * 0.6 : 0),
      percentual_atacadista:  input.percentual_atacadista,
    }))
  }

  return results
}
