"use client";

import React, { useState, useEffect } from "react";
import { UserRole, UserProfile } from "@/lib/types";
import { loginApi } from "@/lib/api";
import { Shield, UserCheck, KeyRound, LogOut } from "lucide-react";

interface RoleSelectorProps {
  currentRole: UserRole;
  onUserChange: (user: UserProfile) => void;
}

const DEMO_CREDENTIALS: Record<UserRole, { username: string; pass: string; title: string }> = {
  admin: { username: "admin", pass: "adminpassword", title: "System Administrator" },
  policymaker: { username: "policymaker", pass: "policypassword", title: "MoRD Policymaker" },
  project_manager: { username: "project_manager", pass: "pmpassword", title: "Project Manager (North Zone)" },
};

export function RoleSelector({ currentRole, onUserChange }: RoleSelectorProps) {
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = async (role: UserRole) => {
    const creds = DEMO_CREDENTIALS[role];
    setLoading(true);
    try {
      const res = await loginApi(creds.username, creds.pass);
      localStorage.setItem("sih_auth_token", res.access_token);
      localStorage.setItem("sih_user_role", res.user.role);
      onUserChange(res.user);
    } catch (err) {
      console.error("Login failed, falling back to client profile:", err);
      onUserChange({
        username: creds.username,
        name: creds.title,
        role: role,
        region: role === "project_manager" ? "North" : "All",
        department: "Ministry of Rural Development",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-paper dark:bg-slate-800 p-1.5 rounded-lg border border-line dark:border-[#2A3742] text-xs">
      <div className="flex items-center gap-1.5 px-2 text-ink/60 dark:text-[#8A9086]">
        <Shield size={14} className="text-teal" />
        <span className="font-semibold uppercase tracking-wider text-[10px]">Active Role:</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => handleRoleSelect("admin")}
          disabled={loading}
          className={`px-2.5 py-1 rounded transition-colors text-xs ${
            currentRole === "admin"
              ? "bg-teal text-white font-medium shadow-sm"
              : "text-ink/70 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
          title="Full access + Model Metadata & Confusion Matrix"
        >
          Administrator
        </button>

        <button
          onClick={() => handleRoleSelect("policymaker")}
          disabled={loading}
          className={`px-2.5 py-1 rounded transition-colors text-xs ${
            currentRole === "policymaker"
              ? "bg-teal text-white font-medium shadow-sm"
              : "text-ink/70 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
          title="Aggregate overview & Regional Analytics (Raw narrative restricted)"
        >
          Policymaker
        </button>

        <button
          onClick={() => handleRoleSelect("project_manager")}
          disabled={loading}
          className={`px-2.5 py-1 rounded transition-colors text-xs ${
            currentRole === "project_manager"
              ? "bg-teal text-white font-medium shadow-sm"
              : "text-ink/70 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
          title="Risk Register & Project Detail (Scoped to North zone)"
        >
          Project Manager
        </button>
      </div>
    </div>
  );
}