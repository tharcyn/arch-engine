# Evaluation Trace Contract

The Arch-Engine evaluation trace subsystem guarantees that all architectural governance decisions are structurally auditable, strictly deterministic, and fully replay-safe.

## Trace Surface Guarantees

1. **Rule Lineage Determinism**: `ruleEvaluated`, `ruleSkipped`, `ruleBlocked`, and `ruleSuppressed` signals capture precise provenance per rule, identifying exactly why a topological decision occurred.
2. **Capability Gating Trace**: Explains precisely which capabilities satisfied pack expectations and which caused execution blocks across the federation intersection boundaries.
3. **Dataset Eligibility Trace**: Explains topological version skew handling and federation merge semantics blocking.
4. **Identity Resolution Trace**: Declares explicit justification for resolving identifiers via alias mapping or dataset collision matching.
5. **Finding Provenance**: Every generated finding anchors to a deterministic timestamp sequence, explicit merge participation tags, and explicit capability usage.
6. **Federation Merge Trace**: Records exact deduplication reasons and provenance concatenations during multi-provider topology ingestion.
7. **CI Automation Guarantee**: All trace footprints map identically back to JSON schemas, allowing zero-friction ingestion by CI validation platforms and release orchestration scripts.

This defines the Trace Surface as the deterministic governance decision explanation API.
