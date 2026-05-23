"use client"
// NEXUS --- Persuasion Panel (--- Copiloto Elite)
// Full persuasion engine UI

import { useState } from "react"
import type { PersuasionOutput } from "@/src/sales/persuasion-engine"

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { try { navigator.clipboard.writeText(text) } catch {} setOk(true); setTimeout(()=>setOk(false),1500) }}
      className="text-[9px] font-bold uppercase px-2 py-1 border border-[#1e3d34] text-[#4a5752] hover:border-[#7a6138] hover:text-[#8a9490] transition-all flex-shrink-0">
      {ok ? "✓" : "copiar"}
    </button>
  )
}

type Sub = "roteiro" | "ganchos" | "email" | "whatsapp" | "objecoes" | "autoridade"
const SUBS: Array<{key:Sub;label:string}> = [
  {key:"roteiro",   label:"Roteiro"},
  {key:"ganchos",   label:"Ganchos"},
  {key:"email",     label:"E-mail"},
  {key:"whatsapp",  label:"WhatsApp"},
  {key:"objecoes",  label:"Objeções"},
  {key:"autoridade",label:"Autoridade"},
]

interface Props {
  persuasion:  PersuasionOutput
  companyName: string
}

export function PersuasionPanel({ persuasion: p, companyName }: Props) {
  const [sub, setSub]           = useState<Sub>("roteiro")
  const [emailVer, setEmailVer] = useState<"formal"|"curta"|"pos_reuniao">("formal")
  const [waStage, setWaStage]   = useState<"abordagem"|"followup"|"pos_reuniao">("abordagem")
  const [expanded, setExpanded] = useState<number|null>(null)

  const flow  = p.conversation_flow
  const email = emailVer === "formal" ? p.email : emailVer === "curta" ? p.email_curta : p.email_pos_reuniao
  const wa    = waStage === "abordagem" ? p.wa_abordagem : waStage === "followup" ? p.wa_followup : p.wa_pos_reuniao

  const tc = (active: boolean) => `py-2.5 px-3 text-[10px] font-bold tracking-[0.08em] uppercase border-b-2 -mb-px whitespace-nowrap transition-all ${active ? "text-[#b8965a] border-[#b8965a]" : "text-[#4a5752] border-transparent hover:text-[#8a9490]"}`

  return (
    <div className="space-y-4">
      {/* Persona + channel strip */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] font-bold uppercase px-2 py-1 border border-[#b8965a] text-[#b8965a]">{p.persona_profile.label}</span>
        <span className="text-[10px] text-[#4a5752]">Canal: <span className="text-[#8a9490]">{p.recommended_channel}</span></span>
        <span className="text-[10px] text-[#4a5752]">Timing: <span className="text-[#8a9490]">{p.best_time_to_call}</span></span>
        <span className="text-[10px] text-[#4a5752]">Tom: <span className="text-[#8a9490]">{p.persona_profile.tone}</span></span>
      </div>

      {/* Subtabs */}
      <div className="flex border-b border-[#1e3d34] overflow-x-auto">
        {SUBS.map(s => <button key={s.key} onClick={()=>setSub(s.key)} className={tc(sub===s.key)}>{s.label}</button>)}
      </div>

      {/* ROTEIRO */}
      {sub==="roteiro" && (
        <div className="space-y-4">
          <div className="border border-[#b8965a] bg-[rgba(184,150,90,0.04)] p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase text-[#7a6138]">Roteiro completo da ligação</p>
              <CopyBtn text={flow.full_script} />
            </div>
            <pre className="text-[12px] text-[#e8e4dc] whitespace-pre-wrap font-sans leading-relaxed">{flow.full_script}</pre>
          </div>

          {[
            ["Abertura (primeiros 30s)", flow.abertura],
            ["Contexto (por que você está ligando)", flow.contexto],
            ["Curiosity Gap (o que você encontrou)", flow.curiosity_gap],
            ["Pergunta-chave (que qualifica e gera curiosidade)", flow.pergunta_chave],
            ["CTA Principal", flow.cta_principal],
            ["CTA Fallback (se resistir)", flow.cta_fallback],
          ].map(([label, text]) => (
            <div key={label} className="border border-[#1e3d34] bg-[#0f2520] p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase text-[#7a6138]">{label}</p>
                <CopyBtn text={text as string} />
              </div>
              <p className="text-[12px] text-[#8a9490] leading-relaxed">{text as string}</p>
            </div>
          ))}

          <div className="border border-[#1e3d34] bg-[#0a1209] px-4 py-2.5">
            <p className="text-[10px] font-mono text-[#4a5752]">{flow.tone_note}</p>
          </div>
        </div>
      )}

      {/* GANCHOS */}
      {sub==="ganchos" && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase text-[#4a5752] mb-2">Ganchos contextuais — específicos para {companyName}</p>
          {p.contextual_hooks.map((h, i) => (
            <div key={i} className="border border-[#1e3d34] bg-[#0f2520] p-4">
              <div className="flex items-start gap-2 mb-2">
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 border flex-shrink-0 ${h.confidence==="high"?"text-emerald-400 border-emerald-800":h.confidence==="medium"?"text-amber-400 border-amber-800":"text-[#4a5752] border-[#1e3d34]"}`}>{h.type}</span>
                <span className="text-[10px] text-[#2a3d36]">{h.evidence}</span>
                <CopyBtn text={h.hook} />
              </div>
              <p className="text-[12px] text-[#e8e4dc] leading-relaxed mb-3">"{h.hook}"</p>
              <div className="pl-3 border-l-2 border-[#7a6138]">
                <p className="text-[11px] text-[#8a9490] italic">Transição: {h.transition}</p>
              </div>
            </div>
          ))}

          {/* Curiosity gap standalone */}
          <div className="border border-[#b8965a] bg-[rgba(184,150,90,0.04)] p-4">
            <p className="text-[10px] font-bold uppercase text-[#7a6138] mb-3">Curiosity Gap — o que você encontrou (sem revelar)</p>
            {[
              ["O que encontrei (não revela)", p.curiosity_gap.gap_statement],
              ["Valor implícito", p.curiosity_gap.implied_value],
              ["Elemento de mistério", p.curiosity_gap.mystery_element],
              ["Pergunta de validação", p.curiosity_gap.validation_ask],
            ].map(([l,t]) => (
              <div key={l} className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] uppercase text-[#4a5752]">{l as string}</p>
                  <CopyBtn text={t as string} />
                </div>
                <p className="text-[12px] text-[#8a9490] italic">"{t as string}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EMAIL */}
      {sub==="email" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(["formal","curta","pos_reuniao"] as const).map(v => (
              <button key={v} onClick={()=>setEmailVer(v)}
                className={`text-[10px] font-bold uppercase px-3 py-1.5 border transition-all ${emailVer===v?"border-[#b8965a] text-[#d4a96a] bg-[rgba(184,150,90,0.08)]":"border-[#1e3d34] text-[#4a5752]"}`}>
                {v==="pos_reuniao"?"Pós-reunião":v.charAt(0).toUpperCase()+v.slice(1)}
              </button>
            ))}
          </div>
          <div className="border border-[#1e3d34] bg-[#0f2520] p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase text-[#7a6138]">Assunto</p>
              <CopyBtn text={email.subject} />
            </div>
            <p className="text-[12px] font-semibold text-[#e8e4dc]">{email.subject}</p>
          </div>
          <div className="border border-[#1e3d34] bg-[#0f2520] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase text-[#7a6138]">Corpo</p>
              <CopyBtn text={email.body + (email.ps ? "\n\n" + email.ps : "")} />
            </div>
            <pre className="text-[12px] text-[#8a9490] whitespace-pre-wrap font-sans leading-relaxed">{email.body}</pre>
            {email.ps && <p className="text-[12px] text-[#4a5752] italic mt-4 pt-4 border-t border-[#1e3d34]">{email.ps}</p>}
          </div>
          {email.data_used.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {email.data_used.map((d,i) => <span key={i} className="text-[10px] text-emerald-400/70 border border-emerald-900/40 px-2 py-0.5">✓ {d}</span>)}
            </div>
          )}
          <div className="border border-[#0f2520] bg-[#070f0d] px-4 py-2">
            <p className="text-[10px] font-mono text-[#2a3d36]">Tom: {email.tone}</p>
          </div>
        </div>
      )}

      {/* WHATSAPP */}
      {sub==="whatsapp" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(["abordagem","followup","pos_reuniao"] as const).map(v => (
              <button key={v} onClick={()=>setWaStage(v)}
                className={`text-[10px] font-bold uppercase px-3 py-1.5 border transition-all ${waStage===v?"border-[#b8965a] text-[#d4a96a] bg-[rgba(184,150,90,0.08)]":"border-[#1e3d34] text-[#4a5752]"}`}>
                {v==="pos_reuniao"?"Pós-reunião":v==="abordagem"?"Abordagem":"Follow-up"}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#4a5752]">{wa.char_count} chars · {wa.tone_check}</span>
            <CopyBtn text={wa.text} />
          </div>
          <div className="bg-[#1a2f1a] border border-[#2e5040] rounded-2xl rounded-tl-none p-5 max-w-sm">
            <pre className="text-[13px] text-[#e8e4dc] whitespace-pre-wrap font-sans leading-relaxed">{wa.text}</pre>
          </div>
          {!wa.is_natural && (
            <div className="px-4 py-2 border border-amber-800/50 bg-amber-950/10">
              <p className="text-[11px] text-amber-400">{wa.tone_check}</p>
            </div>
          )}
        </div>
      )}

      {/* OBJEÇÕES */}
      {sub==="objecoes" && (
        <div className="space-y-3">
          {p.top_objections.map((obj, i) => (
            <div key={i} className={`border bg-[#0f2520] transition-colors ${expanded===i?"border-[#7a6138]":"border-[#1e3d34]"}`}>
              <button onClick={()=>setExpanded(expanded===i?null:i)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <p className="text-[12px] font-semibold text-[#e8e4dc] flex-1">"{obj.objection}"</p>
                <span className={`text-[12px] text-[#4a5752] ${expanded===i?"rotate-180":""}`}>▾</span>
              </button>
              {expanded===i && (
                <div className="border-t border-[#1e3d34] px-4 pb-4 pt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="px-3 py-2 border border-[#1e3d34] bg-[#0a1209]">
                      <p className="text-[9px] uppercase text-[#4a5752] mb-1">Leitura psicológica</p>
                      <p className="text-[11px] text-[#8a9490]">{obj.psychological_read}</p>
                    </div>
                    <div className="px-3 py-2 border border-[#1e3d34] bg-[#0a1209]">
                      <p className="text-[9px] uppercase text-[#4a5752] mb-1">Motivo real</p>
                      <p className="text-[11px] text-[#8a9490]">{obj.real_reason}</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[9px] uppercase text-[#7a6138]">Resposta curta</p>
                      <CopyBtn text={obj.short_response} />
                    </div>
                    <div className="pl-3 border-l-2 border-emerald-800">
                      <p className="text-[12px] text-[#e8e4dc]">"{obj.short_response}"</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[9px] uppercase text-[#7a6138]">Resposta completa</p>
                      <CopyBtn text={obj.long_response} />
                    </div>
                    <p className="text-[12px] text-[#8a9490] leading-relaxed">{obj.long_response}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[9px] uppercase text-blue-400 mb-1">Pergunta de retorno</p>
                      <p className="text-[12px] text-blue-400/70 italic">"{obj.return_question}"</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-amber-400 mb-1">Rota alternativa</p>
                      <p className="text-[12px] text-amber-400/70">{obj.alternative_route}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AUTORIDADE */}
      {sub==="autoridade" && (
        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase text-[#4a5752] mb-2">Como soar como um consultor sênior, não como um vendedor</p>
          {[
            ["Abertura institucional", p.authority_frame.institutional_opener],
            ["Sinal de expertise (sem dizer 'sou especialista')", p.authority_frame.expertise_signal],
            ["Prova social (empresas do mesmo perfil)", p.authority_frame.social_proof],
            ["Frame de urgência (sem pressão artificial)", p.authority_frame.urgency_frame],
            ["Postura", p.authority_frame.posture],
          ].map(([l,t]) => (
            <div key={l} className="border border-[#1e3d34] bg-[#0f2520] p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase text-[#7a6138]">{l as string}</p>
                <CopyBtn text={t as string} />
              </div>
              <p className="text-[12px] text-[#8a9490] leading-relaxed">"{t as string}"</p>
            </div>
          ))}

          {/* Persona profile */}
          <div className="border border-[#1e3d34] bg-[#0f2520] p-4">
            <p className="text-[10px] font-bold uppercase text-[#7a6138] mb-3">Perfil da persona — {p.persona_profile.label}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[9px] uppercase text-[#4a5752] mb-1">Palavras que funcionam</p>
                {p.persona_profile.words_that_work.map((w,i)=><span key={i} className="text-[11px] text-emerald-400 mr-2">"{w}"</span>)}
              </div>
              <div>
                <p className="text-[9px] uppercase text-red-400 mb-1">Palavras a evitar</p>
                {p.persona_profile.words_to_avoid.map((w,i)=><span key={i} className="text-[11px] text-red-400/70 mr-2">"{w}"</span>)}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div><p className="text-[9px] uppercase text-[#4a5752] mb-1">Medo principal</p><p className="text-[11px] text-[#8a9490]">{p.persona_profile.main_fear}</p></div>
              <div><p className="text-[9px] uppercase text-[#4a5752] mb-1">O que cria confiança</p><p className="text-[11px] text-[#8a9490]">{p.persona_profile.trust_signal}</p></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
