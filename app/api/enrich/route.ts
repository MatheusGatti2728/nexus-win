// NEXUS --- POST /api/enrich --- Multi-source company research
import { NextRequest, NextResponse } from "next/server"
import { runCompanyResearch } from "@/src/enrichment/research-orchestrator"
import type { ManualResearchInput } from "@/src/enrichment/research-orchestrator"

export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      cnpj:         string
      fetch_website?: boolean
      fetch_news?:    boolean
      manual?:        ManualResearchInput
    }
    const clean = body.cnpj.replace(/\D/g, "")
    if (clean.length !== 14) return NextResponse.json({ error: "CNPJ inválido" }, { status: 422 })

    const research = await runCompanyResearch(clean, {
      fetch_website: body.fetch_website ?? true,
      fetch_news:    body.fetch_news    ?? true,
      manual:        body.manual,
    })

    return NextResponse.json({ success: true, research })
  } catch (err) {
    console.error("[/api/enrich]", err)
    return NextResponse.json({ error: "Enrichment falhou" }, { status: 500 })
  }
}
