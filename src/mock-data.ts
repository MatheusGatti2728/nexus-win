// NEXUS TAX INTELLIGENCE --- Mock Data (Full Dossier Engine)
import { runRuleEngine } from "./engine/rule-engine"
import { buildStrategicDossier } from "./engine/dossier-engine"
import type { CompanyContext } from "./engine/rule-engine"
import { SEGMENT_LABELS, REGIME_LABELS } from "./engine/tax-matrix"
import type { CompanyInfo } from "./types"
export type { StrategicDossier, CompanyIntelligence, ContextualizedModule, PersonaPlaybook } from "./engine/dossier-engine"

export interface TestScenario {
  id: string; label: string; cnpj: string; description: string
  criticalTest?: string; company: CompanyInfo; context: CompanyContext
  expectedScoreRange: [number, number]
}

function makeCompanyInfo(ctx: CompanyContext): CompanyInfo {
  return {
    name: ctx.razao_social, cnpj: ctx.cnpj,
    cnpj_formatted: ctx.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5"),
    segmento: SEGMENT_LABELS[ctx.consultant.segment],
    regime: REGIME_LABELS[ctx.consultant.tax_regime],
    anos_operacao: ctx.anos_operacao, uf: ctx.uf, porte: ctx.porte,
  }
}

const CONTEXTS: Record<string, CompanyContext> = {
  supermercado: {
    cnpj: "11222333000181", razao_social: "Rede Supermercados Modelo LTDA",
    anos_operacao: 14, porte: "medio", uf: "SP",
    faturamento_estimado: 3_200_000, folha_estimada: 480_000,
    consultant: { segment: "comercio", tax_regime: "lucro_real", operation_flags: ["venda_cartao","icms_st","folha_relevante"] },
  },
  simples_nacional: {
    cnpj: "22333444000199", razao_social: "Mini Mercado Central ME",
    anos_operacao: 4, porte: "micro", uf: "RJ",
    consultant: { segment: "comercio", tax_regime: "simples_nacional" },
  },
  industria_exportadora: {
    cnpj: "44555666000177", razao_social: "Metalúrgica Exportadora SA",
    anos_operacao: 22, porte: "grande", uf: "MG",
    faturamento_estimado: 8_500_000, folha_estimada: 1_200_000,
    consultant: { segment: "industria", tax_regime: "lucro_real", operation_flags: ["exportacao","operacao_industrial","folha_relevante"] },
  },
  servicos_lr: {
    cnpj: "55666777000122", razao_social: "Consultoria Tech BV LTDA",
    anos_operacao: 11, porte: "medio", uf: "PR",
    faturamento_estimado: 2_100_000, folha_estimada: 980_000,
    consultant: { segment: "servicos", tax_regime: "lucro_real", operation_flags: ["folha_relevante","operacao_iss"] },
  },
  comercio_presumido: {
    cnpj: "33444555000166", razao_social: "Distribuidora Norte LTDA",
    anos_operacao: 17, porte: "medio", uf: "BA",
    faturamento_estimado: 4_800_000, folha_estimada: 320_000,
    consultant: { segment: "comercio", tax_regime: "lucro_presumido", operation_flags: ["icms_st","venda_interestadual"] },
  },
  servicos_presumido: {
    cnpj: "77888999000144", razao_social: "Contabilidade Prime LTDA",
    anos_operacao: 9, porte: "pequeno", uf: "SP",
    faturamento_estimado: 450_000, folha_estimada: 180_000,
    consultant: { segment: "servicos", tax_regime: "lucro_presumido", operation_flags: ["folha_relevante","operacao_iss"] },
  },
  industria_presumida: {
    cnpj: "99000111000133", razao_social: "Fábrica Boa Esperança LTDA",
    anos_operacao: 8, porte: "pequeno", uf: "GO",
    faturamento_estimado: 1_200_000, folha_estimada: 280_000,
    consultant: { segment: "industria", tax_regime: "lucro_presumido", operation_flags: ["operacao_industrial"] },
  },
}

function buildFinancial(ctx: CompanyContext) {
  const result = runRuleEngine(ctx)
  const fat = ctx.faturamento_estimado ?? 1_000_000
  const folha = ctx.folha_estimada ?? 300_000
  return result.recommended.map(m => {
    let probable = 0
    switch (m.slug) {
      case "sistema_s": probable = folha * 0.058 * 39 * 0.6; break
      case "verbas_indenizatorias": probable = folha * 0.06 * 0.20 * Math.min(ctx.anos_operacao * 12, 200); break
      case "icms_st_pis_cofins": probable = fat * 0.45 * 0.10 * 0.0925 * 84; break
      case "pis_cofins_taxa_cartao": probable = fat * 0.72 * 0.018 * 0.0925 * 60; break
      case "ipi_credito_presumido_exportacao": probable = fat * 0.40 * 0.0537 * 60; break
      case "revisao_insumos_pis_cofins": probable = fat * 0.30 * 0.0925 * 60; break
      case "icms_iss_acao_coletiva": probable = fat * 0.05 * 0.0925 * 96; break
      case "bonificacoes_descontos": probable = fat * 0.08 * 0.0925 * 60; break
      default: probable = fat * 0.03 * 60
    }
    probable = Math.round(probable)
    if (probable < 10_000) return null
    return {
      module_id: m.slug, module_slug: m.slug, module_name: m.name,
      estimation_available: true, confidence_level: "medium" as const,
      conservative_value: Math.round(probable * 0.7), probable_value: probable,
      optimistic_value: Math.round(probable * 1.35),
      monthly_reference_value: Math.round(probable / 60),
      calculation_basis: `${SEGMENT_LABELS[ctx.consultant.segment]} + ${REGIME_LABELS[ctx.consultant.tax_regime]}`,
      formula_description: m.name, assumptions: [],
      missing_inputs: [], warnings: m.risk_level === "possível" ? ["Risco POSSÍVEL"] : [],
      legal_risk_note: `Risco ${m.risk_level}.`,
      should_show_to_client: !m.needs_review, should_require_human_review: m.needs_review,
    }
  }).filter((x): x is NonNullable<typeof x> => x !== null)
}

export const ALL_SCENARIOS = Object.fromEntries(
  Object.entries(CONTEXTS).map(([id, ctx]) => {
    const engineResult = runRuleEngine(ctx)
    const dossier = buildStrategicDossier(ctx, engineResult)
    return [id, {
      id, label: ctx.razao_social,
      cnpj: ctx.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5"),
      description: `${SEGMENT_LABELS[ctx.consultant.segment]} + ${REGIME_LABELS[ctx.consultant.tax_regime]}`,
      criticalTest: id === "simples_nacional" ? "Score > 25 ou PIS/COFINS não-cumulativo = BUG" : undefined,
      company: makeCompanyInfo(ctx), context: ctx,
      expectedScoreRange: (id === "simples_nacional" ? [0, 25] : [55, 98]) as [number, number],
      engineResult, dossier, financial: buildFinancial(ctx),
      score: {
        score: engineResult.final_score, tier: engineResult.tier,
        recommended_modules: engineResult.recommended.map(m => m.slug),
        rejected_modules: engineResult.rejected.map(m => m.slug),
        needs_more_data: engineResult.missing_for_better_scoring,
        recommendation_count: engineResult.recommended.length,
      },
      recommended: engineResult.recommended, rejected: engineResult.rejected,
    }]
  })
)

export const DEFAULT_SCENARIO = ALL_SCENARIOS.supermercado
export const MOCK_COMPANY = DEFAULT_SCENARIO.company
export const MOCK_SCORE = DEFAULT_SCENARIO.score
export const MOCK_RECOMMENDED = DEFAULT_SCENARIO.recommended
export const MOCK_REJECTED = DEFAULT_SCENARIO.rejected
export const MOCK_FINANCIAL = DEFAULT_SCENARIO.financial
export const MOCK_DOSSIER = DEFAULT_SCENARIO.dossier
