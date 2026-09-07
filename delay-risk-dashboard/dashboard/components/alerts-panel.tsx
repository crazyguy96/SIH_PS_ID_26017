"use client";

import React, { useEffect, useState } from "react";
import { AlertItem } from "@/lib/types";
import { fetchAlerts } from "@/lib/api";
import { formatPct, formatConfidenceTier } from "@/lib/format";
import { AlertTriangle, Bell, ShieldAlert, ArrowRight, CheckCircle2, Clock } from "lucide-react";

interface AlertsPanelProps {
  onSelectProject?: (projectId: string) => void;
  userRole?: string;
}

export function AlertsPanel({ onSelectProject, userRole }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<"ALL" | "CRITICAL" | "HIGH">("ALL");
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAlerts(0.65)
      .then((data) => {
        setAlerts(data.alerts);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const toggleAcknowledge = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAcknowledged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === "ALL") return true;
    return a.severity === filterSeverity;
  });

  return (
    <div className="bg-surface dark:bg-[#141D26] border border-line dark:border-[#2A3742] rounded-lg p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line dark:border-[#2A3742] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-red-500" />
            <h3 className="font-serif text-lg font-semibold">Early Warning Delay Alerts Feed</h3>
            <span className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 text-xs px-2 py-0.5 rounded-full font-bold">
              {alerts.length} Active
            </span>
          </div>
          <p className="text-xs text-ink/60 dark:text-[#8A9086] mt-0.5">
            Real-time feed triggered when inference delay risk exceeds the 65% High-Risk policy threshold
          </p>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-1.5 bg-paper dark:bg-slate-800 p-1 rounded border border-line dark:border-[#2A3742] text-xs">
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
            Critical (&ge;85%)
          </button>
          <button
            onClick={() => setFilterSeverity("HIGH")}
            className={`px-2.5 py-1 rounded transition-colors ${
              filterSeverity === "HIGH"
                ? "bg-surface dark:bg-[#141D26] font-medium text-amber-600 shadow-sm"
                : "text-ink/60 hover:text-ink"
            }`}
          >
            High (65–85%)
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-ink/50">Loading alert notifications...</div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 rounded text-red-800 text-xs">
          Failed to fetch alerts: {error}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="py-8 text-center text-xs text-ink/50">No alerts matching current severity filter.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[500px] overflow-y-auto pr-1">
          {filteredAlerts.map((alert) => {
            const isAck = acknowledged.has(alert.alert_id);
            const isCritical = alert.severity === "CRITICAL";

            return (
              <div
                key={alert.alert_id}
                onClick={() => {
                  if (userRole !== "policymaker" && onSelectProject) {
                    onSelectProject(alert.project_id);
                  }
                }}
                className={`p-4 rounded-lg border transition-all relative ${
                  isAck
                    ? "bg-slate-50/50 dark:bg-slate-900/30 border-line dark:border-[#2A3742] opacity-70"
                    : isCritical
                    ? "bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 hover:border-red-400"
                    : "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 hover:border-amber-400"
                } ${userRole === "policymaker" ? "cursor-default" : "cursor-pointer"}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        isCritical
                          ? "bg-red-600 text-white"
                          : "bg-amber-600 text-white"
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="font-mono text-xs font-bold text-ink dark:text-white">
                      {alert.project_id}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400">
                      {formatPct(alert.predicted_delay_probability)}
                    </span>
                    <button
                      onClick={(e) => toggleAcknowledge(alert.alert_id, e)}
                      title={isAck ? "Mark unacknowledged" : "Mark acknowledged"}
                      className="p-1 text-ink/40 hover:text-ink dark:text-gray-400"
                    >
                      <CheckCircle2 size={15} className={isAck ? "text-emerald-600" : ""} />
                    </button>
                  </div>
                </div>

                <div className="text-xs font-medium text-ink dark:text-gray-200 truncate">
                  {alert.sector} &bull; <span className="text-ink/60 dark:text-[#8A9086]">{alert.region} Region</span>
                </div>

                <div className="mt-2 text-xs flex items-center gap-1 text-red-800 dark:text-red-300 bg-red-100/60 dark:bg-red-950/60 px-2 py-1 rounded">
                  <AlertTriangle size={13} className="shrink-0" />
                  <span className="truncate">Primary Bottleneck: <strong>{alert.primary_driver}</strong></span>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-ink/50 dark:text-[#8A9086] pt-2 border-t border-line/50 dark:border-[#2A3742]/50">
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> {alert.timestamp}
                  </span>
                  {userRole !== "policymaker" && (
                    <span className="flex items-center gap-1 text-teal font-medium hover:underline">
                      Investigate <ArrowRight size={11} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}