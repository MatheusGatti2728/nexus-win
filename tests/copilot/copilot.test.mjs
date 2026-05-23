// ═══════════════════════════════════════════════════════════════
// NEXUS COPILOT — Tests (10 mandatory scenarios)
// Run: node --input-type=module tests/copilot/copilot.test.mjs
// ═══════════════════════════════════════════════════════════════

import { buildCompanySnapshot } from "../../src/copilot/company-snapshot.js"
import { getPersonaBehavior, PERSONA_BEHAVIORS } from "../../src/copilot/persona-behavior.js"
import { generateConversationEntry } from "../../src/copilot/conversation-entry.js"
import { buildWhatNotToSay, generateEmail, generateWhatsApp, generateFollowups } from "../../src/copilot/communication-engines.js"
import { buildNarrativeFrame, buildPainMap, buildCopilotOutput } from "../../src/copilot/narrative-engine.js"

const C = { g:"\x1b[32m", r:"\x1b[31m", b:"\x1b[1m", x:"\x1b[0m", d:"\x1b[2m" }

function test(name, fn) {
  try { fn(); console.log(`  ${C.g}✓${C.x} ${name}`) }
  catch(e) { console.log(`  ${C.r}✗${C.x} ${name}\n    ${C.r}${e.message}${C.x}`) }
}

function makeCtx(segment, regime, flags = [], extra = {}) {
  return {
    cnpj: "11222333000181", razao_social: "Test Company LTDA",
    anos_operacao: 10, porte: "medio", uf: "SP",
    faturamento_estimado: 2_000_000, folha_estimada: 400_000,
    consultant: { segment, tax_regime: regime, operation_flags: flags },
    ...extra,
  }
}

console.log(`\n${C.b}═══ NEXUS Copilot — Tests ═══${C.x}\n`)

// Test 1: CFO ≠ Contador
test("1. CFO e contador têm linguagem e comportamento diferentes", () => {
  const cfo = getPersonaBehavior("cfo")
  const cont = getPersonaBehavior("contador")
  if (cfo.language_style === cont.language_style) throw new Error("CFO e contador têm mesma linguagem")
  if (JSON.stringify(cfo.trust_builders) === JSON.stringify(cont.trust_builders)) throw new Error("Trust builders iguais")
  if (JSON.stringify(cfo.trust_breakers) === JSON.stringify(cont.trust_breakers)) throw new Error("Trust breakers iguais")
  if (!cont.trust_breakers.some(t => t.toLowerCase().includes("contador"))) throw new Error("Contador deve ter trust breaker sobre não criticar outro contador")
})

// Test 2: Supermercado ≠ Indústria
test("2. Snapshot supermercado ≠ snapshot indústria", () => {
  const sup = buildCompanySnapshot(makeCtx("comercio","lucro_real",["venda_cartao","icms_st"]))
  const ind = buildCompanySnapshot(makeCtx("industria","lucro_real",["exportacao","operacao_industrial"]))
  if (sup.subsegment === ind.subsegment) throw new Error("Subsegmento igual")
  if (JSON.stringify(sup.probable_pains) === JSON.stringify(ind.probable_pains)) throw new Error("Dores iguais")
  if (JSON.stringify(sup.operation_signals.sort()) === JSON.stringify(ind.operation_signals.sort())) throw new Error("Sinais iguais")
})

// Test 3: Abordagem muda conforme persona
test("3. Abordagem de entrada muda conforme persona", () => {
  const ctx = makeCtx("comercio","lucro_real",["venda_cartao"])
  const snap = buildCompanySnapshot(ctx)
  const cfo  = generateConversationEntry(ctx, "cfo",  snap)
  const soc  = generateConversationEntry(ctx, "socio", snap)
  const fis  = generateConversationEntry(ctx, "fiscal",snap)
  if (cfo.opening_line === soc.opening_line) throw new Error("CFO e sócio têm mesmo opening line")
  if (cfo.tone_notes === fis.tone_notes) throw new Error("CFO e fiscal têm mesmo tone_notes")
  if (soc.pain_trigger === fis.pain_trigger) throw new Error("Sócio e fiscal têm mesmo pain_trigger")
})

// Test 4: what_not_to_say aparece corretamente
test("4. What not to say lista frases banidas e alternativas", () => {
  const w = buildWhatNotToSay()
  if (w.banned_phrases.length < 5) throw new Error("Menos de 5 frases banidas")
  const r = w.banned_phrases.find(p => p.phrase.includes("recuperação tributária"))
  if (!r) throw new Error("'recuperação tributária' não está banida")
  if (!r.use_instead) throw new Error("Falta alternativa para 'recuperação tributária'")
  if (w.persona_specific.cfo.length === 0) throw new Error("Sem alertas específicos para CFO")
  if (w.persona_specific.contador.length === 0) throw new Error("Sem alertas específicos para contador")
})

// Test 5: Objection engine responde contextualmente
test("5. Objection engine responde de forma contextualizada e não genérica", () => {
  const ctx = makeCtx("comercio","lucro_real",["icms_st"])
  const out = buildCopilotOutput(ctx, [])
  const obj = out.objections
  if (obj.length < 5) throw new Error("Menos de 5 objeções geradas")
  const stObj = obj.find(o => o.module_slug === "sistema_s" || o.objection.toLowerCase().includes("contador"))
  if (!stObj) throw new Error("Sem objeção específica sobre contador/sistema S")
  if (!stObj.response) throw new Error("Objeção sem resposta")
  if (!stObj.follow_up) throw new Error("Objeção sem follow_up")
  // Check non-generic response
  if (stObj.response === "Obrigado pelo feedback.") throw new Error("Resposta genérica")
})

// Test 6: WhatsApp não parece automação
test("6. Mensagem WhatsApp é curta e não parece automação", () => {
  const ctx = makeCtx("comercio","lucro_real",["venda_cartao"])
  const wa  = generateWhatsApp(ctx, "cfo", "primeiro_contato")
  if (wa.character_count > 500) throw new Error(`WhatsApp muito longo: ${wa.character_count} chars`)
  if (wa.text.includes("recuperação tributária")) throw new Error("WhatsApp usa frase banida")
  if (wa.text.includes("oportunidade tributária")) throw new Error("WhatsApp usa frase saturada")
  if (wa.text.includes("[EMPRESA]") || wa.text.includes("{NOME}")) throw new Error("Placeholder não preenchido")
})

// Test 7: E-mail usa dados da empresa
test("7. E-mail usa dados específicos da empresa (não genérico)", () => {
  const ctx = makeCtx("comercio","lucro_real",["venda_cartao"])
  const snap = buildCompanySnapshot(ctx)
  const email = generateEmail(ctx, "cfo", snap, [{ name: "ICMS-ST PIS/COFINS", first_pitch: "Tema 1.125 STJ" }])
  if (email.subject.toLowerCase().includes("oportunidade tributária")) throw new Error("Assunto genérico")
  if (!email.body.includes("Test Company") && !email.body.includes("Test")) throw new Error("E-mail não menciona a empresa")
  if (!email.subject) throw new Error("Sem assunto de e-mail")
  if (!email.ps) throw new Error("Sem P.S. no e-mail")
})

// Test 8: Follow-up muda conforme estágio
test("8. Follow-ups têm conteúdo diferente por estágio", () => {
  const followups = generateFollowups(makeCtx("comercio","lucro_real"), "cfo")
  if (followups.length < 5) throw new Error("Menos de 5 follow-ups gerados")
  const stages = followups.map(f => f.stage)
  const uniqueStages = new Set(stages)
  if (uniqueStages.size < 5) throw new Error("Follow-ups com estágios repetidos")
  const d0 = followups.find(f => f.stage === "d0_first_contact")
  const d14 = followups.find(f => f.stage === "no_response_break_silence")
  if (!d0 || !d14) throw new Error("Faltam estágios D+0 ou D+14")
  if (d0.text === d14.text) throw new Error("D+0 e D+14 com mesmo texto")
})

// Test 9: Snapshot operacional muda conforme empresa
test("9. Snapshot muda conforme operação da empresa", () => {
  const c1 = buildCompanySnapshot(makeCtx("comercio","lucro_real",["venda_cartao","icms_st"], {anos_operacao: 15, porte: "grande"}))
  const c2 = buildCompanySnapshot(makeCtx("servicos","lucro_real",["folha_relevante","operacao_iss"], {anos_operacao: 3, porte: "micro"}))
  if (c1.opportunity_urgency === c2.opportunity_urgency) throw new Error("Urgência idêntica para perfis diferentes")
  if (JSON.stringify(c1.probable_pains) === JSON.stringify(c2.probable_pains)) throw new Error("Dores idênticas")
  if (c1.subsegment === c2.subsegment) throw new Error("Subsegmento idêntico")
  if (c1.maturity_reading === c2.maturity_reading) throw new Error("Leitura de maturidade idêntica")
})

// Test 10: Abordagem evita termos saturados
test("10. Abertura não usa termos saturados ou genéricos", () => {
  const ctx = makeCtx("industria","lucro_real",["exportacao","operacao_industrial"])
  const snap = buildCompanySnapshot(ctx)
  const entry = generateConversationEntry(ctx, "cfo", snap)
  const banned = ["recuperação tributária", "oportunidade tributária", "ganho garantido", "levantamos dinheiro", "estratégias fiscais"]
  for (const term of banned) {
    if (entry.opening_line.toLowerCase().includes(term.toLowerCase()))
      throw new Error(`Opening line contém termo banido: "${term}"`)
    if (entry.context_hook.toLowerCase().includes(term.toLowerCase()))
      throw new Error(`Context hook contém termo banido: "${term}"`)
  }
  if (!entry.context_hook.includes("exporta") && !entry.context_hook.includes("IPI") && !entry.context_hook.includes("industri") && !entry.context_hook.includes("insumo"))
    throw new Error("Context hook é genérico — não menciona o segmento ou operação")
})

console.log()
