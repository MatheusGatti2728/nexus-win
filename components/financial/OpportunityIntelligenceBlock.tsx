"use client"
// NEXUS --- Opportunity Intelligence Panel v20
// Every opportunity renders the same depth. No exceptions.
// Calculators embedded directly in Sistema S and Taxa Cart--o.

import { useState } from "react"
import type { CalculationResult } from "@/src/calculator/strategic-calculator"
import { calcSistemaS, calcTaxaCartao } from "@/src/calculator/strategic-calculator"

// --------- Helpers ------------------------------------------------------------------------------------------------------------------------------------------------------

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { try { navigator.clipboard.writeText(text) } catch {} setOk(true); setTimeout(() => setOk(false), 1400) }}
      style={{ background:"none", border:"1px solid var(--border)", color:"var(--ink-4)", fontSize:"11px", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" as const, cursor:"pointer", padding:"3px 8px", transition:"all 150ms", flexShrink:0 }}
      onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = "var(--v-border)"; (e.target as HTMLElement).style.color = "var(--v-hi)" }}
      onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = "var(--border)"; (e.target as HTMLElement).style.color = "var(--ink-4)" }}>
      {ok ? "✓" : "Copiar"}
    </button>
  )
}

function fmtBRL(n: number | null | undefined): string {
  if (!n || n <= 0) return "—"
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `R$ ${Math.round(n / 1_000)}k`
  return `R$ ${n}`
}

const RISK_COLOR: Record<string, string> = {
  remoto: "var(--success)", possível: "var(--warning)", estruturante: "#a070c0", baixo: "var(--success)"
}

// --------- Embedded Calculators ---------------------------------------------------------------------------------------------------------------

function SistemaSCalc({ regime }: { regime: string }) {
  const [folha, setFolha]   = useState("")
  const [result, setResult] = useState<CalculationResult | null>(null)

  const parseBRL = (s: string): number => {
    const clean = s.replace(/[R$\s]/g, "")
    if (clean.includes(",")) return parseFloat(clean.replace(/\./g, "").replace(",", ".")) || 0
    const noThousands = clean.replace(/\.(\d{3})(?!\d)/g, "$1")
    return parseFloat(noThousands) || 0
  }

  const SM         = 1518
  const TETO       = SM * 20
  const ALIQ       = 0.058
  const folhaNum   = parseBRL(folha)
  const excedente  = Math.max(0, folhaNum - TETO)
  const liveMensal = excedente * ALIQ
  const liveRetro  = liveMensal * 60
  const canCalc    = folhaNum > 0 && excedente > 0

  const run = () => {
    setResult(calcSistemaS({ folha_mensal_bruta: folhaNum }))
  }

  const inp: React.CSSProperties = {
    background: "var(--canvas)", border: "1px solid var(--rule-mid)", color: "var(--ink-1)",
    fontFamily: "'JetBrains Mono',monospace", fontSize: "13px", padding: "8px 10px",
    outline: "none", width: "100%", transition: "border-color 100ms", borderRadius: "var(--r-md)",
    letterSpacing: "0.02em",
  }

  return (
    <div style={{ marginTop:8 }}>

      <div style={{ padding:"10px 14px", borderLeft:"2px solid var(--rule-mid)", marginBottom:14 }}>
        <p style={{ fontSize:10, color:"var(--ink-3)", lineHeight:1.65 }}>
          Tema 1.079 STJ — a base do Sistema S é limitada a <strong>20 salários mínimos (R$ {TETO.toLocaleString("pt-BR")})</strong>. Toda folha acima desse valor tem o excedente a recuperar retroativamente.
        </p>
      </div>

      <div style={{ marginBottom:10 }}>
        <p style={{ fontSize:11, fontWeight:500, letterSpacing:"0.07em", textTransform:"uppercase" as const, color:"var(--ink-4)", marginBottom:6 }}>
          Folha mensal bruta (R$)
        </p>
        <input style={inp} value={folha}
          onChange={e => { setFolha(e.target.value); setResult(null) }}
          placeholder="Ex: 200.000"
          onFocus={e => (e.target as HTMLInputElement).style.borderColor = "var(--v-border)"}
          onBlur={e => (e.target as HTMLInputElement).style.borderColor = "var(--rule-mid)"}/>
      </div>

      {folhaNum > 0 && (
        <div style={{ padding:"10px 14px", background:"var(--canvas)", marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ fontSize:10, color:"var(--ink-4)" }}>Teto legal</span>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"var(--ink-3)" }}>R$ {TETO.toLocaleString("pt-BR")}</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom: excedente > 0 ? 8 : 0 }}>
            <span style={{ fontSize:10, color:"var(--ink-4)" }}>Excedente mensal</span>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color: excedente > 0 ? "var(--v)" : "var(--ink-4)" }}>
              {excedente > 0 ? `R$ ${excedente.toLocaleString("pt-BR")}` : "— abaixo do teto"}
            </span>
          </div>
          {liveMensal > 0 && (
            <>
              <div style={{ height:1, background:"var(--rule)", margin:"4px 0" }} />
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:10, color:"var(--ink-2)", fontWeight:500 }}>Impacto mensal (5,8%)</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:500, color:"var(--v)" }}>{fmtBRL(liveMensal)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:10, color:"var(--ink-2)", fontWeight:500 }}>Retroativo 60 meses</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:500, color:"var(--green)" }}>{fmtBRL(liveRetro)}</span>
              </div>
            </>
          )}
        </div>
      )}

      <button onClick={run} disabled={!canCalc} style={{
        width:"100%", padding:"9px 0", fontSize:"11px", fontWeight:500, fontFamily:"'Inter',sans-serif",
        background: canCalc ? "var(--v-wash)" : "transparent",
        border:`1px solid ${canCalc ? "var(--v-border)" : "var(--rule)"}`,
        color: canCalc ? "var(--v)" : "var(--ink-4)",
        cursor: canCalc ? "pointer" : "not-allowed",
        transition:"all 120ms", borderRadius:"var(--r-md)",
      }}>
        {!folhaNum ? "Informe a folha mensal" : excedente === 0 ? "Folha abaixo do teto — sem excedente" : "Ver cálculo detalhado"}
      </button>

      {result && result.monthly_impact && (
        <div style={{ marginTop:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
            {[
              ["Conservador", result.retroativo_5y?.conservador, "var(--ink-3)"],
              ["Provável",    result.retroativo_5y?.provavel,    "var(--v)"],
              ["Otimista",    result.retroativo_5y?.otimista,    "var(--green)"],
            ].map(([l,v,c]) => (
              <div key={l as string} style={{ textAlign:"center" as const, padding:"10px 6px", borderBottom:`2px solid ${c}` }}>
                <p style={{ fontSize:11, color:"var(--ink-4)", letterSpacing:"0.06em", textTransform:"uppercase" as const, marginBottom:4 }}>{l as string}</p>
                <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:c as string }}>{fmtBRL(v as number)}</p>
                <p style={{ fontSize:11, color:"var(--ink-4)", marginTop:2 }}>60 meses</p>
              </div>
            ))}
          </div>
          {result.premises.map((p, i) => (
            <p key={i} style={{ fontSize:10, color:"var(--ink-4)", fontFamily:"'JetBrains Mono',monospace", marginBottom:3 }}>— {p}</p>
          ))}
          {result.limitations.slice(0,2).map((l, i) => (
            <p key={i} style={{ fontSize:10, color:"var(--yellow)", marginTop:i===0?8:2 }}>⚠ {l}</p>
          ))}
          <p style={{ fontSize:11, color:"var(--ink-4)", fontStyle:"italic", marginTop:8, lineHeight:1.6 }}>{result.disclaimer}</p>
        </div>
      )}
    </div>
  )
}

function TaxaCartaoCalc({ regime }: { regime: string }) {
  const [fat, setFat]     = useState("")
  const [pct, setPct]     = useState("")
  const [mdr, setMdr]     = useState("")
  const [result, setResult] = useState<CalculationResult | null>(null)

  const isSimples = regime === "simples_nacional"

  // Robust BRL parser: handles all formats
  // "500.000,00" --- 500000 | "500.000" --- 500000 | "500000" --- 500000 | "500.50" --- 500.5
  const parseBRL = (s: string): number => {
    const clean = s.replace(/[R$\s]/g, "")
    if (clean.includes(",")) {
      // Brazilian: dots=thousands separator, comma=decimal --- remove dots, replace comma
      return parseFloat(clean.replace(/\./g, "").replace(",", ".")) || 0
    }
    // No comma: dot may be thousands separator ("500.000") or decimal ("500.50")
    // Heuristic: dot followed by exactly 3 digits at end of string --- thousands
    const noThousands = clean.replace(/\.(\d{3})(?!\d)/g, "$1")
    return parseFloat(noThousands) || 0
  }

  // Parse percentage: "70", "70,5", "70.5" all --- number
  const parsePct = (s: string): number => {
    const clean = s.replace(",", ".")
    const n = parseFloat(clean)
    return isNaN(n) ? 0 : Math.min(n, 100)
  }

  // Parse MDR: "1,8", "1.8", "2" --- number
  const parseMDR = (s: string): number => {
    const clean = s.replace(",", ".")
    const n = parseFloat(clean)
    return isNaN(n) || n <= 0 ? 1.8 : Math.min(n, 10)  // default 1.8%, cap 10%
  }

  const run = () => {
    const r = calcTaxaCartao({
      faturamento_mensal:  parseBRL(fat),
      percentual_cartao:   parsePct(pct),
      taxa_media_mdr:      mdr ? parseMDR(mdr) : undefined,
      regime: regime as "lucro_real" | "lucro_presumido" | "simples_nacional",
    })
    setResult(r)
  }

  // Live preview
  const fatNum = parseBRL(fat)
  const pctNum = parsePct(pct)
  const mdrNum = mdr ? parseMDR(mdr) : 1.8
  const aliq   = regime === "lucro_real" ? 9.25 : 3.65
  const liveMonthly = fatNum > 0 && pctNum > 0
    ? (fatNum * pctNum / 100) * (mdrNum / 100) * (aliq / 100)
    : null

  const canCalc = parseBRL(fat) > 0 && parsePct(pct) > 0
  const inp: React.CSSProperties = {
    background: "var(--canvas)", border: "1px solid var(--border-mid)", color: "var(--ink-1)",
    fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", padding: "8px 10px",
    outline: "none", width: "100%", transition: "border-color 100ms", borderRadius: "var(--r-md)",
  }

  if (isSimples) {
    return (
      <div style={{ padding:"12px 16px", borderLeft:"2px solid var(--border-mid)" }}>
        <p style={{ fontSize:11, color:"var(--ink-3)", lineHeight:1.6 }}>
          Não aplicável ao Simples Nacional — o regime unifica as contribuições, eliminando a separação de base e alíquota de PIS/COFINS que fundamenta a tese dos Temas 779/780.
        </p>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 8 }}>

      {/* Context note */}
      <div style={{ padding:"8px 12px", background:"var(--canvas)", marginBottom:12, borderLeft:"2px solid var(--border-mid)" }}>
        <p style={{ fontSize:10, color:"var(--ink-3)", lineHeight:1.6 }}>
          O MDR (taxa da maquininha) não deve compor a base do PIS/COFINS — Temas 779/780 STJ. O impacto é calculado sobre o PIS/COFINS recolhido a mais sobre a taxa paga às adquirentes (Cielo, Rede, Stone, etc.).
        </p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:10 }}>
        <div>
          <p style={{ fontSize:11, fontWeight:500, letterSpacing:"0.06em", textTransform:"uppercase" as const, color:"var(--ink-3)", marginBottom:4 }}>Faturamento mensal (R$)</p>
          <input style={inp} value={fat} onChange={e => setFat(e.target.value)} placeholder="Ex: 500.000"
            onFocus={e => (e.target as HTMLInputElement).style.borderColor = "rgba(124,58,237,0.3)"}
            onBlur={e => (e.target as HTMLInputElement).style.borderColor = "var(--border-mid)"}/>
        </div>
        <div>
          <p style={{ fontSize:11, fontWeight:500, letterSpacing:"0.06em", textTransform:"uppercase" as const, color:"var(--ink-3)", marginBottom:4 }}>% vendas em cartão</p>
          <input style={inp} value={pct} onChange={e => setPct(e.target.value)} placeholder="Ex: 70"
            onFocus={e => (e.target as HTMLInputElement).style.borderColor = "rgba(124,58,237,0.3)"}
            onBlur={e => (e.target as HTMLInputElement).style.borderColor = "var(--border-mid)"}/>
        </div>
        <div>
          <p style={{ fontSize:11, fontWeight:500, letterSpacing:"0.06em", textTransform:"uppercase" as const, color:"var(--ink-3)", marginBottom:4 }}>Taxa MDR % (padrão 1,8%)</p>
          <input style={inp} value={mdr} onChange={e => setMdr(e.target.value)} placeholder="1,8"
            onFocus={e => (e.target as HTMLInputElement).style.borderColor = "rgba(124,58,237,0.3)"}
            onBlur={e => (e.target as HTMLInputElement).style.borderColor = "var(--border-mid)"}/>
        </div>
      </div>

      {/* Live calculation preview */}
      {liveMonthly !== null && liveMonthly > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"7px 12px", background:"var(--canvas)", marginBottom:10, borderRadius:"var(--r-md)" }}>
          <span style={{ fontSize:10, color:"var(--ink-4)" }}>Estimativa ao vivo:</span>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:500, color:"var(--v)" }}>
            {fmtBRL(liveMonthly)}/mês
          </span>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:"var(--ink-3)" }}>
            → {fmtBRL(liveMonthly * 60)} retroativo 60m
          </span>
        </div>
      )}

      <button onClick={run} disabled={!canCalc} style={{
        width:"100%", padding:"9px 0", fontSize:"11px", fontWeight:500,
        fontFamily:"'Inter',sans-serif",
        background: canCalc ? "rgba(124,58,237,0.08)" : "transparent",
        border: `1px solid ${canCalc ? "rgba(124,58,237,0.2)" : "var(--border)"}`,
        color: canCalc ? "var(--v)" : "var(--ink-4)",
        cursor: canCalc ? "pointer" : "not-allowed",
        transition:"all 120ms", borderRadius:"var(--r-md)",
      }}>
        {canCalc ? "Calcular impacto completo" : "Informe faturamento e % em cartão"}
      </button>

      {result && (
        <div style={{ marginTop:16 }}>
          {result.retroativo_5y ? (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
                {[
                  ["Conservador", result.retroativo_5y.conservador, "var(--ink-3)"],
                  ["Provável",    result.retroativo_5y.provavel,    "var(--v)"],
                  ["Otimista",    result.retroativo_5y.otimista,    "var(--success)"],
                ].map(([l,v,c]) => (
                  <div key={l as string} style={{ padding:"12px 10px", borderBottom:"2px solid " + (c as string), textAlign:"center" }}>
                    <p style={{ fontSize:11, color:"var(--ink-4)", textTransform:"uppercase" as const, letterSpacing:"0.06em", marginBottom:4 }}>{l as string}</p>
                    <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:500, color:c as string }}>{fmtBRL(v as number)}</p>
                    <p style={{ fontSize:11, color:"var(--ink-4)", marginTop:2 }}>retroativo 60m</p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize:10, color:"var(--ink-3)", marginBottom:8 }}>
                Mensal estimado: <strong>{fmtBRL(result.monthly_impact?.provavel ?? 0)}</strong> · Alíquota: {aliq}% PIS/COFINS
              </p>
              {result.premises.map((p, i) => (
                <p key={i} style={{ fontSize:10, color:"var(--ink-4)", fontFamily:"'JetBrains Mono',monospace", marginBottom:2 }}>— {p}</p>
              ))}
              {result.limitations.slice(0,2).map((l, i) => (
                <p key={i} style={{ fontSize:10, color:"var(--warning)", marginTop:i===0?8:2 }}>⚠ {l}</p>
              ))}
              <p style={{ fontSize:11, color:"var(--ink-4)", fontStyle:"italic", marginTop:8, lineHeight:1.6 }}>{result.disclaimer}</p>
            </>
          ) : (
            <div style={{ padding:"12px 16px", background:"var(--canvas)", borderLeft:"2px solid var(--border-mid)" }}>
              <p style={{ fontSize:11, color:"var(--ink-3)", lineHeight:1.6 }}>
                {result.missing_inputs.length > 0
                  ? `Preencha: ${result.missing_inputs.join(", ")}`
                  : "Volume calculado abaixo de R$ 50/mês. Verifique os valores informados."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// --------- Main Opportunity Block ---------------------------------------------------------------------------------------------------------

interface OpportunityBlockProps {
  module: any
  financialCalc?:  CalculationResult | null
  regime:          string
  companyName:     string
  whyItFits?:      string   // from dossier-engine contextualizer
}

export function OpportunityIntelligenceBlock({ module: m, financialCalc, regime, companyName, whyItFits }: OpportunityBlockProps) {
  const [open, setOpen] = useState(false)
  const nome = companyName.split(" ")[0]
  const hasCalc = ["sistema_s", "pis_cofins_taxa_cartao"].includes(m.slug)

  const execSummary = m.executive_summary ?? m.opportunity_summary ?? m.first_pitch ?? "Análise em andamento."
  const whyFits = whyItFits ?? m.why_it_fits_this_company ?? (
    m.slug === "pis_cofins_folha"
      ? `Como ${nome} opera em regime de folha relevante, há aderência preliminar para análise estrutural da tributação sobre mão de obra.`
      : m.slug === "plurifasico_beneficio"
      ? `Como ${nome} atua no comércio/distribuição, a análise de produtos com tributação monofásica pode revelar créditos não aproveitados.`
      : `Ainda não existem evidências suficientes para contextualizar esta oportunidade especificamente para ${nome}. Validar operação na ligação.`
  )

  const riskColor = RISK_COLOR[m.risk_level] ?? "var(--ink-3)"

  return (
    <div style={{ borderBottom:"1px solid var(--border)" }}>
      {/* Header row */}
      <button onClick={() => setOpen(!open)} style={{
        width:"100%", display:"flex", alignItems:"center", gap:20, padding:"22px 48px",
        background:"none", border:"none", cursor:"pointer", textAlign:"left",
        transition:"background 150ms",
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--bg-1)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "none"}>
        {/* Score */}
        <div style={{ textAlign:"center", flexShrink:0, width:52 }}>
          <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:17, fontWeight:300, color:"var(--v)" }}>{m.score}</p>
          <p style={{ fontSize:"11px", color:"var(--ink-4)", textTransform:"uppercase" as const, letterSpacing:"0.08em" }}>{m.tier}</p>
        </div>
        {/* Name + summary */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
            <p style={{ fontSize:13.5, fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", color:"var(--ink-1)", letterSpacing:"-0.025em" }}>{m.name}</p>
            <span style={{ fontSize:"11px", fontWeight:500, letterSpacing:"0.05em", padding:"1px 6px", border:`1px solid ${riskColor}`, color:riskColor, borderRadius:3 }}>
              {m.risk_level}
            </span>
            {m.priority === "core" && (
              <span style={{ fontSize:"11px", fontWeight:500, letterSpacing:"0.05em", padding:"1px 6px", border:"1px solid var(--v-border)", color:"var(--v)", background:"var(--v-wash)", borderRadius:3 }}>
                CORE
              </span>
            )}
          </div>
          <p style={{ fontSize:12, color:"var(--ink-3)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:500 }}>{execSummary.slice(0, 100)}…</p>
        </div>
        {/* Retroativo */}
        {financialCalc?.retroativo_5y && (
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:16, fontWeight:500, color:"var(--ink-1)" }}>
              {fmtBRL(financialCalc.retroativo_5y.provavel)}
            </p>
            <p style={{ fontSize:"11px", color:"var(--ink-4)", textTransform:"uppercase" as const, letterSpacing:"0.06em" }}>retroativo est.</p>
          </div>
        )}
        <span style={{ color:"var(--ink-4)", fontSize:12, flexShrink:0, transition:"transform 200ms", transform: open ? "rotate(180deg)" : "none" }}>▾</span>
      </button>

      {/* Expanded content */}
      {open && (
        <div style={{ padding:"0 52px 44px", display:"flex", flexDirection:"column", gap:28 }}>

          {/* 1. Resumo executivo */}
          <div style={{ borderLeft:"2px solid var(--accent)", paddingLeft:20, background:"var(--v-wash)", padding:"16px 20px" }}>
            <p style={{ fontSize:"10px", fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase" as const, color:"var(--v-border)", marginBottom:8 }}>Resumo executivo</p>
            <p style={{ fontSize:13, color:"var(--ink-1)", lineHeight:1.8 }}>{execSummary}</p>
          </div>

          {/* 2. Por que cabe para esta empresa */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div style={{ background:"var(--lift)", border:"1px solid var(--border)", padding:20 }}>
              <p style={{ fontSize:"11px", fontWeight:500, letterSpacing:"0.07em", textTransform:"uppercase" as const, color:"var(--ink-4)", marginBottom:10 }}>Por que cabe para {nome}</p>
              <p style={{ fontSize:12, color:"var(--ink-2)", lineHeight:1.7 }}>{whyFits}</p>
            </div>

            {/* 3. Como introduzir + linguagem exata */}
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {m.commercial_read && (
                <div style={{ background:"var(--lift)", border:"1px solid var(--border)", padding:16, flex:1 }}>
                  <p style={{ fontSize:"11px", fontWeight:500, letterSpacing:"0.07em", textTransform:"uppercase" as const, color:"var(--ink-4)", marginBottom:8 }}>Como introduzir na ligação</p>
                  <p style={{ fontSize:12, color:"var(--ink-2)", lineHeight:1.6 }}>{m.commercial_read}</p>
                </div>
              )}
            </div>
          </div>

          {/* 4. Linguagem exata + Curiosity gap */}
          {(m.how_to_use_in_call || m.curiosity_trigger) && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {m.how_to_use_in_call && (
                <div style={{ background:"var(--lift)", border:"1px solid var(--border-mid)", padding:16 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                    <p style={{ fontSize:"11px", fontWeight:500, letterSpacing:"0.07em", textTransform:"uppercase" as const, color:"var(--ink-4)" }}>Linguagem exata</p>
                    <CopyBtn text={m.how_to_use_in_call} />
                  </div>
                  <p style={{ fontSize:12, color:"var(--ink-1)", lineHeight:1.7, fontStyle:"italic" }}>"{m.how_to_use_in_call}"</p>
                </div>
              )}
              {m.curiosity_trigger && (
                <div style={{ background:"var(--lift)", border:"1px solid var(--border-mid)", padding:16 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                    <p style={{ fontSize:"11px", fontWeight:500, letterSpacing:"0.07em", textTransform:"uppercase" as const, color:"var(--ink-4)" }}>⚡ Curiosity gap</p>
                    <CopyBtn text={m.curiosity_trigger} />
                  </div>
                  <p style={{ fontSize:12, color:"var(--v)", lineHeight:1.7, fontStyle:"italic" }}>"{m.curiosity_trigger}"</p>
                </div>
              )}
            </div>
          )}

          {/* 5. Q&A esperado */}
          {m.expected_questions && m.expected_questions.length > 0 && (
            <div>
              <p style={{ fontSize:"11px", fontWeight:500, letterSpacing:"0.07em", textTransform:"uppercase" as const, color:"var(--ink-4)", marginBottom:12 }}>Questionamentos esperados</p>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {m.expected_questions.map((qa, i) => (
                  <div key={i} style={{ background:"var(--lift)", border:"1px solid var(--border)", padding:16 }}>
                    <p style={{ fontSize:12, fontWeight:600, color:"var(--ink-1)", marginBottom:8 }}>"{qa.q}"</p>
                    <div style={{ paddingLeft:12, borderLeft:"2px solid var(--success-dim)" }}>
                      <p style={{ fontSize:12, color:"var(--ink-2)", lineHeight:1.6 }}>{qa.a}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Fundamento + Período retroativo */}
          {(m.legal_basis || m.retroactive_period) && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {m.legal_basis && (
                <div style={{ background:"var(--lift)", border:"1px solid var(--border)", padding:16 }}>
                  <p style={{ fontSize:"11px", fontWeight:500, letterSpacing:"0.07em", textTransform:"uppercase" as const, color:"var(--ink-4)", marginBottom:8 }}>Fundamento jurídico</p>
                  <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"var(--v)", lineHeight:1.6 }}>{m.legal_basis}</p>
                </div>
              )}
              {m.retroactive_period && (
                <div style={{ background:"var(--lift)", border:"1px solid var(--border)", padding:16 }}>
                  <p style={{ fontSize:"11px", fontWeight:500, letterSpacing:"0.07em", textTransform:"uppercase" as const, color:"var(--ink-4)", marginBottom:8 }}>Período retroativo</p>
                  <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:13, color:"var(--ink-1)" }}>{m.retroactive_period}</p>
                </div>
              )}
            </div>
          )}

          {/* 7. Calculadora embutida (Sistema S e Taxa Cartão) */}
          {hasCalc && (
            <div style={{ background:"var(--lift)", border:"1px solid var(--border-mid)", padding:20 }}>
              <p style={{ fontSize:"11px", fontWeight:500, letterSpacing:"0.07em", textTransform:"uppercase" as const, color:"var(--ink-4)", marginBottom:12 }}>
                Estimativa financeira — {m.slug === "sistema_s" ? "Sistema S" : "Taxa de Cartão"}
              </p>
              {m.slug === "sistema_s" ? (
                <SistemaSCalc regime={regime} />
              ) : (
                <TaxaCartaoCalc regime={regime} />
              )}
            </div>
          )}

          {/* 8. Financeiro pré-calculado (outros módulos) */}
          {!hasCalc && financialCalc?.retroativo_5y && (
            <div>
              <p style={{ fontSize:"11px", fontWeight:500, letterSpacing:"0.07em", textTransform:"uppercase" as const, color:"var(--ink-4)", marginBottom:12 }}>Estimativa financeira (60 meses)</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                {[
                  ["Conservador", financialCalc.retroativo_5y.conservador, "var(--ink-3)"],
                  ["Provável",    financialCalc.retroativo_5y.provavel,    "var(--v)"],
                  ["Otimista",   financialCalc.retroativo_5y.otimista,    "var(--success)"],
                ].map(([l,v,c]) => (
                  <div key={l as string} style={{ background:"var(--lift)", border:"1px solid var(--border)", padding:14, textAlign:"center" }}>
                    <p style={{ fontSize:"11px", fontWeight:600, letterSpacing:"0.1em", textTransform:"uppercase" as const, color:"var(--ink-3)", marginBottom:6 }}>{l as string}</p>
                    <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14, fontWeight:500, color:c as string }}>{fmtBRL(v as number)}</p>
                  </div>
                ))}
              </div>
              {financialCalc.disclaimer && (
                <p style={{ fontSize:"11px", color:"var(--ink-4)", fontStyle:"italic", marginTop:8 }}>{financialCalc.disclaimer}</p>
              )}
            </div>
          )}

          {/* 9. Validation questions */}
          {m.validation_questions && m.validation_questions.length > 0 && (
            <div>
              <p style={{ fontSize:"11px", fontWeight:500, letterSpacing:"0.07em", textTransform:"uppercase" as const, color:"var(--ink-4)", marginBottom:10 }}>Confirmar na ligação</p>
              {m.validation_questions.map((q, i) => (
                <div key={i} style={{ display:"flex", gap:10, padding:"7px 0", borderBottom:"1px solid var(--border)" }}>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:"11px", color:"var(--v-border)", flexShrink:0, paddingTop:2 }}>{String(i+1).padStart(2,"0")}</span>
                  <p style={{ fontSize:12, color:"var(--ink-3)", lineHeight:1.5 }}>{q}</p>
                </div>
              ))}
            </div>
          )}

          {/* 10. Risk notes */}
          {m.risk_notes && m.risk_notes.length > 0 && (
            <div>
              {m.risk_notes.map((r, i) => (
                <div key={i} style={{ padding:"10px 14px", borderLeft:"2px solid var(--warning-dim)", background:"var(--warning-faint)", marginBottom:4 }}>
                  <p style={{ fontSize:11, color:"var(--warning)" }}>⚠ {r}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
