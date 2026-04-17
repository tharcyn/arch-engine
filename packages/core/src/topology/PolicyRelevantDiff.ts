import type { PolicyRelevantDiffKind } from './PolicyRelevantDiffKind';
import type { TopologyChangeKind } from './TopologyChangeKind';

export interface PolicyRelevantDiff {
  readonly policyDiffSurfaceVersion: "1.0.0";
  readonly kind: PolicyRelevantDiffKind;
  readonly sourceClassificationKind: TopologyChangeKind;
  readonly hasStructuralChanges: boolean;
  readonly hasMetadataChanges: boolean;
}
