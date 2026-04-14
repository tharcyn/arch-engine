const fs = require('fs');
const path = require('path');

const packagesDir = path.join(__dirname, '../packages');
const dirs = fs.readdirSync(packagesDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => path.join(packagesDir, d.name, 'package.json'));

const pkgPaths = [
  ...dirs,
  path.join(__dirname, '../package.json'),
  path.join(__dirname, '../action/package.json'),
];

for (const p of pkgPaths) {
  if (!fs.existsSync(p)) continue;
  const json = JSON.parse(fs.readFileSync(p, 'utf-8'));
  
  if (json.version && (json.name.startsWith('@arch-engine') || json.name === 'arch-engine-root' || json.name === 'arch-engine-action' || json.name === 'arch-engine-schema')) {
    json.version = '1.0.0';
  }
  
  for (const group of ['dependencies', 'devDependencies', 'peerDependencies']) {
    if (json[group]) {
      for (const [dep, ver] of Object.entries(json[group])) {
        if (dep.startsWith('@arch-engine/')) {
          json[group][dep] = '^1.0.0';
        }
      }
    }
  }
  fs.writeFileSync(p, JSON.stringify(json, null, 2) + '\n', 'utf-8');
}
console.log('Bumped all @arch-engine packages to 1.0.0');
