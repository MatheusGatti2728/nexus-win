"use client"
// NEXUS --- Opportunity Calculator Cards

import { useState } from "react"
import type { CalculationResult, CalculatorInput } from "@/src/calculator/strategic-calculator"
import { runStrategicCalculator } from "@/src/calculator/strategic-calculator"
import type { Segment, TaxRegime } from "@/src/engine/tax-matrix"

// --------- Format helpers ---------------------------------------------------------------------------------------------------------------------------------

function fmtBRL(n: number | null | undefined): string {
  if (!n || n <= 0) return "—"
  return n >= 1_000_000 ? `R$ ${(n/1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `R$ ${Math.round(n/1_000)}k`
    : `R$ ${n}`
}

// --------- Single result card ---------------------------------------------------------------------------------------------------------------------

function ResultCard({ result }: { result: CalculationResult }) {
  const [expanded, setExpanded] = useState(false)
  const hasValue = Boolean(result.monthly_impact || result.retroativo_5y)

  const confColor = result.confidence === "high" ? "text-emerald-400 border-emerald-800"
    : result.confidence === "medium" ? "text-amber-400 border-amber-800"
    : "text-[#4a5752] border-[#1e3d34]"

  return (
    <div className={`border bg-[#0f2520] ${expanded ? "border-[#7a6138]" : "border-[#1e3d34]"}`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-start gap-4 px-5 py-4 text-left">
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-[#e8e4dc] leading-snug">{result.module_name}</p>
          {result.missing_inputs.length > 0 && (
            <p className="text-[10px] text-amber-400/70 mt-1">⚠ Faltando: {result.missing_inputs.join(", ")}</p>
          )}
        </div>

        {hasValue ? (
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-[#4a5752] uppercase">Retroativo (60m)</p>
            <p className="text-[16px] font-black font-mono text-[#b8965a]">{fmtBRL(result.retroativo_5y?.provavel ?? null)}</p>
            <p className="text-[10px] text-[#4a5752]">mensal: {fmtBRL(result.monthly_impact?.provavel ?? null)}</p>
          </div>
        ) : (
          <div className="text-right flex-shrink-0">
            <p className="text-[11px] text-[#2a3d36] italic">Dados insuficientes</p>
          </div>
        )}

        <span className={`text-[12px] text-[#4a5752] flex-shrink-0 mt-0.5 ${expanded ? "rotate-180" : ""}`}>▾</span>
      </button>

      {expanded && (
        <div className="border-t border-[#1e3d34] px-5 pb-5 pt-4 space-y-4">
          {/* Range table */}
          {hasValue && result.retroativo_5y && (
            <div>
              <p className="text-[10px] font-bold uppercase text-[#7a6138] mb-3">Estimativa retroativa (60 meses)</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["Conservador", result.retroativo_5y.conservador, "text-[#4a5752]"],
                  ["Provável",    result.retroativo_5y.provavel,    "text-[#b8965a]"],
                  ["Otimista",    result.retroativo_5y.otimista,    "text-emerald-400"],
                ].map(([label, value, color]) => (
                  <div key={label as string} className="border border-[#1e3d34] p-3 text-center">
                    <p className="text-[9px] text-[#4a5752] uppercase mb-1">{label as string}</p>
                    <p className={`text-[14px] font-black font-mono ${color as string}`}>{fmtBRL(value as number)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formula */}
          <div>
            <p className="text-[10px] font-bold uppercase text-[#7a6138] mb-1">Fórmula</p>
            <p className="text-[11px] font-mono text-[#4a5752] bg-[#0a1209] px-3 py-2">{result.formula}</p>
          </div>

          {/* Premises */}
          <div>
            <p className="text-[10px] font-bold uppercase text-[#7a6138] mb-2">Premissas utilizadas</p>
            {result.premises.map((p, i) => <p key={i} className="text-[11px] text-[#4a5752] mb-0.5">— {p}</p>)}
          </div>

          {/* Limitations */}
          {result.limitations.length > 0 && (
            <div className="px-3 py-2 border border-amber-800/40 bg-amber-950/10">
              <p className="text-[9px] uppercase text-amber-500 mb-1">Limitações</p>
              {result.limitations.map((l, i) => <p key={i} className="text-[11px] text-amber-400/60 mb-0.5">— {l}</p>)}
            </div>
          )}

          {/* Confidence + disclaimer */}
          <div className="flex items-center justify-between">
            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 border ${confColor}`}>
              confiança {result.confidence}
            </span>
          </div>
          <p className="text-[10px] text-[#2a3d36] italic">{result.disclaimer}</p>
        </div>
      )}
    </div>
  )
}

// --------- Calculator input form ------------------------------------------------------------------------------------------------------------

interface InputFormProps {
  segment:   Segment
  regime:    TaxRegime
  onCalc:    (results: CalculationResult[]) => void
}

function CalculatorInputForm({ segment, regime, onCalc }: InputFormProps) {
  const [folha,    setFolha]    = useState("")
  const [nFunc,    setNFunc]    = useState("")
  const [fat,      setFat]      = useState("")
  const [pctCart,  setPctCart]  = useState("")
  const [compras,  setCompras]  = useState("")
  const [pctAtac,  setPctAtac]  = useState("")

  function run() {
    const parsed: CalculatorInput = {
      regime:                 regime as "lucro_real"|"lucro_presumido"|"simples_nacional",
      segment:                segment as "servicos"|"comercio"|"industria",
      folha_mensal:           folha    ? Number(folha.replace(/\D/g,""))    : undefined,
      num_funcionarios:       nFunc    ? Number(nFunc)                       : undefined,
      faturamento_mensal:     fat      ? Number(fat.replace(/\D/g,""))      : undefined,
      percentual_cartao:      pctCart  ? Number(pctCart)                    : undefined,
      compras_mensais:        compras  ? Number(compras.replace(/\D/g,""))  : undefined,
      percentual_atacadista:  pctAtac  ? Number(pctAtac)                    : undefined,
    }
    onCalc(runStrategicCalculator(parsed))
  }

  const inp = "w-full bg-[#0a1209] border border-[#1e3d34] text-[#e8e4dc] text-[12px] px-3 py-2 outline-none focus:border-[#7a6138] placeholder:text-[#2a3d36]"
  const lb  = "text-[10px] font-bold uppercase text-[#4a5752] block mb-1"

  return (
    <div className="border border-[#1e3d34] bg-[#0f2520] p-4 space-y-3">
      <p className="text-[10px] font-bold uppercase text-[#7a6138]">Dados para estimativa</p>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lb}>Folha bruta mensal (R$)</label><input placeholder="Ex: 150000" value={folha} onChange={e=>setFolha(e.target.value)} className={inp}/></div>
        <div><label className={lb}>Nº funcionários</label><input placeholder="Ex: 80" value={nFunc} onChange={e=>setNFunc(e.target.value)} className={inp}/></div>
        {segment !== "industria" && <>
          <div><label className={lb}>Faturamento mensal (R$)</label><input placeholder="Ex: 500000" value={fat} onChange={e=>setFat(e.target.value)} className={inp}/></div>
          <div><label className={lb}>% vendas em cartão</label><input placeholder="Ex: 70" value={pctCart} onChange={e=>setPctCart(e.target.value)} className={inp}/></div>
        </>}
        {segment === "industria" && <>
          <div><label className={lb}>Compras mensais (R$)</label><input placeholder="Ex: 300000" value={compras} onChange={e=>setCompras(e.target.value)} className={inp}/></div>
          <div><label className={lb}>% de atacadistas</label><input placeholder="Ex: 30" value={pctAtac} onChange={e=>setPctAtac(e.target.value)} className={inp}/></div>
        </>}
      </div>
      <button onClick={run}
        className="w-full bg-[rgba(184,150,90,0.08)] border border-[#7a6138] text-[#d4a96a] text-[11px] font-bold uppercase py-2.5 hover:bg-[rgba(184,150,90,0.14)] transition-all">
        Calcular estimativas
      </button>
      <p className="text-[10px] text-[#2a3d36] italic text-center">Estimativas preliminares sujeitas à validação documental</p>
    </div>
  )
}

// --------- Main component ---------------------------------------------------------------------------------------------------------------------------------

interface Props {
  segment:   Segment
  regime:    TaxRegime
  autoResults?: CalculationResult[]   // if already calculated from pipeline
}

export function OpportunityCalculatorCard({ segment, regime, autoResults }: Props) {
  const [results, setResults] = useState<CalculationResult[]>(autoResults ?? [])

  return (
    <div className="space-y-4">
      <CalculatorInputForm segment={segment} regime={regime} onCalc={setResults} />
      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase text-[#4a5752]">
            {results.length} módulo(s) calculado(s)
          </p>
          {results.map((r, i) => <ResultCard key={i} result={r} />)}
        </div>
      )}
    </div>
  )
}
