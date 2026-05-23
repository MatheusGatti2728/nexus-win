#!/usr/bin/env node
// pnpm check:system --- verifica todos os subsistemas

const C = { g: "\x1b[32m", y: "\x1b[33m", r: "\x1b[31m", d: "\x1b[2m", b: "\x1b[1m", x: "\x1b[0m" }
const ok   = (m: string, d?: string) => console.log(`  ${C.g}✅${C.x} ${m}${d ? ` ${C.d}(${d})${C.x}` : ""}`)
const warn = (m: string, d?: string) => console.log(`  ${C.y}⚠️ ${C.x} ${m}${d ? ` ${C.d}— ${d}${C.x}` : ""}`)
const fail = (m: string, d?: string) => console.log(`  ${C.r}✗ ${C.x} ${m}${d ? ` ${C.d}— ${d}${C.x}` : ""}`)

const env = process.env
const isMock = env.NEXT_PUBLIC_USE_MOCK_PIPELINE !== "false"
const appEnv = env.APP_ENV ?? "local"

console.log(`\n${C.b}${C.y}╔══════════════════════════════════════════════╗${C.x}`)
console.log(`${C.b}${C.y}║  NEXUS — System Ready Check                  ║${C.x}`)
console.log(`${C.b}${C.y}╚══════════════════════════════════════════════╝${C.x}\n`)

// 1. Node version
const [major] = process.version.slice(1).split(".").map(Number)
major >= 18 ? ok("Node.js version", process.version) : fail("Node.js 18+ required", process.version)

// 2. Environment
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  warn("Supabase credentials", "não configurado — mock mode only")
} else {
  ok("Supabase credentials", "configurado")
}

// 3. Pipeline mode
if (isMock) {
  ok("Pipeline mode", "mock (sem chamadas reais)")
} else {
  ok("Pipeline mode", "real")
  if (!env.ANTHROPIC_API_KEY && !env.OPENAI_API_KEY) {
    fail("LLM provider", "nenhuma chave configurada — set ANTHROPIC_API_KEY")
  } else {
    ok("LLM provider", env.ANTHROPIC_API_KEY ? "Claude" : "OpenAI")
  }
}

// 4. App env
appEnv === "production" && isMock
  ? fail("Production + mock", "mock pipeline não pode estar ativo em produção")
  : ok("APP_ENV", appEnv)

// 5. Source files
import { existsSync } from "fs"
existsSync("./src/mock-data.ts") ? ok("Mock data", "src/mock-data.ts encontrado") : fail("Mock data", "src/mock-data.ts não encontrado")
existsSync("./app/(dashboard)/page.tsx") ? ok("Dashboard", "página principal encontrada") : fail("Dashboard", "app/(dashboard)/page.tsx não encontrado")
existsSync("./app/(dashboard)/sandbox/page.tsx") ? ok("Sandbox", "página de testes encontrada") : fail("Sandbox", "não encontrada")

// 6. Domain review modules
console.log()
warn("Módulos com domain review:", "revisar antes de uso em cliente")
;["pis_cofins_taxa_cartao", "pis_cofins_folha", "plurifasico_beneficio", "icms_grossup"].forEach(m =>
  console.log(`      ${C.y}⚠${C.x} ${C.d}${m}${C.x}`)
)

console.log(`\n${C.b}  URLs disponíveis:${C.x}`)
console.log(`  ${C.d}Dashboard:${C.x} http://localhost:3000/dashboard`)
console.log(`  ${C.d}Sandbox:${C.x}   http://localhost:3000/dashboard/sandbox`)
console.log(`  ${C.d}Pilot:${C.x}     http://localhost:3000/dashboard/pilot`)
console.log(`  ${C.d}Health:${C.x}    http://localhost:3000/api/health\n`)
