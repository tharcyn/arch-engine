# @arch-engine/core Deterministic Freeze Regime Specification

## Section 1 — Purpose
The freeze harness protects explicit deterministic execution guarantees across foundational architecture boundaries. It enforces:

*   **Canonical hashing identifiers:** Asserts identical canonical hash output across shuffled key permutations and unicode-normalized inputs.
*   **Trace stability constraints:** Rejects trace timeline mutations occurring outside explicit transaction step frames.
*   **Sandbox exit capabilities:** Maps all capability aborts unconditionally into 5 defined exit taxonomies.
*   **Prototype mutation defenses:** Rejects prototype descriptor mutation before adapter execution begins.
*   **Topology traversal closures:** Rejects traversal graphs exceeding maxDepth or containing closure cycles.
*   **Canonicalization type scaling:** Rejects explicitly disallowed runtime types emitting CANONICALIZATION_TYPE_ERROR.
*   **Entropy injection boundaries:** Rejects Date.now() and Math.random() invocations inside sandbox scopes.
*   **Snapshot lineage regression:** Rejects sequence downgrade, parent hash mismatches, and unrecognized repository identities.
*   **Public export stability:** Asserts invariant SDK API extraction signatures and deep leak barriers.

## Section 2 — Phase Coverage Table

| Phase | Enforcement Target | Failure Trigger | CI Scope |
|---|---|---|---|
| Phase 1 | Canonical identity invariance | Pairwise semantic equality mismatch across permutation | PR + Nightly |
| Phase 2 | Resolvers trace boundaries | Nested scope invocation or timeline mutation outside frame | PR + Nightly |
| Phase 3 | Adapter sandbox taxonomy | Unregistered behavior escapes taxonomy mapping | PR + Nightly |
| Phase 4 | Object/Array/Promise Sentinel | Descriptor writability/configurability mutation | PR + Nightly |
| Phase 5 | Snapshot sequence monotonicity | parentHash mismatch OR sequence regression | PR + Nightly |
| Phase 6 | Substituted tie-breaks determinism | Namespace hash drift OR byte-normalized fallback drift | PR + Nightly |
| Phase 7 | Domain limit exclusion | Non-finite numbers or unmapped BigInt/Map injections | PR + Nightly |
| Phase 8 | Sandbox entropy DI bindings | Unhandled Math.random or Date.now calls | PR + Nightly |
| Phase 9 | Max subgraph recursion bounds | Depth overflow OR closure cycle detection | PR + Nightly |
| Phase 10 | SDK API boundary boundaries | Changes in export indexes or .d.ts matrix differences | PR + Nightly |
| Phase 11 | Iterative replay stability | Hash invariant collision during 100-1000 iter permutations | PR + Nightly |

## Section 3 — Snapshot Update Procedure
Snapshot baseline mutation requires:

1.  `SNAPSHOT_UPDATE_APPROVED=true` set in CI context logic.
2.  AND presence of `CHANGELOG_FREEZE_UPDATE.md` in the PR diff.

If these conditions are absent, CI enforces: `FREEZE_BASELINE_MUTATION_UNAUTHORIZED`.

## Section 4 — Seed Replay Instructions
Replay deterministic failures using:

```bash
FREEZE_SEED=<seed> npm test <phase-test-file>
```

Example CI Failure:
Seed: 4839201

Command:
```bash
FREEZE_SEED=4839201 npm test tests/freeze/canonical_hash_contract_snapshot.test.ts
```

## Section 5 — PR vs Nightly Execution Matrix
Loop extensions in the stress harnesses scale based on operational runtime context. 

| Mode | Process Env | Iterations |
|---|---|---|
| PR | `process.env.CI_NIGHTLY` undefined | 100 |
| Nightly | `process.env.CI_NIGHTLY=true` | 1000 |

## Section 6 — Freeze Drift Category Contract
All freeze failures must emit a category defined in `freeze-drift-taxonomy.ts`. 

Known categories:
*   `FREEZE_HASH_DRIFT`
*   `FREEZE_TRACE_DRIFT`
*   `FREEZE_PUBLIC_SURFACE_DRIFT`
*   `FREEZE_TOPOLOGY_BOUNDARY_DRIFT`
*   `FREEZE_CANONICALIZATION_DRIFT`
*   `FREEZE_SNAPSHOT_SEQUENCE_DRIFT`
*   `FREEZE_ENTROPY_CONTRACT_DRIFT`
*   `FREEZE_ADAPTER_SANDBOX_DRIFT`

Unknown categories trigger `UNKNOWN_FREEZE_DRIFT_CATEGORY`.

## Section 7 — Machine-Readable Drift Summary Contract
CI pipeline failures emit a deterministic machine-readable JSON structure explicitly for automated tracking:

```json
BEGIN_FREEZE_SUMMARY_JSON
{
   "phase": "Phase X",
   "category": "FREEZE_DRIFT_LABEL",
   "seed": "4839201",
   "expectedGuard": "true",
   "receivedValue": "false",
   "baselineFile": "tests/freeze/snapshots/mock.snap"
}
END_FREEZE_SUMMARY_JSON
```

Required fields:
- `phase`: The architectural freeze phase boundary breached.
- `category`: Taxonomy drift mapping label.
- `seed`: Randomization index utilized (if applicable).
- `expectedGuard`: Contract boundary expectation string.
- `receivedValue`: Output state detected structurally breaking.
- `baselineFile`: Snap path asserting deviation (if applicable).
