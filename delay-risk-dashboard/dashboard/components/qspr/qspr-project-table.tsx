"use client";

import React, { useMemo, useState } from "react";
import { Search, RotateCcw, ChevronLeft, ChevronRight, History as HistoryIcon } from "lucide-react";
import { QsprProjectResult } from "@/lib/qspr-types";
import { RISK_BG, RISK_COLORS } from "@/lib/format";

const PAGE_SIZE = 25;

interface QsprProjectTableProps {
  results: QsprProjectResult[];
  onSelectProject: (projectId: string) => void;
}

export function QsprProjectTable({ results, onSelectProject }: QsprProjectTableProps) {
  const [search, setSearch] = useState("");
  const [state, setState] = useState("All");
  const [sector, setSector] = useState("All");
  const [risk, setRisk] = useState("All");
  const [page, setPage] = useState(1);

  const states = useMemo(
    () => Array.from(new Set(results.map((r) => r.state).filter(Boolean))).sort() as string[],
    [results]
  );
  const sectors = useMemo(
    () => Array.from(new Set(results.map((r) => r.sector).filter(Boolean))).sort() as string[],
    [results]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return results.filter((r) => {
      if (state !== "All" && r.state !== state) return false;
      if (sector !== "All" && r.sector !== sector) return false;
      if (risk !== "All" && r.risk_category !== risk) return false;
      if (q) {
        const haystack = `${r.project_id} ${r.project_name ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [results, state, sector, risk, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

  function resetFilters() {
    setSearch("");
    setState("All");
    setSector("All");
    setRisk("All");
    setPage(1);
  }

  return (
    <div className="bg-surface dark:bg-[#141D26] border border-line dark:border-[#2A3742] rounded-lg overflow-hidden">
      {/* Filters */}
      <div className="p-3.5 border-b border-line dark:border-[#2A3742] flex flex-wrap items-center gap-2.5 text-xs">
        <select
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setPage(1);
          }}
          className="border border-line dark:border-[#2A3742] rounded bg-paper dark:bg-slate-800 text-ink dark:text-gray-200 px-2.5 py-1.5 focus:outline-none focus:border-teal"
        >
          <option value="All">All States</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={sector}
          onChange={(e) => {
            setSector(e.target.value);
            setPage(1);
          }}
          className="border border-line dark:border-[#2A3742] rounded bg-paper dark:bg-slate-800 text-ink dark:text-gray-200 px-2.5 py-1.5 focus:outline-none focus:border-teal max-w-[220px]"
        >
          <option value="All">All Sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={risk}
          onChange={(e) => {
            setRisk(e.target.value);
            setPage(1);
          }}
          className="border border-line dark:border-[#2A3742] rounded bg-paper dark:bg-slate-800 text-ink dark:text-gray-200 px-2.5 py-1.5 focus:outline-none focus:border-teal"
        >
          <option value="All">All Risk Tiers</option>
          <option value="High">High Risk (&gt;65%)</option>
          <option value="Medium">Medium Risk (35–65%)</option>
          <option value="Low">Low Risk (&lt;35%)</option>
        </select>

        <div className="relative flex-1 min-w-[170px]">
          <Search size={14} className="absolute left-2.5 top-2 text-ink/40" />
          <input
            type="text"
            placeholder="Search project ID or name…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full border border-line dark:border-[#2A3742] rounded bg-paper dark:bg-slate-800 text-ink dark:text-gray-200 pl-8 pr-2.5 py-1.5 focus:outline-none focus:border-teal"
          />
        </div>

        {(state !== "All" || sector !== "All" || risk !== "All" || search) && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-[11px] text-ink/60 hover:text-ink dark:text-gray-400 dark:hover:text-white px-2 py-1.5"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        )}

        <span className="ml-auto text-[11px] text-ink/50 dark:text-[#8A9086] font-mono">
          {filtered.length.toLocaleString("en-IN")} project{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-ink/50 dark:text-[#8A9086] border-b border-line dark:border-[#2A3742]">
              <th className="px-4 py-2.5 font-semibold">Project</th>
              <th className="px-4 py-2.5 font-semibold">Project ID</th>
              <th className="px-4 py-2.5 font-semibold">State</th>
              <th className="px-4 py-2.5 font-semibold">Sector</th>
              <th className="px-4 py-2.5 font-semibold">Progress</th>
              <th className="px-4 py-2.5 font-semibold">Delay Probability</th>
              <th className="px-4 py-2.5 font-semibold">History</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((r) => (
              <tr
                key={r.project_id}
                onClick={() => onSelectProject(r.project_id)}
                className="border-b border-line dark:border-[#2A3742] last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
              >
                <td className="px-4 py-2.5 max-w-[280px] truncate" title={r.project_name || undefined}>
                  {r.project_name || "—"}
                </td>
                <td className="px-4 py-2.5 font-mono">{r.project_id}</td>
                <td className="px-4 py-2.5">{r.state || "—"}</td>
                <td className="px-4 py-2.5 max-w-[160px] truncate" title={r.sector || undefined}>
                  {r.sector || "—"}
                </td>
                <td className="px-4 py-2.5">
                  {r.physical_progress_pct !== null ? `${r.physical_progress_pct}%` : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-[11px]"
                    style={{
                      backgroundColor: RISK_BG[r.risk_category],
                      color: RISK_COLORS[r.risk_category],
                    }}
                  >
                    {r.delay_probability_pct.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {r.previously_scored ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-ink/60 dark:text-[#8A9086]">
                      <HistoryIcon size={12} />
                      {r.previous_predictions.length} prior
                    </span>
                  ) : (
                    <span className="text-[11px] text-ink/40">First snapshot</span>
                  )}
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink/50">
                  No projects match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-line dark:border-[#2A3742] text-[11px] text-ink/60 dark:text-[#8A9086]">
        <span>
          Page {clampedPage} of {totalPages}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={clampedPage <= 1}
            className="p-1.5 rounded border border-line dark:border-[#2A3742] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={clampedPage >= totalPages}
            className="p-1.5 rounded border border-line dark:border-[#2A3742] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
