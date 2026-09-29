"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { QsprUploadCard } from "./qspr-upload-card";
import { QsprResultsSummary } from "./qspr-results-summary";
import { QsprCharts } from "./qspr-charts";
import { QsprProjectTable } from "./qspr-project-table";
import { QsprProjectDetailPanel } from "./qspr-project-detail-panel";
import { QsprPredictResponse, QsprSectorAnalyticsRow } from "@/lib/qspr-types";

function groupTopN(
  results: QsprPredictResponse["results"],
  key: "sector" | "state",
  topN: number
): QsprSectorAnalyticsRow[] {
  const buckets = new Map<string, number[]>();
  for (const r of results) {
    const label = (r[key] || "Unknown").trim() || "Unknown";
    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label)!.push(r.delay_probability_pct);
  }
  const rows: QsprSectorAnalyticsRow[] = Array.from(buckets.entries()).map(([label, vals]) => ({
    label,
    average_delay_probability_pct: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
    project_count: vals.length,
  }));
  rows.sort((a, b) => b.average_delay_probability_pct - a.average_delay_probability_pct);
  return rows.slice(0, topN);
}

export function QsprSection() {
  const [result, setResult] = useState<QsprPredictResponse | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const sectorData = useMemo(() => (result ? groupTopN(result.results, "sector", 10) : []), [result]);
  const stateData = useMemo(() => (result ? groupTopN(result.results, "state", 12) : []), [result]);
  const riskDistribution = useMemo(() => {
    const dist = { High: 0, Medium: 0, Low: 0 };
    if (result) {
      for (const r of result.results) dist[r.risk_category] += 1;
    }
    return dist;
  }, [result]);

  return (
    <div className="space-y-6">
      <QsprUploadCard onProcessed={setResult} />

      {result && (
        <>
          <QsprResultsSummary result={result} />

          {result.issues.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-semibold mb-2">
                <AlertTriangle size={14} />
                {result.issues.length} project{result.issues.length === 1 ? "" : "s"} could not be processed
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {result.issues.map((issue, idx) => (
                  <div key={idx} className="text-[11px] text-amber-900/80 dark:text-amber-200/80 flex flex-wrap gap-x-3">
                    <span className="font-mono">{issue.project_id || "Unidentified"}</span>
                    {issue.project_name && <span className="italic truncate max-w-[220px]">{issue.project_name}</span>}
                    {issue.page && <span>Page {issue.page}</span>}
                    <span className="text-ink/50 dark:text-[#8A9086]">[{issue.stage}]</span>
                    <span>{issue.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <QsprCharts sectorData={sectorData} stateData={stateData} riskDistribution={riskDistribution} />

          <QsprProjectTable results={result.results} onSelectProject={setSelectedProjectId} />
        </>
      )}

      <QsprProjectDetailPanel projectId={selectedProjectId} onClose={() => setSelectedProjectId(null)} />
    </div>
  );
}
