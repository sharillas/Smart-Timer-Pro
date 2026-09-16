const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const dgram = require('dgram');

const app = express();
app.use(express.json({ limit: '50mb' }));

const server = http.createServer(app);
let httpsServer = null;
const io = new Server(server);

const appVersion = (() => {
    try { return require('./package.json').version; }
    catch (e) { return '1.2.0'; }
})();

// --- PERSISTENCE ---
let messagesFile = '';
let logoFile = '';
let settingsFile = '';
let audioEndFile = '';
let audioWarningFile = '';
let audioDangerFile = '';
let dataDir = __dirname;

let quickMessages = ['Wrap Up Now', 'Q&A Starting', '5 Minutes Left', 'Speak Up'];
let logoData = '';

let settings = {
    fontFamily: "'Courier New', monospace",
    colorNormal: '#10b981',
    colorWarning: '#f59e0b',
    colorDanger: '#f97316',
    colorExpired: '#ef4444',
    bgColor: '#000000',
    showHours: true,
    showSeconds: true,
    warningThreshold: 120,
    dangerThreshold: 30,
    stopAtZero: true,
    audioEndEnabled: true,
    audioWarningEnabled: true,
    audioDangerEnabled: true,
    logoFit: 'contain',
    statusIndicator: 'none',
    barX: 10,
    barY: 88,
    barWidth: 80,
    barHeight: 14,
    semaforoX: 50,
    semaforoY: 88,
    semaforoSize: 46,
    timerX: 50,
    timerY: 46,
    timerSize: 22,
    bgMode: 'color',
    captionFont: "'Anton', sans-serif",
    showClock: false,
    colorTheme: 'default',
    autoOpenPresenter: false,
    apiPin: '',
    language: 'en',
    prestartLabel: 'STARTS IN',
    webhookUrl: '',
    oscEnabled: false,
    oscHost: '',
    oscPort: 9000,
    oscPath: '/stp',
    httpsEnabled: false,
    defaultPresets: [
        { label: '00:00', seconds: 0 },
        { label: '1m', seconds: 60 },
        { label: '5m', seconds: 300 },
        { label: '10m', seconds: 600 },
        { label: '15m', seconds: 900 },
        { label: '30m', seconds: 1800 },
        { label: '60m', seconds: 3600 },
        { label: '2h', seconds: 7200 }
    ],
    customPresets: []
};

let audioEnd = '';
let audioWarning = '';
let audioDanger = '';

function initPersistence() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    messagesFile = path.join(dataDir, 'messages.json');
    logoFile = path.join(dataDir, 'logo.json');
    settingsFile = path.join(dataDir, 'settings.json');
    audioEndFile = path.join(dataDir, 'audio_end.json');
    audioWarningFile = path.join(dataDir, 'audio_warning.json');
    audioDangerFile = path.join(dataDir, 'audio_danger.json');
    sessionLogFile = path.join(dataDir, 'session_log.json');

    // Messages
    try {
        if (fs.existsSync(messagesFile)) {
            quickMessages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
        } else {
            fs.writeFileSync(messagesFile, JSON.stringify(quickMessages));
        }
    } catch (e) { console.error('Could not load messages.json', e); }

    // Logo
    try {
        if (fs.existsSync(logoFile)) {
            const parsed = JSON.parse(fs.readFileSync(logoFile, 'utf8'));
            if (parsed && parsed.image) logoData = parsed.image;
        }
    } catch (e) { console.error('Could not load logo.json', e); }
    state.logoData = logoData;

    // Settings
    try {
        if (fs.existsSync(settingsFile)) {
            const saved = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
            settings = { ...settings, ...saved };
        }
    } catch (e) { console.error('Could not load settings.json', e); }

    // Audio
    try {
        if (fs.existsSync(audioEndFile)) {
            const data = JSON.parse(fs.readFileSync(audioEndFile, 'utf8'));
            if (data && data.audio) audioEnd = data.audio;
        }
    } catch (e) { console.error('Could not load audio_end.json', e); }
    try {
        if (fs.existsSync(audioWarningFile)) {
            const data = JSON.parse(fs.readFileSync(audioWarningFile, 'utf8'));
            if (data && data.audio) audioWarning = data.audio;
        }
    } catch (e) { console.error('Could not load audio_warning.json', e); }
    try {
        if (fs.existsSync(audioDangerFile)) {
            const data = JSON.parse(fs.readFileSync(audioDangerFile, 'utf8'));
            if (data && data.audio) audioDanger = data.audio;
        }
    } catch (e) { console.error('Could not load audio_danger.json', e); }

    // Session log
    try {
        if (fs.existsSync(sessionLogFile)) {
            const parsed = JSON.parse(fs.readFileSync(sessionLogFile, 'utf8'));
            if (Array.isArray(parsed)) sessionLog = parsed;
        }
    } catch (e) { console.error('Could not load session log', e); }
}

function saveMessages() {
    if (!messagesFile) return;
    try { fs.writeFileSync(messagesFile, JSON.stringify(quickMessages)); }
    catch (e) { console.error('Could not save messages.json', e); }
}

function saveSettings() {
    if (!settingsFile) return;
    try { fs.writeFileSync(settingsFile, JSON.stringify(settings)); }
    catch (e) { console.error('Could not save settings.json', e); }
}

function saveAudioEnd() {
    if (!audioEndFile) return;
    try { fs.writeFileSync(audioEndFile, JSON.stringify({ audio: audioEnd })); }
    catch (e) { console.error('Could not save audio_end.json', e); }
}

function saveAudioWarning() {
    if (!audioWarningFile) return;
    try { fs.writeFileSync(audioWarningFile, JSON.stringify({ audio: audioWarning })); }
    catch (e) { console.error('Could not save audio_warning.json', e); }
}

function saveAudioDanger() {
    if (!audioDangerFile) return;
    try { fs.writeFileSync(audioDangerFile, JSON.stringify({ audio: audioDanger })); }
    catch (e) { console.error('Could not save audio_danger.json', e); }
}

function init(config) {
    if (config && config.dataDir) {
        dataDir = config.dataDir;
    }
    initPersistence();
}

// --- APP STATE ---
let state = {
    timeLeft: 600,
    initialTime: 600,
    countupTime: 0,
    isRunning: false,
    message: '',
    showMessage: false,
    mode: 'countdown',
    logoData: logoData,
    alertLevel: 'normal',
    activeTime: 600,
    version: appVersion,
    settings: settings,
    agendaActive: false,
    agendaIndex: -1,
    agendaName: '',
    agendaTimeLeft: 0,
    agendaTotal: 0,
    agendaEndTime: null,
    agendaAutoNext: true
};

let lastAlertLevel = 'normal';

// --- SESSION LOG ---
let sessionLog = [];
let sessionLogFile = '';

function logEvent(type, label) {
    const entry = { time: new Date().toISOString(), type, label: label || '' };
    sessionLog.push(entry);
    if (sessionLog.length > 5000) sessionLog.shift();
    if (sessionLogFile) {
        try { fs.writeFileSync(sessionLogFile, JSON.stringify(sessionLog)); }
        catch (e) { console.error('Could not save session log', e); }
    }
    io.emit('sessionLogUpdate', entry);
    sendWebhook(type, label);
}

// --- WEBHOOKS (HTTP callbacks) ---
function sendWebhook(event, label) {
    const url = settings.webhookUrl;
    if (!url) return;
    const payload = { app: 'smart-timer-pro', event, label, time: new Date().toISOString() };
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3000),
    }).catch(() => {});
}

// --- OSC OUTPUT ---
let oscSocket = null;

function encodeOSC(address, args) {
    const parts = [Buffer.from(address), Buffer.from(',' + args.map((a) => (typeof a === 'number' ? 'i' : 's')).join(''))];
    for (const a of args) {
        if (typeof a === 'number') {
            const b = Buffer.alloc(4);
            b.writeInt32BE(a);
            parts.push(b);
        } else {
            parts.push(Buffer.from(String(a)));
        }
    }
    const total = parts.reduce((sum, p) => sum + Math.ceil(p.length / 4) * 4, 0);
    const out = Buffer.alloc(total);
    let off = 0;
    for (const p of parts) {
        p.copy(out, off);
        off += Math.ceil(p.length / 4) * 4;
    }
    return out;
}

function sendOSC(event, seconds) {
    if (!settings.oscEnabled || !settings.oscHost) return;
    try {
        if (!oscSocket) oscSocket = dgram.createSocket('udp4');
        const msg = encodeOSC(`${settings.oscPath || '/stp'}/${event}`, [typeof seconds === 'number' ? seconds : 0]);
        oscSocket.send(msg, settings.oscPort || 9000, settings.oscHost);
    } catch (e) { console.error('OSC send failed', e); }
}

// --- UNDO ---
let undoSnapshot = null;

function captureUndo() {
    undoSnapshot = {
        timeLeft: state.timeLeft,
        countupTime: state.countupTime,
        isRunning: state.isRunning,
        mode: state.mode,
        initialTime: state.initialTime,
        message: state.message,
        showMessage: state.showMessage,
        agendaActive: state.agendaActive,
        agendaIndex: state.agendaIndex,
        agendaName: state.agendaName,
        agendaTimeLeft: state.agendaTimeLeft,
        agendaTotal: state.agendaTotal
    };
}

function restoreUndo() {
    if (!undoSnapshot) return false;
    Object.assign(state, undoSnapshot);
    state.isRunning = false;
    countdownEndTime = null;
    countupStartTime = null;
    state.agendaEndTime = null;
    undoSnapshot = null;
    broadcast();
    return true;
}

// --- CROSS-SITE REQUEST PROTECTION ---
// Blocks browser requests coming from foreign origins (CSRF) while
// allowing same-origin UI, Companion polling and LAN tools (no Origin header).
app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        const originHost = origin.split('://')[1] || '';
        const hostHeader = req.headers.host || '';
        if (originHost !== hostHeader) {
            return res.status(403).send('Forbidden');
        }
    }
    next();
});

// --- OPTIONAL PIN PROTECTION ---
// When a PIN is configured (Settings > Security), control endpoints require it.
// Read-only endpoints (state, settings, messages, audio, agenda, companion,
// profile export) stay open so displays and monitoring keep working.
// Note: req.path here is relative to the '/api' mount (e.g. '/reset').
const PIN_PROTECTED = [
    '/start',
    '/pause',
    '/toggle_playback',
    '/reset',
    '/add',
    '/mode',
    '/message',
    '/messages/add',
    '/messages/remove',
    '/messages/edit',
    '/indicator',
    '/presets/add',
    '/presets/remove',
    '/presets/default/edit',
    '/audio/upload',
    '/audio/clear',
    '/system/logo/upload',
    '/system/logo/clear',
    '/agenda/add',
    '/agenda/remove',
    '/agenda/edit',
    '/agenda/start',
    '/agenda/next',
    '/agenda/stop',
    '/agenda/setAutoNext',
    '/profile/import',
    '/undo',
    '/log/clear'
];

app.use('/api', (req, res, next) => {
    const pin = settings.apiPin;
    if (!pin) return next();
    const isSettingsPost = req.path === '/settings' && req.method === 'POST';
    const isProtected = isSettingsPost || PIN_PROTECTED.some((p) => req.path === p || req.path.startsWith(p + '/'));
    if (!isProtected) return next();

    const provided = req.query.pin || req.headers['x-pin'] || '';
    if (provided !== pin) {
        return res.status(401).send('Invalid PIN');
    }
    next();
});

// Strip the PIN from any settings object that leaves the server
function publicSettings() {
    const out = { ...settings, apiPin: undefined, apiPinEnabled: !!settings.apiPin };
    return out;
}

// --- TICK ENGINE (drift-free, based on wall clock) ---
let countdownEndTime = null;
let countupStartTime = null;

setInterval(() => {
    if (!state.isRunning) return;
    const now = Date.now();

    if (state.mode === 'countdown' || state.mode === 'prestart') {
        if (countdownEndTime === null) {
            countdownEndTime = now + state.timeLeft * 1000;
        }
        const newTime = Math.round((countdownEndTime - now) / 1000);
        if (newTime !== state.timeLeft) {
            state.timeLeft = newTime;
            if (settings.stopAtZero && state.timeLeft <= 0) {
                state.timeLeft = 0;
                state.isRunning = false;
                countdownEndTime = null;
            }
            broadcast();
        }
    } else if (state.mode === 'countup') {
        if (countupStartTime === null) {
            countupStartTime = now - state.countupTime * 1000;
        }
        const newTime = Math.floor((now - countupStartTime) / 1000);
        if (newTime !== state.countupTime) {
            state.countupTime = newTime;
            broadcast();
        }
    } else if (state.mode === 'agenda' && state.agendaActive) {
        if (state.agendaEndTime === null) {
            state.agendaEndTime = now + state.agendaTimeLeft * 1000;
        }
        const newTime = Math.round((state.agendaEndTime - now) / 1000);
        if (newTime !== state.agendaTimeLeft) {
            state.agendaTimeLeft = newTime;
            if (state.agendaTimeLeft <= 0) {
                if (state.agendaAutoNext) {
                    advanceAgenda();
                } else {
                    state.agendaTimeLeft = 0;
                    state.isRunning = false;
                }
            }
            broadcast();
        }
    }
}, 200);

function computeAlertLevel() {
    if ((state.mode === 'countdown' || state.mode === 'prestart') && state.isRunning) {
        if (state.timeLeft <= 0) return 'expired';
        if (state.timeLeft <= settings.dangerThreshold) return 'danger';
        if (state.timeLeft <= settings.warningThreshold) return 'warning';
    }
    if ((state.mode === 'countdown' || state.mode === 'prestart') && !state.isRunning && state.timeLeft <= 0) return 'expired';
    return 'normal';
}

function broadcast() {
    const prevAlert = state.alertLevel;
    state.alertLevel = computeAlertLevel();
    state.settings = publicSettings();
    state.activeTime = state.mode === 'countup' ? state.countupTime : state.timeLeft;

    // Audio triggers + OSC
    if (state.isRunning && (state.mode === 'countdown' || state.mode === 'prestart')) {
        if (state.alertLevel === 'expired' && prevAlert !== 'expired') {
            io.emit('audioTrigger', { type: 'end' });
            sendOSC('end', 0);
        } else if (state.alertLevel === 'danger' && prevAlert === 'warning') {
            io.emit('audioTrigger', { type: 'danger' });
            sendOSC('danger', state.timeLeft);
        } else if (state.alertLevel === 'warning' && prevAlert === 'normal') {
            io.emit('audioTrigger', { type: 'warning' });
            sendOSC('warning', state.timeLeft);
        }
    }

    io.emit('stateUpdate', state);
}

// --- API ENDPOINTS ---
app.get('/api/state', (req, res) => res.json(state));

app.get('/api/start', (req, res) => {
    const now = Date.now();
    if (state.mode === 'countdown' || state.mode === 'prestart') {
        countdownEndTime = now + state.timeLeft * 1000;
    } else if (state.mode === 'countup') {
        countupStartTime = now - state.countupTime * 1000;
    } else if (state.mode === 'agenda' && state.agendaActive) {
        state.agendaEndTime = now + state.agendaTimeLeft * 1000;
    }
    state.isRunning = true;
    logEvent('start', state.mode === 'agenda' && state.agendaActive ? state.agendaName : '');
    sendOSC('start', state.mode === 'countdown' ? state.timeLeft : 0);
    broadcast();
    res.send('Started');
});

app.get('/api/pause', (req, res) => {
    state.isRunning = false;
    logEvent('pause', '');
    sendOSC('pause', 0);
    broadcast();
    res.send('Paused');
});

app.get('/api/toggle_playback', (req, res) => {
    if (state.isRunning) {
        state.isRunning = false;
        logEvent('pause', '');
        sendOSC('pause', 0);
    } else {
        const now = Date.now();
        if (state.mode === 'countdown' || state.mode === 'prestart') {
            countdownEndTime = now + state.timeLeft * 1000;
        } else if (state.mode === 'countup') {
            countupStartTime = now - state.countupTime * 1000;
        } else if (state.mode === 'agenda' && state.agendaActive) {
            state.agendaEndTime = now + state.agendaTimeLeft * 1000;
        }
        state.isRunning = true;
        logEvent('start', state.mode === 'agenda' && state.agendaActive ? state.agendaName : '');
        sendOSC('start', state.mode === 'countdown' ? state.timeLeft : 0);
    }
    broadcast();
    res.send(state.isRunning ? 'Started' : 'Paused');
});

app.get('/api/reset', (req, res) => {
    captureUndo();
    let sec;
    if (req.query.sec !== undefined) {
        sec = parseInt(req.query.sec) || 0;
    } else if (state.mode === 'countup') {
        sec = 0;
    } else {
        sec = state.initialTime;
    }
    state.isRunning = false;
    countdownEndTime = null;
    countupStartTime = null;
    if (state.mode === 'countup') {
        state.countupTime = sec;
    } else {
        state.timeLeft = sec;
        state.initialTime = sec;
    }
    logEvent('reset', String(sec));
    sendOSC('reset', sec);
    broadcast();
    res.send('Reset');
});

app.get('/api/add', (req, res) => {
    captureUndo();
    const sec = parseInt(req.query.sec) || 0;
    if (state.mode === 'countup') {
        state.countupTime += sec;
        if (state.isRunning) countupStartTime -= sec * 1000;
    } else if (state.mode === 'countdown' || state.mode === 'prestart') {
        state.timeLeft += sec;
        if (state.isRunning) countdownEndTime += sec * 1000;
    } else if (state.mode === 'agenda' && state.agendaActive) {
        state.agendaTimeLeft += sec;
        if (state.isRunning) state.agendaEndTime += sec * 1000;
    }
    logEvent(sec >= 0 ? 'add' : 'subtract', String(Math.abs(sec)));
    broadcast();
    res.send('Adjusted');
});

app.get('/api/undo', (req, res) => {
    if (restoreUndo()) {
        logEvent('undo', '');
        res.send('Undone');
    } else {
        res.status(400).send('Nothing to undo');
    }
});

app.get('/api/mode', (req, res) => {
    const validModes = ['countdown', 'countup', 'timeofday', 'logo', 'agenda', 'prestart'];
    if (validModes.includes(req.query.set)) {
        captureUndo();
        if (state.isRunning) {
            const now = Date.now();
            if (req.query.set === 'countdown' || req.query.set === 'prestart') {
                countdownEndTime = now + state.timeLeft * 1000;
            } else if (req.query.set === 'countup') {
                countupStartTime = now - state.countupTime * 1000;
            } else if (req.query.set === 'agenda' && state.agendaActive) {
                state.agendaEndTime = now + state.agendaTimeLeft * 1000;
            }
        }
        state.mode = req.query.set;
        logEvent('mode', req.query.set);
        broadcast();
        res.send('Mode updated');
    } else {
        res.status(400).send('Invalid Mode');
    }
});

app.get('/api/message/toggle', (req, res) => {
    state.showMessage = !state.showMessage;
    broadcast();
    res.send(state.showMessage ? 'Message Shown' : 'Message Hidden');
});

app.get('/api/message/set', (req, res) => {
    state.message = req.query.text || '';
    broadcast();
    res.send('Message Set');
});

app.get('/api/message/trigger', (req, res) => {
    const index = parseInt(req.query.index);
    if (!isNaN(index) && index >= 0 && index < quickMessages.length) {
        captureUndo();
        state.message = quickMessages[index];
        state.showMessage = true;
        logEvent('message', quickMessages[index]);
        broadcast();
        res.send('Message Triggered Live');
    } else {
        res.status(400).send('Invalid Message Index');
    }
});

app.get('/api/message/hide', (req, res) => {
    state.showMessage = false;
    broadcast();
    res.send('Message Hidden');
});

app.post('/api/system/logo/upload', (req, res) => {
    if (req.body && req.body.image) {
        state.logoData = req.body.image;
        logoData = state.logoData;
        fs.writeFileSync(logoFile, JSON.stringify({ image: state.logoData }));
        broadcast();
        res.send('Logo Uploaded');
    } else {
        res.status(400).send('No Image Data Received');
    }
});

app.get('/api/system/logo/clear', (req, res) => {
    state.logoData = '';
    logoData = '';
    if (fs.existsSync(logoFile)) {
        fs.unlinkSync(logoFile);
    }
    broadcast();
    res.send('Logo Cleared');
});

app.get('/api/messages', (req, res) => res.json(quickMessages));

app.get('/api/messages/add', (req, res) => {
    const text = req.query.text;
    if (quickMessages.length >= 5) {
        return res.status(400).send('Max 5 messages');
    }
    if (text && !quickMessages.includes(text)) {
        quickMessages.push(text);
        saveMessages();
        io.emit('messagesUpdate', quickMessages);
    }
    res.send('Added');
});

app.get('/api/messages/remove', (req, res) => {
    const index = parseInt(req.query.index);
    if (!isNaN(index) && index >= 0 && index < quickMessages.length) {
        quickMessages.splice(index, 1);
        saveMessages();
        io.emit('messagesUpdate', quickMessages);
    }
    res.send('Removed');
});

app.get('/api/messages/edit', (req, res) => {
    const index = parseInt(req.query.index);
    const text = req.query.text || '';
    if (!isNaN(index) && index >= 0 && index < quickMessages.length && text.trim()) {
        quickMessages[index] = text;
        saveMessages();
        io.emit('messagesUpdate', quickMessages);
    }
    res.send('Edited');
});

// --- SETTINGS API ---
app.get('/api/settings', (req, res) => res.json(publicSettings()));

app.post('/api/settings', (req, res) => {
    if (!req.body) return res.status(400).send('Missing body');
    Object.assign(settings, req.body);
    saveSettings();
    state.settings = publicSettings();
    broadcast();
    io.emit('settingsUpdate', publicSettings());
    res.json(publicSettings());
});

// --- INDICATOR API ---
app.get('/api/indicator', (req, res) => {
    const type = req.query.type;
    const action = req.query.action;
    if (!type || !action) return res.status(400).send('Missing type/action');

    if (action === 'on') {
        settings.statusIndicator = type;
    } else {
        if (settings.statusIndicator === type) settings.statusIndicator = 'none';
    }

    saveSettings();
    state.settings = publicSettings();
    broadcast();
    io.emit('settingsUpdate', publicSettings());
    res.send('Indicator updated');
});

// --- DEFAULT PRESETS API ---
app.get('/api/presets/default', (req, res) => res.json(settings.defaultPresets || []));

app.get('/api/presets/default/edit', (req, res) => {
    const index = parseInt(req.query.index);
    const sec = parseInt(req.query.sec);
    const label = req.query.label || '';
    if (!Array.isArray(settings.defaultPresets)) return res.status(400).send('No presets');
    if (isNaN(index) || index < 0 || index >= settings.defaultPresets.length) return res.status(400).send('Invalid index');
    if (isNaN(sec) || sec < 0) return res.status(400).send('Invalid seconds');
    settings.defaultPresets[index] = { label: label || formatPresetLabel(sec), seconds: sec };
    saveSettings();
    state.settings = publicSettings();
    io.emit('settingsUpdate', publicSettings());
    res.send('Preset edited');
});

// --- CUSTOM PRESETS API ---
app.get('/api/presets', (req, res) => res.json(settings.customPresets || []));

app.get('/api/presets/add', (req, res) => {
    const sec = parseInt(req.query.sec);
    const label = req.query.label || '';
    if (isNaN(sec) || sec <= 0) return res.status(400).send('Invalid seconds');
    if (!Array.isArray(settings.customPresets)) settings.customPresets = [];
    settings.customPresets.push({ label: label || formatPresetLabel(sec), seconds: sec });
    saveSettings();
    state.settings = publicSettings();
    io.emit('settingsUpdate', publicSettings());
    res.send('Preset added');
});

app.get('/api/presets/remove', (req, res) => {
    const index = parseInt(req.query.index);
    if (!Array.isArray(settings.customPresets)) settings.customPresets = [];
    if (!isNaN(index) && index >= 0 && index < settings.customPresets.length) {
        settings.customPresets.splice(index, 1);
        saveSettings();
        state.settings = publicSettings();
        io.emit('settingsUpdate', publicSettings());
    }
    res.send('Preset removed');
});

// --- EVENT PROFILES (export/import) ---
app.get('/api/profile/export', (req, res) => {
    res.setHeader('Content-Disposition', 'attachment; filename="smart-timer-pro-profile.json"');
    res.json({
        app: 'Smart Timer Pro',
        profileVersion: 1,
        exportedAt: new Date().toISOString(),
        settings: publicSettings(),
        quickMessages,
        logoData
    });
});

app.post('/api/profile/import', (req, res) => {
    if (!req.body) return res.status(400).send('Missing body');

    if (Array.isArray(req.body.quickMessages)) {
        quickMessages = req.body.quickMessages.filter((m) => typeof m === 'string').slice(0, 5);
        saveMessages();
        io.emit('messagesUpdate', quickMessages);
    }

    if (req.body.logoData !== undefined) {
        logoData = req.body.logoData || '';
        state.logoData = logoData;
        if (logoData) {
            fs.writeFileSync(logoFile, JSON.stringify({ image: logoData }));
        } else if (fs.existsSync(logoFile)) {
            fs.unlinkSync(logoFile);
        }
    }

    if (req.body.settings && typeof req.body.settings === 'object') {
        Object.assign(settings, req.body.settings);
        saveSettings();
    }

    state.settings = publicSettings();
    broadcast();
    io.emit('settingsUpdate', publicSettings());
    res.send('Profile imported');
});

// --- AGENDA (RUNDOWN) API ---
function advanceAgenda() {
    const items = settings.agenda || [];
    const next = state.agendaIndex + 1;
    if (next < items.length) {
        state.agendaIndex = next;
        state.agendaName = items[next].name || 'Session ' + (next + 1);
        state.agendaTotal = items[next].seconds || 0;
        state.agendaTimeLeft = state.agendaTotal;
        state.agendaEndTime = Date.now() + state.agendaTotal * 1000;
        logEvent('agenda_session', state.agendaName);
        if (state.agendaTotal === 0) {
            advanceAgenda();
            return;
        }
    } else {
        state.agendaActive = false;
        state.agendaIndex = -1;
        state.agendaName = '';
        state.agendaTimeLeft = 0;
        state.agendaTotal = 0;
        state.agendaEndTime = null;
        state.isRunning = false;
        state.mode = 'countdown';
        logEvent('agenda_end', '');
    }
}

app.get('/api/agenda', (req, res) => {
    res.json({
        items: settings.agenda || [],
        autoNext: state.agendaAutoNext,
        active: state.agendaActive,
        index: state.agendaIndex,
        name: state.agendaName,
        timeLeft: state.agendaTimeLeft,
        total: state.agendaTotal
    });
});

app.post('/api/agenda/add', (req, res) => {
    const name = (req.body && req.body.name) || '';
    const seconds = parseInt(req.body && req.body.seconds);
    if (!name.trim() || isNaN(seconds) || seconds <= 0) {
        return res.status(400).send('Invalid name or seconds');
    }
    if (!Array.isArray(settings.agenda)) settings.agenda = [];
    settings.agenda.push({ name: name.trim(), seconds });
    saveSettings();
    state.settings = publicSettings();
    broadcast();
    io.emit('settingsUpdate', publicSettings());
    res.send('Agenda item added');
});

app.get('/api/agenda/remove', (req, res) => {
    const index = parseInt(req.query.index);
    if (!Array.isArray(settings.agenda)) settings.agenda = [];
    if (!isNaN(index) && index >= 0 && index < settings.agenda.length) {
        settings.agenda.splice(index, 1);
        if (state.agendaActive && index === state.agendaIndex) {
            state.agendaActive = false;
            state.agendaIndex = -1;
            state.agendaName = '';
            state.agendaTimeLeft = 0;
            state.agendaTotal = 0;
            state.agendaEndTime = null;
        } else if (state.agendaActive && index < state.agendaIndex) {
            state.agendaIndex--;
        }
        saveSettings();
        state.settings = publicSettings();
        broadcast();
        io.emit('settingsUpdate', publicSettings());
    }
    res.send('Removed');
});

app.post('/api/agenda/edit', (req, res) => {
    const index = parseInt(req.body && req.body.index);
    const name = (req.body && req.body.name) || '';
    const seconds = parseInt(req.body && req.body.seconds);
    if (!Array.isArray(settings.agenda)) settings.agenda = [];
    if (isNaN(index) || index < 0 || index >= settings.agenda.length) {
        return res.status(400).send('Invalid index');
    }
    if (!name.trim() || isNaN(seconds) || seconds <= 0) {
        return res.status(400).send('Invalid name or seconds');
    }
    settings.agenda[index] = { name: name.trim(), seconds };
    if (state.agendaActive && index === state.agendaIndex) {
        state.agendaName = name.trim();
        state.agendaTotal = seconds;
        state.agendaTimeLeft = seconds;
        state.agendaEndTime = Date.now() + seconds * 1000;
    }
    saveSettings();
    state.settings = publicSettings();
    broadcast();
    io.emit('settingsUpdate', publicSettings());
    res.send('Agenda item edited');
});

app.get('/api/agenda/setAutoNext', (req, res) => {
    state.agendaAutoNext = req.query.value === 'true' || req.query.value === '1';
    settings.agendaAutoNext = state.agendaAutoNext;
    saveSettings();
    state.settings = publicSettings();
    io.emit('settingsUpdate', publicSettings());
    res.send('Auto-next updated');
});

app.get('/api/agenda/start', (req, res) => {
    const items = settings.agenda || [];
    if (items.length === 0) return res.status(400).send('Agenda is empty');
    captureUndo();
    let index = parseInt(req.query.index);
    if (isNaN(index) || index < 0 || index >= items.length) index = 0;
    state.agendaIndex = index;
    state.agendaName = items[index].name || 'Session ' + (index + 1);
    state.agendaTotal = items[index].seconds;
    state.agendaTimeLeft = state.agendaTotal;
    state.agendaEndTime = Date.now() + state.agendaTotal * 1000;
    state.agendaActive = true;
    state.mode = 'agenda';
    state.isRunning = true;
    logEvent('agenda_start', state.agendaName);
    broadcast();
    res.send('Agenda started');
});

app.get('/api/agenda/next', (req, res) => {
    if (!state.agendaActive) return res.status(400).send('Agenda not active');
    captureUndo();
    advanceAgenda();
    broadcast();
    res.send('Next session');
});

app.get('/api/agenda/stop', (req, res) => {
    captureUndo();
    state.agendaActive = false;
    state.agendaIndex = -1;
    state.agendaName = '';
    state.agendaTimeLeft = 0;
    state.agendaTotal = 0;
    state.agendaEndTime = null;
    state.isRunning = false;
    state.mode = 'countdown';
    logEvent('agenda_stop', '');
    broadcast();
    res.send('Agenda stopped');
});

function formatPresetLabel(totalSeconds) {    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) {
        return `${h}h${m.toString().padStart(2, '0')}m${s.toString().padStart(2, '0')}s`;
    }
    if (m > 0) {
        return `${m}m${s.toString().padStart(2, '0')}s`;
    }
    return `${s}s`;
}

// --- AUDIO API ---
app.post('/api/audio/upload', (req, res) => {
    const { type, audio } = req.body;
    if (!type || !audio) return res.status(400).send('Missing type or audio data');

    if (type === 'end') {
        audioEnd = audio;
        saveAudioEnd();
    } else if (type === 'warning') {
        audioWarning = audio;
        saveAudioWarning();
    } else if (type === 'danger') {
        audioDanger = audio;
        saveAudioDanger();
    } else {
        return res.status(400).send('Invalid audio type');
    }
    io.emit('audioUpdate', { audioEnd, audioWarning, audioDanger });
    res.send('Audio uploaded');
});

app.get('/api/audio/clear', (req, res) => {
    const type = req.query.type;
    if (type === 'end') {
        audioEnd = '';
        if (fs.existsSync(audioEndFile)) fs.unlinkSync(audioEndFile);
    } else if (type === 'warning') {
        audioWarning = '';
        if (fs.existsSync(audioWarningFile)) fs.unlinkSync(audioWarningFile);
    } else if (type === 'danger') {
        audioDanger = '';
        if (fs.existsSync(audioDangerFile)) fs.unlinkSync(audioDangerFile);
    } else {
        return res.status(400).send('Missing type');
    }
    io.emit('audioUpdate', { audioEnd, audioWarning, audioDanger });
    res.send('Audio cleared');
});

app.get('/api/audio', (req, res) => {
    res.json({ audioEnd, audioWarning, audioDanger });
});

app.get('/api/companion', (req, res) => {
    const active = state.mode === 'countup' ? state.countupTime : state.timeLeft;
    const abs = Math.abs(active);
    const timeStr = (active < 0 ? '-' : '') +
        Math.floor(abs / 60).toString().padStart(2, '0') + ':' +
        (abs % 60).toString().padStart(2, '0');

    const overTimeStr = active < 0
        ? '+' + Math.floor(abs / 60).toString().padStart(2, '0') + ':' + (abs % 60).toString().padStart(2, '0')
        : '';

    res.json({
        time: timeStr,
        running: state.isRunning,
        msg_active: state.showMessage,
        raw_seconds: active,
        over_time: overTimeStr,
        mode: state.mode,
        alertLevel: state.alertLevel,
        messages: quickMessages,
        agendaActive: state.agendaActive,
        agendaName: state.agendaName,
        agendaTimeLeft: state.agendaTimeLeft,
        agendaTotal: state.agendaTotal
    });
});

// --- SESSION LOG API ---
app.get('/api/log', (req, res) => res.json(sessionLog));

app.get('/api/log/export', (req, res) => {
    const rows = ['time,type,label'];
    sessionLog.forEach((e) => {
        rows.push([e.time, e.type, '"' + String(e.label).replace(/"/g, '""') + '"'].join(','));
    });
    res.setHeader('Content-Disposition', 'attachment; filename="smart-timer-pro-session-log.csv"');
    res.setHeader('Content-Type', 'text/csv');
    res.send(rows.join('\r\n'));
});

app.get('/api/log/clear', (req, res) => {
    sessionLog = [];
    if (sessionLogFile) {
        try { fs.writeFileSync(sessionLogFile, JSON.stringify([])); } catch (e) {}
    }
    res.send('Log cleared');
});

// --- SOCKET.IO ---
io.on('connection', (socket) => {
    state.settings = publicSettings();
    socket.emit('stateUpdate', state);
    socket.emit('messagesUpdate', quickMessages);
    socket.emit('settingsUpdate', publicSettings());
    socket.emit('audioUpdate', { audioEnd, audioWarning, audioDanger });
});

// --- STATIC FILES ---
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

function ensureCertificate(dir) {
    const forge = require('node-forge');
    const certFile = path.join(dir, 'https-cert.pem');
    const keyFile = path.join(dir, 'https-key.pem');
    if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
        return { cert: fs.readFileSync(certFile, 'utf8'), key: fs.readFileSync(keyFile, 'utf8') };
    }
    const pki = forge.pki;
    const keys = pki.rsa.generateKeyPair(2048);
    const cert = pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01' + forge.util.bytesToHex(forge.random.getBytesSync(8));
    cert.validity.notBefore = new Date(Date.now() - 86400000);
    cert.validity.notAfter = new Date(Date.now() + 10 * 365 * 86400000);
    const attrs = [
        { name: 'commonName', value: 'Smart Timer Pro' },
        { name: 'organizationName', value: 'smartchoice' },
    ];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.setExtensions([
        { name: 'basicConstraints', cA: true },
        { name: 'subjectAltName', altNames: [{ type: 2, value: 'localhost' }, { type: 7, ip: '127.0.0.1' }] },
    ]);
    cert.sign(keys.privateKey, forge.md.sha256.create());
    const pemCert = pki.certificateToPem(cert);
    const pemKey = pki.privateKeyToPem(keys.privateKey);
    fs.writeFileSync(certFile, pemCert);
    fs.writeFileSync(keyFile, pemKey);
    return { cert: pemCert, key: pemKey };
}

function startListening() {
    server.on('error', (e) => {
        if (e && e.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use. Is another instance of Smart Timer Pro running?`);
        } else {
            console.error('Server error:', e);
        }
    });

    if (settings.httpsEnabled) {
        try {
            const { key, cert } = ensureCertificate(dataDir);
            httpsServer = https.createServer({ key, cert }, app);
            httpsServer.on('error', server.listeners('error')[0]);
            io.attach(httpsServer);
            httpsServer.listen(PORT, HOST, () => console.log(`Smart Timer Pro secure server running on port ${PORT}`));
            return;
        } catch (e) {
            console.error('Could not start HTTPS, falling back to HTTP:', e);
        }
    }

    server.listen(PORT, HOST, () => console.log(`Smart Timer Pro server running on port ${PORT}`));
}

if (!messagesFile) {
    init({ dataDir: process.env.STP_DATA_DIR || __dirname });
}
startListening();

module.exports = { app, io, state, init, getSettings, startListening, get server() { return httpsServer || server; } };

function getSettings() {
    return settings;
}