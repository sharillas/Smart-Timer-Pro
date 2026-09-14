# Smart Timer Pro - Development Guide

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Desktop Shell | Electron | 28.x |
| Backend Server | Node.js + Express | 4.18.x |
| Real-time Communication | Socket.IO | 4.7.x |
| Frontend | Vanilla HTML/CSS/JS | - |
| Installer Builder | electron-builder (NSIS) | 24.x |
| Companion Module | @companion-module/base | 1.8.x |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Electron Main Process                 │
│  ┌──────────────┐              ┌──────────────────────┐ │
│  │ Moderator     │              │ Presenter Window     │ │
│  │ Window        │              │ (external display)   │ │
│  │ 1280x850      │              │ fullscreen / 960x540 │ │
│  └──────┬───────┘              └──────────┬───────────┘ │
│         │                                 │              │
│         └──────────┬──────────────────────┘              │
│                    │                                     │
│           http://127.0.0.1:3000                         │
│                    │                                     │
│  ┌─────────────────▼──────────────────────────────────┐ │
│  │              Express + Socket.IO Server             │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │ │
│  │  │ REST API │  │ Socket   │  │ Static Files     │ │ │
│  │  │ endpoints│  │ events   │  │ (public/)        │ │ │
│  │  └──────────┘  └──────────┘  └──────────────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
Smart-Timer-Pro/
├── main.js              # Electron main process
│   ├── createMainWindow()      # Moderator window (1280x850)
│   ├── createPresenterWindow() # External display window
│   └── IPC handlers            # toggle-presenter
├── preload.js           # Context bridge for renderer
├── server.js            # Express + Socket.IO backend
│   ├── State management        # Timer state + tick engine
│   ├── Persistence             # messages.json, settings.json, audio
│   ├── REST API endpoints      # /api/* endpoints
│   └── Socket.IO events        # stateUpdate, messagesUpdate, etc.
├── package.json         # Dependencies + electron-builder config
├── scripts/
│   └── bump-version.js  # Auto-increment minor version
├── public/
│   ├── index.html       # Moderator control panel UI
│   ├── presenter.html   # Fullscreen presenter view
│   └── images/
│       └── logo.svg     # smartchoice logo
├── companion/
│   └── Smart-Timer-Pro/
│       ├── main.js      # Companion module logic
│       ├── package.json # Module manifest
│       └── HELP.md      # Installation guide
├── assets/
│   ├── icon.png         # App icon (256x256)
│   └── icon.ico         # Installer icon
├── docs/                # Documentation
└── dist/                # Build output (gitignored)
    ├── win-unpacked/    # Unpacked app
    └── Smart Timer Pro Setup X.Y.0.exe
```

## Key Design Decisions

### 1. Single Server, Multiple Windows

The Express server runs on `0.0.0.0:3000` (all interfaces, so Companion or other devices on the network can connect) and both the moderator and presenter windows connect to it. This keeps state centralized and avoids complex IPC for timer data.

### 2. Tick Engine

The timer runs in the server process using `setInterval(1000)`. The state is broadcast to all connected clients via Socket.IO every second. This ensures all windows show the exact same time.

### 3. Settings Persistence

Settings, messages, logos, and audio are stored as JSON files in the writable data directory:
- **Electron**: `%APPDATA%/Smart-Timer-Pro/`
- **Standalone**: project directory

### 4. External Display Detection

The main process uses Electron's `screen.getAllDisplays()` to detect if a second monitor is connected:
- **External monitor present**: Opens fullscreen kiosk window on display 2
- **No external monitor**: Opens resizable 960x540 window on main display

### 5. Companion API

The `/api/companion` endpoint aggregates all relevant state into a single JSON response optimized for Bitfocus Companion polling (every 300ms). This avoids multiple API calls.

## Development Commands

```powershell
# Install dependencies
npm install

# Run Electron app in dev mode
npm start

# Run server only (test in browser)
node server.js
# Then open http://127.0.0.1:3000

# Run the automated test suite
npm test

# Auto-bump version (patch / minor / major)
npm run bump:patch
npm run bump:minor
npm run bump

# Build installer (bumps version + compiles)
npm run build
```

The build outputs to `dist/Smart Timer Pro Setup X.Y.0.exe`.

## Automated Tests

Tests live in `tests/` and use the Node.js built-in test runner (`node:test`):

- `tests/server.test.js` — spawns the real server on a dedicated port with a
  temporary data directory (`STP_DATA_DIR`), then exercises the timer engine,
  agenda, messages, audio, profiles, CSRF protection and PIN protection.
- `tests/frontend.test.js` — parses the frontend scripts and the module files
  to catch syntax errors.

Tests are development-only: they are not shipped in the installer and never
touch user data (they use a fresh temporary directory for each run).

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):

- On every push and pull request to `master`: runs `npm test`
- On version tags (`v*`): runs the tests, builds the installer and the
  Companion module, and publishes them to a GitHub release automatically

To release: bump the version (`npm run bump:minor` etc.), commit, and push a
tag (`git tag vX.Y.Z && git push origin vX.Y.Z`). The workflow does the rest.

## Companion Module Development

```powershell
# Navigate to companion module
cd companion/smart-timer-pro

# Install dependencies
npm install

# Build tgz (bundles with webpack)
npm run build
```

The module uses variables with the prefix `$(smart-timer-pro:*)` to avoid collisions with other modules.
