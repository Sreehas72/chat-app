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
- Electron 45 desktop wrapper
- electron-builder and NSIS for the Windows installer

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

## Run the desktop app

The Electron wrapper opens the deployed app at `https://chat-app-bqf7.onrender.com`. The URL is defined once in `electron/config.js`. It requires an internet connection and does not start the local server.

```bash
npm install
npm run electron
```

The window is titled **Chat App** and uses the icon in `electron/assets/`. Links to another site open in your default browser instead of inside the app.

To test the wrapper:

1. Run `npm run electron`.
2. Confirm the window opens to the deployed chat app with the **Chat App** title and icon.
3. Join a room and send a message from both the desktop window and a browser tab.
4. Press `Alt`, open **View > Toggle Developer Tools**, and run `window.open('https://example.com')` in the Console. The page should open in your default browser, not in a new Electron window.

## Build the Windows installer

The `build:win` script uses electron-builder to create a 64-bit NSIS installer:

```bash
npm install
npm run build:win
```

The installer is written to `release/ChatApp-Setup.exe`. Installation is per-user, and the wizard lets you choose the destination folder. The generated installer is not code-signed, so Windows SmartScreen may display a warning.

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
- `npm ci --omit=dev` for the build and `npm start` for the server
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
├─ electron-builder.yml      # Windows installer configuration
├─ electron/
│  ├─ main.js                # Desktop window and external-link handling
│  ├─ config.js              # Deployed app URL and window title
│  ├─ before-build.js        # Keeps server dependencies out of the installer
│  ├─ package.json           # Packaged desktop app metadata
│  └─ assets/                # Desktop app icons (ICO for Windows, PNG otherwise)
├─ package.json
├─ public/
│  ├─ index.html             # Mobile-first chat interface
│  ├─ manifest.webmanifest   # PWA metadata
│  ├─ service-worker.js      # App-shell caching
│  └─ icons/                 # Install icons
└─ data/                     # Local SQLite database (ignored by Git)
```
