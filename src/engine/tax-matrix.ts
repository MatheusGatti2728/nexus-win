// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS TAX INTELLIGENCE --- Tax Intelligence Matrix
//
// Regra fundamental:
// - O regime informado pelo CONSULTOR prevalece sobre qualquer infer--ncia
// - A matriz -- DETERMIN--STICA: mesmo input --- mesmo output sempre
// - M--dulos BLOCKED nunca s--o recomendados, independente de soft factors
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

export type Segment   = "servicos" | "comercio" | "industria"
export type TaxRegime = "lucro_real" | "lucro_presumido" | "simples_nacional"
export type ModuleSlug =
  | "verbas_indenizatorias"
  | "sistema_s"
  | "pis_cofins_folha"
  | "icms_iss_acao_coletiva"
  | "revisao_insumos_pis_cofins"
  | "icms_grossup"
  | "ipi_credito_presumido_exportacao"
  | "difal_pis_cofins"
  | "plurifasico_beneficio"
  | "icms_st_pis_cofins"
  | "ipi_atacadista"
  | "pis_cofins_taxa_cartao"
  | "bonificacoes_descontos"

export type MatrixTier = "core" | "secondary" | "blocked"

export interface MatrixResult {
  core:      ModuleSlug[]
  secondary: ModuleSlug[]
  blocked:   ModuleSlug[]
}

// --------- The Matrix ---------------------------------------------------------------------------------------------------------------------------------------------

const MATRIX: Record<Segment, Record<TaxRegime, MatrixResult>> = {

  // ------ SERVI--OS ------------------------------------------------------------------------------------------------------------------------------------------

  servicos: {
    lucro_real: {
      core: [
        "verbas_indenizatorias",
        "sistema_s",
        "pis_cofins_folha",
        "icms_iss_acao_coletiva",
        "revisao_insumos_pis_cofins",
      ],
      secondary: ["icms_grossup"],
      blocked: [
        "ipi_credito_presumido_exportacao",
        "difal_pis_cofins",
        "plurifasico_beneficio",
        "icms_st_pis_cofins",
        "ipi_atacadista",
        "pis_cofins_taxa_cartao",
        "bonificacoes_descontos",
      ],
    },
    lucro_presumido: {
      core: [
        "verbas_indenizatorias",
        "sistema_s",
        "pis_cofins_folha",
        "icms_iss_acao_coletiva",
      ],
      secondary: [],
      blocked: [
        "revisao_insumos_pis_cofins",
        "icms_st_pis_cofins",
        "pis_cofins_taxa_cartao",
        "bonificacoes_descontos",
        "plurifasico_beneficio",
        "difal_pis_cofins",
        "ipi_credito_presumido_exportacao",
        "ipi_atacadista",
        "icms_grossup",
      ],
    },
    simples_nacional: {
      core: [],
      secondary: ["verbas_indenizatorias", "sistema_s"],
      blocked: [
        "pis_cofins_folha",
        "icms_iss_acao_coletiva",
        "revisao_insumos_pis_cofins",
        "icms_grossup",
        "ipi_credito_presumido_exportacao",
        "difal_pis_cofins",
        "plurifasico_beneficio",
        "icms_st_pis_cofins",
        "ipi_atacadista",
        "pis_cofins_taxa_cartao",
        "bonificacoes_descontos",
      ],
    },
  },

  // ------ COM--RCIO ------------------------------------------------------------------------------------------------------------------------------------------

  comercio: {
    lucro_real: {
      core: [
        "icms_st_pis_cofins",
        "pis_cofins_taxa_cartao",
        "bonificacoes_descontos",
        "plurifasico_beneficio",
        "sistema_s",
        "pis_cofins_folha",
      ],
      // DIFAL: s-- entra em secondary se flag ecommerce/interestadual presente
      // (verificado dinamicamente em applyOperationFlags)
      secondary: ["revisao_insumos_pis_cofins", "icms_grossup"],
      blocked: [
        "ipi_credito_presumido_exportacao",
        "ipi_atacadista",
        "verbas_indenizatorias", // não é core em comércio LR
        "icms_iss_acao_coletiva",
      ],
    },
    lucro_presumido: {
      core: [
        "verbas_indenizatorias",
        "sistema_s",
        "icms_iss_acao_coletiva",
        "icms_st_pis_cofins",
      ],
      secondary: [
        "pis_cofins_taxa_cartao",  // baixa prioridade / needs_review
        "difal_pis_cofins",        // só se e-commerce interestadual
      ],
      blocked: [
        "revisao_insumos_pis_cofins",
        "bonificacoes_descontos",
        "plurifasico_beneficio",
        "pis_cofins_folha",
        "ipi_credito_presumido_exportacao",
        "ipi_atacadista",
        "icms_grossup",
      ],
    },
    simples_nacional: {
      core: [],
      secondary: ["verbas_indenizatorias", "sistema_s"],
      blocked: [
        "icms_st_pis_cofins",
        "pis_cofins_taxa_cartao",
        "bonificacoes_descontos",
        "plurifasico_beneficio",
        "revisao_insumos_pis_cofins",
        "pis_cofins_folha",
        "icms_iss_acao_coletiva",
        "icms_grossup",
        "ipi_credito_presumido_exportacao",
        "ipi_atacadista",
        "difal_pis_cofins",
      ],
    },
  },

  // ------ IND--STRIA ---------------------------------------------------------------------------------------------------------------------------------------

  industria: {
    lucro_real: {
      core: [
        "ipi_credito_presumido_exportacao",
        "ipi_atacadista",
        "revisao_insumos_pis_cofins",
        "icms_grossup",
        "sistema_s",
        "pis_cofins_folha",
      ],
      secondary: ["verbas_indenizatorias"],
      blocked: [
        "plurifasico_beneficio",
        "icms_iss_acao_coletiva",
        "icms_st_pis_cofins",
        "pis_cofins_taxa_cartao",
        "bonificacoes_descontos",
        "difal_pis_cofins",
      ],
    },
    lucro_presumido: {
      core: [
        "sistema_s",
        "verbas_indenizatorias",
        "ipi_atacadista",
        "ipi_credito_presumido_exportacao",
      ],
      secondary: ["icms_grossup"],
      blocked: [
        "revisao_insumos_pis_cofins",
        "bonificacoes_descontos",
        "plurifasico_beneficio",
        "pis_cofins_folha",
        "pis_cofins_taxa_cartao",
        "icms_iss_acao_coletiva",
        "icms_st_pis_cofins",
        "difal_pis_cofins",
      ],
    },
    simples_nacional: {
      core: [],
      secondary: ["verbas_indenizatorias", "sistema_s"],
      blocked: [
        "ipi_credito_presumido_exportacao",
        "ipi_atacadista",
        "revisao_insumos_pis_cofins",
        "icms_grossup",
        "pis_cofins_folha",
        "icms_st_pis_cofins",
        "pis_cofins_taxa_cartao",
        "bonificacoes_descontos",
        "plurifasico_beneficio",
        "icms_iss_acao_coletiva",
        "difal_pis_cofins",
      ],
    },
  },
}

// --------- Operation flags ------------------------------------------------------------------------------------------------------------------------------

export type OperationFlag =
  | "venda_cartao"
  | "venda_interestadual"
  | "ecommerce"
  | "exportacao"
  | "icms_st"
  | "folha_relevante"
  | "operacao_iss"
  | "operacao_industrial"
  | "operacao_varejista"

// --------- Consultant input ---------------------------------------------------------------------------------------------------------------------------

export interface ConsultantInput {
  segment: Segment
  tax_regime: TaxRegime
  subsegment?: string
  operation_flags?: OperationFlag[]
}

// --------- Matrix lookup result ---------------------------------------------------------------------------------------------------------------

export interface ClassifiedModules {
  core:         ModuleSlug[]
  secondary:    ModuleSlug[]
  blocked:      ModuleSlug[]
  source:       "consultant_override" | "inferred"
  segment:      Segment
  tax_regime:   TaxRegime
  flags_applied: OperationFlag[]
}

// --------- Main lookup function ---------------------------------------------------------------------------------------------------------------

/**
 * Returns module classification for a given segment + regime.
 * Consultant-provided data ALWAYS overrides inferred data.
 * Operation flags can promote modules from secondary → core or unblock DIFAL/ISS.
 */
export function lookupMatrix(
  input: ConsultantInput,
  source: "consultant_override" | "inferred" = "consultant_override"
): ClassifiedModules {
  const base = MATRIX[input.segment][input.tax_regime]
  const flags = input.operation_flags ?? []

  let core      = [...base.core]
  let secondary = [...base.secondary]
  let blocked   = [...base.blocked]

  // ------ Flag-driven promotions ------------------------------------------------------------------------------------------------------

  // DIFAL: unblock if ecommerce or venda_interestadual flag present
  if (
    blocked.includes("difal_pis_cofins") &&
    (flags.includes("ecommerce") || flags.includes("venda_interestadual"))
  ) {
    blocked = blocked.filter(m => m !== "difal_pis_cofins")
    secondary.push("difal_pis_cofins")
  }

  // ISS: promote icms_iss_acao_coletiva if operacao_iss flag
  if (
    blocked.includes("icms_iss_acao_coletiva") &&
    flags.includes("operacao_iss")
  ) {
    blocked = blocked.filter(m => m !== "icms_iss_acao_coletiva")
    secondary.push("icms_iss_acao_coletiva")
  }

  // IPI exporta----o: unblock if exportacao flag + industria
  if (
    blocked.includes("ipi_credito_presumido_exportacao") &&
    flags.includes("exportacao")
  ) {
    blocked = blocked.filter(m => m !== "ipi_credito_presumido_exportacao")
    secondary.push("ipi_credito_presumido_exportacao")
  }

  // ICMS-ST: promote if icms_st flag
  if (
    blocked.includes("icms_st_pis_cofins") &&
    flags.includes("icms_st")
  ) {
    blocked = blocked.filter(m => m !== "icms_st_pis_cofins")
    secondary.push("icms_st_pis_cofins")
  }

  // Folha relevante: promote sistema_s and verbas to core if in secondary
  if (flags.includes("folha_relevante")) {
    if (secondary.includes("sistema_s")) {
      secondary = secondary.filter(m => m !== "sistema_s")
      core.push("sistema_s")
    }
    if (secondary.includes("verbas_indenizatorias")) {
      secondary = secondary.filter(m => m !== "verbas_indenizatorias")
      core.push("verbas_indenizatorias")
    }
  }

  // Simples Nacional: if folha_relevante, promote verbas to secondary
  if (
    input.tax_regime === "simples_nacional" &&
    flags.includes("folha_relevante") &&
    blocked.includes("verbas_indenizatorias")
  ) {
    blocked = blocked.filter(m => m !== "verbas_indenizatorias")
    secondary.push("verbas_indenizatorias")
  }

  return { core, secondary, blocked, source, segment: input.segment, tax_regime: input.tax_regime, flags_applied: flags }
}

// --------- Helpers ------------------------------------------------------------------------------------------------------------------------------------------------------

export function getTierFor(slug: ModuleSlug, classified: ClassifiedModules): MatrixTier {
  if (classified.core.includes(slug))      return "core"
  if (classified.secondary.includes(slug)) return "secondary"
  return "blocked"
}

export function isBlocked(slug: ModuleSlug, classified: ClassifiedModules): boolean {
  return classified.blocked.includes(slug)
}

// Labels for UI
export const SEGMENT_LABELS: Record<Segment, string> = {
  servicos:  "Serviços",
  comercio:  "Comércio",
  industria: "Indústria",
}

export const REGIME_LABELS: Record<TaxRegime, string> = {
  lucro_real:        "Lucro Real",
  lucro_presumido:   "Lucro Presumido",
  simples_nacional:  "Simples Nacional",
}

export const FLAG_LABELS: Record<OperationFlag, string> = {
  venda_cartao:        "Venda em cartão",
  venda_interestadual: "Venda interestadual",
  ecommerce:           "E-commerce",
  exportacao:          "Exportação",
  icms_st:             "ICMS-ST",
  folha_relevante:     "Folha relevante",
  operacao_iss:        "Operação com ISS",
  operacao_industrial: "Operação industrial",
  operacao_varejista:  "Operação varejista",
}
