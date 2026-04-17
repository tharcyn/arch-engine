import * as fs from 'node:fs';
import * as path from 'node:path';
import type { PolicyRegistryLockEntry, PolicyRegistryLockfile } from '@arch-engine/core';

// Persists resolved remote policy registry metadata
// as a deterministic lock snapshot for CI-stable
// and reviewable governance federation workflows
export function writePolicyRegistryLockfile(
  entries: PolicyRegistryLockEntry[],
  activeDatasetIdentity?: import('@arch-engine/core').PolicyRegistryLockfileDatasetIdentity,
  activeCapabilityManifest?: Record<string, boolean>,
  activeMutationClassRegistry?: Record<string, unknown>,
  activeAuthorityScopeRegistry?: Record<string, unknown>,
  activeSurfaceConfidenceRegistry?: Record<string, unknown>,
  activeTrustBoundaryRules?: Record<string, unknown>
): void {
  const dir = path.resolve(process.cwd(), '.arch-engine');
  const file = path.join(dir, 'policy-lock.json');
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Deterministic ordering: sort entries by registryUrl
  const sortedEntries = [...entries].sort((a, b) => a.registryUrl.localeCompare(b.registryUrl));

  let existingLockfile: PolicyRegistryLockfile | undefined;
  if (fs.existsSync(file)) {
      try {
          existingLockfile = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {}
  }

  const { refreshPolicyRegistryLockfile } = require('@arch-engine/core');
  const result = refreshPolicyRegistryLockfile(sortedEntries, existingLockfile, undefined, activeDatasetIdentity, activeCapabilityManifest, activeMutationClassRegistry, activeAuthorityScopeRegistry, activeSurfaceConfidenceRegistry, activeTrustBoundaryRules);
  const lockfile = result.lockfile;

  const tempFile = path.join(dir, `policy-lock.json.tmp.${Date.now()}`);
  fs.writeFileSync(tempFile, JSON.stringify(lockfile, null, 2) + "\n", 'utf8');
  fs.renameSync(tempFile, file);
}
