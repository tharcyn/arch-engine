import { PolicyStackEntry } from '../policy/types.js';
import { isDeeplyFrozen } from './deepFreezeDeterministic.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';

export const METADATA_IMMUTABILITY_CONTRACT_VERSION = 'v1';

/**
 * Phase 4.12 Objective 4: Deep Immutability Certification Surface
 *
 * Verifies after pipeline completion that all loader-produced metadata
 * is deeply frozen. Returns deterministic boolean or throws.
 */
export function certifyLoaderMetadataImmutability(
  entries: PolicyStackEntry[],
  rootEntry: PolicyStackEntry
): void {
  // Root executionMetadata must be deeply frozen
  if (!isDeeplyFrozen(rootEntry.executionMetadata)) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.LOADER_METADATA_NOT_DEEPLY_FROZEN,
      message: `Root entry executionMetadata is not deeply frozen. ` +
        `Contract: ${METADATA_IMMUTABILITY_CONTRACT_VERSION}`,
      stage: 'metadataImmutabilityCertification'
    });
  }

  // SnapshotEnvelope must be deeply frozen
  if (rootEntry.executionMetadata?.snapshotEnvelope) {
    if (!isDeeplyFrozen(rootEntry.executionMetadata.snapshotEnvelope)) {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.LOADER_METADATA_NOT_DEEPLY_FROZEN,
        message: `SnapshotEnvelope is not deeply frozen. ` +
          `Contract: ${METADATA_IMMUTABILITY_CONTRACT_VERSION}`,
        stage: 'metadataImmutabilityCertification'
      });
    }
  }

  // All entries' executionMetadata must be deeply frozen
  for (const entry of entries) {
    if (entry.executionMetadata && !isDeeplyFrozen(entry.executionMetadata)) {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.LOADER_METADATA_NOT_DEEPLY_FROZEN,
        message: `Entry "${entry.policyNamespace || ''}/${entry.policyId}" executionMetadata is not deeply frozen. ` +
          `Contract: ${METADATA_IMMUTABILITY_CONTRACT_VERSION}`,
        stage: 'metadataImmutabilityCertification',
        policyId: entry.policyId,
        policyNamespace: entry.policyNamespace
      });
    }
  }
}
