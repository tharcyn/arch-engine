import { PolicyStackEntry } from '../policy/types.js';
import { SnapshotEnvelope, LOADER_PROTOCOL_VERSION, SNAPSHOT_ENVELOPE_VERSION } from '../transport/types.js';
import { enforcePlannerBoundary } from '../transport/enforcePlannerBoundary.js';
import { assertCompositionRuntimeCompatibility } from './assertCompositionRuntimeCompatibility.js';
import { COMPOSITION_RUNTIME_CAPABILITIES } from './compositionRuntimeCapabilityDescriptor.js';
import { LOADER_PROTOCOL_CAPABILITIES } from '../transport/loaderProtocolCapabilityDescriptor.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';

export const COMPOSITION_RUNTIME_ENTRY_VERSION = 'v1';

/**
 * Phase 5 Objective 1: Composition Runtime Entry Boundary
 *
 * Guarantees runtime safety before planner execution begins. Validates loader payload,
 * certifies boundary compliance, and strictly enforces compatibility mode.
 */
export function compositionRuntimeEntry(
  entries: PolicyStackEntry[],
  rootEntry: PolicyStackEntry
): void {
  // Extract envelope implicitly via executionMetadata
  const envelope = rootEntry.executionMetadata?.snapshotEnvelope;
  if (!envelope) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.COMPOSITION_RUNTIME_ENTRY_INCOMPATIBLE_PROTOCOL,
      message: `Composition runtime entry failed: root entry missing SnapshotEnvelope. ` +
        `Contract: ${COMPOSITION_RUNTIME_ENTRY_VERSION}`,
      stage: 'compositionRuntimeEntry'
    });
  }

  // 1. Verify plannerBoundaryContract / authoritative surfaces
  enforcePlannerBoundary(entries, rootEntry);

  // 2. Assert protocol capability compatibility
  assertCompositionRuntimeCompatibility(LOADER_PROTOCOL_CAPABILITIES, COMPOSITION_RUNTIME_CAPABILITIES);

  // 3. Assert SnapshotEnvelopeVersion supported
  if (envelope.snapshotEnvelopeVersion !== SNAPSHOT_ENVELOPE_VERSION) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.COMPOSITION_RUNTIME_ENTRY_INCOMPATIBLE_PROTOCOL,
      message: `Composition runtime entry failed: SnapshotEnvelope version "${envelope.snapshotEnvelopeVersion}" ` +
        `not supported. Expected "${SNAPSHOT_ENVELOPE_VERSION}". ` +
        `Contract: ${COMPOSITION_RUNTIME_ENTRY_VERSION}`,
      stage: 'compositionRuntimeEntry'
    });
  }

  // 4. Assert LOADER_PROTOCOL_VERSION compatible
  if (envelope.loaderProtocolVersion !== LOADER_PROTOCOL_VERSION) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.COMPOSITION_RUNTIME_ENTRY_INCOMPATIBLE_PROTOCOL,
      message: `Composition runtime entry failed: loader protocol version "${envelope.loaderProtocolVersion}" ` +
        `not supported. Expected "${LOADER_PROTOCOL_VERSION}". ` +
        `Contract: ${COMPOSITION_RUNTIME_ENTRY_VERSION}`,
      stage: 'compositionRuntimeEntry'
    });
  }
}
