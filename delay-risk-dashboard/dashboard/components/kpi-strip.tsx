import React from "react";
import { OverviewData } from "@/lib/types";
import { formatPct } from "@/lib/format";
import {
  AlertCircle,
  Activity,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export function KpiStrip({ overview }: { overview: OverviewData }) {
  const highRiskPct =
    overview.total_projects > 0
      ? (overview.high_risk / overview.total_projects) * 100
      : 0;

  const items = [
    {
      label: "Total Projects Monitored",
      value: overview.total_projects.toLocaleString("en-IN"),
      subtext: "Live active inference pool",
      icon: Activity,
      color: "text-ink dark:text-white",
    },
    {
      label: "% Flagged High-Risk",
      value: `${highRiskPct.toFixed(1)}%`,
      subtext: `${overview.high_risk.toLocaleString(
        "en-IN"
      )} projects > 65% delay risk`,
      icon: AlertCircle,
      color: "text-red-600 dark:text-red-400",
    },
    {
      label: "Avg Delay Probability",
      value: formatPct(overview.avg_delay_probability),
      subtext: "System-wide mean delay likelihood",
      icon: CheckCircle2,
      color: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Risk Distribution",
      value: `${overview.high_risk.toLocaleString("en-IN")}`,
      subtext: `High: ${overview.high_risk} | Medium: ${overview.medium_risk} | Low: ${overview.low_risk}`,
      icon: ShieldCheck,
      color: "text-emerald-600 dark:text-emerald-400",
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
              <div
                className={`font-serif text-3xl font-bold leading-none ${item.color}`}
              >
                {item.value}
              </div>

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