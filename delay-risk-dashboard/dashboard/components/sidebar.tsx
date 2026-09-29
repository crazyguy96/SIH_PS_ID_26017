"use client";

import React from "react";
import { UserRole } from "@/lib/types";
import { LayoutDashboard, TableProperties, Map, Bell, Cpu, FileText, FlaskConical } from "lucide-react";

export type NavSection = "overview" | "register" | "regional" | "alerts" | "model" | "predict-new" | "qspr";

interface SidebarProps {
  activeSection: NavSection;
  onSectionChange: (section: NavSection) => void;
  userRole: UserRole;
  alertCount?: number;
}

export function Sidebar({
  activeSection,
  onSectionChange,
  userRole,
  alertCount = 0,
}: SidebarProps) {
  const navItems: { id: NavSection; label: string; icon: any; roles: UserRole[]; badge?: number }[] = [
    {
      id: "overview",
      label: "Executive Overview",
      icon: LayoutDashboard,
      roles: ["admin", "policymaker"],
    },
    {
      id: "register",
      label: "Risk Register",
      icon: TableProperties,
      roles: ["admin", "project_manager"],
    },
    {
    id: "predict-new",
    label: "Predict New Project",
    icon: FileText,
    roles: ["admin", "project_manager"],
    },
    {
      id: "qspr",
      label: "QSPR / PAIMANA Prediction",
      icon: FlaskConical,
      roles: ["admin", "project_manager"],
    },
    {
      id: "regional",
      label: "Regional Analytics",
      icon: Map,
      roles: ["admin", "policymaker"],
    },
    {
      id: "alerts",
      label: "Alerts Feed",
      icon: Bell,
      roles: ["admin", "policymaker", "project_manager"],
      badge: alertCount,
    },
    {
      id: "model",
      label: "Model Governance",
      icon: Cpu,
      roles: ["admin"],
    },
  ];

    return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-slate-200 dark:border-[#26323C] sticky top-0 h-screen bg-white dark:bg-[#111923]">

      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-slate-200 dark:border-[#26323C]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal/10 flex items-center justify-center">
            <LayoutDashboard size={18} className="text-teal" />
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] font-semibold text-teal">
              Risk Intelligence
            </div>

            <h2 className="text-sm font-semibold text-ink dark:text-white leading-tight mt-0.5">
              Land Acquisition
            </h2>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto">

        <div className="px-2 mb-2 text-[10px] uppercase tracking-[0.16em] font-semibold text-ink/40 dark:text-gray-500">
          Monitor
        </div>

        {navItems
          .filter((item) =>
            ["overview", "register", "regional", "alerts"].includes(item.id)
          )
          .map((item) => {
            const isAllowed = item.roles.includes(userRole);
            const isActive = activeSection === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isAllowed) onSectionChange(item.id);
                }}
                disabled={!isAllowed}
                className={`w-full flex items-center justify-between mb-1 text-left text-sm px-3 py-2.5 rounded-lg font-medium transition-all ${
                  isActive
                    ? "bg-teal text-white shadow-sm"
                    : isAllowed
                    ? "text-ink/70 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    : "text-ink/30 dark:text-gray-600 cursor-not-allowed opacity-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={17} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`min-w-6 h-5 px-1.5 flex items-center justify-center rounded-full text-[10px] font-bold ${
                      isActive
                        ? "bg-white text-teal"
                        : "bg-red-500 text-white"
                    }`}
                  >
                    {item.badge > 999 ? "999+" : item.badge}
                  </span>
                )}
              </button>
            );
          })}

        <div className="px-2 mt-6 mb-2 text-[10px] uppercase tracking-[0.16em] font-semibold text-ink/40 dark:text-gray-500">
          Analysis
        </div>

        {navItems
          .filter((item) =>
            ["predict-new", "qspr"].includes(item.id)
          )
          .map((item) => {
            const isAllowed = item.roles.includes(userRole);
            const isActive = activeSection === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isAllowed) onSectionChange(item.id);
                }}
                disabled={!isAllowed}
                className={`w-full flex items-center mb-1 text-left text-sm px-3 py-2.5 rounded-lg font-medium transition-all ${
                  isActive
                    ? "bg-teal text-white shadow-sm"
                    : isAllowed
                    ? "text-ink/70 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    : "text-ink/30 dark:text-gray-600 cursor-not-allowed opacity-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={17} />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}

        <div className="px-2 mt-6 mb-2 text-[10px] uppercase tracking-[0.16em] font-semibold text-ink/40 dark:text-gray-500">
          System
        </div>

        {navItems
          .filter((item) => item.id === "model")
          .map((item) => {
            const isAllowed = item.roles.includes(userRole);
            const isActive = activeSection === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (isAllowed) onSectionChange(item.id);
                }}
                disabled={!isAllowed}
                className={`w-full flex items-center mb-1 text-left text-sm px-3 py-2.5 rounded-lg font-medium transition-all ${
                  isActive
                    ? "bg-teal text-white shadow-sm"
                    : isAllowed
                    ? "text-ink/70 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    : "text-ink/30 dark:text-gray-600 cursor-not-allowed opacity-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={17} />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
      </nav>

      {/* Bottom status */}
      <div className="px-4 py-4 border-t border-slate-200 dark:border-[#26323C]">
        <div className="flex items-center gap-2 text-[11px] text-ink/50 dark:text-gray-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Monitoring system active
        </div>
      </div>

    </aside>
  );
}
