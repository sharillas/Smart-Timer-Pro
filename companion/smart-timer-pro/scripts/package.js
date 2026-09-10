const fs = require('fs');
const path = require('path');
const tar = require('tar');

const root = path.resolve(__dirname, '..');
const pkgDir = path.join(root, 'pkg');
const companionDir = path.join(pkgDir, 'companion');

// 1. Ensure pkg/companion exists and copy manifest
if (!fs.existsSync(companionDir)) {
    fs.mkdirSync(companionDir, { recursive: true });
}
fs.copyFileSync(
    path.join(root, 'companion', 'manifest.json'),
    path.join(companionDir, 'manifest.json')
);

// 2. Modify manifest
const frameworkPkg = JSON.parse(
    fs.readFileSync(path.join(root, 'node_modules', '@companion-module', 'base', 'package.json'), 'utf8')
);
const manifest = JSON.parse(fs.readFileSync(path.join(companionDir, 'manifest.json'), 'utf8'));
manifest.runtime.entrypoint = '../main.js';
manifest.version = '1.0.0';
manifest.runtime.api = 'nodejs-ipc';
manifest.runtime.apiVersion = frameworkPkg.version;
fs.writeFileSync(path.join(companionDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

// 3. Create minimal package.json in pkg/
const pkgJson = {
    name: manifest.name,
    version: manifest.version,
    license: manifest.license,
    type: 'commonjs',
    dependencies: {}
};
fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify(pkgJson, null, 2));

// 4. Copy HELP.md to pkg/
fs.copyFileSync(path.join(root, 'HELP.md'), path.join(pkgDir, 'HELP.md'));

// 5. Create .tgz
const outStream = fs.createWriteStream(path.join(root, 'pkg.tgz'));
tar.create({ gzip: true, cwd: root }, ['pkg']).pipe(outStream);
outStream.on('finish', () => {
    console.log('pkg.tgz created successfully');
});
outStream.on('error', (e) => {
    console.error('Failed to create tgz:', e);
});
