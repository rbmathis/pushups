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

Use the `deploy-to-synology.ps1` script from the repo:
```powershell
cd C:\Users\rdpuser\Source\pushups
.\deploy-to-synology.ps1
```

Or manually copy changed files. Example frontend-only update:

- `frontend/src/components/PushupForm.vue`
- `frontend/src/pages/Admin.vue`
- `frontend/src/components/TrendsChart.vue`
- `frontend/src/utils/sessionSettings.js`

### 2. Delete images (required to pick up new code)

**⚠️ Important:** Stop/rebuild alone does NOT pick up new code changes.
You must delete the old images first.

1. Open **Container Manager** → **Image**
2. **Delete** `pushup-tracker-frontend` image (and `pushup-tracker-backend` if backend changed)
3. Then proceed to rebuild

### 3. Rebuild and start

1. Open **Container Manager** → **Project**
2. Select `pushup-tracker`
3. Click **Action** → **Build** (rebuilds from your updated files)
4. Click **Action** → **Start**
5. Wait for containers to start (watch the logs if needed)

## If UI changes do not appear

**⚠️ Do NOT use stop/rebuild alone - it does not pick up code changes.**

Use this proven sequence:

1. Open **Container Manager** → **Image**
2. **Delete** the old images:
   - `pushup-tracker-frontend`
   - `pushup-tracker-backend` (if you changed backend code)
3. Go to **Container Manager** → **Project** → `pushup-tracker`
4. Click **Action** → **Build** (rebuilds fresh images with new code)
5. Click **Action** → **Start**
6. Wait for containers to start
7. Hard refresh browser (`Ctrl+F5`) or test in incognito window

This forces a clean rebuild and ensures new code is picked up.

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
