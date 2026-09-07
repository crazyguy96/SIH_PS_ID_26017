"use client";

import { useEffect, useState } from "react";
import { AuditEntry } from "@/lib/audit";

export function AuditLog() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);

useEffect(() => {
  fetch("/api/audit", {
    headers: {
      "x-user-role": "Administrator",
    },
  })
    .then((res) => {
      if (!res.ok) {
        throw new Error("Failed to fetch audit logs");
      }
      return res.json();
    })
    .then((data) => setLogs(data))
    .catch((err) => {
      console.error("Audit log error:", err);
      setLogs([]);
    });
}, []);

  return (
    <section className="mt-8">
      <h2 className="font-serif text-lg font-semibold mb-1">
        Audit Log
      </h2>

      <p className="text-xs text-ink/50 dark:text-[#8A9086] mb-3">
        Recent user activity and project actions
      </p>

      <div className="hairline rounded bg-surface dark:bg-[#141D26] overflow-hidden">
        {logs.length === 0 ? (
          <div className="px-4 py-6 text-sm text-ink/50 dark:text-[#8A9086]">
            No audit activity recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="hairline-b text-left">
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-4 py-2.5">User</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Project</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log, index) => (
                  <tr key={index} className="hairline-b">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      {log.user}
                    </td>
                    <td className="px-4 py-2.5">
                      {log.role}
                    </td>
                    <td className="px-4 py-2.5">
                      {log.action}
                    </td>
                    <td className="px-4 py-2.5">
                      {log.project_id || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}