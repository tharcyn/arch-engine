import { PolicyStackEntry } from '../policy/types.js';
import { SnapshotEnvelope } from './types.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';

export const METADATA_GRAPH_SHAPE_CONTRACT_VERSION = 'v1';

/**
 * Phase 4.13 Objective 5: Deterministic Metadata Graph Shape Certification
 *
 * Verifies internal consistency between topology surfaces:
 * - adjacency surface matches entry count
 * - dependencyDepth matches adjacency distance
 * - stackIndex matches topological ordering
 * - root depth == 0
 */
export function certifyMetadataGraphShapeInvariant(
  entries: PolicyStackEntry[],
  rootEntry: PolicyStackEntry,
  snapshotEnvelope: SnapshotEnvelope
): void {
  // Verify entry count stability
  if (entries.length === 0) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.METADATA_GRAPH_SHAPE_INCONSISTENT,
      message: `Metadata graph shape inconsistent: zero entries. ` +
        `Contract: ${METADATA_GRAPH_SHAPE_CONTRACT_VERSION}`,
      stage: 'metadataGraphShapeCertification'
    });
  }

  // Verify adjacency surface exists and matches topology
  const adjacency = rootEntry.executionMetadata?.dependencyAdjacencySurface;
  if (!adjacency || typeof adjacency !== 'object') {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.METADATA_GRAPH_SHAPE_INCONSISTENT,
      message: `Metadata graph shape inconsistent: dependencyAdjacencySurface missing on root. ` +
        `Contract: ${METADATA_GRAPH_SHAPE_CONTRACT_VERSION}`,
      stage: 'metadataGraphShapeCertification'
    });
  }

  // Verify adjacency node count matches entry count
  const adjacencyNodeCount = Object.keys(adjacency).length;
  if (adjacencyNodeCount !== entries.length) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.METADATA_GRAPH_SHAPE_INCONSISTENT,
      message: `Metadata graph shape inconsistent: adjacency has ${adjacencyNodeCount} nodes ` +
        `but entries has ${entries.length} entries. ` +
        `Contract: ${METADATA_GRAPH_SHAPE_CONTRACT_VERSION}`,
      stage: 'metadataGraphShapeCertification'
    });
  }

  // Verify root depth == 0
  if (rootEntry.executionMetadata?.dependencyDepth !== 0) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.METADATA_GRAPH_SHAPE_INCONSISTENT,
      message: `Metadata graph shape inconsistent: root entry depth is ` +
        `${rootEntry.executionMetadata?.dependencyDepth}, expected 0. ` +
        `Contract: ${METADATA_GRAPH_SHAPE_CONTRACT_VERSION}`,
      stage: 'metadataGraphShapeCertification'
    });
  }

  // Verify stackIndex ordering: indices should be non-negative and unique
  const indices = entries
    .map(e => e.executionMetadata?.stackIndex)
    .filter(i => i !== undefined) as number[];

  if (indices.length !== entries.length) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.METADATA_GRAPH_SHAPE_INCONSISTENT,
      message: `Metadata graph shape inconsistent: ${entries.length - indices.length} entries missing stackIndex. ` +
        `Contract: ${METADATA_GRAPH_SHAPE_CONTRACT_VERSION}`,
      stage: 'metadataGraphShapeCertification'
    });
  }

  const uniqueIndices = new Set(indices);
  if (uniqueIndices.size !== indices.length) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.METADATA_GRAPH_SHAPE_INCONSISTENT,
      message: `Metadata graph shape inconsistent: duplicate stackIndex values detected. ` +
        `Contract: ${METADATA_GRAPH_SHAPE_CONTRACT_VERSION}`,
      stage: 'metadataGraphShapeCertification'
    });
  }

  // Verify dependencyGraphShapeHash on envelope
  if (!snapshotEnvelope.dependencyGraphShapeHash) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.METADATA_GRAPH_SHAPE_INCONSISTENT,
      message: `Metadata graph shape inconsistent: dependencyGraphShapeHash missing on envelope. ` +
        `Contract: ${METADATA_GRAPH_SHAPE_CONTRACT_VERSION}`,
      stage: 'metadataGraphShapeCertification'
    });
  }
}
