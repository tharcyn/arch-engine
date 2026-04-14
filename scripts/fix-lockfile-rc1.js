/**
 * Historical helper script used during early release-candidate staging (rc.1).
 *
 * Purpose:
 * Normalized package-lock.json workspace dependency version alignment
 * before RC constellation stabilization.
 *
 * Scope:
 * This script is NOT part of the runtime system.
 * This script is NOT part of the CLI execution surface.
 * This script is NOT used by adapter negotiation.
 * This script is NOT used by snapshot replay validation.
 * This script is NOT used by closureGraphHash computation.
 * This script is NOT executed during build, pack, or publish steps.
 *
 * Status:
 * Retained only for historical reproducibility of early dependency alignment.
 *
 * Safe to delete after v1.0.0 stable if no longer required.
 */
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
