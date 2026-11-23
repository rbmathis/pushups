# Pushup Tracker App

A fitness tracking application for monitoring and logging pushup workouts.

## Project Structure

```
pushups/
├── backend/
│   ├── src/
│   │   ├── db/           # SQLite init, model, schema, migrations
│   │   ├── routes/
│   │   └── controllers/
│   └── data/             # pushups.db (dev)
├── frontend/
│   └── src/
│       ├── pages/        # Dashboard.vue, Session.vue
│       └── components/   # QuickAddForm, StatsDashboard, charts, etc.
├── .gitignore
├── AGENTS.md
├── SYNOLOGY_DEPLOY.md
└── package.json
```

## Getting Started

```bash
# 1. Install dependencies
npm run install:all

# 2. Start dev servers (backend on :3001, frontend on :5173)
npm start
```

See **AGENTS.md** for full architecture, commands, critical timezone rules, and contribution guidelines.

### Development with historical data

Run `npm run start:demo` from the repository root to start the frontend and a
backend using a local copy of the NAS database snapshot in
`backend/demo/pushups.db` (705 entries, captured November 23, 2026).
The first run copies it to `backend/data/demo.db`; subsequent runs preserve
that database and any changes you make. The normal `npm start` database is not
changed. Stop an existing dev server first if it already uses ports 3001 or 5173.

The snapshot contains actual workout history and is part of the repository;
anyone with repository access can read it. It is not automatically refreshed
from the NAS. To reset demo data, stop the demo server, move or delete
`backend/data/demo.db` and its `-wal` and `-shm` sidecars, then run
`npm run start:demo` again. This discards changes made in the demo database.
Never use the destructive `backend/seed-data.js` script on a database you want
to keep.

## Features

- Track daily pushup progress
- View workout history
- Set and monitor fitness goals
- Responsive mobile-friendly interface

## Technologies

- **Backend**: Node.js, Express, SQLite3, date-fns-tz
- **Frontend**: Vue 3, Vite, Tailwind CSS, vue-chartjs
- **Database**: SQLite (WAL mode)
- **Deployment**: Docker → Synology NAS (nginx proxy)

## License

MIT
