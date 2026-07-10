# Learning Analytics Dashboard

Learning-analytics dashboard for onboarding & training (React + TS + Node).

A tool for team leads and mentors to track new-hire onboarding: weekly progress
dashboards, probation exit criteria, a knowledge-base catalog, and automatic
metrics collection from Grafana.

## Features

- **Trainee progress dashboards** — weekly/monthly statistics per trainee, per
  mentor, per lead, or company-wide, with color-coded thresholds against
  onboarding-week norms.
- **Grafana metrics collection** — the backend proxies SQL queries to Grafana
  datasources to pull ticket counts, response/transfer/delay rates, and
  work-time-weighted speed, plus quality scores from a review datasource.
- **Scheduled auto-collection** — a cron-based job collects each week's
  metrics twice (a preliminary pass Friday morning, a final pass Friday
  evening); manual edits are preserved across re-collection.
- **CSV export** — weekly, monthly, and aggregate statistics tables can all be
  exported to CSV.
- **Roles & login** — director / manager / trainee roles, each scoped to the
  data they're allowed to see; simple token-based session auth with
  bcrypt-hashed passwords.
- **Dark theme** — a CSS-variable-based theme toggle with no flash-of-unstyled-theme
  on load.

## Architecture

**Frontend** — Vite + React + TypeScript, no router library: a small
hash-based router in `src/App.tsx` maps `location.hash` to page components and
gates navigation by role. Pages live in `src/pages/*`, static reference/plan
content in `src/data/*`.

**Backend** — Express (`server/index.js`) exposes a JSON API, serves the built
frontend in production, and runs the cron scheduler. `server/auth.js` handles
login/session (in-memory tokens, bcrypt password verification).
`server/grafana.js` and `server/metrics.js` proxy requests to Grafana — either
by replaying a dashboard's own panel queries, or via direct SQL against a
Grafana MySQL datasource — so the Grafana API token never reaches the browser.
`server/store.js` persists trainees, users, weekly snapshots, and settings as
JSON files under `server/data/`.

**Data flow**: browser → Express API (Bearer token auth, role-scoped) →
either local JSON storage (`server/data/`) for trainees/weeks/settings, or a
proxied request to Grafana (`GRAFANA_URL` + `GRAFANA_TOKEN`) for metrics
collection. Collected weeks are cached as JSON snapshots so the dashboard
doesn't re-query Grafana on every page load.

## Getting started

```bash
# 1. Backend
cd server
npm install
cp .env.example .env        # fill in GRAFANA_URL / GRAFANA_TOKEN / datasource UIDs
npm run dev                 # http://localhost:8787

# 2. Frontend (in another terminal, from the repo root)
npm install
npm run dev                 # http://localhost:5173 (requests to /api are proxied to 8787)
```

**Demo login** (seeded automatically on first run if `server/data/users.json`
is empty): username `admin`, password `admin123`. Change it from the Users
page after logging in.

The repo ships with synthetic demo data under `server/data/` (fictional
trainees, mentors, and six weeks of metrics) so the dashboard is populated
right after `npm install`. Connecting to a real Grafana instance requires
network access to the host set in `GRAFANA_URL` (in the original deployment
this was VPN-gated).

### Production (single process)

```bash
npm install && npm run build      # build the frontend into dist/
cd server && npm install && npm start
# Serves both the app and the API from http://localhost:8787 (same-origin, no CORS).
```

## Screenshots

_placeholder — add screenshots of the dashboard, weekly statistics, and plan pages here._

---

**Sanitized portfolio version** — real trainee data replaced with synthetic
demo data; internal endpoints, hostnames, document links, and credentials
removed.
