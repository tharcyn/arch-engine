import type { TopologyChangeKind } from './TopologyChangeKind';

export interface TopologyDiffClassification {
  readonly classificationSurfaceVersion: "1.0.0";
  readonly kind: TopologyChangeKind;
  readonly hasStructuralChanges: boolean;
  readonly hasMetadataChanges: boolean;
}
