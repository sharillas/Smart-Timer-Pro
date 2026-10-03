// Generates the app icons from the vector sources in assets/:
//   assets/icon.svg       -> assets/icon.png (window/tray, blue) and
//                            assets/icon.ico (installer/exe/shortcuts, blue,
//                            boosted stroke widths at small sizes so the
//                            shortcuts stay sharp)
//   assets/icon-white.svg -> public/images/logo.png (in-app header, white,
//                            stands out on the dark app background)
//   favicon               -> public/favicon-16.png + public/favicon-32.png
// Rendering: the SVG is rasterized once at 1024px and every target size is
// downscaled with the Electron high-quality resampler (Lanczos) so the small
// sizes keep their definition.
// Run with:  npm run icon

const { app, BrowserWindow, nativeImage } = require('electron');
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

const SUPERSAMPLE = 1024;
const TMP_HTML = path.join(os.tmpdir(), 'stp-icon-render.html');

function boostStrokes(svg, factor) {
    if (factor === 1) return svg;
    return svg.replace(/stroke-width:([0-9.]+)px/g, (m, w) => {
        const v = parseFloat(w) * factor;
        return 'stroke-width:' + v.toFixed(3) + 'px';
    });
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

let sharedWin = null;

async function rasterizeLarge(svg) {
    const html =
        '<!doctype html><html><head><style>html,body{margin:0;padding:0;background:transparent;width:100%;height:100%;overflow:hidden}</style></head>' +
        '<body>' + svg + '</body></html>';
    fs.writeFileSync(TMP_HTML, html);
    if (!sharedWin) {
        sharedWin = new BrowserWindow({
            width: SUPERSAMPLE,
            height: SUPERSAMPLE,
            show: false,
            frame: false,
            transparent: true,
            webPreferences: { offscreen: true, backgroundThrottling: false },
        });
    } else {
        sharedWin.setSize(SUPERSAMPLE, SUPERSAMPLE);
    }
    await sharedWin.loadFile(TMP_HTML);
    await wait(700);
    const img = await sharedWin.webContents.capturePage({ x: 0, y: 0, width: SUPERSAMPLE, height: SUPERSAMPLE });
    await wait(150);
    return img.toPNG();
}

function downscale(pngLarge, size) {
    return nativeImage
        .createFromBuffer(pngLarge)
        .resize({ width: size, height: size, quality: 'best' })
        .toPNG();
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

// PNG-based ICNS for macOS (accepted by Finder/Dock/electron-builder)
function writeIcns(entries) {
    const typeBySize = { 16: 'icp4', 32: 'icp5', 64: 'icp6', 128: 'ic07', 256: 'ic08', 512: 'ic09', 1024: 'ic10' };
    const header = Buffer.alloc(8);
    header.write('icns', 0, 'ascii');
    const parts = [header];
    let total = 8;
    for (const { size, data } of entries) {
        const type = typeBySize[size];
        if (!type) continue;
        const chunk = Buffer.alloc(8 + data.length);
        chunk.write(type, 0, 'ascii');
        chunk.writeUInt32BE(8 + data.length, 4);
        data.copy(chunk, 8);
        parts.push(chunk);
        total += chunk.length;
    }
    const out = Buffer.alloc(total);
    let off = 0;
    for (const p of parts) {
        p.copy(out, off);
        off += p.length;
    }
    out.writeUInt32BE(total, 4);
    return out;
}

app.whenReady().then(async () => {
    try {
        const largeBlue = await rasterizeLarge(SVG_BLUE);
        const largeWhite = await rasterizeLarge(SVG_WHITE);

        // window / tray icon (blue)
        fs.writeFileSync(path.join(ROOT, 'assets', 'icon.png'), downscale(largeBlue, 256));

        // in-app header logo (white)
        fs.writeFileSync(path.join(ROOT, 'public', 'images', 'logo.png'), downscale(largeWhite, 256));

        // favicons
        fs.writeFileSync(path.join(ROOT, 'public', 'favicon-32.png'), downscale(largeBlue, 32));
        fs.writeFileSync(path.join(ROOT, 'public', 'favicon-16.png'), downscale(largeBlue, 16));

        // ico with boosted small sizes (installer, exe, shortcuts)
        const icoPngs = [];
        for (const { size, boost } of ICO_SIZES) {
            const png = boost === 1
                ? downscale(largeBlue, size)
                : downscale(await rasterizeLarge(boostStrokes(SVG_BLUE, boost)), size);
            icoPngs.push({ size, data: png });
            console.log('ico', size + 'px', 'boost ' + boost, png.length, 'bytes');
        }
        fs.writeFileSync(path.join(ROOT, 'assets', 'icon.ico'), writeIco(icoPngs));

        // macOS icon (PNG-based icns)
        const icnsPngs = [16, 32, 64, 128, 256, 512, 1024].map((s) => ({
            size: s,
            data: s === 1024 ? largeBlue : downscale(largeBlue, s)
        }));
        fs.writeFileSync(path.join(ROOT, 'assets', 'icon.icns'), writeIcns(icnsPngs));

        console.log('OK: assets/icon.png, assets/icon.ico, assets/icon.icns, public/images/logo.png, public/favicon-16/32.png');
    } catch (e) {
        console.error('make-icon failed:', (e && e.stack) || e);
    }
    app.exit(0);
});
