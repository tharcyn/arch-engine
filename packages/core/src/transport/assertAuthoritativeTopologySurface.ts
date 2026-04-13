import { PolicyStackEntry } from '../policy/types.js';
import { SnapshotEnvelope } from './types.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';

export const AUTHORITATIVE_TOPOLOGY_CONTRACT_VERSION = 'v1';

/**
 * Phase 4.12 Objective 3: Authoritative Topology Boundary Contract
 *
 * Runtime assertion for Phase 5 planner entrypoint. Verifies that all
 * loader-produced topology surfaces exist and are internally consistent.
 *
 * Composition runtime must consume these surfaces.
 * Composition runtime must NOT recompute them.
 * Composition runtime must NOT mutate them.
 */
export function assertAuthoritativeTopologySurface(
  entries: PolicyStackEntry[],
  snapshotEnvelope: SnapshotEnvelope
): void {
  // Verify dependencyGraphShapeHash exists on envelope
  if (!snapshotEnvelope.dependencyGraphShapeHash) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.AUTHORITATIVE_TOPOLOGY_SURFACE_MISSING,
      message: `Authoritative topology surface missing: dependencyGraphShapeHash not on envelope. ` +
        `Contract: ${AUTHORITATIVE_TOPOLOGY_CONTRACT_VERSION}`,
      stage: 'authoritativeTopologyCertification'
    });
  }

  let rootFound = false;

  for (const entry of entries) {
    const entryId = `${entry.policyNamespace || ''}/${entry.policyId}`;

    // Every entry must have stackIndex
    if (entry.executionMetadata?.stackIndex === undefined) {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.AUTHORITATIVE_TOPOLOGY_SURFACE_MISSING,
        message: `Authoritative topology surface missing: stackIndex not set on entry "${entryId}". ` +
          `Contract: ${AUTHORITATIVE_TOPOLOGY_CONTRACT_VERSION}`,
        stage: 'authoritativeTopologyCertification',
        policyId: entry.policyId,
        policyNamespace: entry.policyNamespace
      });
    }

    // Every entry must have dependencyDepth
    if (entry.executionMetadata?.dependencyDepth === undefined) {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.AUTHORITATIVE_TOPOLOGY_SURFACE_MISSING,
        message: `Authoritative topology surface missing: dependencyDepth not set on entry "${entryId}". ` +
          `Contract: ${AUTHORITATIVE_TOPOLOGY_CONTRACT_VERSION}`,
        stage: 'authoritativeTopologyCertification',
        policyId: entry.policyId,
        policyNamespace: entry.policyNamespace
      });
    }

    // Root depth must be 0
    if (entry.executionMetadata.dependencyDepth === 0) {
      rootFound = true;
    }
  }

  if (!rootFound && entries.length > 0) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.AUTHORITATIVE_TOPOLOGY_SURFACE_INCONSISTENT,
      message: `Authoritative topology surface inconsistent: no entry with depth 0 (root). ` +
        `Contract: ${AUTHORITATIVE_TOPOLOGY_CONTRACT_VERSION}`,
      stage: 'authoritativeTopologyCertification'
    });
  }

  // Verify dependencyAdjacencySurface exists on at least the root entry
  const rootEntry = entries.find(e => e.executionMetadata?.dependencyDepth === 0);
  if (rootEntry && !rootEntry.executionMetadata?.dependencyAdjacencySurface) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.AUTHORITATIVE_TOPOLOGY_SURFACE_MISSING,
      message: `Authoritative topology surface missing: dependencyAdjacencySurface not on root entry. ` +
        `Contract: ${AUTHORITATIVE_TOPOLOGY_CONTRACT_VERSION}`,
      stage: 'authoritativeTopologyCertification'
    });
  }

  // Verify adjacency surface is frozen (if present)
  if (rootEntry?.executionMetadata?.dependencyAdjacencySurface) {
    if (!Object.isFrozen(rootEntry.executionMetadata)) {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.AUTHORITATIVE_TOPOLOGY_SURFACE_INCONSISTENT,
        message: `Authoritative topology surface inconsistent: executionMetadata not frozen on root entry. ` +
          `Contract: ${AUTHORITATIVE_TOPOLOGY_CONTRACT_VERSION}`,
        stage: 'authoritativeTopologyCertification'
      });
    }
  }
}
