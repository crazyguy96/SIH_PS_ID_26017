export type Role = "Administrator" | "Project Manager" | "Viewer";

export type Permission =
  | "view_projects"
  | "view_alerts"
  | "view_audit"
  | "manage_alerts";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  Administrator: [
    "view_projects",
    "view_alerts",
    "view_audit",
    "manage_alerts",
  ],

  "Project Manager": [
    "view_projects",
    "view_alerts",
  ],

  Viewer: [
    "view_projects",
  ],
};

export function canAccess(
  role: string | null,
  permission: Permission
): boolean {
  if (!role || !(role in ROLE_PERMISSIONS)) {
    return false;
  }

  return ROLE_PERMISSIONS[role as Role].includes(permission);
}