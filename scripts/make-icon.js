// Generates assets/icon.png, assets/icon.ico and public/images/logo.png
// from assets/icon.svg (vector source). Run with:
//   npx electron scripts/make-icon.js
// Uses Chromium (Electron) to rasterize the SVG at all Windows icon sizes
// and packs them into a PNG-in-ICO file (Vista+ format, accepted by rcedit
// and by the NSIS installer icon options).

const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SVG = fs.readFileSync(path.join(ROOT, 'assets', 'icon.svg'), 'utf8');
const SIZES = [256, 128, 64, 48, 32, 24, 16];
const TMP_HTML = path.join(os.tmpdir(), 'stp-icon-render.html');

const HTML =
    '<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent;width:100%;height:100%;overflow:hidden}</style></head>' +
    '<body>' + SVG + '</body></html>';

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

let sharedWin = null;

async function rasterize(size) {
    if (!sharedWin) {
        sharedWin = new BrowserWindow({
            width: size,
            height: size,
            show: false,
            frame: false,
            transparent: true,
            webPreferences: { offscreen: true, backgroundThrottling: false },
        });
    } else {
        sharedWin.setSize(size, size);
    }
    await sharedWin.loadFile(TMP_HTML);
    await wait(600);
    const img = await sharedWin.webContents.capturePage({ x: 0, y: 0, width: size, height: size });
    await wait(150);
    return img.toPNG();
}

function writeIco(entries) {
    const count = entries.length;
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(count, 4);
    const dirs = [];
    const blobs = [];
    let offset = 6 + 16 * count;
    for (const { size, data } of entries) {
        const e = Buffer.alloc(16);
        e.writeUInt8(size >= 256 ? 0 : size, 0);
        e.writeUInt8(size >= 256 ? 0 : size, 1);
        e.writeUInt8(0, 2);
        e.writeUInt8(0, 3);
        e.writeUInt16LE(1, 4);
        e.writeUInt16LE(32, 6);
        e.writeUInt32LE(data.length, 8);
        e.writeUInt32LE(offset, 12);
        dirs.push(e);
        blobs.push(data);
        offset += data.length;
    }
    return Buffer.concat([header, ...dirs, ...blobs]);
}

app.whenReady().then(async () => {
    try {
        fs.writeFileSync(TMP_HTML, HTML);
        const pngs = [];
        for (const size of SIZES) {
            const png = await rasterize(size);
            pngs.push({ size, data: png });
            console.log('rendered', size + 'px', png.length, 'bytes');
        }

        const png256 = pngs.find((p) => p.size === 256).data;
        fs.writeFileSync(path.join(ROOT, 'assets', 'icon.png'), png256);
        fs.writeFileSync(path.join(ROOT, 'public', 'images', 'logo.png'), png256);
        fs.writeFileSync(path.join(ROOT, 'assets', 'icon.ico'), writeIco(pngs));

        console.log('PNG color type:', png256[25], '(6 = RGBA)');
        console.log('OK: assets/icon.png, assets/icon.ico, public/images/logo.png');
    } catch (e) {
        console.error('make-icon failed:', e && e.stack || e);
    }
    app.exit(0);
});
