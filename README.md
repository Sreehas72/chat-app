# Chat App

A real-time, room-based chat application built with Node.js, Express, Socket.io, and SQLite. The frontend is served by the same server as a mobile-first, installable PWA.

## Features

- Join an existing room or create a new one by entering its name.
- Send and receive messages instantly with Socket.io.
- See the online users for the current room.
- See when other people are typing.
- Load the 50 most recent messages when joining a room.
- Store messages in SQLite and reload them when joining a room.
- Use a responsive, mobile-first interface with light and dark color schemes.
- Install the app from the browser through its web app manifest and service worker.
- Open the app shell offline; messaging still requires a connection to the server.
- Check server availability at `/health`.

## Tech stack

- Node.js 22+
- Express 5
- Socket.io 4
- SQLite with better-sqlite3
- Vanilla HTML, CSS, and JavaScript
- Web app manifest and service worker

## Run locally

### Requirements

- Node.js 22 or newer
- npm

### Setup

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). To test real-time chat, open the app in two tabs, join the same room with different usernames, and send a message.

For development with automatic restarts:

```bash
npm run dev
```

The SQLite database is created automatically at `data/chat.db` on first use.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Port the HTTP and Socket.io server listens on. |
| `DATABASE_PATH` | `data/chat.db` | Location of the SQLite database file. |

Example:

```bash
PORT=4000 DATABASE_PATH=./data/chat.db npm start
```

On Windows PowerShell:

```powershell
$env:PORT = "4000"; $env:DATABASE_PATH = ".\data\chat.db"; npm start
```

When deploying to a platform with an ephemeral filesystem, set `DATABASE_PATH` to a path on a persistent disk so messages survive restarts. The included Render Blueprint uses the free plan, so it does not configure persistent storage.

## Deploy to Render

The repository includes a `render.yaml` Blueprint that configures:

- Node.js 24
- `npm ci` for the build and `npm start` for the server
- A health check at `/health`
- The Render free plan
- Automatic deploys from the `master` branch

No `DATABASE_PATH` is set, so the app uses `data/chat.db`. Render's free plan has an ephemeral filesystem: message history resets whenever the service restarts or redeploys. Free services also sleep after 15 minutes without traffic, and the app cold-starts on the next request. To keep history permanently, use a paid instance with a persistent disk and point `DATABASE_PATH` at it.

1. Push this repository to GitHub.
2. In the Render Dashboard, open **New > Blueprint**.
3. Connect GitHub and select the `chat-app` repository.
4. Use the `master` branch and the default Blueprint path (`render.yaml`).
5. Review the resources and click **Deploy Blueprint**.
6. Open the generated `onrender.com` URL and check `/health`.

Every push to `master` redeploys the service automatically.

## Install as a PWA

The app can be installed when served from `localhost` or over HTTPS:

1. Start the server and open the app.
2. Refresh once so the service worker can take control.
3. Use the browser's **Install app** or **Add to Home Screen** option.

## Project structure

```text
.
├─ server.js                 # Express and Socket.io server
├─ db.js                     # SQLite schema and message queries
├─ render.yaml               # Render deployment Blueprint
├─ package.json
├─ public/
│  ├─ index.html             # Mobile-first chat interface
│  ├─ manifest.webmanifest   # PWA metadata
│  ├─ service-worker.js      # App-shell caching
│  └─ icons/                 # Install icons
└─ data/                     # Local SQLite database (ignored by Git)
```
