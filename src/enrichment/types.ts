// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS --- Company Intelligence Enrichment Types
//
// RULES:
// - Never invent data. Missing = "n--o identificado".
// - Separate fact from hypothesis.
// - Every insight must cite its source.
// - Low confidence data must never become a strong assertion.
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// --------- Base source result ---------------------------------------------------------------------------------------------------------------------

export type SourceStatus     = "success" | "partial" | "failed" | "skipped"
export type ConfidenceLevel  = "low" | "medium" | "high"
export type DataType         = "fact" | "hypothesis" | "signal" | "unknown"

export interface SourceResult<T = Record<string, unknown>> {
  source:      string
  source_url?: string
  status:      SourceStatus
  confidence:  ConfidenceLevel
  data:        T
  findings:    string[]          // concrete findings from this source
  warnings:    string[]          // low confidence, partial data, assumptions
  fetched_at:  string
}

// --------- Brasil API / Receita Federal ---------------------------------------------------------------------------------------

export interface BrasilAPIData {
  cnpj:                string
  razao_social:        string
  nome_fantasia:       string | null
  situacao_cadastral:  string
  data_abertura:       string
  idade_anos:          number
  natureza_juridica:   string
  capital_social:      number | null
  porte:               string
  uf:                  string
  municipio:           string
  cnae_fiscal:         string
  cnae_fiscal_descricao: string
  cnaes_secundarios:   Array<{ codigo: string; descricao: string }>
  qsa:                 Array<{ nome: string; qual: string; qual_rf: string }>
  email:               string | null
  telefone:            string | null
}

// --------- Website data ---------------------------------------------------------------------------------------------------------------------------------------

export interface WebsiteData {
  url:               string | null
  found:             boolean
  title:             string | null
  description:       string | null
  products_services: string[]
  segments_served:   string[]
  has_ecommerce:     boolean
  has_export:        boolean
  has_esg:           boolean
  certifications:    string[]
  locations:         string[]
  about_summary:     string | null
  key_phrases:       string[]
}

// --------- News / public signals ------------------------------------------------------------------------------------------------------------

export interface NewsItem {
  title:      string
  summary:    string
  date:       string | null
  source:     string
  url:        string | null
  sentiment:  "positive" | "neutral" | "negative"
  tags:       string[]   // "expansão", "exportação", "investimento", "crise", etc.
}

export interface NewsData {
  items:           NewsItem[]
  top_signals:     string[]   // extracted commercial signals
  growth_signals:  boolean
  risk_signals:    boolean
}

// --------- Court / tribunal data ------------------------------------------------------------------------------------------------------------

export interface CourtCase {
  type:          string   // "mandado_segurança", "execucao_fiscal", "acao_anulatoria"
  subject:       string
  status:        string
  year:          number | null
  court:         string | null
  lawyers:       string[]
  tax_theme?:    string   // "ICMS", "PIS/COFINS", "IRPJ", etc.
}

export interface CourtData {
  cases:              CourtCase[]
  has_tax_litigation: boolean
  recurring_themes:   string[]
  known_lawyers:      string[]
  maturity_level:     "none" | "low" | "medium" | "high"
  manual_input?:      string    // consultant can paste info found manually
}

// --------- LinkedIn / decision makers ---------------------------------------------------------------------------------------------

export interface DecisionMaker {
  name:        string
  title:       string
  linkedin_url?: string
  confidence:  ConfidenceLevel
  source:      "linkedin" | "website" | "news" | "manual"
  is_target:   boolean    // primary target for cold approach
}

export interface LinkedInData {
  decision_makers: DecisionMaker[]
  company_size?:   string
  industry?:       string
  manual_input?:   string
}

// --------- Normalized intelligence output ------------------------------------------------------------------------------

export interface PublicSignal {
  signal:     string
  type:       DataType
  source:     string
  confidence: ConfidenceLevel
  commercial_hook?: string   // how this signal translates to a commercial angle
}

export interface TaxMaturitySignal {
  signal:      string
  implication: string
  source:      string
}

export interface CompanyIntelligence {
  cnpj:                          string
  company_identity:              Partial<BrasilAPIData>
  operational_summary:           string    // 2-3 sentences, facts only
  business_model_hypothesis:     string    // clearly labeled as hypothesis
  decision_makers:               DecisionMaker[]
  public_signals:                PublicSignal[]
  legal_signals:                 TaxMaturitySignal[]
  tax_maturity_signals:          TaxMaturitySignal[]
  likely_operations:             string[]
  commercial_hooks:              string[]  // ready-to-use in conversation
  risks_and_unknowns:            string[]
  recommended_validation_questions: string[]
  enrichment_sources:            Array<{ source: string; status: SourceStatus; confidence: ConfidenceLevel }>
  enrichment_confidence:         ConfidenceLevel
  enriched_at:                   string
}

// --------- Manual input (consultant pastes findings) ------------------------------------------------

export interface ManualEnrichmentInput {
  linkedin_url?:       string
  website_url?:        string
  news_snippet?:       string
  court_snippet?:      string
  decision_maker_name?: string
  decision_maker_title?: string
  notes?:              string
}
