"use client";

import React, { useEffect, useState } from "react";
import { X, FileText, History as HistoryIcon, CircleHelp } from "lucide-react";
import { qsprFetchProject } from "@/lib/qspr-api";
import { QsprProjectDetailResponse } from "@/lib/qspr-types";
import { RISK_COLORS, RISK_BG, formatCrore } from "@/lib/format";

interface QsprProjectDetailPanelProps {
  projectId: string | null;
  onClose: () => void;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink/50 dark:text-[#8A9086]">{label}</div>
      <div className="text-xs text-ink dark:text-gray-200 mt-0.5">{value ?? "—"}</div>
    </div>
  );
}

export function QsprProjectDetailPanel({ projectId, onClose }: QsprProjectDetailPanelProps) {
  const [detail, setDetail] = useState<QsprProjectDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!projectId) {
      setDetail(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    qsprFetchProject(projectId)
      .then((data) => {
        setDetail(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [projectId]);

  if (!projectId) return null;
  const current = detail?.current;

  return (
    <>
      <div className="fixed inset-0 bg-ink/40 dark:bg-black/60 z-40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <aside className="fixed top-0 right-0 h-full w-full sm:w-[560px] md:w-[620px] bg-surface dark:bg-[#141D26] z-50 border-l border-line dark:border-[#2A3742] shadow-2xl flex flex-col transition-transform duration-200 ease-out overflow-y-auto">
        <div className="p-5 border-b border-line dark:border-[#2A3742] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-teal font-semibold">
              QSPR / PAIMANA Prediction
            </span>
            <h2 className="font-serif text-xl font-bold mt-0.5 text-ink dark:text-white">{projectId}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-ink/60 hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-ink/50 py-16">
            Fetching QSPR project history…
          </div>
        ) : error ? (
          <div className="p-6 m-4 bg-red-50 dark:bg-red-950/40 border border-red-200 rounded text-red-800 dark:text-red-300 text-xs">
            {error}
          </div>
        ) : current ? (
          <div className="p-5 space-y-6">
            {/* Identity */}
            <div>
              <h3 className="font-serif text-base font-semibold text-ink dark:text-white mb-3">
                {current.project_name || "Untitled project"}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Project ID" value={<span className="font-mono">{current.project_id}</span>} />
                <Field
                  label="Legacy ID"
                  value={current.legacy_project_id ? <span className="font-mono">{current.legacy_project_id}</span> : "Not confirmed"}
                />
                <Field label="Ministry" value={current.ministry} />
                <Field label="Sector" value={current.sector} />
                <Field label="State" value={current.state} />
                <Field label="Agency" value={current.agency} />
              </div>
            </div>

            {/* Timeline & cost */}
            <div className="border-t border-line dark:border-[#2A3742] pt-4">
              <h4 className="text-[11px] uppercase tracking-wider text-ink/50 dark:text-[#8A9086] font-semibold mb-3">
                Schedule &amp; Cost
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Approval / Start Date" value={current.approval_date} />
                <Field label="Original Completion Date" value={current.original_completion_date} />
                <Field label="Revised Completion Date" value={current.revised_completion_date} />
                <Field label="Physical Progress" value={current.physical_progress_pct !== null ? `${current.physical_progress_pct}%` : null} />
                <Field label="Original Cost" value={formatCrore(current.original_cost_crore)} />
                <Field label="Anticipated/Revised Cost" value={formatCrore(current.anticipated_cost_crore)} />
                <Field label="Cumulative Expenditure" value={formatCrore(current.cumulative_expenditure_crore)} />
                <Field label="Source Page" value={current.source_page ? `Page ${current.source_page}` : null} />
              </div>
            </div>

            {/* Current Prediction */}
            <div className="border-t border-line dark:border-[#2A3742] pt-4">
              <h4 className="text-[11px] uppercase tracking-wider text-ink/50 dark:text-[#8A9086] font-semibold mb-3">
                Current Prediction — {current.report_label}
              </h4>
              <div className="flex items-center gap-3">
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full font-bold text-sm"
                  style={{ backgroundColor: RISK_BG[current.risk_category], color: RISK_COLORS[current.risk_category] }}
                >
                  {current.delay_probability_pct.toFixed(1)}% delay probability
                </span>
                <span className="text-xs text-ink/60 dark:text-[#8A9086]">{current.risk_category} risk · {current.prediction_class}</span>
              </div>
              <p className="text-[11px] text-ink/50 dark:text-[#8A9086] mt-2 font-mono">
                Model version: {current.model_version}
              </p>
            </div>

            {/* Historical Predictions */}
            <div className="border-t border-line dark:border-[#2A3742] pt-4">
              <h4 className="text-[11px] uppercase tracking-wider text-ink/50 dark:text-[#8A9086] font-semibold mb-3 flex items-center gap-1.5">
                <HistoryIcon size={13} />
                Historical Predictions
              </h4>
              {detail && detail.previous.length > 0 ? (
                <div className="space-y-2">
                  {detail.previous.map((p) => (
                    <div
                      key={p.report_label}
                      className="flex items-center justify-between text-xs bg-paper dark:bg-slate-800/60 rounded-lg px-3 py-2"
                    >
                      <span className="text-ink/70 dark:text-gray-300">{p.report_label}</span>
                      <span className="font-semibold" style={{ color: RISK_COLORS[p.risk_category] }}>
                        {p.delay_probability_pct.toFixed(1)}% · {p.risk_category}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink/50 italic">
                  No earlier QSPR snapshots — this is the first time this project has been scored.
                </p>
              )}
            </div>

            {/* Actual Outcome */}
            <div className="border-t border-line dark:border-[#2A3742] pt-4">
              <h4 className="text-[11px] uppercase tracking-wider text-ink/50 dark:text-[#8A9086] font-semibold mb-3 flex items-center gap-1.5">
                <CircleHelp size={13} />
                Actual Outcome
              </h4>
              <p className="text-xs text-ink/60 dark:text-[#8A9086] italic">
                {detail?.actual_outcome_known ? detail?.actual_outcome : "Not available yet"}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 m-4 text-xs text-ink/50 flex items-center gap-2">
            <FileText size={14} />
            No QSPR data found for this project.
          </div>
        )}
      </aside>
    </>
  );
}
