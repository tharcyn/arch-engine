import * as crypto from 'node:crypto';
import { SnapshotEnvelope } from './types.js';
import { stableCanonicalStringify } from './stableCanonicalStringify.js';
import { computeCapabilityDescriptorMatrixHash } from './capabilityDescriptorMatrixHash.js';

export const SNAPSHOT_STRUCTURE_HASH_VERSION = 'v1';

/**
 * Phase 4.13 Objective 4 / Phase 8.6 Fix: SnapshotEnvelope Structural Digest Surface
 *
 * Computes SHA256 of the sorted field name set on the SnapshotEnvelope + the
 * global Capability Matrix Hash.
 * Detects schema drift across engines, unexpected envelope evolution,
 * and capability disparity bridging mismatches between nodes.
 *
 * Transport-diagnostic only. Must NOT feed into PolicyStackFingerprint
 * or extendedPolicyStackFingerprint.
 */
export function computeSnapshotEnvelopeStructureHash(envelope: SnapshotEnvelope): string {
  const fieldNames = Object.keys(envelope).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  const matrixHash = computeCapabilityDescriptorMatrixHash();
  
  return crypto.createHash('sha256')
    .update(stableCanonicalStringify(fieldNames))
    .update(matrixHash)
    .digest('hex');
}

export const structureHashInputs = {
  capabilityDescriptorMatrixHashIncluded: true,
  capabilityMatrixCanonicalizationVersionIncluded: true
};
