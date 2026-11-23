# Synology NAS Deployment Guide (UI-Only)

## Scope

This guide is strictly for **Container Manager UI** workflows.
No terminal/SSH steps are part of this process.

## Required project location

- Project root: `/volume1/docker/pushup-tracker`
- Data folder: `/volume1/docker/pushup-tracker/data`
- Backup folder: `/volume1/docker/pushup-tracker/backups`

## Safety rules

1. Never mirror-copy with delete options into the live project folder.
2. Never remove or overwrite `/volume1/docker/pushup-tracker/data`.
3. Never remove or overwrite `/volume1/docker/pushup-tracker/backups`.
4. Copy only changed files from local machine to `Z:\pushup-tracker`.

## Expected project structure

```text
/volume1/docker/pushup-tracker/
├── compose YAML file
├── backend/
├── frontend/
├── data/       # persistent SQLite database
└── backups/    # rolling online database backups
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

### 2. Safe update workflow

1. Check the backend log for a recent `Database backup created at ...` message.
2. Stop the project and wait for both containers to stop.
3. Run `deploy-to-synology.ps1`; it refuses to deploy if `data/` is missing.
4. Build and start the project. Do not delete the `data/` or `backups/` folders.
5. Confirm `http://<nas-ip>:3001/api/health` returns `{"status":"ok"}`.
6. Confirm the dashboard still shows the expected history before considering the deployment complete.

The backend creates an SQLite online-backup snapshot at startup and every 24 hours.
It retains the newest 14 snapshots in `backups/`. This is safer than copying a
live WAL-mode database file because SQLite completes the snapshot consistently.

### 3. Full clean rebuild (only when needed)

**⚠️ Important:** This is the ONLY method that reliably picks up new code.

1. Open **Container Manager** → **Project**
2. Select `pushup-tracker`
3. Click **Action** → **Stop** (wait for it to stop)
4. Open **Container Manager** → **Container**
5. **Delete each container** in the pushup-tracker project
   - `pushup-tracker-backend`
   - `pushup-tracker-frontend`
   - `pushup-tracker-db` (if present)
6. Open **Container Manager** → **Image**
7. **Delete each image**:
   - `pushup-tracker-frontend`
   - `pushup-tracker-backend`
8. Go back to **Container Manager** → **Project** → `pushup-tracker`
9. Click **Action** → **Build** (rebuilds fresh images with new code)
10. Click **Action** → **Start**
11. Wait for containers to start (check logs to confirm)
12. Hard refresh browser (`Ctrl+F5`) or test in incognito window

## If UI changes do not appear

**Use the full clean rebuild sequence (this ALWAYS works):**

1. **Container Manager** → **Project** → `pushup-tracker` → **Action** → **Stop**
2. **Container Manager** → **Container** → Delete all pushup-tracker containers:
   - `pushup-tracker-backend`
   - `pushup-tracker-frontend`
   - `pushup-tracker-db` (if present)
3. **Container Manager** → **Image** → Delete all pushup-tracker images:
   - `pushup-tracker-frontend`
   - `pushup-tracker-backend`
4. **Container Manager** → **Project** → `pushup-tracker` → **Action** → **Build**
5. **Container Manager** → **Project** → `pushup-tracker` → **Action** → **Start**
6. Wait for all containers to start (view logs to confirm)
7. Hard refresh browser (`Ctrl+F5`) or test in incognito window

This completely removes cached layers and forces a clean rebuild with your new code.

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

Backups are stored separately in:

`/volume1/docker/pushup-tracker/backups/`

To recover, stop the project, preserve the current `data/pushups.db`, copy the
desired `backups/pushups-*.db` snapshot to `data/pushups.db`, remove any stale
`pushups.db-wal` and `pushups.db-shm` files, then start the project and verify
the history.

## UI troubleshooting

1. If frontend shows `host not found in upstream "backend"`:
   - Ensure backend service is running in the same project.
   - Rebuild/restart backend, then frontend from Project UI.
2. For logs:
   - **Container Manager** → **Container** → select container → **Log**.

## Backup

Back up both paths:

- `/volume1/docker/pushup-tracker/data/`
- `/volume1/docker/pushup-tracker/backups/`
