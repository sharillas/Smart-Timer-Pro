const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// electron-builder's internal rcedit step fails on this machine (winCodeSign
// cache extraction requires symlinks). This hook patches the icon directly
// with rcedit-x64.exe from the extracted cache, right after packaging and
// before the installer is built.
exports.default = async function afterPack(context) {
    if (context.electronPlatformName !== 'win32') return;

    const exePath = path.join(context.appOutDir, 'Smart Timer Pro.exe');
    if (!fs.existsSync(exePath)) {
        console.log('afterPack: executable not found, skipping icon patch');
        return;
    }

    const ico = path.join(context.packager.projectDir, 'assets', 'icon.ico');
    if (!fs.existsSync(ico)) {
        console.log('afterPack: icon.ico not found');
        return;
    }

    const cacheRoot = path.join(os.homedir(), 'AppData', 'Local', 'electron-builder', 'Cache', 'winCodeSign');
    let rcedit = null;
    if (fs.existsSync(cacheRoot)) {
        for (const d of fs.readdirSync(cacheRoot)) {
            const p = path.join(cacheRoot, d, 'rcedit-x64.exe');
            if (fs.existsSync(p)) {
                rcedit = p;
                break;
            }
        }
    }
    if (!rcedit) {
        console.log('afterPack: rcedit-x64.exe not found in cache, skipping icon patch');
        return;
    }

    try {
        execFileSync(rcedit, [exePath, '--set-icon', ico], { stdio: 'pipe' });
        console.log('afterPack: icon patched on', exePath);
    } catch (e) {
        console.error('afterPack: icon patch failed', e.message);
    }
};
