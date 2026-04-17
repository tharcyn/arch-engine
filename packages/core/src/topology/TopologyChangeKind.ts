export type TopologyChangeKind =
  | "no_change"
  | "structural_addition"
  | "structural_removal"
  | "structural_mixed"
  | "metadata_only"
  | "metadata_and_structural";
