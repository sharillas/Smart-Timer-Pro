# SmartCountdownTimer Pro - Companion Module

## Overview

This module allows controlling **SmartCountdownTimer Pro** from an Elgato Stream Deck via Bitfocus Companion.

## Installation

### Prerequisites

- Bitfocus Companion v3.0 or later
- SmartCountdownTimer Pro running on the same network
- Elgato Stream Deck

### Method 1: Developer Mode (Windows/Mac)

1. Open Companion > Click the gear icon (Settings) > Enable **Developer Mode**
2. Choose a folder for developer modules
3. Copy the `companion/smartcountdowntimer-pro/` folder into that directory
4. Restart Companion

### Method 2: Companion Pi (Linux)

```bash
sudo mkdir -p /opt/companion-module-dev/smartcountdowntimer-pro
sudo cp -r companion/smartcountdowntimer-pro/* /opt/companion-module-dev/smartcountdowntimer-pro/
cd /opt/companion-module-dev/smartcountdowntimer-pro
sudo npm install @companion-module/base@^1.8.0
sudo chown -R companion:companion /opt/companion-module-dev/smartcountdowntimer-pro
sudo systemctl restart companion
```

### Method 3: Import Package

1. Run `npm run build` inside the companion module folder to create a `.tgz` package
2. In Companion: Modules > Import Module Package
3. Upload the `.tgz` file

## Configuration

1. Open Companion Web UI (usually `http://<companion-ip>:8000`)
2. Go to **Connections** tab
3. Click **Add Connection**
4. Search for **SmartCountdownTimer Pro**
5. Enter the IP address of the PC running SmartCountdownTimer Pro
6. Port: `3000` (default)
7. Click **Save**

The module status should turn green when connected.

## Actions

| Action | Description |
|---|---|
| Toggle Start / Pause | Start or pause the timer |
| Start Timer | Force start the timer |
| Pause Timer | Pause the timer |
| Toggle Message On/Off | Show/hide the current message |
| Hide Message | Force hide the message |
| Trigger Instant Message by Slot | Trigger and show a quick message instantly (slots 1-5) |
| Reset Timer | Reset to specific seconds |
| Reset to Last Set Time | Reset to the previously set time |
| Add/Subtract Time | Adjust time (+/- seconds) |
| Set Display Mode | Change between Countdown, Count-Up, Time of Day, Idle/Logo |

## Feedbacks

| Feedback | Behavior |
|---|---|
| **Timer State** | Auto-colors button: green (running), orange (warning <2min), red (expired) |
| **Message Active** | Highlights button when a message is live on screen |

## Presets

### Smart Controls
| Preset | Button |
|---|---|
| Smart Timer Button | Toggle + live time display with auto-coloring |
| Toggle Message | Show/hide message with active feedback |
| Reset to Last Set Time | Reset to previous time |

### Quick Messages
| Preset | Button |
|---|---|
| Trigger Quick Message 1-5 | Instant trigger each message slot with message preview text |

### Display Modes
| Preset | Button |
|---|---|
| Countdown | Switch to countdown mode |
| Count-Up | Switch to count-up mode |
| Time of Day | Show live clock |
| Idle / Logo | Show uploaded logo |

### Quick Times
| Preset | Button |
|---|---|
| 1m / 5m / 10m / 15m / 30m / 60m | Reset timer to preset duration |

### Manual Adjustments
| Preset | Button |
|---|---|
| +1 Minute | Add 1 minute |
| -1 Minute | Subtract 1 minute |

## Variables

Variables can be used in button text for dynamic display:

| Variable | Value |
|---|---|
| `$(smartcountdowntimer-pro:time)` | Current time (MM:SS) |
| `$(smartcountdowntimer-pro:raw_seconds)` | Raw seconds value |
| `$(smartcountdowntimer-pro:over_time)` | Overtime (+MM:SS) |
| `$(smartcountdowntimer-pro:mode)` | Current mode name |
| `$(smartcountdowntimer-pro:msg_1)` | Quick message slot 1 text |
| `$(smartcountdowntimer-pro:msg_2)` | Quick message slot 2 text |
| ... | ... |
| `$(smartcountdowntimer-pro:msg_5)` | Quick message slot 5 text |

## Troubleshooting

| Issue | Solution |
|---|---|
| Module not appearing | Ensure the folder contains `main.js`, `package.json`, and `HELP.md`. Restart Companion. |
| Connection failure | Check the IP is correct and the timer is running. Try `http://<ip>:3000/api/state` in a browser. |
| Variables not updating | The module polls every 300ms. Check network latency. |
| Presets not loading | Re-import the module or restart Companion. |
