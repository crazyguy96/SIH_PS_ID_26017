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
import { formatFeatureName } from "@/lib/format";

export function FeatureImportanceChart({ data }: { data: FeatureImportance[] }) {
  const chartData = [...data]
    .sort((a, b) => a.importance - b.importance)
    .map((d) => ({ ...d, label: formatFeatureName(d.feature) }));

  return (
    <div className="hairline rounded bg-surface dark:bg-[#141D26] p-4">
      <h3 className="font-serif text-[15px] font-semibold mb-1">
        Top global delay drivers
      </h3>
      <p className="text-xs text-ink/60 dark:text-[#B9BEB2] mb-3">
        Relative weight each factor carries in the trained model, across all projects.
      </p>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="2 4" stroke="#D3D6CD" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#16202B" }} />
          <YAxis
            type="category"
            dataKey="label"
            width={190}
            tick={{ fontSize: 11, fill: "#16202B" }}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 4,
              border: "1px solid #D3D6CD",
              fontFamily: "var(--font-sans)",
            }}
          />
          <Bar dataKey="importance" fill="#2F5D62" radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
