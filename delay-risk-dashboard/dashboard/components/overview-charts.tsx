"use client";

import React, { useMemo } from "react";
import {
  RegionBreakdown,
  SectorBreakdown,
  QuarterlyTrendPoint,
} from "@/lib/types";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

import { Map, Layers, TrendingUp } from "lucide-react";

interface OverviewChartsProps {
  regionData: RegionBreakdown[];
  sectorData: SectorBreakdown[];
  quarterlyTrend: QuarterlyTrendPoint[];
}

export function OverviewCharts({
  regionData,
  sectorData,
  quarterlyTrend,
}: OverviewChartsProps) {
  const regionChartData = useMemo(
    () =>
      regionData.map((r) => ({
        region: r.region,
        total: r.total,
        highRiskPct:
          r.total > 0 ? (r.high / r.total) * 100 : 0,
      })),
    [regionData]
  );

  const sectorChartData = useMemo(
    () =>
      sectorData.map((s) => ({
        sector: s.sector,
        total: s.total,
        probability: s.avg_probability * 100,
      })),
    [sectorData]
  );

  const quarterlyChartData = useMemo(
    () =>
      quarterlyTrend.map((q) => ({
        quarter: q.quarter,
        total: q.total,
        probability: q.avg_probability * 100,
      })),
    [quarterlyTrend]
  );

  return (
    <div className="space-y-6">

      {/* REGION + SECTOR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* REGIONAL */}
        <div className="
          rounded-2xl
          border border-slate-200/80 dark:border-slate-700/60
          bg-white dark:bg-[#141D26]
          p-5
          shadow-[0_2px_10px_rgba(15,23,42,0.04)]
        ">
          <div className="flex items-center gap-2 mb-1">
            <Map size={18} className="text-teal" />
            <h3 className="text-sm font-semibold tracking-tight text-ink dark:text-white">
              Delay Risk by Region
            </h3>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 mb-5">
            Project volume and high-risk proportion across monitoring zones
          </p>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={regionChartData}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="region"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={55}
                  tickFormatter={(value) =>
                    value.length > 11 ? `${value.substring(0, 10)}...` : value
                  }
                />

                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11 }}
                />

                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  unit="%"
                  domain={[0, 100]}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #E2E8F0",
                    borderRadius: "12px",
                    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                    fontSize: "11px",
                  }}
                  labelStyle={{
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                />
                <Legend />

                <Bar
                  yAxisId="left"
                  dataKey="total"
                  name="Total Projects"
                  fill="#0D9488"
                  radius={[4, 4, 0, 0]}
                />

                <Bar
                  yAxisId="right"
                  dataKey="highRiskPct"
                  name="High Risk Rate (%)"
                  fill="#DC2626"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTOR */}
        <div className="
          rounded-2xl
          border border-slate-200/80 dark:border-slate-700/60
          bg-white dark:bg-[#141D26]
          p-5
          shadow-[0_2px_10px_rgba(15,23,42,0.04)]
        ">
          <div className="flex items-center gap-2 mb-1">
            <Layers size={18} className="text-teal" />
            <h3 className="text-sm font-semibold tracking-tight text-ink dark:text-white">
              Top 10 Sectors Risk Profile
            </h3>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 mb-5">
            Project volume and average delay likelihood across sectors
          </p>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sectorChartData}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 15,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="sector"
                  tick={{ fontSize: 9 }}
                  interval={0}
                  angle={-32}
                  textAnchor="end"
                  height={65}
                  tickFormatter={(value) =>
                    value.length > 13 ? `${value.substring(0, 12)}...` : value
                  }
                />

               <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11 }}
                />

                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  unit="%"
                  domain={[0, 100]}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #E2E8F0",
                    borderRadius: "12px",
                    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                    fontSize: "11px",
                  }}
                  labelStyle={{
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                />
                <Legend />

                <Bar
                  yAxisId="left"
                  dataKey="total"
                  name="Total Projects"
                  fill="#0284C7"
                  radius={[4, 4, 0, 0]}
                />

                <Bar
                  yAxisId="right"
                  dataKey="probability"
                  name="Avg Delay Probability (%)"
                  fill="#D97706"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* QUARTERLY */}
      <div className="
          rounded-2xl
          border border-slate-200/80 dark:border-slate-700/60
          bg-white dark:bg-[#141D26]
          p-5
          shadow-[0_2px_10px_rgba(15,23,42,0.04)]
        ">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={18} className="text-teal" />
          <h3 className="text-sm font-semibold tracking-tight text-ink dark:text-white">
            Chronological Delay Risk Trend Across Quarters
          </h3>
        </div>

        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 mb-5">
          Evolution of average delay likelihood over successive reporting cycles
        </p>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={quarterlyChartData}
              margin={{
                top: 10,
                right: 20,
                left: 0,
                bottom: 25,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis
                dataKey="quarter"
                tick={{ fontSize: 10 }}
                angle={-35}
                textAnchor="end"
              />

              <YAxis
                tick={{ fontSize: 11 }}
                domain={[0, 100]}
                unit="%"
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #E2E8F0",
                  borderRadius: "12px",
                  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                  fontSize: "11px",
                }}
                labelStyle={{
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              />
              <Legend />

              <Line
                type="monotone"
                dataKey="probability"
                name="Avg Delay Probability (%)"
                stroke="#DC2626"
                strokeWidth={2.5}
                dot={{ r: 2.5 }}
              />

            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}