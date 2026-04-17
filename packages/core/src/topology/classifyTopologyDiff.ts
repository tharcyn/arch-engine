import type { TopologyDiffResult } from './TopologyDiffResult';
import type { TopologyChangeKind } from './TopologyChangeKind';
import type { TopologyDiffClassification } from './TopologyDiffClassification';

export function classifyTopologyDiff(
  diff: TopologyDiffResult
): TopologyDiffClassification {
  const metaDiff = diff.metadataDiff;
  const hasMetadataChanges = metaDiff !== undefined && (
    metaDiff.nodeMetadataChanges.length > 0 ||
    metaDiff.edgeMetadataChanges.length > 0
  );

  const hasAdditions = diff.addedNodes.length > 0 || diff.addedEdges.length > 0;
  const hasRemovals = diff.removedNodes.length > 0 || diff.removedEdges.length > 0;
  
  const hasStructuralChanges = hasAdditions || hasRemovals;

  let kind: TopologyChangeKind;

  if (!hasStructuralChanges && !hasMetadataChanges) {
    kind = "no_change";
  } else if (!hasStructuralChanges && hasMetadataChanges) {
    kind = "metadata_only";
  } else if (hasStructuralChanges && hasMetadataChanges) {
    kind = "metadata_and_structural";
  } else if (hasAdditions && !hasRemovals) {
    kind = "structural_addition";
  } else if (!hasAdditions && hasRemovals) {
    kind = "structural_removal";
  } else {
    // hasAdditions && hasRemovals
    kind = "structural_mixed";
  }

  return Object.freeze({
    classificationSurfaceVersion: "1.0.0",
    kind,
    hasStructuralChanges,
    hasMetadataChanges
  });
}
