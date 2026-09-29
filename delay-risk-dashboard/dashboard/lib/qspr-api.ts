// QSPR/PAIMANA Prediction — independent API client.
// Talks only to /api/qspr/*; never touches /api/projects, /api/overview,
// /api/regional, or /api/alerts.

import {
  QsprValidationResult,
  QsprPredictResponse,
  QsprProjectDetailResponse,
  QsprAnalyticsSummary,
  QsprSectorAnalyticsRow,
} from "./qspr-types";

const QSPR_API_BASE = process.env.NEXT_PUBLIC_QSPR_API_URL || "http://127.0.0.1:8001";

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("sih_auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseErrorDetail(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
    if (body?.detail) return JSON.stringify(body.detail);
  } catch {
    /* response wasn't JSON - fall through */
  }
  return fallback;
}

export async function qsprValidatePdf(file: File): Promise<QsprValidationResult> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${QSPR_API_BASE}/api/qspr/validate`, {
    method: "POST",
    headers: { ...getAuthHeader() },
    body: formData,
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, `Validation failed: ${res.statusText}`));
  }
  return res.json();
}

export async function qsprPredictPdf(
  file: File,
  reportLabelOverride?: string
): Promise<QsprPredictResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const url = new URL(`${QSPR_API_BASE}/api/qspr/predict-pdf`);
  if (reportLabelOverride) {
    url.searchParams.set("report_label_override", reportLabelOverride);
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { ...getAuthHeader() },
    body: formData,
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, `Prediction failed: ${res.statusText}`));
  }
  return res.json();
}

export async function qsprFetchProject(projectId: string): Promise<QsprProjectDetailResponse> {
  const res = await fetch(`${QSPR_API_BASE}/api/qspr/project/${encodeURIComponent(projectId)}`, {
    headers: { ...getAuthHeader() },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res, `Project lookup failed: ${res.statusText}`));
  }
  return res.json();
}

export async function qsprFetchAnalyticsSummary(): Promise<QsprAnalyticsSummary> {
  const res = await fetch(`${QSPR_API_BASE}/api/qspr/analytics/summary`, {
    headers: { ...getAuthHeader() },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`QSPR analytics summary fetch failed: ${res.statusText}`);
  return res.json();
}

export async function qsprFetchSectorAnalytics(
  topN: number = 10
): Promise<{ report_label: string | null; sectors: QsprSectorAnalyticsRow[] }> {
  const res = await fetch(`${QSPR_API_BASE}/api/qspr/analytics/sector?top_n=${topN}`, {
    headers: { ...getAuthHeader() },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`QSPR sector analytics fetch failed: ${res.statusText}`);
  return res.json();
}

export async function qsprFetchGeographyAnalytics(
  topN: number = 12
): Promise<{ report_label: string | null; states: QsprSectorAnalyticsRow[] }> {
  const res = await fetch(`${QSPR_API_BASE}/api/qspr/analytics/geography?top_n=${topN}`, {
    headers: { ...getAuthHeader() },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`QSPR geography analytics fetch failed: ${res.statusText}`);
  return res.json();
}
