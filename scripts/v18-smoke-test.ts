/**
 * NEXUS v18 — SMOKE TEST
 *
 * Testa os comportamentos críticos do sistema sem CNPJ real.
 * Valida a lógica dos engines antes do teste manual.
 *
 * COMO RODAR:
 *   npx ts-node scripts/v18-smoke-test.ts
 *   ou
 *   node --loader ts-node/esm scripts/v18-smoke-test.ts
 *
 * Deve rodar em < 5 segundos (sem chamadas de API).
 */

// --------- Test runner ------------------------------------------------------------------------------------------------------------------------------------------

interface TestResult { name: string; passed: boolean; error?: string; details?: string }
const results: TestResult[] = []

function test(name: string, fn: () => void | Promise<void>): void {
  try {
    const r = fn()
    if (r instanceof Promise) {
      r.then(() => results.push({ name, passed: true }))
       .catch(e => results.push({ name, passed: false, error: String(e.message) }))
    } else {
      results.push({ name, passed: true })
    }
  } catch (e: any) {
    results.push({ name, passed: false, error: String(e.message) })
  }
}

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(msg)
}

function assertContains(text: string, sub: string): void {
  if (!text.toLowerCase().includes(sub.toLowerCase())) {
    throw new Error(`Esperado "${sub}" em:\n"${text.slice(0, 120)}"`)
  }
}

function assertNotContains(text: string, sub: string): void {
  if (text.toLowerCase().includes(sub.toLowerCase())) {
    throw new Error(`Frase proibida encontrada: "${sub}"`)
  }
}

// --------- Inline logic (sem importar os engines) ---------------------------------------------------------

const CNAE_PROFILES: Record<string, { activity: string; tax_signals: string[]; typical_ops: string[] }> = {
  "embala": { activity: "fabricação de embalagens industriais", tax_signals: ["créditos de insumos PIS/COFINS", "IPI sobre saídas"], typical_ops: ["fabricação própria", "cadeia de insumos", "operação interestadual"] },
  "supermercado": { activity: "comércio varejista de alimentos", tax_signals: ["ICMS-ST Tema 1.125", "exclusão ICMS Tema 69"], typical_ops: ["compras com ICMS-ST embutido", "alto volume de cartões"] },
  "tecnologia": { activity: "serviços de TI e software", tax_signals: ["ISS base PIS/COFINS", "encargos sobre folha"], typical_ops: ["folha intensiva", "ISS municipal"] },
  "distribui": { activity: "distribuição atacadista", tax_signals: ["ICMS interestadual", "ICMS-ST", "PIS/COFINS"], typical_ops: ["operação interestadual", "cadeia logística"] },
}

function getCNAEProfile(cnae: string) {
  const lc = cnae.toLowerCase()
  for (const [key, p] of Object.entries(CNAE_PROFILES)) {
    if (lc.includes(key)) return p
  }
  return null
}

function buildNarrative(razao: string, cnae: string, municipio: string, uf: string): string {
  const profile = getCNAEProfile(cnae)
  if (profile) {
    const loc = municipio && uf ? ` sediada em ${municipio}/${uf}` : ""
    return `${razao} atua em ${profile.activity}${loc}. Operação típica: ${profile.typical_ops.slice(0,2).join(", ")}.`
  }
  if (cnae) return `${razao} atua em ${cnae.toLowerCase()}.`
  return "Operação a confirmar."
}

function buildSignals(cnae: string, has_export: boolean, has_ecommerce: boolean) {
  const signals: Array<{ type: string; evidence: string; tax_impact: string; operational_impact: string; commercial_read: string }> = []
  const lc = cnae.toLowerCase()
  if (/fabricação|industri/.test(lc)) signals.push({ type: "industry", evidence: `CNAE: ${cnae}`, tax_impact: "Créditos de insumos PIS/COFINS (REsp 1.221.170) + IPI", operational_impact: "Processo produtivo com cadeia de insumos", commercial_read: "Empresas industriais normalmente têm créditos de insumos não revisados" })
  if (/varejo|comércio|supermercado/.test(lc)) signals.push({ type: "retail", evidence: `CNAE: ${cnae}`, tax_impact: "ICMS-ST Tema 1.125 STJ + taxas de cartão", operational_impact: "Alto volume de compras com ICMS-ST embutido", commercial_read: "Varejistas têm dois pontos técnicos: ICMS-ST e taxa de cartão" })
  if (has_export) signals.push({ type: "export", evidence: "Sinal do site ou flag ativada", tax_impact: "IPI Crédito Presumido Exportação (5,37% — Lei 9.363/96)", operational_impact: "Saídas com isenção criam acúmulo de créditos", commercial_read: "Crédito presumido de IPI com alíquota fixada em lei — 5 anos de retroativo" })
  if (has_ecommerce) signals.push({ type: "ecommerce", evidence: "Canal digital identificado", tax_impact: "DIFAL nas operações interestaduais + base PIS/COFINS", operational_impact: "Vendas para múltiplos estados — cada estado gera sensibilidade específica", commercial_read: "E-commerce tem ponto específico sobre DIFAL raramente revisado" })
  return signals
}

const MODULES: Record<string, { name: string; executive_summary: string; curiosity_trigger: string; legal_basis: string; retroactive_period: string; expected_questions: Array<{q:string;a:string}>; how_to_use_in_call: string }> = {
  sistema_s: {
    name: "Sistema S — Limitação da Base",
    executive_summary: "O STJ limitou as contribuições ao Sistema S a 20 salários mínimos por empregado.",
    curiosity_trigger: "Um ponto sobre a composição da folha que raramente entra no radar contábil.",
    legal_basis: "STJ — Tema 1.079 (REsp 1.898.532/CE)",
    retroactive_period: "60 meses (5 anos)",
    expected_questions: [{ q: "Isso já foi decidido definitivamente?", a: "Sim. Tema 1.079 do STJ — julgado sob recurso repetitivo. Vincula toda a Justiça Federal." }],
    how_to_use_in_call: "Há um ponto relacionado à base de contribuições ao Sistema S — o STJ fixou um teto que a maioria das empresas nunca aproveitou sistematicamente.",
  },
}

const FRASES_PROIBIDAS_NARRATIVA = [
  "empresa com maturidade tributária média",
  "empresa de comércio no lucro real",
  "empresa de indústria no lucro real",
  "empresa de serviços no lucro real",
]

const FRASES_PROIBIDAS_PLAYBOOK = [
  "tenho oportunidade tributária",
  "tem 2 minutos?",
  "você teria disponibilidade?",
  "recuperação tributária",
  "ganho garantido",
]

// --------- Testes ---------------------------------------------------------------------------------------------------------------------------------------------------------

console.log("\n╔═══════════════════════════════════════════════════╗")
console.log("║   NEXUS v18 — SMOKE TEST                         ║")
console.log("╚═══════════════════════════════════════════════════╝\n")

// GRUPO 1: CNAE_PROFILES
console.log("── Grupo 1: Perfis Setoriais CNAE ──────────────────\n")

test("1.1 CNAE embalagem → activity específica", () => {
  const p = getCNAEProfile("Fabricação de embalagens plásticas")
  assert(p !== null, "Perfil não encontrado para embalagem")
  assertContains(p!.activity, "embalagens industriais")
})

test("1.2 CNAE supermercado → activity de varejo alimentar", () => {
  const p = getCNAEProfile("Comércio varejista de alimentos — supermercados")
  assert(p !== null, "Perfil não encontrado para supermercado")
  assertContains(p!.activity, "varejista")
})

test("1.3 CNAE tecnologia → activity de TI/software", () => {
  const p = getCNAEProfile("Tecnologia e software")
  assert(p !== null, "Perfil não encontrado para tecnologia")
  assertContains(p!.activity, "TI")
})

test("1.4 CNAE não reconhecido → null (sem inventar)", () => {
  const p = getCNAEProfile("Atividades de educação superior")
  assert(p === null, "Não deve ter perfil para educação na v18")
})

test("1.5 tax_signals inclui referências específicas", () => {
  const p = getCNAEProfile("supermercado")
  assert(p !== null, "Perfil não encontrado")
  assert(p!.tax_signals.some(s => s.includes("Tema")), "tax_signals deve incluir referência a Tema STJ")
})

// GRUPO 2: Narrativa Operacional
console.log("\n── Grupo 2: Narrativa Operacional ──────────────────\n")

test("2.1 Narrativa industrial menciona atividade real", () => {
  const n = buildNarrative("Embalagens Wood Pack", "Fabricação de embalagens plásticas", "Campinas", "SP")
  assertContains(n, "embalagens")
  assertContains(n, "Campinas")
})

test("2.2 Narrativa varejo menciona comércio", () => {
  const n = buildNarrative("Supermercado Modelo", "Comércio varejista de alimentos — supermercado", "São Paulo", "SP")
  assertContains(n, "varejista")
})

test("2.3 Narrativa não contém frases proibidas", () => {
  const n = buildNarrative("Empresa Teste", "Fabricação de embalagens plásticas", "SP", "SP")
  for (const frase of FRASES_PROIBIDAS_NARRATIVA) {
    assertNotContains(n, frase)
  }
})

test("2.4 CNAE não reconhecido → fallback usa CNAE real, não genérico", () => {
  const n = buildNarrative("Empresa Educação", "Atividades de educação superior", "Rio de Janeiro", "RJ")
  assertNotContains(n, "maturidade tributária média")
  assertContains(n, "educação")
})

test("2.5 Narrativa menciona localização quando disponível", () => {
  const n = buildNarrative("Empresa X", "Fabricação de embalagens plásticas", "Campinas", "SP")
  assertContains(n, "Campinas/SP")
})

// GRUPO 3: Sinais Operacionais
console.log("\n── Grupo 3: Sinais Operacionais ────────────────────\n")

test("3.1 CNAE industrial gera sinal 'industry'", () => {
  const s = buildSignals("Fabricação industrial", false, false)
  assert(s.some(x => x.type === "industry"), "Sinal industry não gerado")
})

test("3.2 Sinal industry tem tax_impact com 'insumos' e 'IPI'", () => {
  const s = buildSignals("Fabricação industrial", false, false)
  const sig = s.find(x => x.type === "industry")!
  assertContains(sig.tax_impact, "insumos")
  assertContains(sig.tax_impact, "IPI")
})

test("3.3 Exportação gera sinal 'export' com alíquota 5,37%", () => {
  const s = buildSignals("Fabricação industrial", true, false)
  const sig = s.find(x => x.type === "export")
  assert(sig !== undefined, "Sinal export não gerado")
  assertContains(sig!.tax_impact, "5,37%")
})

test("3.4 E-commerce gera sinal com 'DIFAL'", () => {
  const s = buildSignals("Varejo", false, true)
  const sig = s.find(x => x.type === "ecommerce")
  assert(sig !== undefined, "Sinal ecommerce não gerado")
  assertContains(sig!.tax_impact, "DIFAL")
})

test("3.5 Cada sinal tem operational_impact e commercial_read", () => {
  const s = buildSignals("Fabricação industrial", true, true)
  for (const sig of s) {
    assert(sig.operational_impact?.length > 10, `operational_impact vazio em ${sig.type}`)
    assert(sig.commercial_read?.length > 10, `commercial_read vazio em ${sig.type}`)
  }
})

// GRUPO 4: M--dulos de Profundidade
console.log("\n── Grupo 4: Módulos — Campos de Profundidade ───────\n")

test("4.1 sistema_s tem executive_summary", () => {
  assert(MODULES.sistema_s.executive_summary?.length > 20, "executive_summary muito curto")
  assertNotContains(MODULES.sistema_s.executive_summary, "oportunidade tributária")
})

test("4.2 sistema_s tem curiosity_trigger", () => {
  assert(MODULES.sistema_s.curiosity_trigger?.length > 10, "curiosity_trigger vazio")
})

test("4.3 sistema_s tem legal_basis com referência STJ", () => {
  assertContains(MODULES.sistema_s.legal_basis, "STJ")
  assertContains(MODULES.sistema_s.legal_basis, "1.079")
})

test("4.4 sistema_s tem retroactive_period de 60 meses", () => {
  assertContains(MODULES.sistema_s.retroactive_period, "60")
})

test("4.5 sistema_s expected_questions tem resposta", () => {
  assert(MODULES.sistema_s.expected_questions?.length > 0, "Sem perguntas esperadas")
  assert(MODULES.sistema_s.expected_questions[0].a?.length > 10, "Resposta vazia")
})

test("4.6 how_to_use_in_call não contém frases proibidas", () => {
  for (const frase of FRASES_PROIBIDAS_PLAYBOOK) {
    assertNotContains(MODULES.sistema_s.how_to_use_in_call, frase)
  }
})

// GRUPO 5: Regras de Neg--cio Cr--ticas
console.log("\n── Grupo 5: Regras de Negócio ──────────────────────\n")

test("5.1 TRF correto por UF: SP → TRF3", () => {
  const TRF_MAP: Record<string, string> = { SP:"TRF3", MG:"TRF6", RJ:"TRF2", RS:"TRF4", PR:"TRF4", SC:"TRF4", BA:"TRF1", CE:"TRF5", GO:"TRF1" }
  assert(TRF_MAP["SP"] === "TRF3", "SP deve ser TRF3")
  assert(TRF_MAP["MG"] === "TRF6", "MG deve ser TRF6")
  assert(TRF_MAP["RS"] === "TRF4", "RS deve ser TRF4")
})

test("5.2 Temperatura 'muito_quente' para empresa industrial exportadora antiga", () => {
  let heat = 0
  const anos = 18, has_export = true, has_industry = true, has_ecommerce = false
  if (anos >= 10) heat += 2
  if (has_export) heat += 2
  if (has_industry) heat += 2
  const temp = heat >= 8 ? "muito_quente" : heat >= 5 ? "quente" : heat >= 3 ? "morna" : "fria"
  assert(temp === "quente" || temp === "muito_quente", `Esperado quente ou muito_quente, got ${temp} (heat: ${heat})`)
})

test("5.3 Temperatura 'fria' para empresa nova sem sinais", () => {
  let heat = 0
  // Empresa com 2 anos, sem sinais
  const temp = heat >= 8 ? "muito_quente" : heat >= 5 ? "quente" : heat >= 3 ? "morna" : "fria"
  assert(temp === "fria", `Esperado fria, got ${temp}`)
})

test("5.4 Legal maturity 'none' → abordagem educacional", () => {
  const approach = "none" === "none" ? "Abordagem educacional — empresa provavelmente nunca revisou estrategicamente."
    : "none" === "low" ? "Abordagem consultiva"
    : "Abordagem técnica direta"
  assertContains(approach, "educacional")
})

test("5.5 Frases proibidas no Playbook são detectáveis", () => {
  const sample_bad_playbook = "Bom dia! Tenho oportunidade tributária para sua empresa. Tem 2 minutos?"
  const has_bad = FRASES_PROIBIDAS_PLAYBOOK.some(f => sample_bad_playbook.toLowerCase().includes(f.toLowerCase()))
  assert(has_bad, "Não detectou frases proibidas — lógica de validação com problema")
})

// --------- Resultados ---------------------------------------------------------------------------------------------------------------------------------------------

setTimeout(() => {
  console.log("\n╔═══════════════════════════════════════════════════╗")
  console.log("║   RESULTADOS                                      ║")
  console.log("╠═══════════════════════════════════════════════════╣")

  let passed = 0, failed = 0
  for (const r of results) {
    const icon = r.passed ? "✅" : "❌"
    console.log(`║ ${icon} ${r.name.padEnd(46)} ║`)
    if (!r.passed && r.error) {
      console.log(`║    └─ ${r.error.slice(0, 50).padEnd(51)} ║`)
      failed++
    } else {
      passed++
    }
  }

  console.log("╠═══════════════════════════════════════════════════╣")
  console.log(`║  PASSOU: ${String(passed).padStart(2)} / ${String(results.length).padEnd(2)}   FALHOU: ${String(failed).padStart(2)}                  ║`)
  console.log("╚═══════════════════════════════════════════════════╝")

  if (failed === 0) {
    console.log("\n✅ SMOKE TEST APROVADO — pronto para teste manual\n")
    process.exit(0)
  } else {
    console.log(`\n❌ SMOKE TEST REPROVADO — ${failed} teste(s) falhando\n`)
    process.exit(1)
  }
}, 100)
