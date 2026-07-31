# Changelog

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
- "SmartCountdownTimer Pro" product name
