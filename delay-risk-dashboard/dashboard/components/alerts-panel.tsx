"use client";

import React, { useEffect, useState } from "react";
import { AlertItem, AlertProjectPreview } from "@/lib/types";
import { fetchAlerts } from "@/lib/api";
import { formatPct } from "@/lib/format";
import {
  AlertTriangle,
  Bell,
  ArrowRight,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
type RawAlert = {
  alert_id?: string;

  project_id?: string;
  quarter?: string;

  region?: string;
  region_final?: string;

  severity?: string;
  risk_category?: string;

  predicted_delay_probability?: number;
  predicted_delay_pct?: number;

  sector?: string;
  sector_extracted?: string;

  primary_driver?: string;
  top_contributing_drivers?: string[];
  top_delay_drivers?: string[];
};

function normalizeRegion(value: unknown): string {
  const region = String(value ?? "Unknown")
    .replace(/\u00A0/g, " ")
    .trim();

  return region || "Unknown";
}

function normalizeSeverity(alert: RawAlert): "CRITICAL" | "HIGH" {
  if (
    String(alert.severity ?? "").toUpperCase() === "CRITICAL"
  ) {
    return "CRITICAL";
  }

  const probability = Number(
    alert.predicted_delay_probability ?? 0
  );

  return probability >= 0.85 ? "CRITICAL" : "HIGH";
}

function normalizeProbability(value: unknown): number {
  let probability = Number(value ?? 0);

  if (probability > 1) {
    probability /= 100;
  }

  return Math.max(0, Math.min(1, probability));
}

function groupRawAlerts(rawAlerts: RawAlert[]): AlertItem[] {
  const groups = new Map<
    string,
    {
      region: string;
      severity: "CRITICAL" | "HIGH";
      records: RawAlert[];
    }
  >();

  for (const alert of rawAlerts) {
    const region = normalizeRegion(
      alert.region ?? alert.region_final
    );

    const severity = normalizeSeverity(alert);

    const key = `${region.toLowerCase()}::${severity}`;

    if (!groups.has(key)) {
      groups.set(key, {
        region,
        severity,
        records: [],
      });
    }

    groups.get(key)!.records.push(alert);
  }

  return Array.from(groups.values())
    .map((group) => {
      const records = group.records;

      // Deduplicate by project ID.
      const projectMap = new Map<string, RawAlert>();

      for (const record of records) {
        const projectId = String(
          record.project_id ?? "UNKNOWN-PROJECT"
        ).trim();

        const existing = projectMap.get(projectId);

        const currentProbability =
          normalizeProbability(
            record.predicted_delay_probability
          );

        const existingProbability = existing
          ? normalizeProbability(
              existing.predicted_delay_probability
            )
          : -1;

        if (
          !existing ||
          currentProbability > existingProbability
        ) {
          projectMap.set(projectId, record);
        }
      }

      // Count primary bottlenecks.
      const driverCounts = new Map<string, number>();

      for (const record of records) {
        let driver =
          record.primary_driver ??
          record.top_contributing_drivers?.[0] ??
          record.top_delay_drivers?.[0] ??
          "Schedule / Reporting Risk";

        driver = String(driver).trim() || "Schedule / Reporting Risk";

        driverCounts.set(
          driver,
          (driverCounts.get(driver) ?? 0) + 1
        );
      }

      const topBottlenecks = Array.from(
        driverCounts.entries()
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([driver, count]) => ({
          driver,
          record_count: count,
        }));

      const projectRecords = Array.from(
        projectMap.values()
      );

      projectRecords.sort(
        (a, b) =>
          normalizeProbability(
            b.predicted_delay_probability
          ) -
          normalizeProbability(
            a.predicted_delay_probability
          )
      );

      const topProjects: AlertProjectPreview[] =
        projectRecords.slice(0, 5).map((record) => {
          const probability = normalizeProbability(
            record.predicted_delay_probability
          );

          return {
            project_id: String(
              record.project_id ?? ""
            ),
            quarter: String(
              record.quarter ?? ""
            ),
            sector: String(
              record.sector ??
                record.sector_extracted ??
                "Unknown"
            ),
            predicted_delay_probability: probability,
            predicted_delay_pct: probability * 100,
            primary_driver: String(
              record.primary_driver ??
                record.top_contributing_drivers?.[0] ??
                record.top_delay_drivers?.[0] ??
                "Schedule / Reporting Risk"
            ),
          };
        });

      const probabilities = records.map((record) =>
        normalizeProbability(
          record.predicted_delay_probability
        )
      );

      const averageProbability =
        probabilities.length > 0
          ? probabilities.reduce(
              (sum, value) => sum + value,
              0
            ) / probabilities.length
          : 0;

      const maxProbability =
        probabilities.length > 0
          ? Math.max(...probabilities)
          : 0;

      return {
        alert_id: `GROUP-${group.severity}-${group.region
          .replace(/\s+/g, "-")
          .replace(/\//g, "-")}`,

        region: group.region,

        severity: group.severity,

        record_count: records.length,

        project_count: projectMap.size,

        average_probability: averageProbability,

        max_probability: maxProbability,

        top_bottlenecks: topBottlenecks,

        projects: topProjects,

        timestamp: "Current Alert Cycle",
      };
    })
    .sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === "CRITICAL" ? -1 : 1;
      }

      return (
        b.average_probability -
        a.average_probability
      );
    });
}

interface AlertsPanelProps {
  onSelectProject?: (projectId: string,quarter: string) => void;
  userRole?: string;
}

export function AlertsPanel({
  onSelectProject,
  userRole,
}: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [totalProjects, setTotalProjects] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [
    filterSeverity,
    setFilterSeverity
  ] = useState<"ALL" | "CRITICAL" | "HIGH">("ALL");

  const [acknowledged, setAcknowledged] =
    useState<Set<string>>(new Set());

  const [expanded, setExpanded] =
    useState<Set<string>>(new Set());

  useEffect(() => {
  fetchAlerts(0.65)
    .then((data) => {
      const rawAlerts =
        (data.alerts ?? []) as unknown as RawAlert[];

      const groupedAlerts =
        groupRawAlerts(rawAlerts);

      setAlerts(groupedAlerts);

      // Prefer backend's unique-project count when available.
      // Otherwise calculate it from the raw individual records.
      const projectCount =
        Number(data.project_count ?? 0) > 0
          ? Number(data.project_count)
          : new Set(
              rawAlerts
                .map((a) =>
                  String(a.project_id ?? "").trim()
                )
                .filter(Boolean)
            ).size;

      setTotalProjects(projectCount);
      setLoading(false);
    })
    .catch((err) => {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load alerts"
      );
      setLoading(false);
    });
}, []);

  const toggleAcknowledge = (
    id: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    setAcknowledged((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filterSeverity === "ALL") return true;
    return alert.severity === filterSeverity;
  });

  return (
    <div className="bg-surface dark:bg-[#141D26] border border-line dark:border-[#2A3742] rounded-lg p-5 space-y-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line dark:border-[#2A3742] pb-4">

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Bell size={18} className="text-red-500" />

            <h3 className="font-serif text-lg font-semibold">
              Early Warning Delay Alerts
            </h3>

            <span className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 text-xs px-2 py-0.5 rounded-full font-bold">
              {totalProjects.toLocaleString()} monitored projects
            </span>

            <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full">
              {alerts.length} alert groups
            </span>
          </div>

          <p className="text-xs text-ink/60 dark:text-[#8A9086] mt-1">
            Projects with predicted delay risk at or above the
            65% early-warning threshold, grouped by region and severity.
          </p>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-1.5 bg-paper dark:bg-slate-800 p-1 rounded border border-line dark:border-[#2A3742] text-xs shrink-0">

          <button
            onClick={() => setFilterSeverity("ALL")}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterSeverity === "ALL"
                ? "bg-surface dark:bg-[#141D26] font-medium shadow-sm"
                : "text-ink/60 hover:text-ink"
            }`}
          >
            All ({alerts.length})
          </button>

          <button
            onClick={() => setFilterSeverity("CRITICAL")}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterSeverity === "CRITICAL"
                ? "bg-surface dark:bg-[#141D26] font-medium text-red-600 shadow-sm"
                : "text-ink/60 hover:text-ink"
            }`}
          >
            Critical
          </button>

          <button
            onClick={() => setFilterSeverity("HIGH")}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterSeverity === "HIGH"
                ? "bg-surface dark:bg-[#141D26] font-medium text-amber-600 shadow-sm"
                : "text-ink/60 hover:text-ink"
            }`}
          >
            High
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="py-8 text-center text-xs text-ink/50">
          Loading alert groups...
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 rounded text-red-800 text-xs">
          Failed to fetch alerts: {error}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="py-8 text-center text-xs text-ink/50">
          No alerts matching current severity filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const isAck = acknowledged.has(alert.alert_id);
            const isExpanded = expanded.has(alert.alert_id);
            const isCritical = alert.severity === "CRITICAL";

            return (
              <div
                key={alert.alert_id}
                className={`rounded-lg border transition-all ${
                  isAck
                    ? "bg-slate-50/50 dark:bg-slate-900/30 border-line dark:border-[#2A3742] opacity-70"
                    : isCritical
                    ? "bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/40"
                    : "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40"
                }`}
              >

                {/* GROUP HEADER */}
                <div
                  onClick={() => toggleExpanded(alert.alert_id)}
                  className="p-4 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                >
                  <div className="flex items-start justify-between gap-3">

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">

                        {isExpanded ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                            isCritical
                              ? "bg-red-600 text-white"
                              : "bg-amber-600 text-white"
                          }`}
                        >
                          {alert.severity}
                        </span>

                        <span className="font-semibold text-sm">
                          {alert.region} Region
                        </span>
                      </div>

                      <div className="mt-2 text-xs text-ink/60 dark:text-[#8A9086]">
                        {(alert.project_count ?? 0).toLocaleString()} unique projects
                        {" · "}
                        {(alert.record_count ?? 0).toLocaleString()} quarterly records
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">

                      <div className="text-right">
                        <div className="text-sm font-mono font-bold text-red-600 dark:text-red-400">
                          {formatPct(alert.average_probability ?? 0)}
                        </div>

                        <div className="text-[10px] text-ink/50">
                          avg risk
                        </div>
                      </div>

                      <button
                        onClick={(e) =>
                          toggleAcknowledge(alert.alert_id, e)
                        }
                        title={
                          isAck
                            ? "Mark unacknowledged"
                            : "Mark acknowledged"
                        }
                        className="p-1 text-ink/40 hover:text-ink"
                      >
                        <CheckCircle2
                          size={16}
                          className={
                            isAck
                              ? "text-emerald-600"
                              : ""
                          }
                        />
                      </button>
                    </div>
                  </div>

                  {/* Bottleneck summary */}
                  {(alert.top_bottlenecks?.length ?? 0) > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {alert.top_bottlenecks?.map((b) => (
                        <span
                          key={b.driver}
                          className="text-[11px] px-2 py-1 rounded bg-white/70 dark:bg-black/20 border border-line/60 dark:border-[#2A3742]"
                        >
                          {b.driver}
                          {" · "}
                          {b.record_count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* EXPANDED PROJECTS */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-line/60 dark:border-[#2A3742]">

                    <div className="pt-3 text-[11px] font-semibold text-ink/60 dark:text-[#8A9086] uppercase tracking-wider">
                      Highest-risk projects in this group
                    </div>

                    <div className="mt-2 space-y-2">
                      {alert.projects?.map((project) => (
                        <div
                          key={`${alert.alert_id}-${project.project_id}`}
                          className="flex items-center justify-between gap-3 p-3 rounded border border-line/60 dark:border-[#2A3742] bg-surface/60 dark:bg-[#111820]"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-bold">
                                {project.project_id}
                              </span>

                              <span className="text-[10px] text-ink/50">
                                {project.quarter}
                              </span>
                            </div>

                            <div className="text-[11px] mt-1 truncate">
                              {project.sector}
                            </div>

                            <div className="text-[11px] mt-1 text-red-700 dark:text-red-300">
                              {project.primary_driver}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">

                            <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400">
                              {formatPct(
                                project.predicted_delay_probability ?? 0
                              )}
                            </span>

                            {userRole !== "policymaker" &&
                              onSelectProject && (
                                <button
                                  onClick={() =>
                                    onSelectProject(
                                      project.project_id,
                                      project.quarter
                                    )
                                  }
                                  className="flex items-center gap-1 text-[11px] text-teal font-medium hover:underline"
                                >
                                  Investigate
                                  <ArrowRight size={11} />
                                </button>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[10px] text-ink/50 dark:text-[#8A9086]">
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {alert.timestamp}
                      </span>

                      <span>
                        Max risk:{" "}
                        <strong>
                          {formatPct(alert.max_probability ?? 0)}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}