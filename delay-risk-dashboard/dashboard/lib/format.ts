import { RiskCategory } from "./types";

const FEATURE_LABELS: Record<string, string> = {
  project_age_months_at_report: "Project Age at Reporting (Months)",
  physical_progress_pct: "Physical Progress (%)",
  original_cost_crore: "Original Sanctioned Cost (₹ Cr)",
  state_freq_encoded: "State-Level Delay Pattern Index",
  anticipated_cost_crore_extracted: "Anticipated Revision Cost (₹ Cr)",
  narrative_char_length: "MOSPI Narrative Length (Chars)",
  narrative_word_count: "MOSPI Narrative Word Count",
  cost_overrun_pct_calc_clean: "Cost Overrun (%)",
  extracted_scheduled_date_was_missing: "Scheduled Date Missing in Record",
  original_completion_date_was_missing: "Original Date Missing in Record",
  num_issue_flags_v2: "Active Compound Bottleneck Count",
  has_land_component_v2: "Land Acquisition Component Active",
  land_acquisition_progress_ratio: "Land Acquisition Progress Ratio",
  land_gap_ha_calc: "Land Acquisition Shortfall Gap (Ha)",
  land_acquisition_pct: "Land Acquired (%)",
  land_possession_pct_calc: "Land Possession Handover (%)",
  legal_dispute: "Pending Legal Dispute / Court Injunction",
  compensation_mentioned: "Compensation Disbursal Grievance",
  forest_land_or_clearance_issue: "Forest / Environmental Clearance Pending",
  rr_issue: "Rehabilitation & Resettlement (R&R) Bottleneck",
  row_issue: "Right-of-Way (RoW) / Utility Obstruction",
  administrative_issue: "Inter-Departmental Administrative Sanction Delay",
};

export function formatFeatureName(raw: string): string {
  if (FEATURE_LABELS[raw]) return FEATURE_LABELS[raw];
  if (raw.startsWith("sector_extracted_")) {
    return `Sector: ${titleCase(raw.replace("sector_extracted_", ""))}`;
  }
  if (raw.startsWith("region_final_")) {
    return `Region: ${titleCase(raw.replace("region_final_", ""))}`;
  }
  if (raw.startsWith("kw_")) {
    return `MOSPI Keyword: ${titleCase(raw.replace("kw_", "").replace(/_/g, " "))}`;
  }
  return titleCase(raw.replace(/_/g, " "));
}

export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export const RISK_COLORS: Record<RiskCategory, string> = {
  High: "#B3261E",
  Medium: "#B45309",
  Low: "#15803D",
};

export const RISK_BG: Record<RiskCategory, string> = {
  High: "#FEE2E2",
  Medium: "#FEF3C7",
  Low: "#DCFCE7",
};

export function formatPct(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "0.0%";
  return `${(n * 100).toFixed(1)}%`;
}

export function formatCrore(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 1 })} Cr`;
}

export function formatConfidenceTier(tier: string): { label: string; badgeClass: string } {
  switch (tier) {
    case "high_date_evidence":
      return {
        label: "High Date Evidence",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300",
      };
    case "medium_time_overrun":
      return {
        label: "Medium (Historical Overrun)",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300",
      };
    case "low_narrative_signal":
      return {
        label: "Low (Narrative Signal)",
        badgeClass: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300",
      };
    default:
      return {
        label: "Unlabeled / Active Inference",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
      };
  }
}
