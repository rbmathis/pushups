# Synology NAS Deployment Guide

## Prerequisites

1. **Synology DSM 7.2+** with **Container Manager** installed from Package Center
2. SSH access enabled on your NAS
3. A `docker` shared folder created

## Deployment Steps

### 1. Copy Project to NAS

Copy the **entire** `pushups` folder contents to your Synology NAS. The final structure must be:

```
/volume1/docker/pushup-tracker/
├── docker-compose.yml          ← Must be here
├── backend/                    ← Must be sibling of docker-compose.yml
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── frontend/                   ← Must be sibling of docker-compose.yml
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── src/
└── data/                       ← Created for SQLite database
```

**IMPORTANT**: The `docker-compose.yml`, `backend/`, and `frontend/` folders must all be in the same directory!

You can use:

- **File Station** (drag and drop the entire pushups folder contents)
- **SMB/CIFS** file share
- **SCP** command: `scp -r ./pushups/* user@your-nas-ip:/volume1/docker/pushup-tracker/`

### 2. Create Data Directory

SSH into your NAS and create the data directory:

```bash
ssh user@your-nas-ip
sudo mkdir -p /volume1/docker/pushup-tracker/data
sudo chown 1000:1000 /volume1/docker/pushup-tracker/data
```

### 3. Deploy via Container Manager

#### Option A: Using Container Manager UI (Recommended)

1. Open **Container Manager** on your Synology NAS
2. Go to **Project** tab
3. Click **Create**
4. Set:
   - **Project name**: `pushup-tracker`
   - **Path**: `/volume1/docker/pushup-tracker`
   - **Source**: Select "Use existing docker-compose.yml"
5. Click **Next** and review the configuration
6. Click **Done** to start the containers

#### Option B: Using SSH

```bash
cd /volume1/docker/pushup-tracker
sudo docker-compose up -d --build
```

### 4. Access Your App

- **Frontend**: `http://your-nas-ip:8080`
- **Backend API**: `http://your-nas-ip:3001/api/statistics`

## Port Configuration

| Service           | Container Port | Host Port |
| ----------------- | -------------- | --------- |
| Frontend (nginx)  | 80             | 8080      |
| Backend (Node.js) | 3001           | 3001      |

You can change the host ports in `docker-compose.yml` if needed.

## Persistent Data

Your pushup data is stored in:

```
/volume1/docker/pushup-tracker/data/pushups.db
```

This folder is mapped as a volume, so your data persists across container restarts.

## Updating the App

1. Copy updated files to the NAS
2. In Container Manager, select the project
3. Click **Action** → **Stop**
4. Click **Action** → **Build** to rebuild with new code
5. Click **Action** → **Start**

Or via SSH:

```bash
cd /volume1/docker/pushup-tracker
sudo docker-compose down
sudo docker-compose up -d --build
```

## Troubleshooting

### View Container Logs

```bash
sudo docker logs pushup-tracker-backend
sudo docker logs pushup-tracker-frontend
```

### Check Container Status

```bash
sudo docker ps
```

### Restart Containers

```bash
sudo docker-compose restart
```

### Reset Database

```bash
sudo rm /volume1/docker/pushup-tracker/data/pushups.db
sudo docker-compose restart backend
```

## Firewall Rules

If you have Synology Firewall enabled, allow these ports:

- **8080** (Frontend)
- **3001** (Backend API - only needed for direct API access)

## Reverse Proxy (Optional)

For HTTPS access with a custom domain, use Synology's **Reverse Proxy**:

1. Go to **Control Panel** → **Login Portal** → **Advanced** → **Reverse Proxy**
2. Create a new rule:
   - **Source**: Your domain, HTTPS, port 443
   - **Destination**: `localhost`, port 8080

## Backup

Add the data folder to your backup solution:

```
/volume1/docker/pushup-tracker/data/
```
