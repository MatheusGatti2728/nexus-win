"use client"
// NEXUS --- Unified Copilot Panel v22
// Behavioral intelligence. Not scripts.
// Trains the consultant HOW to act, not what to say.

import { useState } from "react"
import type { UnifiedCopilotOutput } from "@/src/sales/unified-copilot-engine"

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { try { navigator.clipboard.writeText(text) } catch {} setOk(true); setTimeout(() => setOk(false), 1500) }}
      className="copy-btn">{ok ? "✓ Copiado" : "Copiar"}</button>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="t-label" style={{ marginBottom: 8 }}>{children}</p>
}

type Sub = "antes" | "abertura" | "objecoes" | "urgencia" | "email" | "whatsapp" | "perguntas"
const SUBS: Array<{ key: Sub; label: string; sub: string }> = [
  { key: "antes",    label: "Antes de Ligar", sub: "Briefing" },
  { key: "abertura", label: "Roteiro",         sub: "Ligação" },
  { key: "objecoes", label: "Objeções",        sub: "Controle" },
  { key: "urgencia", label: "Urgência",        sub: "Fechamento" },
  { key: "email",    label: "E-mail",          sub: "Executivo" },
  { key: "whatsapp", label: "WhatsApp",        sub: "Fluxos" },
  { key: "perguntas",label: "Perguntas",       sub: "Inteligentes" },
]

export function UnifiedCopilotPanel({ copilot: c }: { copilot: UnifiedCopilotOutput }) {
  const [sub, setSub] = useState<Sub>("antes")
  const beh = c.behavioral
  const preCM = beh?.pre_call_mentality
  const personaGuide = beh?.persona_guide
  const openingOpp = beh?.opening_opportunity
  const waFlows = beh?.whatsapp_flows

  return (
    <div>
      {/* Sub-tab strip */}
      <div style={{ display:"flex", gap:0, borderBottom:"1px solid var(--border)", marginBottom:28, overflowX:"auto" }}>
        {SUBS.map(s => (
          <button key={s.key} onClick={() => setSub(s.key)} style={{
            display:"flex", flexDirection:"column", gap:2,
            padding:"11px 16px 9px", border:"none",
            borderBottom:`2px solid ${sub===s.key?"var(--v)":"transparent"}`,
            background:"none", cursor:"pointer", whiteSpace:"nowrap", marginBottom:-1,
          }}>
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11.5, fontWeight:sub===s.key?500:400, color:sub===s.key?"var(--v-hi)":"var(--ink-3)", transition:"color 150ms" }}>
              {s.label}
            </span>
            
          </button>
        ))}
      </div>

      {/* ANTES DE LIGAR */}
      {sub==="antes"&&(
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {openingOpp&&(
            <div style={{ padding:"20px 24px", border:"1px solid var(--v-border)", background:"var(--v-wash)" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
                <div>
                  <p className="t-label" style={{ marginBottom:4, color:"var(--v-border)" }}>Melhor porta de entrada</p>
                  <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:15, fontWeight:700, color:"var(--iris-hi)" }}>{openingOpp.name}</p>
                </div>
                <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" as const, padding:"3px 8px", border:"1px solid var(--v-border)", color:"var(--v)" }}>
                  {openingOpp.commercial_temp==="easy"?"Alta abertura":openingOpp.commercial_temp==="medium"?"Média":"Técnico"}
                </span>
              </div>
              <p style={{ fontSize:12, color:"var(--ink-2)", lineHeight:1.7, marginBottom:12 }}>{openingOpp.why_first}</p>
              <div style={{ padding:"12px 16px", background:"var(--lift)", marginBottom:10 }}>
                <Label>Ângulo recomendado</Label>
                <p style={{ fontSize:12, color:"var(--ink-1)", lineHeight:1.6 }}>{openingOpp.opening_angle}</p>
              </div>
              <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                <div style={{ flex:1 }}>
                  <Label>Linha de curiosidade</Label>
                  <p style={{ fontSize:12, color:"var(--ink-1)", fontStyle:"italic", lineHeight:1.6 }}>"{openingOpp.curiosity_line}"</p>
                </div>
                <CopyBtn text={openingOpp.curiosity_line}/>
              </div>
              {preCM?.secondary_modules?.length>0&&(
                <p style={{ fontSize:10, color:"var(--ink-4)", marginTop:10 }}>
                  Menção secundária apenas se surgir naturalmente: {preCM.secondary_modules.join(", ")}
                </p>
              )}
            </div>
          )}

          {personaGuide&&(
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div style={{ padding:20, border:"1px solid var(--rule)", background:"var(--lift)" }}>
                <Label>{`Persona — ${personaGuide.persona_label}`}</Label>
                <p style={{ fontSize:12, color:"var(--ink-2)", lineHeight:1.6, marginBottom:10 }}>{personaGuide.primary_goal}</p>
                <div style={{ padding:"8px 12px", borderLeft:"2px solid var(--error-dim)", background:"var(--error-faint)" }}>
                  <p style={{ fontSize:11, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase" as const, color:"var(--error-dim)", marginBottom:4 }}>O que teme</p>
                  <p style={{ fontSize:11, color:"var(--ink-3)", lineHeight:1.5 }}>{personaGuide.what_they_fear}</p>
                </div>
              </div>
              <div style={{ padding:20, border:"1px solid var(--rule)", background:"var(--lift)" }}>
                <Label>O que desbloqueia o interesse</Label>
                <p style={{ fontSize:12, color:"var(--ink-2)", lineHeight:1.6, marginBottom:10 }}>{personaGuide.unlock_pattern}</p>
                <div style={{ padding:"8px 12px", borderLeft:"2px solid var(--warning-dim)", background:"var(--warning-faint)" }}>
                  <p style={{ fontSize:11, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase" as const, color:"var(--warning-dim)", marginBottom:4 }}>Zona de perigo</p>
                  <p style={{ fontSize:11, color:"var(--ink-3)", lineHeight:1.5 }}>{personaGuide.danger_zone}</p>
                </div>
              </div>
            </div>
          )}

          {preCM&&(
            <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div style={{ border:"1px solid var(--jade-border)", background:"var(--success-faint)", padding:20 }}>
                  <p className="t-label" style={{ marginBottom:12, color:"var(--success)" }}>Estado mental — comportamento</p>
                  {preCM.mindset_rules.map((rule:string,i:number)=>(
                    <div key={i} style={{ display:"flex", gap:10, padding:"6px 0", borderBottom:"1px solid rgba(42,158,110,0.1)" }}>
                      <span style={{ color:"var(--success)", fontSize:10, flexShrink:0, paddingTop:2 }}>✓</span>
                      <p style={{ fontSize:12, color:"var(--ink-2)", lineHeight:1.5 }}>{rule}</p>
                    </div>
                  ))}
                </div>
                <div style={{ border:"1px solid var(--rule)", background:"var(--lift)", padding:20 }}>
                  <Label>Tom</Label>
                  <p style={{ fontSize:12, color:"var(--ink-1)", lineHeight:1.6, marginBottom:14 }}>{preCM.tone_guidance}</p>
                  <Label>Ritmo</Label>
                  <p style={{ fontSize:12, color:"var(--ink-2)", lineHeight:1.6 }}>{preCM.pacing_note}</p>
                </div>
              </div>

              <div style={{ border:"1px solid var(--rule)", background:"var(--lift)", padding:20 }}>
                <Label>Validar na ligação — checklist</Label>
                {preCM.what_to_validate.map((v:string,i:number)=>(
                  <div key={i} style={{ display:"flex", gap:10, padding:"7px 0", borderBottom:"1px solid var(--border)", alignItems:"center" }}>
                    <div style={{ width:14, height:14, border:"1px solid var(--rule-mid)", flexShrink:0 }}/>
                    <p style={{ fontSize:12, color:"var(--ink-2)" }}>{v}</p>
                  </div>
                ))}
              </div>

              <div style={{ padding:"16px 20px", border:"1px solid var(--error-dim)", background:"var(--error-faint)" }}>
                <p className="t-label" style={{ marginBottom:10, color:"var(--error-dim)" }}>✗ Nunca fazer</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {[...preCM.what_not_to_do,...(c.legal_context?.avoid_in_opening??[])].map((d:string,i:number)=>(
                    <span key={i} style={{ fontSize:10, fontWeight:600, padding:"3px 8px", border:"1px solid var(--error-dim)", color:"var(--error)", background:"var(--error-faint)" }}>"{d}"</span>
                  ))}
                </div>
              </div>
            </>
          )}

          {c.legal_context?.opening_modifier&&(
            <div style={{ padding:"16px 20px", borderLeft:"2px solid var(--accent)", background:"var(--v-wash)" }}>
              <p className="t-label" style={{ marginBottom:8, color:"var(--v-border)" }}>⚖ Contexto jurídico ativo</p>
              <p style={{ fontSize:12, color:"var(--ink-1)", lineHeight:1.7 }}>{c.legal_context.opening_modifier}</p>
            </div>
          )}
        </div>
      )}

      {/* ROTEIRO */}
      {sub==="abertura"&&(
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {personaGuide?.example_intro&&(
            <div style={{ padding:"18px 20px", border:"1px solid var(--rule-mid)", background:"var(--lift)" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <Label>Tom de abertura — exemplo de como soar (adapte ao momento)</Label>
                <CopyBtn text={personaGuide.example_intro}/>
              </div>
              <p style={{ fontSize:13, color:"var(--ink-1)", fontStyle:"italic", lineHeight:1.8 }}>"{personaGuide.example_intro}"</p>
            </div>
          )}

          {c.call_flow.flow_steps?.length>0&&(
            <div>
              <p className="t-label" style={{ marginBottom:14 }}>Fluxo cronológico</p>
              {c.call_flow.flow_steps.map((step:string,i:number)=>(
                <div key={i} style={{ display:"flex", gap:16, padding:"14px 0", borderBottom:"1px solid var(--border)", position:"relative" }}>
                  {i<c.call_flow.flow_steps.length-1&&<div style={{ position:"absolute", left:11, top:34, width:1, height:24, background:"var(--border-mid)" }}/>}
                  <div style={{ width:24, height:24, border:"1px solid var(--v-border)", background:"var(--v-wash)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"var(--v)", fontWeight:700 }}>{String(i+1).padStart(2,"0")}</span>
                  </div>
                  <p style={{ fontSize:12, color:"var(--ink-2)", flex:1, lineHeight:1.6, paddingTop:4 }}>{step}</p>
                </div>
              ))}
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {([
              ["Contexto de setor", c.call_flow.sector_context],
              ["Ângulo competitivo", c.call_flow.competitive_angle],
              ["Pergunta âncora", c.call_flow.anchor_question],
              ["Pré-empt de objeção", c.call_flow.pre_empt_objection],
            ] as [string,string][]).filter(([,v])=>v).map(([l,v])=>(
              <div key={l} style={{ background:"var(--lift)", border:"1px solid var(--rule)", padding:16 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <p className="t-label">{l}</p>
                  <CopyBtn text={v}/>
                </div>
                <p style={{ fontSize:12, color:"var(--ink-2)", lineHeight:1.6 }}>{v}</p>
              </div>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div style={{ padding:"16px 20px", borderLeft:"2px solid var(--accent)", background:"var(--v-wash)" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <p className="t-label">CTA principal</p>
                <CopyBtn text={c.call_flow.cta_primary}/>
              </div>
              <p style={{ fontSize:12, color:"var(--ink-1)", fontStyle:"italic", lineHeight:1.7 }}>"{c.call_flow.cta_primary}"</p>
            </div>
            {personaGuide?.transition_to_cta&&(
              <div style={{ padding:"16px 20px", background:"var(--lift)", border:"1px solid var(--rule)" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <p className="t-label">Transição para agenda</p>
                  <CopyBtn text={personaGuide.transition_to_cta}/>
                </div>
                <p style={{ fontSize:12, color:"var(--ink-2)", fontStyle:"italic", lineHeight:1.7 }}>"{personaGuide.transition_to_cta}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* OBJEÇÕES */}
      {sub==="objecoes"&&(
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {c.objections.slice(0,6).map((obj:any,i:number)=>(
            <div key={i} style={{ border:"1px solid var(--rule)", background:"var(--lift)" }}>
              <div style={{ padding:"14px 20px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:"var(--ink-4)" }}>{String(i+1).padStart(2,"0")}</span>
                <p style={{ fontSize:13, fontWeight:600, color:"var(--ink-1)", fontFamily:"'Space Grotesk',sans-serif" }}>"{obj.trigger}"</p>
              </div>
              <div style={{ padding:"14px 20px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                <div>
                  <p className="t-label" style={{ marginBottom:6 }}>Leitura psicológica</p>
                  <p style={{ fontSize:11, color:"var(--ink-3)", lineHeight:1.5, fontStyle:"italic" }}>{obj.psychological_read}</p>
                </div>
                <div>
                  <p className="t-label" style={{ marginBottom:6 }}>Resposta</p>
                  <p style={{ fontSize:12, color:"var(--ink-2)", lineHeight:1.6 }}>{obj.response}</p>
                </div>
                <div>
                  <div style={{ marginBottom:10 }}>
                    <p className="t-label" style={{ marginBottom:4 }}>Follow-up</p>
                    <p style={{ fontSize:11, color:"var(--ink-3)", lineHeight:1.5 }}>{obj.follow_up}</p>
                  </div>
                  {obj.never_say&&(
                    <div style={{ padding:"6px 10px", borderLeft:"2px solid var(--error-dim)", background:"var(--error-faint)" }}>
                      <p style={{ fontSize:11, fontWeight:600, letterSpacing:"0.12em", textTransform:"uppercase" as const, color:"var(--error-dim)", marginBottom:3 }}>Nunca dizer</p>
                      <p style={{ fontSize:10, color:"var(--error)", lineHeight:1.4 }}>"{obj.never_say}"</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* URGÊNCIA */}
      {sub==="urgencia"&&(
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {([
            ["Urgência suave",         c.urgency.soft,            false],
            ["Urgência direta",        c.urgency.direct,          true],
            ["Matemática retroativa",  c.urgency.retroactive_math, false],
            ["Timing de setor",        c.urgency.sector_timing,   false],
          ] as [string,string,boolean][]).filter(([,v])=>v).map(([l,v,accent])=>(
            <div key={l} style={{ padding:"18px 20px", border:`1px solid ${accent?"var(--v-border)":"var(--border)"}`, background:accent?"var(--v-wash)":"var(--lift)" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <p className="t-label" style={{ color:accent?"var(--v-border)":undefined }}>{l}</p>
                <CopyBtn text={v}/>
              </div>
              <p style={{ fontSize:13, color:"var(--ink-1)", lineHeight:1.7, fontStyle:"italic" }}>"{v}"</p>
            </div>
          ))}
        </div>
      )}

      {/* E-MAIL */}
      {sub==="email"&&(
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ padding:"14px 20px", background:"var(--lift)", border:"1px solid var(--rule)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <p className="t-label">Assunto</p>
              <CopyBtn text={c.email.subject}/>
            </div>
            <p style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:13, fontWeight:600, color:"var(--ink-1)" }}>{c.email.subject}</p>
          </div>
          {[["E-mail curto (preferido)", c.email.body_short, true], ["E-mail formal", c.email.body_formal, false]].map(([l,v,pref])=>(
            <div key={l as string} style={{ padding:"18px 20px", background:"var(--lift)", border:`1px solid ${pref?"var(--border-mid)":"var(--border)"}` }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                <p className="t-label">{l as string}</p>
                <CopyBtn text={v as string}/>
              </div>
              <pre style={{ fontFamily:"inherit", fontSize:12, color:"var(--ink-1)", lineHeight:1.9, whiteSpace:"pre-wrap", margin:0 }}>{v as string}</pre>
            </div>
          ))}
          {c.email.ps&&(
            <div style={{ padding:"12px 16px", borderLeft:"2px solid var(--v-border)", background:"var(--v-wash)" }}>
              <p className="t-label" style={{ marginBottom:6 }}>P.S.</p>
              <p style={{ fontSize:12, color:"var(--ink-2)", lineHeight:1.6 }}>{c.email.ps}</p>
            </div>
          )}
        </div>
      )}

      {/* WHATSAPP */}
      {sub==="whatsapp"&&(
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          {waFlows?.initial&&(
            <div>
              <p className="t-label" style={{ marginBottom:14 }}>Primeiro contato</p>
              {waFlows.initial.messages.map((msg:any,i:number)=>(
                <div key={i} style={{ border:"1px solid var(--rule-mid)", background:"var(--lift)", padding:"18px 20px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                    <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" as const, padding:"2px 8px", border:"1px solid var(--v-border)", color:"var(--v)" }}>D+0</span>
                    <p style={{ fontSize:10, color:"var(--ink-4)" }}>{msg.when}</p>
                    <span style={{ marginLeft:"auto" }}><CopyBtn text={msg.message}/></span>
                  </div>
                  <pre style={{ fontFamily:"inherit", fontSize:12, color:"var(--ink-1)", lineHeight:1.9, whiteSpace:"pre-wrap", margin:0 }}>{msg.message}</pre>
                  <div style={{ marginTop:12, padding:"8px 12px", borderLeft:"2px solid var(--border-mid)", background:"var(--canvas)" }}>
                    <p style={{ fontSize:10, color:"var(--ink-3)", lineHeight:1.5, fontStyle:"italic" }}>📌 {msg.note}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {waFlows?.followups&&waFlows.followups.length>0&&(
            <div>
              <p className="t-label" style={{ marginBottom:14 }}>Fluxos de follow-up — cenários reais</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {waFlows.followups.map((flow:any,fi:number)=>(
                  <WaAccordion key={fi} flow={flow}/>
                ))}
              </div>
            </div>
          )}

          {!waFlows&&[
            ["Abertura",c.whatsapp.initial],
            ["Follow-up",c.whatsapp.followup],
            ["Pós reunião",c.whatsapp.post_meeting],
          ].filter(([,v])=>v).map(([l,v])=>(
            <div key={l as string} style={{ padding:"16px 20px", background:"var(--lift)", border:"1px solid var(--rule)" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <p className="t-label">{l as string}</p>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:11, color:"var(--ink-4)" }}>{(v as string).length} chars</span>
                  <CopyBtn text={v as string}/>
                </div>
              </div>
              <pre style={{ fontFamily:"inherit", fontSize:12, color:"var(--ink-1)", lineHeight:1.9, whiteSpace:"pre-wrap", margin:0 }}>{v as string}</pre>
            </div>
          ))}
        </div>
      )}

      {/* PERGUNTAS */}
      {sub==="perguntas"&&(
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {c.smart_questions.map((q:string,i:number)=>(
            <div key={i} style={{ display:"flex", gap:14, padding:"13px 0", borderBottom:"1px solid var(--border)", alignItems:"flex-start" }}>
              <span className="t-mono" style={{ fontSize:11, color:"var(--v-border)", flexShrink:0, paddingTop:3 }}>{String(i+1).padStart(2,"0")}</span>
              <p style={{ fontSize:13, color:"var(--ink-1)", flex:1, lineHeight:1.6 }}>{q}</p>
              <CopyBtn text={q}/>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function WaAccordion({ flow }: { flow: { sequence_label:string; messages:Array<{step:string;when:string;message:string;note:string}> } }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ border:"1px solid var(--rule)", background:"var(--lift)" }}>
      <button onClick={()=>setOpen(!open)} style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:"none", border:"none", cursor:"pointer", textAlign:"left" as const }}
        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="var(--bg-1)"}
        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="none"}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"var(--ink-4)" }}>{flow.messages[0]?.step??""}</span>
        <span style={{ fontSize:12, fontWeight:500, color:"var(--ink-1)", flex:1 }}>{flow.sequence_label}</span>
        <span style={{ color:"var(--ink-4)", fontSize:11, transform:open?"rotate(180deg)":"none", transition:"transform 200ms" }}>▾</span>
      </button>
      {open&&(
        <div style={{ borderTop:"1px solid var(--border)", padding:"16px 20px", display:"flex", flexDirection:"column", gap:12 }}>
          {flow.messages.map((msg,i:number)=>(
            <div key={i}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <span style={{ fontSize:11, color:"var(--ink-4)" }}>{msg.when}</span>
                <CopyBtn text={msg.message}/>
              </div>
              <pre style={{ fontFamily:"inherit", fontSize:12, color:"var(--ink-1)", lineHeight:1.9, whiteSpace:"pre-wrap", margin:0, marginBottom:8 }}>{msg.message}</pre>
              <div style={{ padding:"6px 12px", borderLeft:"2px solid var(--border-mid)", background:"var(--canvas)" }}>
                <p style={{ fontSize:10, color:"var(--ink-3)", lineHeight:1.5, fontStyle:"italic" }}>📌 {msg.note}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
