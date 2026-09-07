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
      <aside className="fixed top-0 right-0 h-full w-full sm:w-[580px] md:w-[650px] bg-surface dark:bg-[#141D26] z-50 border-l border-line dark:border-[#2A3742] shadow-2xl flex flex-col transition-transform duration-200 ease-out">
        {/* Top Header */}
        <div className="p-5 border-b border-line dark:border-[#2A3742] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-ink/50 dark:text-[#8A9086]">
                {detail?.quarter || "Quarterly Record"}
              </span>
              {detail && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                    formatConfidenceTier(detail.label_confidence_tier).badgeClass
                  }`}
                >
                  {formatConfidenceTier(detail.label_confidence_tier).label}
                </span>
              )}
            </div>
            <h2 className="font-serif text-xl font-bold mt-1 text-ink dark:text-white">
              {projectId}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-ink/60 hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-ink/50">
            Fetching project intelligence &amp; SHAP explanations...
          </div>
        ) : error ? (
          <div className="p-6 m-4 bg-red-50 dark:bg-red-950/40 border border-red-200 rounded text-red-800 dark:text-red-300 text-xs">
            {error}
          </div>
        ) : detail ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Risk Gauge Header */}
            <div className="bg-paper dark:bg-slate-900/60 p-4 rounded-lg border border-line dark:border-[#2A3742] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex flex-col items-center justify-center text-center font-bold text-sm shadow-inner"
                  style={{
                    backgroundColor: RISK_BG[detail.risk_category],
                    color: RISK_COLORS[detail.risk_category],
                    border: `2px solid ${RISK_COLORS[detail.risk_category]}`,
                  }}
                >
                  <span>{(detail.predicted_delay_probability * 100).toFixed(0)}%</span>
                  <span className="text-[9px] uppercase tracking-wider font-semibold">Risk</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: RISK_BG[detail.risk_category],
                        color: RISK_COLORS[detail.risk_category],
                      }}
                    >
                      {detail.risk_category} Delay Risk
                    </span>
                  </div>
                  <p className="text-xs text-ink/60 dark:text-[#8A9086] mt-1">
                    LightGBM Early Detection Model Inference
                  </p>
                </div>
              </div>

              <div className="text-right text-xs">
                <span className="text-ink/50 dark:text-[#8A9086] block">Physical Progress</span>
                <span className="font-semibold text-sm">
                  {detail.feature_snapshot.progress_and_cost.physical_progress_pct.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-line dark:border-[#2A3742] text-xs">
              <button
                onClick={() => setActiveTab("explanation")}
                className={`py-2 px-3 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "explanation"
                    ? "border-teal text-teal"
                    : "border-transparent text-ink/60 dark:text-gray-400 hover:text-ink"
                }`}
              >
                <BarChart2 size={14} />
                SHAP Explainability
              </button>
              <button
                onClick={() => setActiveTab("narrative")}
                className={`py-2 px-3 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "narrative"
                    ? "border-teal text-teal"
                    : "border-transparent text-ink/60 dark:text-gray-400 hover:text-ink"
                }`}
              >
                <FileText size={14} />
                Quarterly Narrative
              </button>
              <button
                onClick={() => setActiveTab("features")}
                className={`py-2 px-3 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "features"
                    ? "border-teal text-teal"
                    : "border-transparent text-ink/60 dark:text-gray-400 hover:text-ink"
                }`}
              >
                <FileSearch size={14} />
                Features Snapshot
              </button>
              <button
                onClick={() => setActiveTab("audit")}
                className={`py-2 px-3 font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "audit"
                    ? "border-teal text-teal"
                    : "border-transparent text-ink/60 dark:text-gray-400 hover:text-ink"
                }`}
              >
                <ShieldAlert size={14} />
                Audit Record
              </button>
            </div>

            {/* Tab 1: SHAP Explainability & Recommendations */}
            {activeTab === "explanation" && (
              <div className="space-y-5">
                {/* Horizontal SHAP Bar Chart */}
                <div className="bg-surface dark:bg-[#141D26] border border-line dark:border-[#2A3742] p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-semibold text-ink dark:text-white uppercase tracking-wider">
                      Local Feature Contributions (TreeSHAP)
                    </h4>
                    <span className="text-[10px] text-ink/50 dark:text-[#8A9086]">
                      Red = Increases Delay Risk | Green = Protective
                    </span>
                  </div>

                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={detail.shap_explanation}
                        margin={{ top: 5, right: 30, left: 140, bottom: 5 }}
                      >
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis
                          type="category"
                          dataKey="friendly_name"
                          tick={{ fontSize: 10 }}
                          width={130}
                        />
                        <Tooltip
                          formatter={(val: any) => [Number(val).toFixed(4), "SHAP Contribution"]}
                          contentStyle={{
                            backgroundColor: "#1F2937",
                            borderColor: "#374151",
                            borderRadius: 6,
                            color: "#F9FAFB",
                            fontSize: 11,
                          }}
                        />
                        <ReferenceLine x={0} stroke="#888888" />
                        <Bar dataKey="shap_value">
                          {detail.shap_explanation.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.shap_value > 0 ? "#DC2626" : "#16A34A"}
                            />
                          ))}
                        </Bar>
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
                <div className="bg-surface dark:bg-[#141D26] border border-line dark:border-[#2A3742] p-4 rounded-lg">
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

                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-line dark:border-[#2A3742]">
                    {renderHighlightedNarrative()}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Full Feature Snapshot */}
            {activeTab === "features" && (
              <div className="space-y-4 text-xs">
                {/* Progress & Cost Grid */}
                <div className="bg-surface dark:bg-[#141D26] border border-line dark:border-[#2A3742] p-4 rounded-lg">
                  <h4 className="font-semibold text-ink dark:text-white mb-2 uppercase tracking-wider text-[11px]">
                    Progress &amp; Financial Metrics
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-ink/50 dark:text-[#8A9086] block text-[11px]">Original Cost</span>
                      <strong className="text-sm">{formatCrore(detail.feature_snapshot.progress_and_cost.original_cost_crore)}</strong>
                    </div>
                    <div>
                      <span className="text-ink/50 dark:text-[#8A9086] block text-[11px]">Anticipated Cost</span>
                      <strong className="text-sm">{formatCrore(detail.feature_snapshot.progress_and_cost.anticipated_cost_crore)}</strong>
                    </div>
                    <div>
                      <span className="text-ink/50 dark:text-[#8A9086] block text-[11px]">Cost Overrun %</span>
                      <strong className="text-sm">{detail.feature_snapshot.progress_and_cost.cost_overrun_pct.toFixed(1)}%</strong>
                    </div>
                    <div>
                      <span className="text-ink/50 dark:text-[#8A9086] block text-[11px]">Project Age at Report</span>
                      <strong className="text-sm">{detail.feature_snapshot.progress_and_cost.project_age_months.toFixed(0)} Months</strong>
                    </div>
                  </div>
                </div>

                {/* Land Acquisition Status Grid */}
                <div className="bg-surface dark:bg-[#141D26] border border-line dark:border-[#2A3742] p-4 rounded-lg">
                  <h4 className="font-semibold text-ink dark:text-white mb-2 uppercase tracking-wider text-[11px]">
                    Land Acquisition &amp; Possession Status
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-ink/50 dark:text-[#8A9086] block text-[11px]">Total Land Required</span>
                      <strong className="text-sm">{detail.feature_snapshot.land_acquisition_status.land_required_ha.toFixed(1)} Ha</strong>
                    </div>
                    <div>
                      <span className="text-ink/50 dark:text-[#8A9086] block text-[11px]">Land Acquired</span>
                      <strong className="text-sm">{detail.feature_snapshot.land_acquisition_status.land_acquired_ha.toFixed(1)} Ha</strong>
                    </div>
                    <div>
                      <span className="text-ink/50 dark:text-[#8A9086] block text-[11px]">Acquisition Gap</span>
                      <strong className="text-sm text-red-600">{detail.feature_snapshot.land_acquisition_status.land_gap_ha.toFixed(1)} Ha</strong>
                    </div>
                    <div>
                      <span className="text-ink/50 dark:text-[#8A9086] block text-[11px]">Possession Handed Over</span>
                      <strong className="text-sm">{detail.feature_snapshot.land_acquisition_status.land_possession_pct.toFixed(1)}%</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Isolated Audit Record (Strictly Separated) */}
            {activeTab === "audit" && (
              <div className="space-y-4">
                <div className="bg-slate-900 text-slate-100 p-5 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-2 text-amber-400 mb-2">
                    <ShieldAlert size={18} />
                    <h4 className="font-serif text-sm font-semibold uppercase tracking-wider">
                      Audit &amp; Historical Master Record
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    {detail.audit_record.governance_note}
                  </p>

                  <div className="grid grid-cols-2 gap-4 bg-slate-800/80 p-3.5 rounded border border-slate-700 text-xs font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px]">time_overrun_months:</span>
                      <span className="text-amber-300 font-bold text-base">
                        {detail.audit_record.time_overrun_months} Months
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">time_overrun_was_missing:</span>
                      <span className="text-slate-300 font-bold text-base">
                        {detail.audit_record.time_overrun_months_was_missing ? "True (1)" : "False (0)"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                    Compliance Verification: LightGBM feature vector dimension = 84 columns.
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
