// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS TAX INTELLIGENCE --- All UI Types
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

export type EventType =
  | "dossier_started" | "cnpj_validated" | "company_enriched"
  | "company_persisted" | "score_pronto" | "financial_estimations_ready"
  | "prompt_built" | "llm_generation_started" | "llm_generation_completed"
  | "output_validated" | "report_persisted" | "report_ready"
  | "dossier_failed" | "dossier_partial"

export interface PipelineEvent {
  event_type: EventType
  org_id: string
  user_id: string
  company_id: string | null
  report_id: string | null
  timestamp: string
  severity: "info" | "warning" | "error"
  payload: Record<string, unknown>
}

export type ScoreTier = "S" | "A" | "B" | "C" | "D"
export type RiskLevel = "remoto" | "possível" | "estruturante" | "baixo"
export type ConfidenceLevel = "low" | "medium" | "high"
export type PipelineStage =
  | "idle" | "validating" | "fetching" | "enriching" | "persisting"
  | "scoring" | "calculating" | "building_prompt" | "generating"
  | "validating_output" | "persisting_report" | "complete" | "failed" | "partial"

export interface ScoreData {
  score: number
  tier: ScoreTier
  recommended_modules: string[]
  rejected_modules: string[]
  needs_more_data: string[]
  recommendation_count: number
}

export interface RecommendedModule {
  module_id: string
  module_slug: string
  module_name: string
  score: number
  risk_level: RiskLevel
  ideal_persona: string
  first_pitch: string
  commercial_argument: string
  complexity: "Baixa" | "Média" | "Alta"
  category: string
}

export interface RejectedModule {
  module_id: string
  module_slug: string
  module_name: string
  rejection_reason: string
  hard_rule_triggered: string
}

export interface FinancialEstimation {
  module_id: string
  module_slug: string
  module_name: string
  estimation_available: boolean
  confidence_level: ConfidenceLevel
  conservative_value: number | null
  probable_value: number | null
  optimistic_value: number | null
  monthly_reference_value: number | null
  calculation_basis: string
  formula_description: string
  assumptions: string[]
  missing_inputs: string[]
  warnings: string[]
  legal_risk_note: string
  should_show_to_client: boolean
  should_require_human_review: boolean
}

export interface DossierOpportunity {
  module_slug: string
  name: string
  relevance_explanation: string
  commercial_argument: string
  financial_reference: string | null
  risk_transparency: string
}

export interface DossierData {
  title: string
  executive_summary: string
  company_context: string
  strategic_reading: string
  recommended_opportunities: DossierOpportunity[]
  financial_view: string
  risk_notes: string[]
  suggested_approach: string
  meeting_agenda: string[]
  next_steps: string[]
  internal_notes: string[]
  disclaimer: string
}

export interface PersonaData {
  tag: string
  priority: "primary" | "secondary"
  main_pain: string
  language_style: string
  opening: string
  value_argument: string
  avoid: string[]
  cta: string
}

export interface CompanyInfo {
  name: string
  cnpj: string
  cnpj_formatted: string
  segmento: string
  regime: string
  anos_operacao: number
  uf: string
  porte: string
}

export interface DossierProgressState {
  stage: PipelineStage
  events: PipelineEvent[]
  company: CompanyInfo | null
  scoreData: ScoreData | null
  recommendedModules: RecommendedModule[]
  rejectedModules: RejectedModule[]
  financialData: FinancialEstimation[]
  dossierData: DossierData | null
  personaData: PersonaData[]
  error: string | null
  isComplete: boolean
  isPartial: boolean
  elapsedMs: number
  reportId: string | null
}
