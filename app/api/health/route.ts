import { NextResponse } from "next/server"
export async function GET() {
  return NextResponse.json({
    status: "ok",
    app_env: "local",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    mock_pipeline: true,
  })
}
