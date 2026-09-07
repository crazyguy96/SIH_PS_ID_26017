import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import { canAccess } from "@/lib/rbac";

export async function GET(request: Request) {
  const role = request.headers.get("x-user-role");

  if (!canAccess(role, "view_alerts")) {
    return Response.json(
      { error: "Forbidden: insufficient permissions" },
      { status: 403 }
    );
  }  


  try {
    const dbPath = path.resolve(
      process.cwd(),
      "../../model_output/scoring.db"
    );

    console.log("Opening database:", dbPath);

    const db = new Database(dbPath, {
      readonly: true,
    });

    const alerts = db
      .prepare(`
        SELECT
          project_id,
          quarter,
          alert_type,
          severity,
          message,
          recommended_actions
        FROM alerts
        ORDER BY rowid DESC
        LIMIT 100
      `)
      .all();

    console.log("Alerts loaded:", alerts.length);
    console.log("First alert:", alerts[0]);

    db.close();

    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Failed to load alerts:", error);

    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}