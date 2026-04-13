import * as crypto from 'node:crypto';
import { PolicyStackEntry } from '../policy/types.js';
import { stableCanonicalStringify } from './stableCanonicalStringify.js';

export const CAPABILITY_CLOSURE_CACHE_VERSION = 'v1';

export function computeCapabilityClosureHash(
  entries: PolicyStackEntry[],
  currentEntry: PolicyStackEntry
): string {
  const visited = new Set<string>();
  const deps = new Set<string>();
  
  function traverse(e: PolicyStackEntry) {
    const id = e.policyNamespace + '/' + e.policyId;
    if (visited.has(id)) return;
    visited.add(id);
    deps.add(id);
    
    if (e.config.extends) {
      const extendsArr = Array.isArray(e.config.extends) ? e.config.extends : [e.config.extends];
      for (const ex of extendsArr) {
        const dep = entries.find(x => x.policyId === ex);
        if (dep) traverse(dep);
      }
    }
  }
  traverse(currentEntry);

  const payload = {
    dependencies: Array.from(deps).sort((a,b) => a < b ? -1 : a > b ? 1 : 0),
    policyIdentity: currentEntry.policyNamespace + '/' + currentEntry.policyId,
    transitiveCapabilities: [...(currentEntry.transitiveRequiredCapabilities || [])].sort((a,b) => a < b ? -1 : a > b ? 1 : 0)
  };

  // Phase 4.9: Use stableCanonicalStringify for mechanically enforced key ordering
  const canonicalString = stableCanonicalStringify(payload);
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

export function applyCapabilityClosureCache(
  entries: PolicyStackEntry[],
  currentEntry: PolicyStackEntry
): void {
  const hash = computeCapabilityClosureHash(entries, currentEntry);
  if (!currentEntry.executionMetadata) currentEntry.executionMetadata = {};
  currentEntry.executionMetadata.capabilityClosureHash = hash;
}
