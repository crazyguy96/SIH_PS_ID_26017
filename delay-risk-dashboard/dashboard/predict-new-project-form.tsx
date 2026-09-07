"use client";

import { useState } from "react";
import { predictNewProject } from "@/lib/api";
import { NewProjectInput, NewProjectPrediction } from "@/lib/types";



const REGIONS = [
  "Central", "East", "Multi-State/National", "North",
  "Northeast", "South", "Unknown", "West",
];

const SECTORS = [
  "ATOMIC ENERGY", "CIVIL AVIATION", "COAL", "COMMERCE", "COMMERCE AND INDUSTRY",
  "DEFENCE PRODUCTION", "DEPARTMENT OF HIGHER EDUCATION", "FERTILISERS",
  "FERTILIZERS", "FINANCE", "HEALTH AND FAMILY WELFARE", "HEAVY INDUSTRY",
  "HOME AFFAIRS", "HUMAN RESOURCE DEVELOPMENT", "INFORMATION AND BROADCASTING",
  "MINES", "PETROCHEMICALS", "PETROLEUM", "POWER", "RAILWAYS",
  "RENEWABLE ENERGY", "ROAD TRANSPORT AND HIGHWAYS", "RURAL DEVELOPMENT",
  "SHIPPING AND PORTS", "STEEL", "TELECOMMUNICATIONS", "UNKNOWN",
  "URBAN DEVELOPMENT", "WATER RESOURCES",
];

const RISK_COLOR: Record<string, string> = {
  High: "#B3261E",
  Medium: "#8A6A12",
  Low: "#2F6B3A",
};

const EMPTY: NewProjectInput = {
  project_id: "",
  region_final: REGIONS[0],
  sector_extracted: SECTORS[0],
  original_cost_crore: 0,
  anticipated_cost_crore_extracted: undefined,
  physical_progress_pct: undefined,
  project_age_months_at_report: undefined,
  land_required_ha: undefined,
  land_acquired_ha: undefined,
  land_possession_ha: undefined,
  compensation_mentioned: false,
  legal_dispute: false,
  forest_land_or_clearance_issue: false,
  rr_issue: false,
  row_issue: false,
  administrative_issue: false,
  covid_period: false,
  narrative_text: "",
  scheduled_completion_date: undefined,
  original_completion_date: undefined,
};

const ISSUE_CHECKBOXES: { key: keyof NewProjectInput; label: string }[] = [
  { key: "compensation_mentioned", label: "Compensation dispute" },
  { key: "legal_dispute", label: "Legal dispute" },
  { key: "forest_land_or_clearance_issue", label: "Forest / environment clearance issue" },
  { key: "rr_issue", label: "R&R (resettlement) issue" },
  { key: "row_issue", label: "Right-of-way issue" },
  { key: "administrative_issue", label: "Administrative bottleneck" },
];

export function PredictNewProjectForm() {
  const [form, setForm] = useState<NewProjectInput>(EMPTY);
  const [result, setResult] = useState<NewProjectPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof NewProjectInput>(key: K, value: NewProjectInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const prediction = await predictNewProject(form);
      setResult(prediction);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prediction failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="hairline rounded bg-surface dark:bg-[#141D26] p-6">
      <h2 className="font-serif text-lg font-semibold mb-1">Predict new project</h2>
      <p className="text-sm text-ink/70 dark:text-[#B9BEB2] mb-5 max-w-[65ch]">
        Enter details for a project not yet in the register. The existing trained
        model scores it live — nothing here retrains or changes the model.
      </p>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Project ID (optional)">
          <input
            type="text"
            className="input"
            value={form.project_id ?? ""}
            onChange={(e) => update("project_id", e.target.value)}
            placeholder="e.g. NEW-2026-001"
          />
        </Field>
        <Field label="Scheduled completion date">
        <input
          type="date"
          className="input"
          value={form.scheduled_completion_date ?? ""}
          onChange={(e) =>
            update(
              "scheduled_completion_date",
              e.target.value || undefined
            )
          }
        />
      </Field>

      <Field label="Original planned completion date">
        <input
          type="date"
          className="input"
          value={form.original_completion_date ?? ""}
          onChange={(e) =>
            update(
              "original_completion_date",
              e.target.value || undefined
            )
          }
        />
      </Field>

        <Field label="Original planned completion date">
          <input
            type="date"
            className="input"
            value={form.original_completion_date ?? ""}
            onChange={(e) =>
              update(
                "original_completion_date",
                e.target.value || undefined
              )
            }
          />
        </Field>

        <Field label="Scheduled completion date">
          <input
            type="date"
            className="input"
            value={form.scheduled_completion_date ?? ""}
            onChange={(e) =>
              update(
                "scheduled_completion_date",
                e.target.value || undefined
              )
            }
          />
        </Field>

        <Field label="Region">
          <select
            className="input"
            value={form.region_final}
            onChange={(e) => update("region_final", e.target.value)}
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </Field>

        <Field label="Sector">
          <select
            className="input"
            value={form.sector_extracted}
            onChange={(e) => update("sector_extracted", e.target.value)}
          >
            {SECTORS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>

        <Field label="Original cost (₹ crore)">
          <input
            type="number" step="any" className="input" required
            value={form.original_cost_crore}
            onChange={(e) => update("original_cost_crore", parseFloat(e.target.value) || 0)}
          />
        </Field>

        <Field label="Anticipated cost (₹ crore, optional)">
          <input
            type="number" step="any" className="input"
            value={form.anticipated_cost_crore_extracted ?? ""}
            onChange={(e) => update("anticipated_cost_crore_extracted", e.target.value === "" ? undefined : parseFloat(e.target.value))}
          />
        </Field>

        <Field label="Physical progress (%)">
          <input
            type="number" step="any" min={0} max={100} className="input"
            value={form.physical_progress_pct ?? ""}
            onChange={(e) => update("physical_progress_pct", e.target.value === "" ? undefined : parseFloat(e.target.value))}
          />
        </Field>

        <Field label="Project age so far (months)">
          <input
            type="number" step="any" min={0} className="input"
            value={form.project_age_months_at_report ?? ""}
            onChange={(e) => update("project_age_months_at_report", e.target.value === "" ? undefined : parseFloat(e.target.value))}
          />
        </Field>

        <Field label="Land required (ha)">
          <input
            type="number" step="any" min={0} className="input"
            value={form.land_required_ha ?? ""}
            onChange={(e) => update("land_required_ha", e.target.value === "" ? undefined : parseFloat(e.target.value))}
          />
        </Field>

        <Field label="Land acquired (ha)">
          <input
            type="number" step="any" min={0} className="input"
            value={form.land_acquired_ha ?? ""}
            onChange={(e) => update("land_acquired_ha", e.target.value === "" ? undefined : parseFloat(e.target.value))}
          />
        </Field>

        <Field label="Land possession (ha)">
          <input
            type="number" step="any" min={0} className="input"
            value={form.land_possession_ha ?? ""}
            onChange={(e) => update("land_possession_ha", e.target.value === "" ? undefined : parseFloat(e.target.value))}
          />
        </Field>

        <div className="sm:col-span-2">
          <div className="text-xs text-ink/60 dark:text-[#B9BEB2] mb-2">Known issues (tick any that apply)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ISSUE_CHECKBOXES.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(form[key])}
                  onChange={(e) => update(key, e.target.checked as any)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm mb-3">
            <input
              type="checkbox"
              checked={form.covid_period}
              onChange={(e) => update("covid_period", e.target.checked)}
            />
            This reporting period falls in the COVID-affected window (2020–2022)
          </label>
        </div>

        <div className="sm:col-span-2">
          <Field label="Project status narrative (optional — improves explanation quality)">
            <textarea
              className="input min-h-[80px]"
              value={form.narrative_text ?? ""}
              onChange={(e) => update("narrative_text", e.target.value)}
              placeholder="e.g. Compensation dispute with landowners pending in district court; forest clearance stage-I awaited."
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Predicting…" : "Predict delay risk"}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 text-sm text-[#B3261E]">{error}</div>
      )}

      {result && (
        <div className="mt-6 hairline-t pt-5">
          <div className="flex items-baseline gap-4 flex-wrap">
            <div>
              <div className="text-xs text-ink/60 dark:text-[#B9BEB2]">Delay probability</div>
              <div className="font-serif text-3xl font-semibold">
                {result.predicted_delay_probability.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-ink/60 dark:text-[#B9BEB2]">Risk tier</div>
              <div
                className="font-serif text-2xl font-semibold"
                style={{ color: RISK_COLOR[result.risk_tier] ?? undefined }}
              >
                {result.risk_tier}
              </div>
            </div>
            <div>
              <div className="text-xs text-ink/60 dark:text-[#B9BEB2]">Priority score</div>
              <div className="font-serif text-2xl font-semibold">{result.priority_score}</div>
            </div>
          </div>

          {result.top_delay_drivers.length > 0 && (
            <div className="mt-4">
              <div className="text-xs text-ink/60 dark:text-[#B9BEB2] mb-1">Top delay drivers</div>
              <ul className="text-sm list-disc pl-5">
                {result.top_delay_drivers.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          )}

          {result.recommended_actions.length > 0 && (
            <div className="mt-4">
              <div className="text-xs text-ink/60 dark:text-[#B9BEB2] mb-1">Recommended actions</div>
              <ul className="text-sm list-disc pl-5">
                {result.recommended_actions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          <details className="mt-4 text-xs text-ink/50 dark:text-[#8A9086]">
            <summary className="cursor-pointer">Approximated inputs used for this prediction</summary>
            <ul className="list-disc pl-5 mt-2">
              {result.approximated_fields_used.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-ink/60 dark:text-[#B9BEB2] mb-1">{label}</div>
      {children}
    </label>
  );
}
