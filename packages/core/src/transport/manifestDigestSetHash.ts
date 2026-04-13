import * as crypto from 'node:crypto';
import { PolicyStackEntry } from '../policy/types.js';
import { stableCanonicalStringify } from './stableCanonicalStringify.js';

export const MANIFEST_DIGEST_SET_HASH_VERSION = 'v1';

/**
 * Phase 4.10 Task 2: Manifest Digest Aggregation Surface
 *
 * Computes a deterministic hash representing the entire manifest identity set
 * across all resolved stack entries. Each entry contributes its own manifest
 * digest (SHA256 of its raw hash + version). The aggregate is a sorted,
 * canonically-serialized set hashed via SHA256.
 *
 * Purpose:
 * - Mirror drift detection
 * - Policy evolution simulation correctness
 * - Planner cache invalidation accuracy
 * - Cross-snapshot manifest equivalence comparison
 *
 * Does NOT replace closureGraphHash, trustScopeHash, or trustPolicyHash.
 */
export function computeManifestDigest(entry: PolicyStackEntry): string {
  // Manifest digest = SHA256 of the entry's identity surface
  const payload = {
    hash: entry.hash,
    policyId: entry.policyId,
    policyNamespace: entry.policyNamespace || '',
    version: entry.config.version || 1
  };
  return crypto.createHash('sha256').update(stableCanonicalStringify(payload)).digest('hex');
}

export function computeManifestDigestSetHash(entries: PolicyStackEntry[]): string {
  const digests = entries.map(e => computeManifestDigest(e))
    .sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

  const payload = { digests };
  const canonicalString = stableCanonicalStringify(payload);
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}
