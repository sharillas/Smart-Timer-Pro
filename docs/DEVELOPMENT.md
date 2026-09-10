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

The Express server runs on `127.0.0.1:3000` (localhost only) and both the moderator and presenter windows connect to it. This keeps state centralized and avoids complex IPC for timer data.

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

# Auto-bump version (1.0.0 → 1.1.0)
npm run bump

# Build installer (bumps version + compiles)
npm run build
```

The build outputs to `dist/Smart Timer Pro Setup X.Y.0.exe`.

## Companion Module Development

```powershell
# Navigate to companion module
cd companion/Smart-Timer-Pro

# Install dependencies
npm install

# Build (requires companion-module-build)
npm run build
```

The module uses variables with the prefix `$(Smart-Timer-Pro:*)` to avoid collisions with other modules.
