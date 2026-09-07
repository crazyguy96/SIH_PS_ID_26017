import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(
  process.cwd(),
  "..",
  "..",
  "model_output",
  "scoring.db"
);

const VALID_ROLES = [
  "Administrator",
  "Project Manager",
  "Viewer",
] as const;

type UserRole = (typeof VALID_ROLES)[number];

function openDatabase() {
  return new Database(dbPath);
}

// GET — retrieve audit logs
export async function GET(req: NextRequest) {
  try {
    const roleHeader = req.headers.get("x-user-role");

    if (!roleHeader) {
      return NextResponse.json(
        { error: "User role is required" },
        { status: 403 }
      );
    }

    if (!VALID_ROLES.includes(roleHeader as UserRole)) {
      return NextResponse.json(
        { error: "Invalid user role" },
        { status: 403 }
      );
    }

    const db = openDatabase();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        role TEXT NOT NULL,
        action TEXT NOT NULL,
        project_id TEXT,
        details TEXT
      )
    `).run();

    const logs = db
      .prepare(`
        SELECT
          id,
          timestamp,
          role,
          action,
          project_id,
          details
        FROM audit_logs
        ORDER BY id DESC
        LIMIT 100
      `)
      .all();

    db.close();

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Audit log fetch error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch audit logs",
      },
      { status: 500 }
    );
  }
}

// POST — record an audit action
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      action,
      project_id = null,
      details = null,
    } = body;

    const roleHeader = req.headers.get("x-user-role");

    if (!roleHeader) {
      return NextResponse.json(
        {
          success: false,
          error: "User role is required",
        },
        { status: 403 }
      );
    }

    if (!VALID_ROLES.includes(roleHeader as UserRole)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user role",
        },
        { status: 403 }
      );
    }

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: "Audit action is required",
        },
        { status: 400 }
      );
    }

    const db = openDatabase();

    db.prepare(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        role TEXT NOT NULL,
        action TEXT NOT NULL,
        project_id TEXT,
        details TEXT
      )
    `).run();

    db.prepare(`
      INSERT INTO audit_logs
      (timestamp, role, action, project_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      new Date().toISOString(),
      roleHeader,
      action,
      project_id,
      typeof details === "string"
        ? details
        : details
          ? JSON.stringify(details)
          : null
    );

    db.close();

    return NextResponse.json({
      success: true,
      message: "Audit action recorded",
    });
  } catch (error) {
    console.error("Audit logging error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to record audit action",
      },
      { status: 500 }
    );
  }
}