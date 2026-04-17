import type { TopologyDiffResult } from './TopologyDiffResult';
import type { TopologyDiffClassification } from './TopologyDiffClassification';
import type { PolicyRelevantDiff } from './PolicyRelevantDiff';
import type { PolicyRelevantDiffKind } from './PolicyRelevantDiffKind';

export function classifyPolicyRelevantDiff(
  diff: TopologyDiffResult,
  classification: TopologyDiffClassification
): PolicyRelevantDiff {
  let matchedKind: PolicyRelevantDiffKind;

  switch (classification.kind) {
    case "no_change":
      matchedKind = "no_policy_relevance";
      break;
    case "metadata_only":
      matchedKind = "metadata_drift";
      break;
    case "structural_addition":
      matchedKind = "structural_expansion";
      break;
    case "structural_removal":
      matchedKind = "structural_contraction";
      break;
    case "structural_mixed":
      matchedKind = "structural_recomposition";
      break;
    case "metadata_and_structural":
      matchedKind = "mixed_drift";
      break;
    default:
      matchedKind = "no_policy_relevance";
  }

  return Object.freeze({
    policyDiffSurfaceVersion: "1.0.0",
    kind: matchedKind,
    sourceClassificationKind: classification.kind,
    hasStructuralChanges: classification.hasStructuralChanges,
    hasMetadataChanges: classification.hasMetadataChanges
  });
}
