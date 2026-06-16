# Synology NAS Deployment Guide (UI-Only)

## Scope

This guide is strictly for **Container Manager UI** workflows.
No terminal/SSH steps are part of this process.

## Required project location

- Project root: `/volume1/docker/pushup-tracker`
- Data folder: `/volume1/docker/pushup-tracker/data`

## Safety rules

1. Never mirror-copy with delete options into the live project folder.
2. Never remove or overwrite `/volume1/docker/pushup-tracker/data`.
3. Copy only changed files from local machine to `Z:\pushup-tracker`.

## Expected project structure

```text
/volume1/docker/pushup-tracker/
├── compose YAML file
├── backend/
├── frontend/
└── data/
```

## First-time setup in Container Manager

1. Open **Container Manager**.
2. Open **Project**.
3. Click **Create**.
4. Set:
   - Project name: `pushup-tracker`
   - Path: `/volume1/docker/pushup-tracker`
   - Source: existing compose YAML file in that folder
5. Complete the wizard and start the project.

## Normal update workflow

### 1. Copy changed files only

Copy only files you changed into `Z:\pushup-tracker`.

Example frontend-only update:

- `frontend/src/components/PushupForm.vue`
- `frontend/src/pages/Admin.vue`
- `frontend/src/components/TrendsChart.vue`
- `frontend/src/utils/sessionSettings.js`

### 2. Rebuild using UI

1. Open **Container Manager** → **Project**.
2. Select `pushup-tracker`.
3. For frontend-only updates, rebuild/redeploy **frontend** only.
4. For backend updates, rebuild/redeploy **backend** (and frontend only if needed).

## If UI changes do not appear

Use this sequence:

1. Open **Container Manager** → **Image**.
2. Delete only the `pushup-tracker-frontend` image.
3. Go to **Project** → `pushup-tracker` → **Action** → **Build**.
4. Then **Action** → **Start**.
5. Hard refresh browser (`Ctrl+F5`) or test in an incognito window.

## App endpoints

- Frontend: `http://<nas-ip>:8080`
- API check: `http://<nas-ip>:3001/api/statistics`

## Data persistence

Database files are expected in:

`/volume1/docker/pushup-tracker/data/`

Typical files:

- `pushups.db`
- `pushups.db-wal`
- `pushups.db-shm`

## UI troubleshooting

1. If frontend shows `host not found in upstream "backend"`:
   - Ensure backend service is running in the same project.
   - Rebuild/restart backend, then frontend from Project UI.
2. For logs:
   - **Container Manager** → **Container** → select container → **Log**.

## Backup

Back up this path:

`/volume1/docker/pushup-tracker/data/`
