"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { Layers, MapPin, Gauge } from "lucide-react";
import { QsprSectorAnalyticsRow } from "@/lib/qspr-types";
import { RISK_COLORS } from "@/lib/format";

function riskColorForPct(pct: number): string {
  if (pct >= 65) return RISK_COLORS.High;
  if (pct >= 35) return RISK_COLORS.Medium;
  return RISK_COLORS.Low;
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.substring(0, n - 1)}…` : s;
}

interface HorizontalBarCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  data: QsprSectorAnalyticsRow[];
}

function HorizontalBarCard({ title, subtitle, icon, data }: HorizontalBarCardProps) {
  const chartData = data.map((d) => ({
    label: truncate(d.label, 22),
    fullLabel: d.label,
    avg: d.average_delay_probability_pct,
    count: d.project_count,
  }));
  const height = Math.max(180, chartData.length * 34);

  return (
    <div className="bg-surface dark:bg-[#141D26] border border-line dark:border-[#2A3742] p-5 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h3 className="font-serif text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-xs text-ink/60 dark:text-[#8A9086] mb-4">{subtitle}</p>

      {chartData.length === 0 ? (
        <div className="py-10 text-center text-xs text-ink/50">No data yet — process a report to see this chart.</div>
      ) : (
        <div style={{ height }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="label"
                width={140}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(value, _name, props) => [
                  `${Number(value).toFixed(1)}% (${props.payload.count} project${
                    props.payload.count === 1 ? "" : "s"
                  })`,
                  "Predicted avg. delay probability",
                ]}
                labelFormatter={(_label, payload) =>
                  String(payload?.[0]?.payload?.fullLabel ?? _label ?? "")
                }
              />
              <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={riskColorForPct(entry.avg)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

interface QsprChartsProps {
  sectorData: QsprSectorAnalyticsRow[];
  stateData: QsprSectorAnalyticsRow[];
  riskDistribution: { High: number; Medium: number; Low: number };
}

export function QsprCharts({ sectorData, stateData, riskDistribution }: QsprChartsProps) {
  const total = riskDistribution.High + riskDistribution.Medium + riskDistribution.Low;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HorizontalBarCard
          title="Predicted Delay Probability by Sector"
          subtitle="Top sectors by average predicted delay probability (QSPR model)"
          icon={<Layers size={18} className="text-teal" />}
          data={sectorData}
        />
        <HorizontalBarCard
          title="Predicted Delay Probability by State"
          subtitle="Top states by average predicted delay probability (QSPR model)"
          icon={<MapPin size={18} className="text-teal" />}
          data={stateData}
        />
      </div>

      <div className="bg-surface dark:bg-[#141D26] border border-line dark:border-[#2A3742] p-5 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <Gauge size={18} className="text-teal" />
          <h3 className="font-serif text-lg font-semibold">Predicted Risk Distribution</h3>
        </div>
        <p className="text-xs text-ink/60 dark:text-[#8A9086] mb-4">
          Share of projects in each predicted risk band for this report
        </p>
        {total === 0 ? (
          <div className="py-6 text-center text-xs text-ink/50">No data yet — process a report to see this chart.</div>
        ) : (
          <div className="space-y-3">
            {(["High", "Medium", "Low"] as const).map((cat) => {
              const count = riskDistribution[cat];
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium" style={{ color: RISK_COLORS[cat] }}>
                      {cat} risk
                    </span>
                    <span className="text-ink/60 dark:text-[#8A9086]">
                      {count} project{count === 1 ? "" : "s"} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: RISK_COLORS[cat] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
