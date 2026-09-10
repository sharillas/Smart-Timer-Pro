const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json({ limit: '50mb' }));

const server = http.createServer(app);
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
let dataDir = __dirname;

let quickMessages = ['Wrap Up Now', 'Q&A Starting', '5 Minutes Left', 'Speak Up'];
let logoData = '';

let settings = {
    fontFamily: "'Courier New', monospace",
    colorNormal: '#10b981',
    colorWarning: '#f59e0b',
    colorDanger: '#f97316',
    colorExpired: '#ef4444',
    showHours: true,
    showSeconds: true,
    warningThreshold: 120,
    dangerThreshold: 30,
    stopAtZero: true,
    audioEndEnabled: true,
    audioWarningEnabled: true,
    logoFit: 'contain',
    customPresets: []
};

let audioEnd = '';
let audioWarning = '';

function initPersistence() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    messagesFile = path.join(dataDir, 'messages.json');
    logoFile = path.join(dataDir, 'logo.json');
    settingsFile = path.join(dataDir, 'settings.json');
    audioEndFile = path.join(dataDir, 'audio_end.json');
    audioWarningFile = path.join(dataDir, 'audio_warning.json');

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
    messageIsPermanent: false,
    mode: 'countdown',
    logoData: logoData,
    alertLevel: 'normal',
    activeTime: 600,
    version: appVersion,
    settings: settings
};

let lastAlertLevel = 'normal';
let warningFired = false;
let dangerFired = false;

// --- TICK ENGINE ---
setInterval(() => {
    if (state.isRunning) {
        if (state.mode === 'countdown') {
            if (settings.stopAtZero && state.timeLeft <= 0) {
                state.isRunning = false;
                state.timeLeft = 0;
                broadcast();
                return;
            }
            state.timeLeft--;
        } else if (state.mode === 'countup') {
            state.countupTime++;
        }
        broadcast();
    }
}, 1000);

function computeAlertLevel() {
    if (state.mode === 'countdown' && state.isRunning) {
        if (state.timeLeft <= 0) return 'expired';
        if (state.timeLeft <= settings.dangerThreshold) return 'danger';
        if (state.timeLeft <= settings.warningThreshold) return 'warning';
    }
    if (state.mode === 'countdown' && !state.isRunning && state.timeLeft <= 0) return 'expired';
    return 'normal';
}

function broadcast() {
    const prevAlert = state.alertLevel;
    state.alertLevel = computeAlertLevel();
    state.settings = settings;
    state.activeTime = state.mode === 'countup' ? state.countupTime : state.timeLeft;

    // Audio triggers
    if (state.isRunning && state.mode === 'countdown') {
        if (state.alertLevel === 'expired' && prevAlert !== 'expired') {
            io.emit('audioTrigger', { type: 'end' });
        } else if (state.alertLevel === 'danger' && prevAlert === 'warning') {
            io.emit('audioTrigger', { type: 'danger' });
        } else if (state.alertLevel === 'warning' && prevAlert === 'normal') {
            io.emit('audioTrigger', { type: 'warning' });
        }
    }

    io.emit('stateUpdate', state);
}

// --- API ENDPOINTS ---
app.get('/api/state', (req, res) => res.json(state));

app.get('/api/start', (req, res) => {
    state.isRunning = true;
    warningFired = false;
    dangerFired = false;
    broadcast();
    res.send('Started');
});

app.get('/api/pause', (req, res) => {
    state.isRunning = false;
    broadcast();
    res.send('Paused');
});

app.get('/api/toggle_playback', (req, res) => {
    state.isRunning = !state.isRunning;
    if (state.isRunning) { warningFired = false; dangerFired = false; }
    broadcast();
    res.send(state.isRunning ? 'Started' : 'Paused');
});

app.get('/api/reset', (req, res) => {
    let sec;
    if (req.query.sec !== undefined) {
        sec = parseInt(req.query.sec) || 0;
    } else if (state.mode === 'countup') {
        sec = 0;
    } else {
        sec = state.initialTime;
    }
    state.isRunning = false;
    if (state.mode === 'countup') {
        state.countupTime = sec;
    } else {
        state.timeLeft = sec;
        state.initialTime = sec;
    }
    warningFired = false;
    dangerFired = false;
    broadcast();
    res.send('Reset');
});

app.get('/api/add', (req, res) => {
    const sec = parseInt(req.query.sec) || 0;
    if (state.mode === 'countup') {
        state.countupTime += sec;
    } else {
        state.timeLeft += sec;
    }
    broadcast();
    res.send('Adjusted');
});

app.get('/api/mode', (req, res) => {
    const validModes = ['countdown', 'countup', 'timeofday', 'logo'];
    if (validModes.includes(req.query.set)) {
        state.mode = req.query.set;
        broadcast();
        res.send('Mode updated');
    } else {
        res.status(400).send('Invalid Mode');
    }
});

app.get('/api/message/toggle', (req, res) => {
    state.showMessage = !state.showMessage;
    state.messageIsPermanent = false;
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
        state.message = quickMessages[index];
        state.showMessage = true;
        state.messageIsPermanent = true;
        broadcast();
        res.send('Message Triggered Live');
    } else {
        res.status(400).send('Invalid Message Index');
    }
});

app.get('/api/message/hide', (req, res) => {
    state.showMessage = false;
    state.messageIsPermanent = false;
    broadcast();
    res.send('Message Hidden');
});

app.post('/api/system/logo/upload', (req, res) => {
    if (req.body && req.body.image) {
        state.logoData = req.body.image;
        fs.writeFileSync(logoFile, JSON.stringify({ image: state.logoData }));
        broadcast();
        res.send('Logo Uploaded');
    } else {
        res.status(400).send('No Image Data Received');
    }
});

app.get('/api/system/logo/clear', (req, res) => {
    state.logoData = '';
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
app.get('/api/settings', (req, res) => res.json(settings));

app.post('/api/settings', (req, res) => {
    if (!req.body) return res.status(400).send('Missing body');
    Object.assign(settings, req.body);
    saveSettings();
    state.settings = settings;
    broadcast();
    io.emit('settingsUpdate', settings);
    res.json(settings);
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
    state.settings = settings;
    io.emit('settingsUpdate', settings);
    res.send('Preset added');
});

app.get('/api/presets/remove', (req, res) => {
    const index = parseInt(req.query.index);
    if (!Array.isArray(settings.customPresets)) settings.customPresets = [];
    if (!isNaN(index) && index >= 0 && index < settings.customPresets.length) {
        settings.customPresets.splice(index, 1);
        saveSettings();
        state.settings = settings;
        io.emit('settingsUpdate', settings);
    }
    res.send('Preset removed');
});

function formatPresetLabel(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
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
    } else {
        return res.status(400).send('Invalid audio type');
    }
    io.emit('audioUpdate', { audioEnd, audioWarning });
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
    } else {
        return res.status(400).send('Missing type');
    }
    io.emit('audioUpdate', { audioEnd, audioWarning });
    res.send('Audio cleared');
});

app.get('/api/audio', (req, res) => {
    res.json({ audioEnd, audioWarning });
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
        messages: quickMessages
    });
});

// --- SOCKET.IO ---
io.on('connection', (socket) => {
    state.settings = settings;
    socket.emit('stateUpdate', state);
    socket.emit('messagesUpdate', quickMessages);
    socket.emit('settingsUpdate', settings);
    socket.emit('audioUpdate', { audioEnd, audioWarning });
});

// --- STATIC FILES ---
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
server.listen(PORT, '127.0.0.1', () => console.log(`Smart Timer Pro server running on port ${PORT}`));

if (!messagesFile && dataDir === __dirname) {
    init({});
}

module.exports = { app, server, io, state, init };