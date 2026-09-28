const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('child_process');

// electron-builder's rcedit (winCodeSign) needs 7za on PATH to extract its
// cache. Add the bundled 7zip bin dir before building.
const sevenRoot = path.join(os.homedir(), 'AppData', 'Local', 'electron-builder', 'Cache', '7zip@1.0.0');
try {
    const dirs = fs.readdirSync(sevenRoot).filter((d) => {
        const p = path.join(sevenRoot, d);
        return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'bin', '7za.exe'));
    });
    if (dirs.length > 0) {
        const bin = path.join(sevenRoot, dirs[0], 'bin');
        process.env.PATH = bin + path.delimiter + process.env.PATH;
    }
} catch (e) {
    // no 7zip cache yet - let electron-builder handle it
}

const r = spawnSync('npx', ['electron-builder', '--publish', 'never'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
});
process.exit(r.status === null ? 1 : r.status);
