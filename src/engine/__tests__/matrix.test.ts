// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Tax Intelligence Matrix Tests
// All 10 mandatory scenarios
// Run: npx tsx --test src/engine/__tests__/matrix.test.ts
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import { lookupMatrix, isBlocked } from "../tax-matrix"
import { runRuleEngine } from "../rule-engine"
import type { CompanyContext } from "../rule-engine"

function makeCtx(segment: "servicos"|"comercio"|"industria", regime: "lucro_real"|"lucro_presumido"|"simples_nacional", flags: string[] = []): CompanyContext {
  return { cnpj: "11222333000181", razao_social: "Test LTDA", anos_operacao: 10, porte: "medio", uf: "SP",
    consultant: { segment, tax_regime: regime, operation_flags: flags as any } }
}

const tests: Array<{ name: string; test: () => void }> = [

  // Test 1: Servi--os LR --- Com--rcio LR
  { name: "1. Serviços+LR retorna módulos diferentes de Comércio+LR", test: () => {
    const srv = runRuleEngine(makeCtx("servicos", "lucro_real"))
    const com = runRuleEngine(makeCtx("comercio", "lucro_real"))
    const srvSlugs = srv.recommended.map(m=>m.slug).sort().join(",")
    const comSlugs = com.recommended.map(m=>m.slug).sort().join(",")
    if (srvSlugs === comSlugs) throw new Error(`FAIL: módulos idênticos!\n  Serviços: ${srvSlugs}\n  Comércio: ${comSlugs}`)
    // Servi--os deve ter ISS, Com--rcio deve ter ST/cart--o
    if (!srv.recommended.some(m=>m.slug==="icms_iss_acao_coletiva")) throw new Error("Serviços LR deve ter ISS")
    if (!com.recommended.some(m=>m.slug==="icms_st_pis_cofins"))    throw new Error("Comércio LR deve ter ICMS-ST")
  }},

  // Test 2: Ind--stria LR ativa IPI e insumos
  { name: "2. Indústria+LR ativa IPI e insumos", test: () => {
    const r = runRuleEngine(makeCtx("industria", "lucro_real", ["exportacao","operacao_industrial"]))
    if (!r.recommended.some(m=>m.slug==="ipi_credito_presumido_exportacao")) throw new Error("IPI exportação deve entrar")
    if (!r.recommended.some(m=>m.slug==="ipi_atacadista"))              throw new Error("IPI atacadista deve entrar")
    if (!r.recommended.some(m=>m.slug==="revisao_insumos_pis_cofins"))  throw new Error("Revisão insumos deve entrar")
  }},

  // Test 3: Com--rcio LR ativa ST, cart--o, bonifica----o, plurif--sico
  { name: "3. Comércio+LR ativa ST, cartão, bonificação, plurifásico", test: () => {
    const r = runRuleEngine(makeCtx("comercio", "lucro_real", ["venda_cartao","icms_st"]))
    const slugs = r.recommended.map(m=>m.slug)
    const needed = ["icms_st_pis_cofins","pis_cofins_taxa_cartao","bonificacoes_descontos","plurifasico_beneficio"]
    for (const s of needed) if (!slugs.includes(s)) throw new Error(`Comércio LR deve ter ${s}`)
  }},

  // Test 4: Servi--os bloqueia ST, DIFAL, IPI, plurif--sico
  { name: "4. Serviços bloqueia ST, DIFAL, IPI e plurifásico", test: () => {
    const r = runRuleEngine(makeCtx("servicos", "lucro_real"))
    const blocked = ["icms_st_pis_cofins","difal_pis_cofins","ipi_credito_presumido_exportacao","plurifasico_beneficio"]
    for (const s of blocked) {
      if (r.recommended.some(m=>m.slug===s)) throw new Error(`Serviços não deve ter ${s}`)
    }
  }},

  // Test 5: Lucro Presumido bloqueia insumos n--o-cumulativos
  { name: "5. Lucro Presumido bloqueia insumos não-cumulativos", test: () => {
    for (const seg of ["servicos","comercio"] as const) {
      const r = runRuleEngine(makeCtx(seg, "lucro_presumido"))
      if (r.recommended.some(m=>m.slug==="revisao_insumos_pis_cofins"))
        throw new Error(`${seg}+LP não deve ter revisao_insumos`)
    }
  }},

  // Test 6: Simples Nacional bloqueia m--dulos fiscais autom--ticos
  { name: "6. Simples Nacional bloqueia módulos PIS/COFINS não-cumulativo", test: () => {
    const r = runRuleEngine(makeCtx("comercio", "simples_nacional"))
    const forbidden = ["pis_cofins_taxa_cartao","icms_st_pis_cofins","revisao_insumos_pis_cofins","bonificacoes_descontos","pis_cofins_folha"]
    for (const s of forbidden) {
      if (r.recommended.some(m=>m.slug===s)) throw new Error(`SN não deve ter ${s}`)
    }
    if (r.final_score > 25) throw new Error(`SN score deve ser ≤ 25, foi ${r.final_score}`)
  }},

  // Test 7: Regime informado prevalece sobre infer--ncia autom--tica
  { name: "7. Regime do consultor prevalece sobre inferência", test: () => {
    const lr = runRuleEngine(makeCtx("comercio", "lucro_real"))
    const lp = runRuleEngine(makeCtx("comercio", "lucro_presumido"))
    // LP n--o deve ter pis_cofins_folha e bonificacoes
    if (lp.recommended.some(m=>m.slug==="pis_cofins_folha"))    throw new Error("LP não deve ter pis_cofins_folha")
    if (lp.recommended.some(m=>m.slug==="bonificacoes_descontos")) throw new Error("LP não deve ter bonificacoes")
    // classified.source deve ser consultant_override
    if (lr.classified.source !== "consultant_override") throw new Error("Source deve ser consultant_override")
    if (lp.classified.source !== "consultant_override") throw new Error("Source deve ser consultant_override")
  }},

  // Test 8: DIFAL s-- aparece em com--rcio com flag ecommerce/interestadual
  { name: "8. DIFAL só entra em comércio com flag ecommerce/interestadual", test: () => {
    const semFlag   = runRuleEngine(makeCtx("comercio", "lucro_real"))
    const comFlag   = runRuleEngine(makeCtx("comercio", "lucro_real", ["ecommerce"]))
    const servicos  = runRuleEngine(makeCtx("servicos", "lucro_real", ["ecommerce"]))

    if (semFlag.recommended.some(m=>m.slug==="difal_pis_cofins"))
      throw new Error("DIFAL não deve entrar sem flag")
    if (!comFlag.recommended.some(m=>m.slug==="difal_pis_cofins"))
      throw new Error("DIFAL deve entrar com flag ecommerce em comércio")
    if (servicos.recommended.some(m=>m.slug==="difal_pis_cofins"))
      throw new Error("DIFAL não deve entrar em serviços mesmo com flag")
  }},

  // Test 9: ISS s-- entra em servi--os ou com flag operacao_iss
  { name: "9. ISS só entra em serviços ou com flag operacao_iss", test: () => {
    const srv = runRuleEngine(makeCtx("servicos", "lucro_real"))
    const com = runRuleEngine(makeCtx("comercio", "lucro_real"))
    const comIss = runRuleEngine(makeCtx("comercio", "lucro_real", ["operacao_iss"]))

    if (!srv.recommended.some(m=>m.slug==="icms_iss_acao_coletiva"))
      throw new Error("Serviços LR deve ter ISS")
    if (com.recommended.some(m=>m.slug==="icms_iss_acao_coletiva"))
      throw new Error("Comércio sem ISS flag não deve ter o módulo")
    // com--rcio + flag ISS deve desbloquear
    if (!comIss.recommended.some(m=>m.slug==="icms_iss_acao_coletiva"))
      throw new Error("Comércio com flag operacao_iss deve ter o módulo")
  }},

  // Test 10: Mesmo CNPJ com segmentos diferentes gera resultados diferentes
  { name: "10. Mesmo CNPJ com perfis diferentes gera resultados diferentes", test: () => {
    const ctx = (seg: "servicos"|"comercio"|"industria") => makeCtx(seg, "lucro_real")
    const srv = runRuleEngine(ctx("servicos"))
    const com = runRuleEngine(ctx("comercio"))
    const ind = runRuleEngine(ctx("industria"))

    const s = srv.recommended.map(m=>m.slug).sort().join()
    const c = com.recommended.map(m=>m.slug).sort().join()
    const i = ind.recommended.map(m=>m.slug).sort().join()

    if (s===c) throw new Error("Serviços e Comércio não podem ter mesmos módulos")
    if (s===i) throw new Error("Serviços e Indústria não podem ter mesmos módulos")
    if (c===i) throw new Error("Comércio e Indústria não podem ter mesmos módulos")
  }},
]

// --------- Run ------------------------------------------------------------------------------------------------------------------------------------------------------------------

let passed = 0, failed = 0
const C = { g: "\x1b[32m", r: "\x1b[31m", b: "\x1b[1m", x: "\x1b[0m", d: "\x1b[2m" }

console.log(`\n${C.b}═══ NEXUS — Tax Matrix Tests ═══${C.x}\n`)

for (const t of tests) {
  try {
    t.test()
    console.log(`  ${C.g}✓${C.x} ${t.name}`)
    passed++
  } catch (e) {
    console.log(`  ${C.r}✗${C.x} ${t.name}`)
    console.log(`    ${C.r}${e instanceof Error ? e.message : String(e)}${C.x}`)
    failed++
  }
}

console.log(`\n${passed}/${passed+failed} testes passando`)
if (failed === 0) console.log(`${C.g}${C.b}✅ MATRIX VALIDADA${C.x}\n`)
else { console.log(`${C.r}${C.b}✗ ${failed} teste(s) falhando${C.x}\n`); process.exit(1) }
