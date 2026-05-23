// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS COMMERCIAL COPILOT --- Types
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { Segment, TaxRegime, OperationFlag } from "../engine/tax-matrix"

// --------- Company profile ------------------------------------------------------------------------------------------------------------------------------

export type OperationSignal =
  | "alto_cartao" | "provavel_st" | "consumidor_final" | "alta_folha"
  | "exportador" | "industrial" | "servico_intensivo" | "interestadual"
  | "ecommerce" | "grande_porte" | "maturidade_alta" | "maturidade_baixa"

export type ProbablePain =
  | "pressao_caixa" | "margem_operacional" | "complexidade_fiscal"
  | "encargos_folha" | "custo_tributario_alto" | "revisao_atrasada"
  | "risco_auditoria" | "ineficiencia_creditos"

export type LikelyFocus =
  | "eficiencia" | "caixa" | "revisao_operacional" | "exportacao"
  | "folha" | "encargos" | "creditos" | "risco"

export interface CompanySnapshot {
  segment: Segment
  subsegment: string
  operation_signals: OperationSignal[]
  probable_pains: ProbablePain[]
  likely_focus: LikelyFocus[]
  maturity_reading: string        // "empresa madura com operação estruturada"
  strategic_moment: string        // "momento ideal para abordagem"
  red_flags: string[]             // things that could complicate the approach
  opportunity_urgency: "alta" | "media" | "baixa"
}

// --------- Persona types ------------------------------------------------------------------------------------------------------------------------------------

export type PersonaType = "cfo" | "socio" | "fiscal" | "contador" | "rh"

export interface PersonaBehavior {
  persona:          PersonaType
  label:            string
  wants:            string[]   // what this persona cares about
  fears:            string[]   // what this persona avoids
  language_style:   string
  decision_speed:   "rapido" | "deliberado" | "consensual"
  trust_builders:   string[]   // what builds trust with this persona
  trust_breakers:   string[]   // what destroys trust immediately
  best_time:        string
  ideal_entry:      string     // how to open with this persona
  power_questions:  string[]
}

// --------- Conversation entry ---------------------------------------------------------------------------------------------------------------------

export interface ConversationEntry {
  channel:       "telefone" | "email" | "whatsapp" | "linkedin"
  persona:       PersonaType
  opening_line:  string        // the very first thing to say/write
  context_hook:  string        // company-specific hook that shows intelligence
  pain_trigger:  string        // the pain point to open
  curiosity_gap: string        // what makes them want to know more
  full_script:   string[]      // step by step
  fallback:      string        // if they say they're busy
  tone_notes:    string        // voice/tone guidance
}

// --------- Objection model ------------------------------------------------------------------------------------------------------------------------------

export interface ObjectionResponse {
  objection:      string
  response:       string
  tone:           "empathetic" | "authoritative" | "curious" | "concessive"
  follow_up:      string        // what to say right after the response
  avoid:          string        // what NOT to say
  persona:        PersonaType[]
  segment?:       Segment[]
  module_slug?:   string
}

// --------- Email model ------------------------------------------------------------------------------------------------------------------------------------------

export interface GeneratedEmail {
  subject:        string
  preview_text:   string        // email preview line
  body:           string
  ps:             string        // postscript with hook
  tone:           string
  ideal_send_time: string
}

// --------- WhatsApp model ---------------------------------------------------------------------------------------------------------------------------------

export interface WhatsAppMessage {
  text:           string        // the actual message — short, human, no AI-smell
  character_count: number
  tone_check:     string        // "soa humano?", "tem urgência falsa?"
  avoid_reason?:  string        // warning if message has issues
}

// --------- Follow-up model ---------------------------------------------------------------------------------------------------------------------------

export type FollowupStage =
  | "d0_first_contact"
  | "d3_warm_follow"
  | "d7_value_add"
  | "post_meeting"
  | "no_response_break_silence"
  | "authority_reinforcement"

export interface FollowupMessage {
  stage:          FollowupStage
  day:            string        // "D+0", "D+3" etc.
  channel:        "email" | "whatsapp" | "telefone"
  subject?:       string        // for email
  text:           string
  objective:      string        // what this message is trying to achieve
  trigger:        string        // when to send this
}

// --------- Contextual hook ---------------------------------------------------------------------------------------------------------------------------

export interface ContextualHook {
  trigger:        string        // what makes this hook relevant
  hook:           string        // the actual hook line
  segment:        Segment[]
  persona:        PersonaType[]
  operation_flag?: OperationFlag
}

// --------- Pain mapping ---------------------------------------------------------------------------------------------------------------------------------------

export interface PainMap {
  segment:        Segment
  regime:         TaxRegime
  top_pains:      Array<{ pain: string; intensity: "alta" | "media" | "baixa"; commercial_angle: string }>
  pain_language:  Record<PersonaType, string>   // how each persona describes their pain
}

// --------- Narrative model ------------------------------------------------------------------------------------------------------------------------------

export interface NarrativeFrame {
  segment:        Segment
  core_narrative: string      // the master narrative for this segment
  power_words:    string[]    // words that resonate with this segment
  avoid_words:    string[]    // words that trigger resistance
  analogies:      string[]    // analogies that work for this segment
  proof_types:    string[]    // what kind of proof they find credible
}

// --------- Realtime assistant state ---------------------------------------------------------------------------------------------------

export interface RealtimeAssistantState {
  active_persona:     PersonaType
  current_stage:      "opening" | "discovery" | "pitch" | "objection" | "close" | "followup"
  suggested_question: string
  live_objection:     string | null
  suggested_response: string | null
  tone_alert:         string | null    // "você está sendo técnico demais"
  next_move:          string
  cta:                string
}

// --------- Full copilot output ------------------------------------------------------------------------------------------------------------------

export interface CopilotOutput {
  snapshot:           CompanySnapshot
  persona_behaviors:  PersonaPlaybookFull[]
  conversation_entries: ConversationEntry[]
  objections:         ObjectionResponse[]
  emails:             GeneratedEmail[]
  whatsapp_messages:  WhatsAppMessage[]
  followups:          FollowupMessage[]
  contextual_hooks:   ContextualHook[]
  pain_map:           PainMap
  narrative:          NarrativeFrame
  what_not_to_say:    WhatNotToSay
}

export interface PersonaPlaybookFull {
  persona:          PersonaBehavior
  entry:            ConversationEntry
  top_objections:   ObjectionResponse[]
  power_questions:  string[]
  cta:              string
}

export interface WhatNotToSay {
  banned_phrases:  Array<{ phrase: string; why: string; use_instead: string }>
  tone_traps:      string[]   // behaviors that reduce trust
  persona_specific: Record<PersonaType, string[]>
}
