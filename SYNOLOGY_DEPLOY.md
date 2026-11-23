# Synology NAS Deployment Guide

The project is at `/volume1/docker/pushup-tracker` on the NAS, mapped as
`Z:\pushup-tracker` on Windows. The database lives in its `data` directory;
backups live in `backups`. Never delete or overwrite either directory during
deployment. This workflow does not require SSH.

## Deploy an update

1. In Container Manager, confirm the **currently running** backend's data mount
   points to `/volume1/docker/pushup-tracker/data`. Note the current history and
   total in the app. If the mount points elsewhere, stop and locate the actual
   database before proceeding.
2. From the repository root, run:

   ```powershell
   .\deploy-to-synology.ps1
   ```

3. The script compares the tracked build inputs with the last
   **operator-confirmed** release. If they match and the staged files and
   compose file are unchanged, it exits without a backup or file copy. This
   record is not proof of what is currently running: the script cannot inspect
   containers or changes made in Container Manager.
4. Follow the checklist in the script. In Container Manager, stop the
   `pushup-tracker` project and ensure no other process is accessing its database.
   Choose `C` to confirm and continue, or `Q` to quit. Keep the project stopped
   until the backup and staging finish. The NAS compose file will be replaced
   by the repository version; preserve any NAS-specific settings separately.
5. The script copies the database and any WAL, SHM, and journal files to a new
   timestamped folder under `backups`. It compares the copies with the source
   and checks SQLite integrity on a **local temporary copy**. If backup or
   verification fails, it stops without copying application files.
6. After verification, the script stages only tracked build inputs under a new
   `deployment-releases` folder and checks their hashes. It generates a compose
   file pointing at those clean build contexts, saves the previous NAS compose
   file in the release folder, and then replaces the NAS compose file. It never
   removes old source files, images, databases, or backups.
7. In Container Manager, update the project with the new NAS compose file and
   review it. Confirm the backend data mount still points to
   `/volume1/docker/pushup-tracker/data`. Build with caching enabled, then
   recreate and start the project. Avoid the **Clean** action for routine
   updates; do not remove images, data, backups, or volumes.
8. Compare the image tags printed by the script with the running containers,
   and compare each running container's image ID with its newly built image ID
   in Container Manager. Check `http://<nas-ip>:3001/api/health`, the backend
   logs, and the dashboard history and total. Investigate discrepancies before
   logging more data. Choose `C` only after these checks, or `Q` to leave the
   release pending. The script cannot perform the build, inspect containers, or
   validate the running application.

The script stages the current contents of Git-tracked build files, including
uncommitted edits. Add new application files to Git before running it; untracked
build files cause it to stop. Each service's image tag contains a hash of its
source inputs, not an actual Docker image digest. A changed service gets a new
tag; the other service keeps its tag. Docker may still attempt both builds,
depending on Container Manager, but unchanged layers should be cached if the
builder's cache is available. The dependency layers precede application source
in both Dockerfiles. If they rebuild unexpectedly, inspect the build log for
cache misses, a different builder, cache removal, changed manifests, or a
changed base image; the cause of the last slow build is not yet known. Base
images should still be refreshed periodically for security updates.

An interrupted or unconfirmed deployment is retried rather than treated as
complete, including a new offline backup. Old release folders are retained
and will consume space over time; review them manually before any cleanup.
The older `backend/data` directory on the NAS is not the active mount in the
current configuration but contains a separate database: do not delete it
without investigating and preserving it.

The stop confirmation is manual: the script cannot independently prove that
all NAS database users are stopped. SQLite WAL databases must not be accessed
simultaneously from different machines over the network share.

## Restore

Stop the project and preserve the current `data` directory before restoring.
A `pre-deploy-*` backup folder contains the database and whichever sidecars
were present at backup time. Restore that set together into `data`, ensuring
that sidecars left over from the newer database are not mixed with the restored
set. Start the project and verify its history. Do not remove a WAL file from a
live database.

The backend also creates online snapshots in `backups` after startup and daily,
once the current backend has been deployed. These are not a substitute for the
pre-deployment backup: the startup snapshot happens after initialization and
migrations. Keep additional backups off the NAS and test restores periodically;
copies on the same NAS do not protect against its failure.
