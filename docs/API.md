# Smart Timer Pro - API Reference

## Base URL

```
http://127.0.0.1:3000
```

All endpoints return plain text or JSON. No authentication required.

> **Security note**: requests with a foreign `Origin` header (browser cross-site
> requests) are rejected with `403`. API clients (Companion, curl, OBS) don't
> send an Origin header and work normally.

---

## Timer State

### `GET /api/state`

Returns full timer state.

```json
{
  "timeLeft": 600,
  "initialTime": 600,
  "isRunning": false,
  "message": "",
  "showMessage": false,
  "messageIsPermanent": false,
  "mode": "countdown",
  "logoData": "",
  "alertLevel": "normal",
  "settings": { ... }
}
```

### `GET /api/companion`

Optimized state for Companion/Stream Deck integration.

```json
{
  "time": "10:00",
  "running": false,
  "msg_active": false,
  "raw_seconds": 600,
  "over_time": "",
  "mode": "countdown",
  "alertLevel": "normal",
  "messages": ["Wrap Up Now", "Q&A Starting", "5 Minutes Left", "Speak Up"]
}
```

---

## Transport Controls

| Endpoint | Description |
|---|---|
| `GET /api/start` | Start the timer |
| `GET /api/pause` | Pause the timer |
| `GET /api/toggle_playback` | Toggle between start and pause |
| `GET /api/reset` | Reset to last set time |
| `GET /api/reset?sec=600` | Reset to specific seconds |
| `GET /api/add?sec=60` | Add seconds (negative to subtract) |

---

## Display Mode

### `GET /api/mode?set=<mode>`

Valid modes:
| Value | Description |
|---|---|
| `countdown` | Countdown timer |
| `countup` | Count-up timer (starts at 0) |
| `timeofday` | Live clock (HH:MM:SS) |
| `logo` | Display uploaded logo |

---

## Messaging

| Endpoint | Description |
|---|---|
| `GET /api/message/set?text=Hello` | Set custom message text |
| `GET /api/message/toggle` | Show/hide the message |
| `GET /api/message/hide` | Force hide message |
| `GET /api/message/trigger?index=0` | Trigger quick message by index (0-4) and show it live |

### Quick Messages Management

| Endpoint | Description |
|---|---|
| `GET /api/messages` | List all quick messages |
| `GET /api/messages/add?text=Hello` | Add new message (max 5) |
| `GET /api/messages/edit?index=0&text=New` | Edit message at index |
| `GET /api/messages/remove?index=0` | Remove message at index |

---

## Settings

### `GET /api/settings`

Returns current settings object.

### `POST /api/settings`

Update settings. Body: JSON object with any settings fields.

```json
{
  "fontFamily": "Arial, sans-serif",
  "colorNormal": "#10b981",
  "colorWarning": "#f59e0b",
  "colorDanger": "#f97316",
  "colorExpired": "#ef4444",
  "showHours": true,
  "showSeconds": true,
  "warningThreshold": 120,
  "dangerThreshold": 30,
  "stopAtZero": true,
  "audioEndEnabled": true,
  "audioWarningEnabled": true
}
```

---

## Audio

### `POST /api/audio/upload`

Upload audio file as base64.

```json
{
  "type": "end",
  "audio": "data:audio/mp3;base64,..."
}
```

Valid types: `end`, `warning`, `danger`

### `GET /api/audio/clear?type=end`

Clear uploaded audio.

### `GET /api/audio`

Returns `{ audioEnd: "...", audioWarning: "...", audioDanger: "..." }`

---

## Agenda / Rundown

| Endpoint | Description |
|---|---|
| `GET /api/agenda` | Get agenda items and current session state |
| `POST /api/agenda/add` | Add session `{ "name": "...", "seconds": 300 }` |
| `GET /api/agenda/remove?index=N` | Remove session N |
| `POST /api/agenda/edit` | Edit session `{ "index": N, "name": "...", "seconds": 300 }` |
| `GET /api/agenda/start?index=N` | Start the rundown (optionally at session N) and switch the display to Agenda mode |
| `GET /api/agenda/next` | Skip to the next session |
| `GET /api/agenda/stop` | Stop the rundown |
| `GET /api/agenda/setAutoNext?value=true` | Enable/disable auto-advance |

---

## Event Profiles

### `GET /api/profile/export`

Downloads a JSON file with `settings`, `quickMessages` and `logoData`.

### `POST /api/profile/import`

Imports a previously exported profile (JSON body).

---

## Logo

### `POST /api/system/logo/upload`

Upload logo image as base64.

```json
{
  "image": "data:image/png;base64,..."
}
```

### `GET /api/system/logo/clear`

Clear uploaded logo.

---

## Socket.IO Events

### Server → Client

| Event | Payload | Frequency |
|---|---|---|
| `stateUpdate` | Full state object | Every 1 second (when running), or on any state change |
| `messagesUpdate` | String array | When messages list changes |
| `settingsUpdate` | Settings object | On connection and when settings change |
| `audioUpdate` | `{audioEnd, audioWarning}` | When audio files change |
| `audioTrigger` | `{type: "end"\|"warning"\|"danger"}` | When timer crosses thresholds |

### Connection

On new Socket.IO connection, the server automatically sends:
1. `stateUpdate` - current timer state
2. `messagesUpdate` - current quick messages
3. `settingsUpdate` - current settings
4. `audioUpdate` - current audio data
