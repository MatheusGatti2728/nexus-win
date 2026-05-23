// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- POST /api/dossiers/generate
// Runs the real pipeline. No mock scenario lookup.
// CNPJ is the source of truth.
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
import { NextRequest, NextResponse } from "next/server"
import { validateCNPJ, normalizeCNPJ } from "@/lib/ui/utils"
import { runPipeline } from "@/src/pipeline/orchestrator"
import type { Segment, TaxRegime, OperationFlag } from "@/src/engine/tax-matrix"

export const maxDuration = 60 // Vercel edge timeout

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      cnpj?:                 string
      segment?:              Segment
      tax_regime?:           TaxRegime
      operation_flags?:      OperationFlag[]
      subsegment?:           string
      faturamento_estimado?: number
      folha_estimada?:       number
    }

    const cnpj  = body.cnpj ?? ""
    const clean = normalizeCNPJ(cnpj)

    if (!validateCNPJ(clean)) {
      return NextResponse.json({ error: { code: "INVALID_CNPJ", message: "CNPJ inválido — verifique o dígito verificador" } }, { status: 422 })
    }
    if (!body.segment) {
      return NextResponse.json({ error: { code: "MISSING_SEGMENT", message: "Segmento obrigatório" } }, { status: 400 })
    }
    if (!body.tax_regime) {
      return NextResponse.json({ error: { code: "MISSING_REGIME", message: "Regime tributário obrigatório" } }, { status: 400 })
    }

    const result = await runPipeline({
      cnpj:                 clean,
      segment:              body.segment,
      tax_regime:           body.tax_regime,
      operation_flags:      body.operation_flags ?? [],
      subsegment:           body.subsegment,
      faturamento_estimado: body.faturamento_estimado,
      folha_estimada:       body.folha_estimada,
    })

    return NextResponse.json({
      report_id:   result.report_id,
      status:      "complete",
      company_name: result.company_name,
      data_source: result.company_name_source,
      result,
    })
  } catch (err) {
    console.error("[/api/dossiers/generate]", err)
    return NextResponse.json({ error: { code: "PIPELINE_FAILED", message: "Falha no pipeline" } }, { status: 500 })
  }
}
