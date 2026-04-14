const fs = require('fs');
const path = require('path');

const packagesDir = path.join(__dirname, '../packages');
const dirs = fs.readdirSync(packagesDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => path.join(packagesDir, d.name, 'package.json'));

for (const p of dirs) {
  if (!fs.existsSync(p)) continue;
  const meta = JSON.parse(fs.readFileSync(p, 'utf8'));
  console.log(`--- ${meta.name} ---`);
  console.log(`version: ${meta.version}`);
  if (meta.private) console.log(`ERROR: private=true found!`);
  console.log(`license: ${meta.license}`);
  console.log(`engines.node: ${meta.engines?.node}`);
  console.log(`repository.directory: ${meta.repository?.directory}`);
  console.log(`files: ${JSON.stringify(meta.files)}`);
}
