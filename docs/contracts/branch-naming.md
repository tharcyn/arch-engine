# Deterministic Branch Naming Contract

All Arch-Engine adapters enforce a strict, invariant branch naming pattern:

`arch-engine/policy-update/<targetProfile>/<shortIntegrityHash>`

Example:
`arch-engine/policy-update/ci/7a3b9c2`

## Why the Integrity Hash Suffix Exists

The final 7-character suffix is deterministically sliced directly from the `exportArtifactIntegrityHash` embedded in the payload. 

### Collision Prevention Strategy
Using an integrity hash entirely eliminates race conditions and naming collisions when multiple policy generation events run concurrently. If a pipeline fires twice with identical results, the derived branch name is perfectly identical. If a pipeline fires concurrently with divergent results, the branch names naturally diverge, allowing the provider to manage them uniquely.

### Parallel CI, Retry, and Fork Safety
If a transient failure occurs during adapter execution, CI retries are inherently safe. The retry will recalculate the exact same branch name and cleanly reuse it. Furthermore, executing payloads across forks will inherently target unique branch references derived from the cryptographic reality of the payload, preventing namespace pollution.

### Snapshot Binding Guarantees
Because the suffix ties directly to the payload's integrity, an active branch in the upstream provider acts as an immutable physical manifestation of a specific, known-good snapshot. The branch name mathematically guarantees what state is inside it before it is even fetched.

## Adapter-Level Invariant
This naming rule is an adapter-level invariant. Provider implementations (e.g., GitHub, GitLab) are strictly forbidden from altering this derivation logic or appending provider-specific timestamps or IDs. The deterministic naming layer resides in `packages/adapters/shared` to enforce absolute parity.
