const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '..', 'public');

test('frontend scripts parse (index.html)', () => {
    const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
    const scripts = html.match(/<script>([\s\S]*?)<\/script>/g) || [];
    assert.ok(scripts.length > 0, 'expected at least one script block');
    for (const s of scripts) {
        const code = s.replace(/<\/?script>/g, '');
        assert.doesNotThrow(() => new Function(code), 'index.html script must parse');
    }
});

test('frontend scripts parse (presenter.html)', () => {
    const html = fs.readFileSync(path.join(publicDir, 'presenter.html'), 'utf8');
    const scripts = html.match(/<script>([\s\S]*?)<\/script>/g) || [];
    assert.ok(scripts.length > 0, 'expected at least one script block');
    for (const s of scripts) {
        const code = s.replace(/<\/?script>/g, '');
        assert.doesNotThrow(() => new Function(code), 'presenter.html script must parse');
    }
});

test('main.js and companion module parse', () => {
    const root = path.join(__dirname, '..');
    for (const f of ['main.js', 'server.js', 'preload.js', 'companion/smart-timer-pro/main.js']) {
        assert.doesNotThrow(() => new Function(fs.readFileSync(path.join(root, f), 'utf8')), f + ' must parse');
    }
});
