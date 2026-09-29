"use client";

import React, { useState, useEffect } from "react";
import { ProjectDetail, ShapDriver } from "@/lib/types";
import { fetchProjectDetail } from "@/lib/api";
import { formatCrore, formatPct, formatConfidenceTier, RISK_COLORS, RISK_BG } from "@/lib/format";
import {
  X,
  FileText,
  ShieldAlert,
  BarChart2,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  FileSearch,
  ExternalLink,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
  CartesianGrid
} from "recharts";

interface ProjectDetailPanelProps {
  projectId: string | null;
  onClose: () => void;
}

export function ProjectDetailPanel({ projectId, onClose }: ProjectDetailPanelProps) {
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"explanation" | "narrative" | "features" | "audit">("explanation");

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
    fetchProjectDetail(projectId)
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

  // Render narrative text with keyword highlighting
  const renderHighlightedNarrative = () => {
    if (!detail || !detail.narrative || !detail.narrative.raw_text) {
      return <p className="text-xs text-ink/50 italic">No government narrative text available.</p>;
    }

    const text = detail.narrative.raw_text;
    const activeKeywords = detail.narrative.active_keyword_flags || [];

    if (activeKeywords.length === 0) {
      return <p className="text-xs leading-relaxed text-ink/80 dark:text-[#B9BEB2] whitespace-pre-line">{text}</p>;
    }

    // Build combined regex from active patterns
    try {
      const patternStrings = activeKeywords.map((k) => k.pattern.replace(/\\b/g, "")).filter(Boolean);
      const combinedRegex = new RegExp(`(${patternStrings.join("|")})`, "gi");

      const parts = text.split(combinedRegex);

      return (
        <div className="text-xs leading-relaxed text-ink/80 dark:text-[#B9BEB2] whitespace-pre-line">
          {parts.map((part, idx) => {
            const isMatch = patternStrings.some((p) => new RegExp(`^${p}$`, "i").test(part));
            if (isMatch) {
              return (
                <mark
                  key={idx}
                  className="bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100 font-semibold px-1 rounded mx-0.5 border-b-2 border-amber-500"
                  title="Matched ML delay-driver indicator"
                >
                  {part}
                </mark>
              );
            }
            return <span key={idx}>{part}</span>;
          })}
        </div>
      );
    } catch {
      return <p className="text-xs leading-relaxed text-ink/80 dark:text-[#B9BEB2] whitespace-pre-line">{text}</p>;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/40 dark:bg-black/60 z-40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer */}
      <aside
        className="
          fixed top-0 right-0 z-50
          h-full w-full sm:w-[580px] md:w-[680px]
          bg-[#FDFCFB] dark:bg-[#0F1720]
          border-l border-slate-200 dark:border-slate-700
          shadow-2xl
          flex flex-col
          transition-transform duration-200 ease-out
        "
      >
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-[#111923]/90 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">

            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal">
                  Project Record
                </span>

                <span className="text-slate-300 dark:text-slate-600">•</span>

                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                  {detail?.quarter || "Quarterly Record"}
                </span>
              </div>

              <h2 className="text-xl font-semibold tracking-tight text-ink dark:text-white truncate">
                {projectId}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="
                h-9 w-9 shrink-0
                flex items-center justify-center
                rounded-xl
                border border-slate-200 dark:border-slate-700
                bg-white dark:bg-slate-800
                text-slate-500 dark:text-slate-400
                hover:text-ink dark:hover:text-white
                hover:bg-slate-50 dark:hover:bg-slate-700
                transition-colors
              "
              aria-label="Close project details"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-ink/50">
            Loading project risk assessment...
          </div>
        ) : error ? (
          <div className="p-6 m-4 bg-red-50 dark:bg-red-950/40 border border-red-200 rounded text-red-800 dark:text-red-300 text-xs">
            {error}
          </div>
        ) : detail ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Risk Summary */}
            <div
              className="
                rounded-2xl
                border border-slate-200/80 dark:border-slate-700/60
                bg-white dark:bg-[#141D26]
                p-5
                shadow-[0_2px_10px_rgba(15,23,42,0.04)]
              "
            >
              <div className="flex items-center justify-between gap-4">

                <div className="flex items-center gap-4 min-w-0">

                  <div
                    className="h-16 w-16 shrink-0 rounded-2xl flex flex-col items-center justify-center"
                    style={{
                      backgroundColor: RISK_BG[detail.risk_category],
                      color: RISK_COLORS[detail.risk_category],
                      border: `1.5px solid ${RISK_COLORS[detail.risk_category]}`,
                    }}
                  >
                    <span className="text-lg font-bold leading-none">
                      {(detail.predicted_delay_probability * 100).toFixed(0)}%
                    </span>
                    <span className="mt-1 text-[8px] font-semibold uppercase tracking-wider">
                      Risk
                    </span>
                  </div>

                  <div className="min-w-0">
                    <span
                      className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
                      style={{
                        backgroundColor: RISK_BG[detail.risk_category],
                        color: RISK_COLORS[detail.risk_category],
                      }}
                    >
                      {detail.risk_category} Risk
                    </span>

                    <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      Model-estimated delay probability
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
                    Physical Progress
                  </span>

                  <span className="mt-1 block text-lg font-semibold text-ink dark:text-white">
                    {detail.feature_snapshot.progress_and_cost.physical_progress_pct.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
                  Evidence Coverage
                </span>

                <span
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                    formatConfidenceTier(detail.label_confidence_tier).badgeClass
                  }`}
                >
                  {formatConfidenceTier(detail.label_confidence_tier).label}
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="overflow-x-auto -mx-1 px-1">
              <div
                className="
                  inline-flex min-w-max
                  rounded-xl
                  bg-slate-100 dark:bg-slate-800/80
                  p-1
                  gap-1
                "
              >
                <button
                  onClick={() => setActiveTab("explanation")}
                  className={`px-3.5 py-2 rounded-lg text-[11px] font-semibold
                    flex items-center gap-1.5 transition-all ${
                      activeTab === "explanation"
                        ? "bg-white dark:bg-slate-700 text-teal shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-ink dark:hover:text-white"
                    }`}
                >
                  <BarChart2 size={14} />
                  Risk Drivers
                </button>

                <button
                  onClick={() => setActiveTab("narrative")}
                  className={`px-3.5 py-2 rounded-lg text-[11px] font-semibold
                    flex items-center gap-1.5 transition-all ${
                      activeTab === "narrative"
                        ? "bg-white dark:bg-slate-700 text-teal shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-ink dark:hover:text-white"
                    }`}
                >
                  <FileText size={14} />
                  Quarterly Narrative
                </button>

                <button
                  onClick={() => setActiveTab("features")}
                  className={`px-3.5 py-2 rounded-lg text-[11px] font-semibold
                    flex items-center gap-1.5 transition-all ${
                      activeTab === "features"
                        ? "bg-white dark:bg-slate-700 text-teal shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-ink dark:hover:text-white"
                    }`}
                >
                  <FileSearch size={14} />
                  Project Metrics
                </button>

                <button
                  onClick={() => setActiveTab("audit")}
                  className={`px-3.5 py-2 rounded-lg text-[11px] font-semibold
                    flex items-center gap-1.5 transition-all ${
                      activeTab === "audit"
                        ? "bg-white dark:bg-slate-700 text-teal shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-ink dark:hover:text-white"
                    }`}
                >
                  <ShieldAlert size={14} />
                  Audit Record
                </button>
              </div>
            </div>

            {/* Tab 1: SHAP Explainability & Recommendations */}
            {activeTab === "explanation" && (
              <div className="space-y-5">
                {/* Delay Driver Contribution */}
                  <div
  className="
    rounded-2xl
    border border-slate-200/80 dark:border-slate-700/60
    bg-white dark:bg-[#141D26]
    p-5
    shadow-[0_2px_10px_rgba(15,23,42,0.04)]
  "
>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-semibold text-ink dark:text-white tracking-tight">
  Key Risk Drivers
</h4>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
  Factors contributing most strongly to this project's estimated delay risk.
</p>
                      </div>
                    </div>

                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={[...detail.shap_explanation]
                            .sort(
                              (a, b) =>
                                Math.abs(b.shap_value) - Math.abs(a.shap_value)
                            )
                            .slice(0, 6)
                            .map((entry) => ({
                              driver: entry.friendly_name,
                              contribution: Math.abs(entry.shap_value),
                            }))}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 15,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            horizontal={false}
                          />

                          <XAxis
                            type="number"
                            tick={{ fontSize: 10 }}
                            tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
                          />

                          <YAxis
                            type="category"
                            dataKey="driver"
                            width={175}
                            tick={{ fontSize: 10 }}
                          />

                          <Tooltip
                            formatter={(value: any) => [
                              Number(value).toFixed(2),
                              "Contribution",
                            ]}
                            contentStyle={{
                              backgroundColor: "#1F2937",
                              borderColor: "#374151",
                              borderRadius: 6,
                              color: "#F9FAFB",
                              fontSize: 11,
                            }}
                          />

                          <Bar
                            dataKey="contribution"
                            fill="#D97706"
                            radius={[0, 5, 5, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                {/* Plain-Language Rule-Based Interventions */}
                <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2 text-amber-900 dark:text-amber-200">
                    <CheckCircle size={16} className="text-amber-700 dark:text-amber-400" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider">
                      Auditable Recommended Interventions
                    </h4>
                  </div>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mb-3">
                    Derived from transparent governance mapping of primary active delay drivers:
                  </p>
                  <ul className="space-y-2">
                    {detail.recommended_actions.map((rec, i) => (
                      <li
                        key={i}
                        className="text-xs flex items-start gap-2 bg-surface dark:bg-[#141D26] p-2.5 rounded border border-amber-200/80 dark:border-amber-900/40 text-ink dark:text-gray-200"
                      >
                        <span className="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Tab 2: MOSPI Narrative Text with Highlights */}
            {activeTab === "narrative" && (
              <div className="space-y-4">
                <div
  className="
    rounded-2xl
    border border-slate-200/80 dark:border-slate-700/60
    bg-white dark:bg-[#141D26]
    p-5
    shadow-[0_2px_10px_rgba(15,23,42,0.04)]
  "
>
                  <div className="flex items-center justify-between mb-3 border-b border-line dark:border-[#2A3742] pb-2">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-ink dark:text-white">
                        Government Quarterly Report Narrative
                      </h4>
                      <span className="text-[11px] text-ink/50 dark:text-[#8A9086]">
                        Source: MOSPI Quarterly Infrastructure Monitoring Archives
                      </span>
                    </div>
                    <span className="text-[11px] text-ink/60 font-mono">
                      {detail.narrative.character_length} characters
                    </span>
                  </div>

                  {/* Highlight Legend */}
                  {detail.narrative.active_keyword_flags.length > 0 && (
                    <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-950/40 rounded border border-amber-200 dark:border-amber-800 text-[11px] flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-amber-900 dark:text-amber-200">
                        Active Bottleneck Triggers:
                      </span>
                      {detail.narrative.active_keyword_flags.map((kw) => (
                        <span
                          key={kw.keyword_flag}
                          className="bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded font-mono text-[10px]"
                        >
                          {kw.friendly_flag_name} ({kw.match_count})
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="
  p-4
  rounded-xl
  border border-slate-200 dark:border-slate-700
  bg-slate-50/70 dark:bg-slate-900/60
  leading-relaxed
">
                    {renderHighlightedNarrative()}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Full Feature Snapshot */}
            {activeTab === "features" && (
              <div className="space-y-4 text-xs">
                {/* Progress & Cost Grid */}
                <div
  className="
    rounded-2xl
    border border-slate-200/80 dark:border-slate-700/60
    bg-white dark:bg-[#141D26]
    p-5
    shadow-[0_2px_10px_rgba(15,23,42,0.04)]
  "
>
                  <h4 className="text-sm font-semibold tracking-tight text-ink dark:text-white mb-4">
                    Progress &amp; Financial Metrics
                  </h4>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                    <div>
                      <span className="text-ink/50 dark:text-[#8A9086] block text-[11px]">Original Cost</span>
                      <strong className="text-sm font-semibold text-ink dark:text-white">{formatCrore(detail.feature_snapshot.progress_and_cost.original_cost_crore)}</strong>
                    </div>
                    <div>
                      <span className="text-ink/50 dark:text-[#8A9086] block text-[11px]">Anticipated Cost</span>
                      <strong className="text-sm font-semibold text-ink dark:text-white">{formatCrore(detail.feature_snapshot.progress_and_cost.anticipated_cost_crore)}</strong>
                    </div>
                    <div>
                      <span className="text-ink/50 dark:text-[#8A9086] block text-[11px]">Cost Overrun %</span>
                      <strong className="text-sm font-semibold text-ink dark:text-white">{detail.feature_snapshot.progress_and_cost.cost_overrun_pct.toFixed(1)}%</strong>
                    </div>
                    <div>
                      <span className="text-ink/50 dark:text-[#8A9086] block text-[11px]">Project Age at Report</span>
                      <strong className="text-sm font-semibold text-ink dark:text-white">{detail.feature_snapshot.progress_and_cost.project_age_months.toFixed(0)} Months</strong>
                    </div>
                  </div>
                </div>

                {/* Land Acquisition Status Grid */}
                <div
  className="
    rounded-2xl
    border border-slate-200/80 dark:border-slate-700/60
    bg-white dark:bg-[#141D26]
    p-5
    shadow-[0_2px_10px_rgba(15,23,42,0.04)]
  "
>
                  <h4 className="text-sm font-semibold tracking-tight text-ink dark:text-white mb-4">
                    Land Acquisition &amp; Possession Status
                  </h4>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                    <div>
                      <span className="text-ink/50 dark:text-[#8A9086] block text-[11px]">Total Land Required</span>
                      <strong className="text-sm font-semibold text-ink dark:text-white">{detail.feature_snapshot.land_acquisition_status.land_required_ha.toFixed(1)} Ha</strong>
                    </div>
                    <div>
                      <span className="text-ink/50 dark:text-[#8A9086] block text-[11px]">Land Acquired</span>
                      <strong className="text-sm font-semibold text-ink dark:text-white">{detail.feature_snapshot.land_acquisition_status.land_acquired_ha.toFixed(1)} Ha</strong>
                    </div>
                    <div>
                      <span className="text-ink/50 dark:text-[#8A9086] block text-[11px]">Acquisition Gap</span>
                      <strong className="text-sm font-semibold text-red-600 dark:text-red-400">{detail.feature_snapshot.land_acquisition_status.land_gap_ha.toFixed(1)} Ha</strong>
                    </div>
                    <div>
                      <span className="text-ink/50 dark:text-[#8A9086] block text-[11px]">Possession Handed Over</span>
                      <strong className="text-sm font-semibold text-ink dark:text-white">{detail.feature_snapshot.land_acquisition_status.land_possession_pct.toFixed(1)}%</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Isolated Audit Record (Strictly Separated) */}
            {activeTab === "audit" && (
              <div className="space-y-4">
                <div
  className="
    rounded-2xl
    border border-slate-200/80 dark:border-slate-700/60
    bg-white dark:bg-[#141D26]
    p-5
    shadow-[0_2px_10px_rgba(15,23,42,0.04)]
  "
>
                  <div className="flex items-center gap-2 text-teal mb-2">
                    <ShieldAlert size={18} />
                    <h4 className="text-sm font-semibold tracking-tight text-ink dark:text-white">
  Audit & Historical Record
</h4>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 mb-5">
                    {detail.audit_record.governance_note}
                  </p>

                  <div className="
  grid grid-cols-2 gap-4
  rounded-xl
  border border-slate-200 dark:border-slate-700
  bg-slate-50 dark:bg-slate-900/60
  p-4
  text-xs
">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase tracking-wider">time_overrun_months:</span>
                      <span className="text-amber-300 font-bold text-base">
                        {detail.audit_record.time_overrun_months} Months
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase tracking-wider">time_overrun_was_missing:</span>
                      <span className="text-slate-300 font-bold text-base">
                        {detail.audit_record.time_overrun_months_was_missing ? "True (1)" : "False (0)"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                    Model input validation and audit checks completed.
                    Overrun proxy terms are explicitly rejected by backend feature pipeline validation.
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </aside>
    </>
  );
}
