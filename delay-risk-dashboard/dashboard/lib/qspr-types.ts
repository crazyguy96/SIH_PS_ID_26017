// QSPR/PAIMANA Prediction — independent type definitions.
// Deliberately separate from lib/types.ts: this subsystem has its own
// identity model (project_id + legacy_project_id), its own risk fields,
// and its own history shape that doesn't map onto the existing
// ProjectListItem/ProjectDetail types.

export interface QsprValidationResult {
  is_valid: boolean;
  reason: string | null;
  detected_report_label: string | null;
  checks: string[];
}

export interface QsprIssue {
  stage:
    | "extraction"
    | "feature_preparation"
    | "prediction"
    | "missing_required_source_information"
    | "unexpected_error";
  project_id: string | null;
  project_name: string | null;
  page: number | null;
  reason: string;
}

export interface QsprPreviousPrediction {
  report_label: string;
  delay_probability_pct: number;
  prediction_class: string;
  risk_category: "High" | "Medium" | "Low";
}

export interface QsprProjectResult {
  project_id: string;
  legacy_project_id: string | null;
  project_name: string | null;
  agency: string | null;
  ministry: string | null;
  sector: string | null;
  state: string | null;
  approval_date: string | null;
  original_completion_date: string | null;
  revised_completion_date: string | null;
  original_cost_crore: number | null;
  anticipated_cost_crore: number | null;
  cumulative_expenditure_crore: number | null;
  physical_progress_pct: number | null;
  source_page: number | null;
  delay_probability_pct: number;
  prediction_class: string;
  risk_category: "High" | "Medium" | "Low";
  model_version: string;
  previously_scored: boolean;
  previous_predictions: QsprPreviousPrediction[];
  actual_outcome_known: boolean;
}

export interface QsprPredictResponse {
  report_label: string | null;
  projects_extracted: number;
  predictions_generated: number;
  high_risk_count: number;
  average_delay_probability_pct: number;
  issue_count: number;
  results: QsprProjectResult[];
  issues: QsprIssue[];
}

export interface QsprProjectDetailResponse {
  project_id: string;
  current: QsprProjectResult & { report_label: string };
  previous: QsprPreviousPrediction[];
  actual_outcome_known: boolean;
  actual_outcome: string | null;
}

export interface QsprSectorAnalyticsRow {
  label: string;
  average_delay_probability_pct: number;
  project_count: number;
}

export interface QsprAnalyticsSummary {
  report_label: string | null;
  projects_extracted: number;
  predictions_generated: number;
  high_risk_count: number;
  high_risk_pct?: number;
  average_delay_probability_pct: number;
}
