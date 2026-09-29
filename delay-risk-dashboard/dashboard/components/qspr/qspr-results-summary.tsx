"use client";

import React from "react";
import { FileStack, ShieldAlert, Gauge, AlertTriangle } from "lucide-react";
import { QsprPredictResponse } from "@/lib/qspr-types";

interface QsprResultsSummaryProps {
  result: QsprPredictResponse;
}

export function QsprResultsSummary({ result }: QsprResultsSummaryProps) {
  const highRiskPct =
    result.predictions_generated > 0
      ? (result.high_risk_count / result.predictions_generated) * 100
      : 0;

  const items = [
    {
      label: "Report Period",
      value: result.report_label || "—",
      subtext: `${result.projects_extracted.toLocaleString("en-IN")} projects extracted`,
      icon: FileStack,
      color: "text-ink dark:text-white",
    },
    {
      label: "Predictions Generated",
      value: result.predictions_generated.toLocaleString("en-IN"),
      subtext: "QSPR small-model batch prediction",
      icon: Gauge,
      color: "text-teal",
    },
    {
      label: "Predicted ≥ 65% Delay Risk",
      value: `${result.high_risk_count.toLocaleString("en-IN")}`,
      subtext: `${highRiskPct.toFixed(1)}% of predicted projects`,
      icon: ShieldAlert,
      color: "text-red-600 dark:text-red-400",
    },
    {
      label: "Avg. Predicted Delay Probability",
      value: `${result.average_delay_probability_pct.toFixed(1)}%`,
      subtext:
        result.issue_count > 0
          ? `${result.issue_count} project${result.issue_count === 1 ? "" : "s"} could not be processed`
          : "All extracted projects predicted successfully",
      icon: AlertTriangle,
      color: result.issue_count > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="p-5 rounded-lg bg-surface dark:bg-[#141D26] border border-line dark:border-[#2A3742] shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-ink/60 dark:text-[#8A9086] mb-2">
              <span>{item.label}</span>
              <Icon size={16} className={item.color} />
            </div>
            <div>
              <div className={`font-serif text-2xl font-bold leading-none ${item.color}`}>{item.value}</div>
              <div
                className="text-[11px] text-ink/50 dark:text-[#8A9086] mt-2 font-mono truncate"
                title={item.subtext}
              >
                {item.subtext}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
