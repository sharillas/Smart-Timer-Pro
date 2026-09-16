// Generates the README screenshots (run with: node scripts/capture-screenshots.js)
// Starts a temporary server (temp data dir, port 32126), populates demo state,
// and captures the pages with Electron.

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const BASE = 'http://127.0.0.1:32126';
const OUT = path.join(__dirname, '..', 'assets');

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function api(url, opts) {
    opts = opts || {};
    opts.signal = AbortSignal.timeout(8000);
    try {
        return await fetch(BASE + url, opts);
    } catch (e) {
        console.log('  API FAILED', url, e && e.message);
        throw e;
    }
}

let win = null;

async function capture(url, file, width, height, prep = null, delay = 1200) {
    if (!win) {
        win = new BrowserWindow({
            width,
            height,
            show: false,
            webPreferences: { backgroundThrottling: false, offscreen: true },
        });
    } else {
        win.setSize(width, height);
    }
    await win.loadURL(url);
    if (prep) {
        try { await win.webContents.executeJavaScript(prep); } catch (e) { console.error('prep error', e); }
    }
    await wait(delay);
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(OUT, file), img.toPNG());
    console.log('captured', file);
}

app.whenReady().then(async () => {
    process.env.PORT = '32126';
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stp-shots-'));
    process.env.STP_DATA_DIR = dataDir;
    require('../server.js');
    await wait(800);

    // --- populate demo data ---
    await api('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            warningThreshold: 120,
            dangerThreshold: 30,
            prestartLabel: 'STARTS IN',
        }),
    });

    // quick messages
    await api('/api/messages/add?text=' + encodeURIComponent('Wrap Up Now'));
    await api('/api/messages/add?text=' + encodeURIComponent('Q&A Starting'));
    await api('/api/messages/add?text=' + encodeURIComponent('5 Minutes Left'));
    await api('/api/messages/add?text=' + encodeURIComponent('Speak Up'));

    // agenda
    await api('/api/agenda/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Opening', seconds: 900 }),
    });
    await api('/api/agenda/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Keynote', seconds: 2700 }),
    });
    await api('/api/agenda/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Q&A', seconds: 600 }),
    });

    // --- 1. GUI main (default) ---
    console.log('step 1');
    await api('/api/reset?sec=600');
    await api('/api/mode?set=countdown');
    await capture(BASE + '/', 'screenshot_GUI_1.png', 1280, 850);

    // --- 2. GUI agenda active + message live + semaforo ---
    console.log('step 2');
    await api('/api/reset?sec=92');
    console.log('step 2b');
    await api('/api/indicator?type=semaforo&action=on');
    console.log('step 2c');
    await api('/api/message/trigger?index=1');
    console.log('step 2d');
    await api('/api/agenda/start?index=1');
    console.log('step 2e');
    await capture(BASE + '/', 'screenshot_GUI_2.png', 1280, 850);

    // --- 3. Settings modal ---
    console.log('step 3');
    await api('/api/message/hide');
    await api('/api/agenda/stop');
    await api('/api/mode?set=countdown');
    await capture(BASE + '/', 'screenshot_settings.png', 1280, 850, 'openSettings(); true', 1500);

    // --- 4. Presenter countdown (green) ---
    console.log('step 4');
    await api('/api/reset?sec=300');
    await api('/api/mode?set=countdown');
    await capture(BASE + '/presenter.html', 'screenshot_presenter.png', 1280, 720);

    // --- 5. Presenter warning + semaforo + message ---
    console.log('step 5');
    await api('/api/reset?sec=90');
    await api('/api/indicator?type=semaforo&action=on');
    await api('/api/message/trigger?index=2');
    await capture(BASE + '/presenter.html', 'screenshot_External_Monitor_Smaforo.png', 1280, 720);

    // --- 6. Presenter prestart ---
    console.log('step 6');
    await api('/api/message/hide');
    await api('/api/indicator?type=semaforo&action=off');
    await api('/api/reset?sec=120');
    await api('/api/mode?set=prestart');
    await capture(BASE + '/presenter.html', 'screenshot_prestart.png', 1280, 720);

    // --- 7. Remote page (mobile size) ---
    console.log('step 7');
    await api('/api/mode?set=countdown');
    await api('/api/reset?sec=90');
    await capture(BASE + '/remote.html', 'screenshot_remote.png', 480, 820);

    console.log('done');
    app.exit(0);
});
