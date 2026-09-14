const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

const type = (process.argv[2] || 'minor').toLowerCase();
const [major, minor, patch] = pkg.version.split('.').map(Number);

if (type === 'major') {
    pkg.version = `${major + 1}.0.0`;
} else if (type === 'minor') {
    pkg.version = `${major}.${minor + 1}.0`;
} else if (type === 'patch') {
    pkg.version = `${major}.${minor}.${patch + 1}`;
} else {
    console.error(`Unknown bump type "${type}". Use: patch | minor | major`);
    process.exit(1);
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Version bumped (${type}): ${pkg.version}`);
