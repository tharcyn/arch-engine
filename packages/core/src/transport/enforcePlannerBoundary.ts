import { PolicyStackEntry } from '../policy/types.js';
import { isDeeplyFrozen } from './deepFreezeDeterministic.js';
import {
  AUTHORITATIVE_LOADER_SURFACES,
  PLANNER_FORBIDDEN_MUTATION_SURFACES,
  PLANNER_BOUNDARY_CONTRACT_VERSION
} from './plannerBoundaryContract.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';

export const PLANNER_BOUNDARY_ENFORCEMENT_VERSION = 'v1';

/**
 * Phase 4.13 Objective 3: Planner Entry Boundary Enforcement Hook
 *
 * Verifies that all loader-owned surfaces are present and immutable
 * before composition runtime consumes them. Prevents accidental misuse
 * by external planners, federated adapters, or future composition modules.
 */
export function enforcePlannerBoundary(
  entries: PolicyStackEntry[],
  rootEntry: PolicyStackEntry
): void {
  // Verify authoritative surfaces present on root
  const meta = rootEntry.executionMetadata;
  if (!meta) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.PLANNER_BOUNDARY_CONTRACT_VIOLATION,
      message: `Planner boundary violation: root entry has no executionMetadata. ` +
        `Contract: ${PLANNER_BOUNDARY_ENFORCEMENT_VERSION}`,
      stage: 'plannerBoundaryEnforcement'
    });
  }

  // Check authoritative surfaces exist
  const missingAuthoritative: string[] = [];
  for (const surface of AUTHORITATIVE_LOADER_SURFACES) {
    const metaKey = surface;
    // Map conceptual surface 'closureGraphHash' to envelope key 'snapshotClosureGraphHash'
    const envKey = surface === 'closureGraphHash' ? 'snapshotClosureGraphHash' : surface;

    const onMeta = metaKey in meta;
    const onEnvelope = meta.snapshotEnvelope && envKey in meta.snapshotEnvelope;
    if (!onMeta && !onEnvelope) {
      missingAuthoritative.push(surface);
    }
  }

  if (missingAuthoritative.length > 0) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.PLANNER_BOUNDARY_CONTRACT_VIOLATION,
      message: `Planner boundary violation: missing authoritative surfaces [${missingAuthoritative.join(', ')}]. ` +
        `Contract: ${PLANNER_BOUNDARY_ENFORCEMENT_VERSION}`,
      stage: 'plannerBoundaryEnforcement'
    });
  }

  // Verify forbidden-mutation surfaces are frozen
  if (!isDeeplyFrozen(rootEntry.executionMetadata)) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.PLANNER_BOUNDARY_CONTRACT_VIOLATION,
      message: `Planner boundary violation: executionMetadata is not deeply frozen. ` +
        `Forbidden-mutation surfaces must be immutable. ` +
        `Contract: ${PLANNER_BOUNDARY_ENFORCEMENT_VERSION}`,
      stage: 'plannerBoundaryEnforcement'
    });
  }

  // Verify all entries have frozen metadata
  for (const entry of entries) {
    if (entry.executionMetadata && !isDeeplyFrozen(entry.executionMetadata)) {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.PLANNER_BOUNDARY_CONTRACT_VIOLATION,
        message: `Planner boundary violation: entry "${entry.policyNamespace || ''}/${entry.policyId}" ` +
          `executionMetadata is not deeply frozen. Contract: ${PLANNER_BOUNDARY_ENFORCEMENT_VERSION}`,
        stage: 'plannerBoundaryEnforcement',
        policyId: entry.policyId,
        policyNamespace: entry.policyNamespace
      });
    }
  }
}
