// Generates the app icons from the vector sources in assets/:
//   assets/icon.svg       -> assets/icon.png (window/tray, blue) and
//                            assets/icon.ico (installer/exe/shortcuts, blue,
//                            with boosted stroke widths at small sizes so the
//                            shortcuts stay sharp)
//   assets/icon-white.svg -> public/images/logo.png (in-app header, white,
//                            so it stands out on the dark app background)
// Run with:  npm run icon

const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SVG_BLUE = fs.readFileSync(path.join(ROOT, 'assets', 'icon.svg'), 'utf8');
const SVG_WHITE = fs.readFileSync(path.join(ROOT, 'assets', 'icon-white.svg'), 'utf8');

// ico sizes: small sizes get thicker strokes so they stay legible in
// Explorer / Start Menu / desktop shortcuts
const ICO_SIZES = [
    { size: 256, boost: 1.0 },
    { size: 128, boost: 1.0 },
    { size: 96, boost: 1.0 },
    { size: 64, boost: 1.0 },
    { size: 48, boost: 1.2 },
    { size: 32, boost: 1.4 },
    { size: 24, boost: 1.6 },
    { size: 16, boost: 2.0 },
];

const TMP_HTML = path.join(os.tmpdir(), 'stp-icon-render.html');

function boostStrokes(svg, factor) {
    if (factor === 1) return svg;
    return svg.replace(/stroke-width:([0-9.]+)/g, (m, w) => {
        const v = parseFloat(w) * factor;
        return 'stroke-width:' + v.toFixed(3);
    });
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

let sharedWin = null;

async function rasterize(svg, size) {
    const html =
        '<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent;width:100%;height:100%;overflow:hidden}</style></head>' +
        '<body>' + svg + '</body></html>';
    fs.writeFileSync(TMP_HTML, html);
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
        // window / tray icon (blue)
        const pngBlue256 = await rasterize(SVG_BLUE, 256);
        fs.writeFileSync(path.join(ROOT, 'assets', 'icon.png'), pngBlue256);

        // in-app header logo (white, stands out on the dark UI)
        const pngWhite256 = await rasterize(SVG_WHITE, 256);
        fs.writeFileSync(path.join(ROOT, 'public', 'images', 'logo.png'), pngWhite256);

        // ico with boosted small sizes (installer, exe, shortcuts)
        const icoPngs = [];
        for (const { size, boost } of ICO_SIZES) {
            const png = await rasterize(boostStrokes(SVG_BLUE, boost), size);
            icoPngs.push({ size, data: png });
            console.log('ico', size + 'px', 'boost ' + boost, png.length, 'bytes');
        }
        fs.writeFileSync(path.join(ROOT, 'assets', 'icon.ico'), writeIco(icoPngs));

        console.log('OK: assets/icon.png (blue), public/images/logo.png (white), assets/icon.ico');
    } catch (e) {
        console.error('make-icon failed:', (e && e.stack) || e);
    }
    app.exit(0);
});
