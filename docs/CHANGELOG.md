# Changelog

## [1.7.0] - 2026-09-14

### New Features
- **Session log**: Records start/pause/reset, mode changes, agenda sessions and messages; export CSV from Settings
- **Agenda in Companion**: Start/Next/Stop actions, session + time display preset, and agenda variables (name, time left, total)
- **Prestart mode**: "STARTS IN" caption with countdown for pre-event screens
- **Progress ring**: Optional visual ring around the timer showing remaining time (Settings > Prestart & Ring)
- **OSC output**: Sends /stp/start, /stp/pause, /stp/warning, /stp/danger, /stp/end, /stp/reset to a configurable host/port (lighting consoles etc.)
- **Webhooks**: POSTs JSON events (start, warning, end, ...) to a configurable URL
- **Remote control page**: Lightweight mobile-first page at `/remote.html` (button "REMOTE" in the header)
- **Multi-language**: English/Português toggle (Settings > Language)
- **Undo**: Ctrl+Z reverts the last reset/add/mode/agenda action
- **Agenda timeline**: Visual progress bar of sessions in the Agenda card
- **HTTPS (optional)**: Self-signed certificate generated automatically; requires app restart
- **CI/CD**: GitHub Actions runs the test suite on every push and builds + publishes releases automatically on tags

### Changes
- Companion module updated to v1.7.0

## [1.6.0] - 2026-09-14

### New Features
- **Optional access PIN**: Configurable in Settings > Security. When set, control commands require the PIN; displays and monitoring stay open. The Companion module has a matching PIN field. The PIN never leaves the server (not in broadcasts, API responses or profile exports)
- **Automated test suite**: `npm test` runs 12 tests covering the timer engine, agenda, messages, audio, profiles, CSRF and PIN protection (development only, never touches user data)

### Changes
- Companion module updated to v1.6.0 (PIN support)

## [1.5.0] - 2026-09-14

### New Features
- **Agenda / Rundown mode**: Session list with per-session countdown, auto-advance, and session name on the external display
- **Event Profiles**: Export/import the full event setup (settings, messages, presets, agenda, logo) as a JSON file
- **Danger audio**: Third audio slot played when entering the danger zone (falls back to the warning sound)
- **Auto-update**: The app now checks for updates via GitHub releases and offers one-click restart to install
- **OBS integration guide**: New `docs/OBS.md` with browser source + transparent overlay setup
- **Configurable hotkeys**: GO/Pause, Reset and Message shortcuts can be reassigned in Settings

### Improvements
- **Drift-free timer**: Countdown/count-up now run against the wall clock (`Date.now()`), eliminating drift over long events
- **Presenter auto-recovery**: The external display window reopens automatically if it crashes or the monitor is unplugged
- **Reconnect banner**: Both windows show a visible "connection lost" banner and recover automatically
- Presenter window updates in place (no full DOM rebuild every second)

## [1.4.2] - 2026-09-13

### New Features
- **Keyboard shortcuts**: Space = GO/PAUSE, R = RESET, M = toggle message (main window)
- **System tray**: Closing the window now minimizes to the tray with quick controls (GO/Pause, Reset, Quit) — the timer keeps running in background
- **Mobile/tablet ready**: Responsive layout for small screens (remote control from phone/tablet on the same network)
- **CSRF protection**: Foreign browser origins are rejected on API requests

### Improvements
- Presenter window now updates in place (no more full DOM rebuild every second) — smoother on external monitors
- `bump-version.js` now supports `patch`, `minor` and `major` bump types

### Bug Fixes
- Removed dead code (unused alert flags)

## [1.4.1] - 2026-09-13

### Bug Fixes
- **Logo lost on restart**: The uploaded logo is now correctly restored after restarting the app
- **LAN access**: Server now binds to `0.0.0.0` (all interfaces) so Companion and other devices on the network can connect; previously it was loopback-only
- **Single instance**: Second launch now focuses the existing window instead of crashing with a port conflict
- **Port conflict**: Friendly error dialog when port 3000 is already in use

### Docs
- Companion docs: corrected folder paths (`companion/smart-timer-pro`) and variable names

## [1.4.0] - 2026-09-10

### New Features
- **Editable default presets**: Default quick presets (00:00, 1m, 5m, ...) can now be edited (HH:MM:SS)
- **Independent indicator buttons**: Separate Loading Bar and Semáforo ON/OFF buttons (mutually exclusive)
- **Font dropdown**: Choose font type from a dropdown in Settings
- **Transparent overlay window**: Transparent, borderless, always-on-top window to overlay presenter apps (PowerPoint)
- **New theme**: Gray/blue color scheme with white titles (+2px)
- **Modern STM icon**: Gray/blue icon with "STM" letters

### Changes
- GO and RESET button text increased by 4px
- Companion module updated to v1.4.0

## [1.3.0] - 2026-09-10

### New Features
- **Status Indicator**: Loading Bar and/or Semáforo (traffic light) with ON/OFF toggle in the Controls panel
- **Loading Bar**: Progress bar showing remaining time, with independent position (X/Y) and size settings
- **Semáforo**: Modern traffic light indicator (green/amber/red) with glow effects, independent position (X/Y) and size settings
- **Timer Position & Size**: Adjustable X/Y position and size of the timer on the external monitor
- **Companion module**: Added Loading Bar ON/OFF and Semáforo ON/OFF buttons

## [1.2.0] - 2026-09-10

### New Features
- **Logo Fit Mode**: Added logo display options (Fit/contain, Fill/cover, Stretch/fill) to fill the external monitor screen
- **Custom Quick Presets**: Ability to add custom presets in HH:MM:SS format (e.g., 00:33:15 → "33m15s" button)

### Bug Fixes
- **Display Mode switching**: Fixed a bug where switching between display modes (countdown/count-up/time-of-day/logo) reset or lost the timer state. Now countdown and count-up track their own values independently, so switching views preserves what was happening before the change.

## [1.0.0] - 2026-07-31

### Initial Release

**Core Features:**
- Countdown and count-up timer with configurable presets (00:00, 1m, 5m, 10m, 15m, 30m, 60m, 2h)
- Time of Day display (HH:MM:SS)
- Idle/Logo mode with custom image upload
- External display support: fullscreen presenter window on secondary monitor
- Fallback: resizable window when no external monitor detected
- Messaging system: custom messages with instant trigger
- Quick Messages bank: up to 5 editable messages (add, edit, delete, instant live)
- Audio cues: upload custom sounds for timer end and warning thresholds

**Customization (Settings Modal):**
- Custom font family
- HH and SS toggles (show/hide hours and seconds)
- Configurable colors: Normal, Warning, Danger, Expired
- Adjustable thresholds: Warning (default 120s), Danger (default 30s)
- Stop at Zero: auto-pause countdown at 00:00
- Audio: upload end sound and warning sound, enable/disable toggles

**Integration:**
- Bitfocus Companion / Stream Deck support via `/api/companion` endpoint
- Custom Companion module with 20+ presets across 5 categories
- Full REST API + Socket.IO real-time communication

**Build:**
- Standalone Windows installer (.exe) via electron-builder + NSIS
- Auto-versioning: `npm run build` bumps minor version before compiling
- No runtime dependencies required on target PC

**Branding:**
- smartchoice logo and color scheme
- "Smart Timer Pro" product name
