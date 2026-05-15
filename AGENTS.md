# Pushup Tracker — Agent Instructions

Full-stack pushup logging app. Vue 3 frontend + Express/SQLite backend, deployed via Docker to a Synology NAS.

## Commands

```bash
# Install all deps (first time)
npm run install:all

# Run both backend + frontend (dev)
npm start                   # backend :3001, frontend :5173

# Run separately
npm run start:backend       # node src/server.js
npm run start:frontend      # vite dev server

# Tests
npm test                    # backend Jest tests with coverage
npm run test:e2e            # Playwright e2e (from frontend/)
cd backend && npm run test:watch    # watch mode

# Production build
cd frontend && npm run build

# Docker
docker-compose up --build
```

## Architecture

```
frontend/src/
  pages/Dashboard.vue          ← orchestrator; owns refs to child components
  components/
    PushupForm.vue             ← emits 'pushups-logged' → Dashboard triggers refresh
    StatsDashboard.vue         ← exposes refreshStats()
    StatCard.vue
    TrendsChart.vue            ← exposes refresh(); fills all 30 days incl. zeros
    TimeOfDayChart.vue         ← exposes refresh(); donut by time block

backend/src/
  server.js                    ← Express app, DB init, CORS config
  routes/pushups.js            ← route definitions
  controllers/pushupController.js  ← request validation + response shaping
  db/model.js                  ← all SQL queries
  db/init.js                   ← DB open, PRAGMAs, schema, migrations
  db/schema.sql
  db/migrations/001-create-pushups.js
```

All frontend API calls use relative `/api/*` paths — Vite proxies them to `:3001` in dev; Nginx proxies in production.

## Database

- **SQLite** at `backend/data/pushups.db` (dev) or `/volume1/docker/pushup-tracker/data/pushups.db` (Docker/NAS)
- Configurable via `DB_PATH` env var
- WAL mode, foreign keys on
- Two columns matter: `timestamp` (CST, no TZ suffix) and `created_at` (UTC)

## Critical: Timezone

- `timestamp` is stored as **Central Time** (`America/Chicago`) with no timezone indicator — e.g. `"2026-05-01T08:30:00"`
- `created_at` is UTC with Z suffix — audit trail only, never used for analytics
- All date grouping, streak logic, and daily rollover operate on `DATE(timestamp)` in SQLite
- Docker sets `TZ=America/Chicago`; backend uses `date-fns-tz` `formatInTimeZone` to format before insert

**Never store UTC in `timestamp` — it will break daily totals, streaks, and the time-of-day chart.**

## API Routes

| Method | Path                     | Purpose                                                |
| ------ | ------------------------ | ------------------------------------------------------ |
| POST   | `/api/pushups`           | Log a pushup set (`{count}`)                           |
| GET    | `/api/statistics`        | All stats (daily total, streak, averages)              |
| GET    | `/api/history?days=N`    | Daily totals array, all days filled                    |
| GET    | `/api/timeofday`         | Totals by time block (morning/afternoon/evening/night) |
| GET    | `/api/admin/entries`     | All raw entries                                        |
| PUT    | `/api/admin/entries/:id` | Edit an entry                                          |
| DELETE | `/api/admin/entries/:id` | Delete an entry                                        |
| POST   | `/api/admin/entries`     | Insert entry with custom timestamp                     |

## Adding a New Endpoint

1. Add SQL query function to `backend/src/db/model.js` and export it
2. Add controller function to `pushupController.js` and export it
3. Register route in `routes/pushups.js`
4. If it needs to refresh after logging, wire `ref` + call in `Dashboard.vue`

## Frontend Conventions

- Components that fetch data expose a `refresh()` method via `defineExpose`
- `Dashboard.vue` calls all child `refresh()` methods after a 500ms delay post-log
- Charts use **vue-chartjs** (`Line`, `Doughnut`) with **Chart.js 4**
- Styles: **Tailwind CSS** utility classes only; dark slate palette (`slate-800`, `slate-700`)
- No Vuex/Pinia — local `ref` state per component

## Testing

- Backend tests live in `backend/tests/` using Jest + Supertest; run against an in-memory SQLite DB
- See `backend/tests/setup.js` for test DB bootstrap
- E2E tests in `frontend/e2e/` using Playwright targeting `:5173`
- Coverage report output to `backend/coverage/`
