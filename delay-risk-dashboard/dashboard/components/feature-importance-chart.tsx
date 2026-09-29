"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { FeatureImportance } from "@/lib/types";

export function FeatureImportanceChart({
  data,
}: {
  data: FeatureImportance[];
}) {
  const chartData = [...data]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 6)
    .map((d) => ({
      driver: d.feature,
      percentage: Number(d.importance),
    }));

  return (
    <div className="hairline rounded bg-surface dark:bg-[#141D26] p-4">
      <h3 className="font-serif text-[15px] font-semibold mb-1">
        Top Delay Drivers
      </h3>

      <p className="text-xs text-ink/60 dark:text-[#B9BEB2] mb-3">
        Relative contribution of the leading delay factors across monitored projects.
      </p>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{
            top: 5,
            right: 25,
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
            domain={[0, "auto"]}
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => `${value}%`}
          />

          <YAxis
            type="category"
            dataKey="driver"
            width={175}
            tick={{ fontSize: 11 }}
          />

          <Tooltip
            formatter={(value: any) => [
              `${Number(value).toFixed(1)}%`,
              "Contribution",
            ]}
          />

          <Bar
            dataKey="percentage"
            fill="#D97706"
            radius={[0, 5, 5, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}