# Project Delay Risk Register — SIH PS 26017

A Next.js dashboard for the delay-risk predictions produced by the ML
pipeline (`train_model.py` / `explain_and_score.py`). Built and
production-build-tested locally — no v0 involved, plain hand-written code.

Data used: `/data/summary.json` and `/data/projects.json` — your real model
output (top 500 highest-risk projects, plus region/sector/feature-importance
summaries). To refresh with a new model run, just overwrite those two files
with the same shape (see `lib/types.ts`) and redeploy.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy on Vercel

1. Push this folder to a new GitHub repo.
2. Go to https://vercel.com/new, import the repo.
3. Framework preset auto-detects as Next.js — no config needed. Click Deploy.

## Deploy on Netlify

1. Push this folder to a new GitHub repo.
2. Go to https://app.netlify.com, "Add new site" → "Import an existing project".
3. Build command: `npm run build`. Publish directory: `.next`.
4. Netlify auto-detects Next.js and installs the required adapter — click Deploy.

## What's in here

- `app/page.tsx` — the dashboard: KPI strip, region/sector risk charts,
  global feature-importance chart, filterable/sortable project register
  table, and a project detail slide-over panel with SHAP drivers +
  recommended actions.
- `components/` — each piece above as its own component.
- `data/` — your real prediction data, static JSON (no backend needed).
- `lib/types.ts`, `lib/format.ts` — shared types and formatting helpers.

## Design notes

Palette and type deliberately avoid the generic AI-dashboard look (no
cream-background/terracotta-accent, no shadow-heavy card grid). Instead:
a paper/ledger register aesthetic — hairline rules instead of drop
shadows, a serif (Source Serif 4) for headings paired with a data-dense
sans (IBM Plex Sans), a steel-teal accent, and red/amber/green reserved
strictly for risk signaling. Responsive down to mobile; sidebar collapses
on small screens; keyboard focus is visible; reduced-motion is respected.

## Known gaps vs. the PDF (by design — frontend-only scope)

- **GIS map view** and **Alerts & notifications** are placeholder nav items
  with a "not built yet" note — they need project lat/long and a connected
  SMS/email service respectively, which are backend/data concerns, not
  frontend ones.
- **Role-based access / audit trails** need real auth (e.g. NextAuth,
  Clerk) and a backend — out of scope for a static dashboard.
- Currently reads a **static JSON snapshot**. To make it reflect new model
  runs automatically without redeploying, replace the JSON imports in
  `app/page.tsx` with a fetch to an API route backed by a database.
