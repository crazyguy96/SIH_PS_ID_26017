"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  UserRole,
  UserProfile,
  OverviewData,
  ProjectListItem,
  RegionalAnalyticsData,
} from "@/lib/types";
import {
  fetchOverview,
  fetchProjects,
  fetchRegionalAnalytics,
  fetchAlerts,
} from "@/lib/api";
import { PredictNewProjectForm } from "@/predict-new-project-form";

import { Sidebar, NavSection } from "@/components/sidebar";
import { RoleSelector } from "@/components/role-selector";
import { KpiStrip } from "@/components/kpi-strip";
import { OverviewCharts } from "@/components/overview-charts";
import { FilterBar } from "@/components/filter-bar";
import { ProjectsTable } from "@/components/projects-table";
import { ProjectDetailPanel } from "@/components/project-detail-panel";
import { MapView } from "@/components/map-view";
import { ComparativeMatrix } from "@/components/comparative-matrix";
import { AlertsPanel } from "@/components/alerts-panel";
import { AdminModelView } from "@/components/admin-model-view";
import { QsprSection } from "@/components/qspr/qspr-section";
import { Shield, RefreshCw, AlertCircle } from "lucide-react";

export default function DashboardPage() {
  // Navigation & User State
  const [activeSection, setActiveSection] = useState<NavSection>("overview");
  const [userProfile, setUserProfile] = useState<UserProfile>({
    username: "admin",
    name: "System Administrator",
    role: "admin",
    region: "All",
    department: "Infrastructure Oversight Directorate",
  });

  // Data States
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [regional, setRegional] = useState<RegionalAnalyticsData | null>(null);
  const [alertCount, setAlertCount] = useState<number>(0);

  // Projects Register State
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [sortBy, setSortBy] = useState<string>("predicted_delay_probability");
  const [sortOrder, setSortOrder] = useState<string>("desc");

  // Filters
  const [region, setRegion] = useState<string>("All");
  const [sector, setSector] = useState<string>("All");
  const [risk, setRisk] = useState<string>("All");
  const [dataCompleteness, setDataCompleteness] = useState<string>("All");
  const [search, setSearch] = useState<string>("");

  // Detail Modal State
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Loading & Error States
  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Load Overview & Regional Analytics on initial mount
  const loadGlobalData = useCallback(() => {
    setLoadingOverview(true);
    setApiError(null);

    Promise.all([fetchOverview(), fetchRegionalAnalytics(), fetchAlerts(0.65)])
      .then(([ov, reg, al]) => {
        setOverview(ov);
        setRegional(reg);
        setAlertCount(al.alert_count);
        setLoadingOverview(false);
      })
      .catch((err) => {
        console.error("Failed to load dashboard data:", err);
        setApiError(err.message || "Failed to connect to FastAPI backend at http://127.0.0.1:8000");
        setLoadingOverview(false);
      });
  }, []);

  useEffect(() => {
    loadGlobalData();
  }, [loadGlobalData]);

  // Load Filtered Projects for Register Table
const loadProjects = useCallback(() => {
  setLoadingProjects(true);

  // Clear old rows immediately so stale projects
  // cannot remain visible while the filtered request loads.
  setProjects([]);

  fetchProjects({
    region,
    sector,
    risk,
    data_completeness: dataCompleteness,
    search,
    page,
    page_size: pageSize,
    sort_by: sortBy,
    sort_order: sortOrder,
  })
    .then((data) => {
      setProjects(data.projects);
      setTotalCount(data.total_count);
      setTotalPages(data.total_pages);
    })
    .catch((err) => {
      console.error("Failed to fetch projects:", err);
      setProjects([]);
      setTotalCount(0);
      setTotalPages(1);
      setApiError(
        err.message || "Failed to load the project risk register."
      );
    })
    .finally(() => {
      setLoadingProjects(false);
    });
}, [
  region,
  sector,
  risk,
  dataCompleteness,
  search,
  page,
  pageSize,
  sortBy,
  sortOrder,
]);

useEffect(() => {
  setLoadingProjects(true);

  loadProjects();
}, [loadProjects]);

  // Handle Role Change
  const handleRoleChange = (newUser: UserProfile) => {
    setUserProfile(newUser);
    if (newUser.role === "policymaker" && activeSection === "register") {
      setActiveSection("overview");
    } else if (newUser.role === "project_manager") {
      setRegion(newUser.region);
      setActiveSection("register");
    } else if (newUser.role === "admin") {
      setRegion("All");
    }
  };

  // Lists for dropdown options
  const regionsList = useMemo(() => {
    if (!overview || !overview.by_region) return [];
    return overview.by_region.map((r) => r.region).sort();
  }, [overview]);

  const sectorsList = useMemo(() => {
    // Prefer the complete all_sectors list from the backend if available
    if (overview?.all_sectors && overview.all_sectors.length > 0) {
      return overview.all_sectors;
    }
    // Fallback: assemble from multiple sources
    const sectorSet = new Set<string>();
    if (overview?.top_10_sectors) {
      overview.top_10_sectors.forEach((s) => sectorSet.add(s.sector));
    }
    if (regional?.heatmap_matrix) {
      regional.heatmap_matrix.forEach((row) => sectorSet.add(row.sector));
    }
    if (projects.length > 0) {
      projects.forEach((p) => {
        if (p.sector_extracted) sectorSet.add(p.sector_extracted);
      });
    }
    return Array.from(sectorSet).sort();
  }, [overview, regional, projects]);

  const handleSortChange = (col: string) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setRegion(userProfile.role === "project_manager" ? userProfile.region : "All");
    setSector("All");
    setRisk("All");
    setDataCompleteness("All");
    setSearch("");
    setPage(1);
  };

  return (
    <div className="flex min-h-screen bg-[#FDFCFB] dark:bg-[#0D141C] text-ink dark:text-[#E2E8F0]">
      {/* Sidebar Navigation */}
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        userRole={userProfile.role}
        alertCount={alertCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 px-4 sm:px-8 py-7">
        {/* Top Header */}
        <header className="sticky top-0 z-30 -mx-4 sm:-mx-8 px-4 sm:px-8 py-4 mb-6
          bg-[#FDFCFB]/95 dark:bg-[#0D141C]/95 backdrop-blur-xl
          border-b border-slate-200/80 dark:border-slate-700/50">

          <div className="flex items-center justify-between gap-4">

            {/* Left: page identity */}
            <div className="flex items-center gap-3 min-w-0">

              <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl
                bg-teal/10 dark:bg-teal/15 border border-teal/20">
                <Shield size={17} className="text-teal" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em]
                    text-teal">
                    Risk Intelligence
                  </span>

                  <span className="hidden md:inline text-slate-300 dark:text-slate-600">
                    /
                  </span>

                  <span className="hidden md:inline text-[10px] text-ink/40 dark:text-slate-500">
                    Land Acquisition DSS
                  </span>
                </div>

                <h1 className="mt-1 text-xl sm:text-2xl font-semibold tracking-tight
                  text-ink dark:text-white truncate">
                  {activeSection === "overview" && "Executive Overview"}
                  {activeSection === "register" && "Risk Register"}
                  {activeSection === "predict-new" && "Predict New Project"}
                  {activeSection === "qspr" && "QSPR / PAIMANA Prediction"}
                  {activeSection === "regional" && "Regional Analytics"}
                  {activeSection === "alerts" && "Alerts Feed"}
                  {activeSection === "model" && "Model Governance"}
                </h1>
              </div>
            </div>

            {/* Right: controls */}
            <div className="flex items-center gap-2 shrink-0">

              {/* System status */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl
                border border-slate-200 dark:border-slate-700
                bg-white/70 dark:bg-[#141D26]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-medium text-ink/60 dark:text-slate-400">
                  System Active
                </span>
              </div>

              {/* Role */}
              <RoleSelector
                currentRole={userProfile.role}
                onUserChange={handleRoleChange}
              />

              {/* Refresh */}
              <button
                onClick={loadGlobalData}
                className="h-10 w-10 flex items-center justify-center rounded-xl
                  border border-slate-200 dark:border-slate-700
                  bg-white dark:bg-[#141D26]
                  hover:bg-slate-50 dark:hover:bg-slate-800
                  transition-all"
                title="Refresh live metrics"
              >
                <RefreshCw
                  size={15}
                  className={
                    loadingOverview
                      ? "animate-spin text-teal"
                      : "text-ink/60 dark:text-slate-400"
                  }
                />
              </button>
            </div>
          </div>

          {/* Backend warning */}
          {apiError && (
            <div className="mt-3 flex items-center gap-2 rounded-xl
              border border-red-200 dark:border-red-900/60
              bg-red-50 dark:bg-red-950/30
              px-3 py-2.5 text-xs
              text-red-800 dark:text-red-300">
              <AlertCircle size={15} className="shrink-0" />
              <span>
                Backend Status Warning: {apiError}
              </span>
            </div>
          )}
        </header>

        {/* SECTION 1: EXECUTIVE OVERVIEW */}
        {activeSection === "overview" && (
          <div className="space-y-6">
            {overview ? (
              <>
                <section>
                  <KpiStrip overview={overview} />
                </section>

                <section>
                  <OverviewCharts
                    regionData={overview.by_region}
                    sectorData={overview.top_10_sectors}
                    quarterlyTrend={overview.quarterly_trend}
                  />
                </section>
              </>
            ) : (
              <div className="py-12 text-center text-xs text-ink/50">
                Loading executive overview intelligence...
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: RISK SCORING & PROJECT LIST */}
        {activeSection === "register" && (
          <div className="space-y-5">
            {/* Policymaker Notice if viewing register */}
            {userProfile.role === "policymaker" && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded text-xs text-blue-900 dark:text-blue-200">
                <strong>Policy Access Mode:</strong> Viewing summary risk scores. Narrative drill-down is restricted to preserve aggregate focus.
              </div>
            )}

            <div>
              <h2 className="font-serif text-xl font-bold text-ink dark:text-white">
                Live Unlabeled Project Delay Risk Register
              </h2>
              <p className="text-xs text-ink/60 dark:text-[#8A9086] mt-0.5">
                Surfacing predicted delay probabilities (0–100%) and computed risk categories for currently active infrastructure projects
              </p>
            </div>

            <FilterBar
              regions={regionsList}
              sectors={sectorsList}
              region={region}
              sector={sector}
              risk={risk}
              dataCompleteness={dataCompleteness}
              search={search}
              onRegionChange={(v) => { setRegion(v); setPage(1); }}
              onSectorChange={(v) => { setSector(v); setPage(1); }}
              onRiskChange={(v) => { setRisk(v); setPage(1); }}
              onDataCompletenessChange={(v) => {
                setDataCompleteness(v);
                setPage(1);
              }}
              onSearchChange={(v) => { setSearch(v); setPage(1); }}
              onReset={handleResetFilters}
            />

            <ProjectsTable
              projects={projects}
              totalCount={totalCount}
              page={page}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={setPage}
              onSortChange={handleSortChange}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSelectProject={(pid) => setSelectedProjectId(pid)}
              userRole={userProfile.role}
            />
          </div>
        )}

        {/* SECTION 3: REGIONAL & COMPARATIVE ANALYTICS */}
        {activeSection === "regional" && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl font-bold text-ink dark:text-white">
                Regional &amp; Comparative Infrastructure Analytics
              </h2>
              <p className="text-xs text-ink/60 dark:text-[#8A9086] mt-0.5">
                GIS regional monitoring clusters, Sector × Region comparative heatmap matrix, and progress trajectories
              </p>
            </div>

            {regional ? (
              <>
              <MapView
                bubbles={regional.map_bubbles}
                onSelectRegion={(reg) => {
                  setRegion(reg);
                  setSector("All");
                  setRisk("All");
                  setDataCompleteness("All");
                  setSearch("");
                  setPage(1);
                  setActiveSection("register");
                }}
                onNavigateToRegister={(reg) => {
                  setRegion(reg);
                  setPage(1);
                  setSector("All");
                  setRisk("All");
                  setDataCompleteness("All");
                  setSearch("");
                  setActiveSection("register");
                }}
              />

                <ComparativeMatrix
                  regions={regional.regions_list}
                  matrix={regional.heatmap_matrix}
                  timeline={regional.timeline}
                />
              </>
            ) : (
              <div className="py-12 text-center text-xs text-ink/50">
                Loading regional GIS &amp; comparative data...
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: PREDICT NEW PROJECT */}
        {activeSection === "predict-new" && (
          <div className="space-y-5">
            <PredictNewProjectForm />
          </div>
        )}

        {/* SECTION 4B: QSPR / PAIMANA PREDICTION (independent subsystem) */}
        {activeSection === "qspr" && (
          <div className="space-y-5">
            <QsprSection />
          </div>
        )}
        
        {/* SECTION 5: ALERTS FEED */}
        {activeSection === "alerts" && (
          <div className="space-y-5">
            <AlertsPanel
              onSelectProject={(pid) => setSelectedProjectId(pid)}
              userRole={userProfile.role}
            />
          </div>
        )}

        {/* SECTION 5: ADMIN MODEL GOVERNANCE */}
        {activeSection === "model" && userProfile.role === "admin" && (
          <div className="space-y-5">
            <AdminModelView />
          </div>
        )}

        {/* Slide-over Project Detail & Explainable AI Panel */}
        <ProjectDetailPanel
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
        />
      </main>
    </div>
  );
}
