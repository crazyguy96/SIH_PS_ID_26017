export type AuditEntry = {
  timestamp: string;
  user: string;
  role: string;
  action: string;
  project_id?: string;
  details?: string;
};

export async function recordAudit(
  role: string,
  action: string,
  project_id?: string,
  details?: string
) {
  try {
    const response = await fetch("/api/audit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-role": role,
      },
      body: JSON.stringify({
        action,
        project_id: project_id ?? null,
        details: details ?? null,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Audit request failed");
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to record audit action:", error);
    return null;
  }
}