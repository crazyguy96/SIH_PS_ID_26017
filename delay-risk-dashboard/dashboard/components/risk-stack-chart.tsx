"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { RegionSectorCount, RiskTier } from "@/lib/types";
import { RISK_COLORS } from "@/lib/format";

export function RiskStackChart({
  title,
  data,
  categoryKey,
  maxCategories = 12,
}: {
  title: string;
  data: RegionSectorCount[];
  categoryKey: "region_final" | "sector_extracted";
  maxCategories?: number;
}) {
  const byCategory = new Map<string, { name: string; High: number; Medium: number; Low: number; total: number }>();

  for (const row of data) {
    const name = (row[categoryKey] as string) || "Unknown";
    if (!byCategory.has(name)) {
      byCategory.set(name, { name, High: 0, Medium: 0, Low: 0, total: 0 });
    }
    const entry = byCategory.get(name)!;
    entry[row.risk_tier as RiskTier] += row.count;
    entry.total += row.count;
  }

  const chartData = Array.from(byCategory.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, maxCategories);

  return (
    <div className="hairline rounded bg-surface dark:bg-[#141D26] p-4">
      <h3 className="font-serif text-[15px] font-semibold mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 4 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="#D3D6CD" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#16202B" }}
            angle={-25}
            textAnchor="end"
            height={70}
            interval={0}
          />
          <YAxis tick={{ fontSize: 11, fill: "#16202B" }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 4,
              border: "1px solid #D3D6CD",
              fontFamily: "var(--font-sans)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="High" stackId="a" fill={RISK_COLORS.High} name="High risk" />
          <Bar dataKey="Medium" stackId="a" fill={RISK_COLORS.Medium} name="Medium risk" />
          <Bar dataKey="Low" stackId="a" fill={RISK_COLORS.Low} name="Low risk" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
