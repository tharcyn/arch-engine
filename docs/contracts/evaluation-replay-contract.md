# Evaluation Replay Contract

The Arch-Engine evaluation replay subsystem establishes a deterministic governance lifecycle comparison API, guaranteeing that no drift occurs silently across the governance lifecycle.

## Replay Contract Guarantees

1. **Evaluation Replay Guarantees**: A deterministic `EvaluationReplayEnvelope` isolates the core topological hashes for baseline and candidate comparisons.
2. **Capability Drift Guarantees**: Intersection drop-offs and capacity additions are surfaced immediately (`CAPABILITY_REMOVED`, `CAPABILITY_ADDED`).
3. **Dataset Drift Guarantees**: Any dataset ingestion logic or required schema addition that breaks baseline execution is exposed.
4. **Identity Drift Guarantees**: Identity conflict resolutions (e.g. `CROSS_PROVIDER_IDENTITY_ALIAS`) drifting to unresolved states are caught before CI pipelines break.
5. **Merge Drift Guarantees**: Shifts in structural hashing or provenance concat behavior across providers are identified instantly.
6. **Finding Drift Guarantees**: Precise mapping of severity inflation, finding elimination, or structural hash shifts.
7. **Execution Mode Drift Guarantees**: Guarantees isolated execution environments maintain their baseline compatibility footprints.
8. **Lockfile & Bundle Replay Guarantees**: Pinpoint lockfile closure drift and registry target lineage without arbitrary side-effects.
9. **Regression-Runner Guarantees**: Arch-Engine acts as its own regression test framework allowing packs to baseline locally and throw exact error codes on regression events.

The replay surface fundamentally serves as Arch-Engine's continuous evolution protection layer.
