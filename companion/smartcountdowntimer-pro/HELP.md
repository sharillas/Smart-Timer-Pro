# SmartCountdownTimer Pro - Companion Module

Bitfocus Companion module to control **SmartCountdownTimer Pro** stage timer from an Elgato Stream Deck.

## Features

- **Smart Timer Button** -- Toggle start/pause with live time display and auto-coloring (green=running, orange=warning <2min, red=expired)
- **Display Modes** -- Switch between Countdown, Count-Up, Time of Day, and Idle/Logo
- **Quick Messages** -- 5 instant triggers for pre-configured messages
- **Quick Times** -- Reset to 1m, 5m, 10m, 15m, 30m, 60m with one button
- **Manual Adjustments** -- +1min / -1min on the fly
- **Toggle Message** -- Show/hide message on the presenter screen

## Installation

### Method 1: Companion Developer Mode

1. Enable Developer Mode in Companion (Settings gear icon > Enable Developer Mode)
2. Choose a folder for developer modules
3. Copy this module folder to your developer modules directory
4. Restart Companion

### Method 2: Manual Install (Companion Pi)

```bash
# Copy module to developer folder
sudo mkdir -p /opt/companion-module-dev/smartcountdowntimer-pro
sudo cp -r ./* /opt/companion-module-dev/smartcountdowntimer-pro/

# Install dependencies
cd /opt/companion-module-dev/smartcountdowntimer-pro
sudo npm install @companion-module/base@^1.8.0

# Fix permissions and restart
sudo chown -R companion:companion /opt/companion-module-dev/smartcountdowntimer-pro
sudo systemctl restart companion
```

## Configuration

1. Open Companion Web UI
2. Go to Connections
3. Add new connection: search "SmartCountdownTimer Pro"
4. Enter the IP address of the PC running SmartCountdownTimer Pro
5. Port: 3000 (default)
6. Click Save

## Presets

| Category | Presets |
|---|---|
| Smart Controls | Smart Timer Button (toggle + time), Toggle Message, Reset |
| Quick Messages | Instant triggers for slots 1-5 |
| Display Modes | Countdown, Count-Up, Time of Day, Idle/Logo |
| Quick Times | Reset to 1m, 5m, 10m, 15m, 30m, 60m |
| Manual Adjustments | +1 Minute, -1 Minute |

## Variables

| Variable | Description |
|---|---|
| `$(smartcountdowntimer-pro:time)` | Current timer display (MM:SS) |
| `$(smartcountdowntimer-pro:raw_seconds)` | Raw seconds value |
| `$(smartcountdowntimer-pro:over_time)` | Overtime string (+MM:SS) |
| `$(smartcountdowntimer-pro:mode)` | Current mode |
| `$(smartcountdowntimer-pro:msg_1)` through `$(smartcountdowntimer-pro:msg_5)` | Quick message text |

## Requirements

- SmartCountdownTimer Pro v1.0.0 or later running on the same network
- Bitfocus Companion v3.0 or later
- Elgato Stream Deck

## Support

For issues or feature requests, contact smartchoice.
