const fs = require('fs');
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));

lock.version = "1.0.0-rc.1";

for (const pkgName in lock.packages) {
  if (pkgName === "" || pkgName.startsWith("packages/")) {
    lock.packages[pkgName].version = "1.0.0-rc.1";
    if (lock.packages[pkgName].dependencies) {
      if (lock.packages[pkgName].dependencies["@arch-engine/core"]) {
        lock.packages[pkgName].dependencies["@arch-engine/core"] = "1.0.0-rc.1";
      }
      if (lock.packages[pkgName].dependencies["@arch-engine/schema"]) {
        // preserve the prefix if needed
        const current = lock.packages[pkgName].dependencies["@arch-engine/schema"];
        lock.packages[pkgName].dependencies["@arch-engine/schema"] = current.startsWith("^") ? "^1.0.0-rc.1" : "1.0.0-rc.1";
      }
    }
  }
}

fs.writeFileSync('package-lock.json', JSON.stringify(lock, null, 2) + "\n");
console.log("Fixed package-lock.json");
