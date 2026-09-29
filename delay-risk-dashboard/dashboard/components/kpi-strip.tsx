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
      value: (overview.total_projects ?? 0).toLocaleString("en-IN"),
      subtext: "Live active inference pool",
      icon: Activity,
      color: "text-ink dark:text-white",
    },
    {
      label: "% Flagged High-Risk",
      value: `${highRiskPct.toFixed(1)}%`,
      subtext: `${(overview.high_risk ?? 0).toLocaleString(
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
      value: `${(overview.high_risk ?? 0).toLocaleString("en-IN")}`,
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
          className="
            group relative overflow-hidden
            rounded-2xl
            border border-slate-200/80 dark:border-slate-700/60
            bg-white dark:bg-[#141D26]
            p-5
            shadow-[0_2px_10px_rgba(15,23,42,0.04)]
            transition-all duration-200
            hover:-translate-y-0.5
            hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]
          "
        >
          {/* subtle top accent */}
          <div
            className={`absolute inset-x-0 top-0 h-1 ${
              item.label === "Total Projects Monitored"
                ? "bg-slate-400"
                : item.label === "% Flagged High-Risk"
                ? "bg-red-500"
                : item.label === "Avg Delay Probability"
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
          />

          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em]
                text-slate-500 dark:text-slate-400">
                {item.label}
              </p>

              <div
                className={`mt-3 text-3xl font-semibold tracking-tight ${item.color}`}
              >
                {item.value}
              </div>
            </div>

            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl
                bg-slate-100 dark:bg-slate-800/80 ${item.color}`}
            >
              <Icon size={18} strokeWidth={2} />
            </div>
          </div>

          <div
            className="mt-4 border-t border-slate-100 dark:border-slate-700/50 pt-3
              text-[11px] leading-relaxed text-slate-500 dark:text-slate-400"
            title={item.subtext}
          >
            {item.subtext}
          </div>
        </div>
      );
    })}
  </div>
  );
}