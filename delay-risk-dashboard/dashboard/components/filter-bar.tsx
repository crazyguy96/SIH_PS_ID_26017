"use client";

import React from "react";
import { Search, Filter, RotateCcw } from "lucide-react";

interface FilterBarProps {
  regions: string[];
  sectors: string[];
  region: string;
  sector: string;
  risk: string;
  dataCompleteness: string;
  search: string;
  onRegionChange: (v: string) => void;
  onSectorChange: (v: string) => void;
  onRiskChange: (v: string) => void;
  onDataCompletenessChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onReset: () => void;
}

export function FilterBar({
  regions,
  sectors,
  region,
  sector,
  risk,
  dataCompleteness,
  search,
  onRegionChange,
  onSectorChange,
  onRiskChange,
  onDataCompletenessChange,
  onSearchChange,
  onReset,
}: FilterBarProps) {
  return (
  <div
    className="
      rounded-2xl
      border border-slate-200/80 dark:border-slate-700/60
      bg-white dark:bg-[#141D26]
      p-4
      shadow-[0_2px_10px_rgba(15,23,42,0.04)]
    "
  >
    <div className="flex flex-wrap items-center gap-2.5">

      {/* Filter label */}
      <div className="flex items-center gap-2 mr-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg
          bg-teal/10 dark:bg-teal/15">
          <Filter size={14} className="text-teal" />
        </div>

        <span className="text-[11px] font-semibold uppercase tracking-[0.12em]
          text-slate-500 dark:text-slate-400">
          Filters
        </span>
      </div>

      {/* Region */}
      <select
        value={region}
        onChange={(e) => onRegionChange(e.target.value)}
        className="
          h-9 rounded-lg
          border border-slate-200 dark:border-slate-700
          bg-slate-50 dark:bg-slate-800/80
          px-3 text-xs text-ink dark:text-slate-200
          outline-none
          transition
          focus:border-teal focus:ring-2 focus:ring-teal/10
        "
      >
        <option value="All">All Regions</option>
        {regions.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      {/* Sector */}
      <select
        value={sector}
        onChange={(e) => onSectorChange(e.target.value)}
        className="
          h-9 max-w-[210px] rounded-lg
          border border-slate-200 dark:border-slate-700
          bg-slate-50 dark:bg-slate-800/80
          px-3 text-xs text-ink dark:text-slate-200
          outline-none
          transition
          focus:border-teal focus:ring-2 focus:ring-teal/10
        "
      >
        <option value="All">All Sectors</option>
        {sectors.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Risk */}
      <select
        value={risk}
        onChange={(e) => onRiskChange(e.target.value)}
        className="
          h-9 rounded-lg
          border border-slate-200 dark:border-slate-700
          bg-slate-50 dark:bg-slate-800/80
          px-3 text-xs text-ink dark:text-slate-200
          outline-none
          transition
          focus:border-teal focus:ring-2 focus:ring-teal/10
        "
      >
        <option value="All">All Risk Tiers</option>
        <option value="High">High Risk (&gt;65%)</option>
        <option value="Medium">Medium Risk (35–65%)</option>
        <option value="Low">Low Risk (&lt;35%)</option>
      </select>

      {/* Evidence Coverage */}
      <select
        value={dataCompleteness}
        onChange={(e) => onDataCompletenessChange(e.target.value)}
        className="
          h-9 rounded-lg
          border border-slate-200 dark:border-slate-700
          bg-slate-50 dark:bg-slate-800/80
          px-3 text-xs text-ink dark:text-slate-200
          outline-none
          transition
          focus:border-teal focus:ring-2 focus:ring-teal/10
        "
      >
        <option value="All">All Evidence Coverage</option>
        <option value="Complete Data">Strong Evidence</option>
        <option value="Partial Data">Moderate Evidence</option>
        <option value="Sparse Data">Limited Evidence</option>
      </select>

      {/* Search */}
      <div className="relative flex-1 min-w-[220px]">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type="text"
          placeholder="Search project ID or keyword..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="
            h-9 w-full rounded-lg
            border border-slate-200 dark:border-slate-700
            bg-slate-50 dark:bg-slate-800/80
            pl-9 pr-3 text-xs
            text-ink dark:text-slate-200
            placeholder:text-slate-400
            outline-none
            transition
            focus:border-teal focus:ring-2 focus:ring-teal/10
          "
        />
      </div>

      {/* Reset */}
      {(
        region !== "All" ||
        sector !== "All" ||
        risk !== "All" ||
        dataCompleteness !== "All" ||
        search
      ) && (
        <button
          onClick={onReset}
          className="
            h-9 flex items-center gap-1.5
            rounded-lg px-3
            text-xs font-medium
            text-slate-500 dark:text-slate-400
            hover:bg-slate-100 dark:hover:bg-slate-800
            hover:text-ink dark:hover:text-white
            transition-colors
          "
          title="Reset all filters"
        >
          <RotateCcw size={13} />
          Reset
        </button>
      )}
    </div>
  </div>
);
}