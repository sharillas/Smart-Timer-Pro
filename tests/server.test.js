const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PORT = 32123;
const BASE = `http://127.0.0.1:${PORT}`;
let serverProc = null;
let dataDir = null;

function api(path, opts = {}) {
    return fetch(BASE + path, opts);
}

function json(path, opts = {}) {
    return api(path, opts).then(async (r) => {
        const body = await r.text();
        return { status: r.status, body: body ? JSON.parse(body) : null };
    });
}

before(async () => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stp-test-'));
    serverProc = spawn(process.execPath, ['server.js'], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env, PORT: String(PORT), STP_DATA_DIR: dataDir, HOST: '127.0.0.1' },
        stdio: 'ignore',
    });

    // Wait for the server to come up
    for (let i = 0; i < 40; i++) {
        try {
            await api('/api/state', { signal: AbortSignal.timeout(500) });
            return;
        } catch (e) {
            await new Promise((r) => setTimeout(r, 250));
        }
    }
    throw new Error('Server did not start');
});

after(() => {
    if (serverProc) serverProc.kill();
    if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
});

test('state endpoint responds', async () => {
    const r = await json('/api/state');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.mode, 'countdown');
});

test('countdown runs and stops at zero (drift engine)', async () => {
    await api('/api/reset?sec=2');
    await api('/api/start');
    await new Promise((r) => setTimeout(r, 2600));
    const r = await json('/api/state');
    assert.strictEqual(r.body.timeLeft, 0);
    assert.strictEqual(r.body.isRunning, false);
});

test('add/subtract and reset', async () => {
    await api('/api/reset?sec=60');
    await api('/api/add?sec=30');
    let r = await json('/api/state');
    assert.strictEqual(r.body.timeLeft, 90);
    await api('/api/add?sec=-10');
    r = await json('/api/state');
    assert.strictEqual(r.body.timeLeft, 80);
});

test('quick messages CRUD', async () => {
    await api('/api/messages/remove?index=0');
    let r = await json('/api/messages');
    const before = r.body.length;
    await api('/api/messages/add?text=' + encodeURIComponent('Hello Test'));
    r = await json('/api/messages');
    assert.strictEqual(r.body.length, before + 1);
    const idx = r.body.indexOf('Hello Test');
    await api('/api/messages/edit?index=' + idx + '&text=' + encodeURIComponent('Edited'));
    r = await json('/api/messages');
    assert.strictEqual(r.body[idx], 'Edited');
});

test('agenda flow with auto-advance', async () => {
    await api('/api/agenda/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Opening', seconds: 2 }),
    });
    await api('/api/agenda/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Keynote', seconds: 3 }),
    });
    let r = await json('/api/agenda');
    assert.strictEqual(r.body.items.length, 2);

    await api('/api/agenda/start');
    await new Promise((r) => setTimeout(r, 2500));
    r = await json('/api/state');
    assert.strictEqual(r.body.agendaActive, true);
    assert.strictEqual(r.body.agendaName, 'Keynote');

    await api('/api/agenda/stop');
    r = await json('/api/state');
    assert.strictEqual(r.body.agendaActive, false);
});

test('audio upload (danger slot)', async () => {
    await api('/api/audio/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'danger', audio: 'data:audio/wav;base64,AA==' }),
    });
    const r = await json('/api/audio');
    assert.ok(r.body.audioDanger);
});

test('profile export/import roundtrip', async () => {
    await api('/api/messages/add?text=' + encodeURIComponent('ProfileMsg'));
    const r = await json('/api/profile/export');
    assert.ok(r.body.settings);
    assert.ok(Array.isArray(r.body.quickMessages));
    await api('/api/messages/remove?index=0');
    const before = await json('/api/messages');
    await api('/api/profile/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(r.body),
    });
    const after = await json('/api/messages');
    assert.ok(after.body.length >= before.body.length);
});

test('CSRF: foreign origin blocked', async () => {
    let r = await api('/api/reset?sec=5', { headers: { Origin: 'http://evil.com' } });
    assert.strictEqual(r.status, 403);
    r = await api('/api/reset?sec=5', { headers: { Origin: BASE } });
    assert.strictEqual(r.status, 200);
    r = await api('/api/state');
    assert.strictEqual(r.status, 200);
});

test('undo restores previous state', async () => {
    await api('/api/reset?sec=300');
    await api('/api/start');
    await api('/api/reset?sec=99');
    let r = await json('/api/state');
    assert.strictEqual(r.body.timeLeft, 99);
    r = await api('/api/undo');
    assert.strictEqual(r.status, 200);
    r = await json('/api/state');
    assert.strictEqual(r.body.timeLeft, 300);
});

test('session log records events and exports CSV', async () => {
    await api('/api/log/clear');
    await api('/api/reset?sec=10');
    await api('/api/start');
    const r = await json('/api/log');
    assert.ok(Array.isArray(r.body));
    assert.ok(r.body.some((e) => e.type === 'reset'));
    assert.ok(r.body.some((e) => e.type === 'start'));
    const csv = await api('/api/log/export');
    assert.strictEqual(csv.status, 200);
    const text = await csv.text();
    assert.ok(text.startsWith('time,type,label'));
});

test('prestart mode and undo on mode change', async () => {
    await api('/api/mode?set=prestart');
    let r = await json('/api/state');
    assert.strictEqual(r.body.mode, 'prestart');
    r = await api('/api/undo');
    assert.strictEqual(r.status, 200);
});

test('prestart mode keeps the countdown ticking', async () => {
    await api('/api/reset?sec=3');
    await api('/api/start');
    await new Promise((r) => setTimeout(r, 500));
    await api('/api/mode?set=prestart');
    await new Promise((r) => setTimeout(r, 1200));
    const r = await json('/api/state');
    assert.strictEqual(r.body.mode, 'prestart');
    assert.ok(r.body.timeLeft < 3, 'prestart should keep counting down');
    await api('/api/mode?set=countdown');
    await api('/api/pause');
});

test('PIN protection', async () => {
    // Set PIN
    let r = await api('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiPin: '1234' }),
    });
    assert.strictEqual(r.status, 200);

    // Control without PIN -> 401
    r = await api('/api/reset?sec=10');
    assert.strictEqual(r.status, 401);

    // Control with PIN -> 200
    r = await api('/api/reset?sec=10&pin=1234');
    assert.strictEqual(r.status, 200);

    // Read-only stays open
    r = await api('/api/state');
    assert.strictEqual(r.status, 200);
    r = await api('/api/companion');
    assert.strictEqual(r.status, 200);

    // PIN never leaks in settings
    const s = await json('/api/settings');
    assert.strictEqual(s.body.apiPin, undefined);
    assert.strictEqual(s.body.apiPinEnabled, true);

    // Clear PIN (requires PIN)
    r = await api('/api/settings?pin=1234', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiPin: '' }),
    });
    assert.strictEqual(r.status, 200);
    r = await api('/api/reset?sec=5');
    assert.strictEqual(r.status, 200);
});
