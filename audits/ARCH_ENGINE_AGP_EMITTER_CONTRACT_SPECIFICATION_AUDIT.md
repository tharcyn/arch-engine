# Arch-Engine AGP Emitter Contract Specification Audit

**Audit date:** 2026-05-06
**Auditor:** Claude Opus 4.7 (1M context), spec-only contract pass
**Repo:** `/Users/thaasyn/Documents/WebDev/arch-engine`
**Branch:** `main`
**HEAD:** `1dd2f26` (`chore(release): prepare arch-engine v1.0.1`)
**Tag at HEAD:** `arch-engine-v1.0.1`
**Predecessor audits:**
- [audits/ARCH_ENGINE_V1_REPO_AND_AGP_EMITTER_READINESS_AUDIT.md](./ARCH_ENGINE_V1_REPO_AND_AGP_EMITTER_READINESS_AUDIT.md)
- [audits/ARCH_ENGINE_V1_0_1_PUBLIC_CONTRACT_STABILIZATION_AUDIT.md](./ARCH_ENGINE_V1_0_1_PUBLIC_CONTRACT_STABILIZATION_AUDIT.md)
- [audits/ARCH_ENGINE_V1_0_1_EXPORT_FREEZE_REPAIR_AUDIT.md](./ARCH_ENGINE_V1_0_1_EXPORT_FREEZE_REPAIR_AUDIT.md)
- [audits/release/ARCH_ENGINE_V1_0_1_PATCH_RELEASE_PREFLIGHT.md](./release/ARCH_ENGINE_V1_0_1_PATCH_RELEASE_PREFLIGHT.md)

---

## 1. Executive Verdict

**`AGP_EMITTER_CONTRACT_READY_WITH_OPEN_QUESTIONS`**

The contract specification is complete and specification-grade. The 17
required sections are written, and the input/output/determinism/error/
import-boundary surfaces are normatively pinned. Eight open questions
are surfaced (Q1–Q8 in [docs/contracts/agp-emitter-contract.md](../docs/contracts/agp-emitter-contract.md))
with spec defaults that allow implementation to proceed without further
input — but each open question represents a real human-review-and-decide
point. The most material is Q1 (whether to expose `closureGraphHash`
through `@arch-engine/core`'s public surface, or use the already-public
`graphSurfaceHash` as the AGP closure-binding source). Until the human
ratifies (or overrides) the defaults, the contract is mergeable as a
draft and the implementation pass is unblocked but should reference the
ratified defaults.

The pass produced **two documentation files**, no code, no dependency,
no version change, no published artifact.

---

## 2. Scope

Specification only. **No implementation.**

- No `packages/agp-emitter/` directory created.
- No source files written for an emitter package.
- No `package.json` modified.
- No `@arch-governance/runtime` or `@arch-governance/architecture-profile`
  added to any `package.json` (only mentioned by name in the new docs).
- No public Arch-Engine surface changed.
- No CLI flag added.
- No freeze snapshot updated.
- No npm publish.
- No git tag created.
- No git commit (mission says "Do not commit unless explicitly instructed").

The single deliverable is the contract document at
`docs/contracts/agp-emitter-contract.md`, plus this audit.

---

## 3. Repository State

| Field | Value |
| --- | --- |
| Branch | `main` |
| Working tree (pre-pass) | clean |
| HEAD | `1dd2f26 chore(release): prepare arch-engine v1.0.1` |
| Tag at HEAD | `arch-engine-v1.0.1` |
| origin/main | `1dd2f26` (in sync) |
| Most recent v1.0.1 audits | four documents under `audits/` and `audits/release/` |
| Public surface freeze | green (357 freeze tests pass; 1890/1890 total tests pass — see predecessor audits) |

Working tree post-pass: only the two new docs are added; nothing else
modified.

---

## 4. AGP Package Verification

### 4.1 npm view results

```
@arch-governance/architecture-profile  → versions: ["0.1.0"]
                                         dist-tags: { latest: 0.1.0, next: 0.1.0 }
                                         license: Apache-2.0
                                         dependencies: { "@arch-governance/runtime": "1.7.0" }
                                         exports: { ".": "./dist/index.js" }
                                         repo: github.com/agp-protocol/agp

@arch-governance/runtime               → versions: ["1.7.0"]
                                         dist-tags: { latest: 1.7.0, next: 1.7.0 }
                                         license: Apache-2.0
                                         exports: { ".": "./dist/index.js" }
                                         repo: github.com/agp-protocol/agp
```

### 4.2 Profile public-surface probe

A tempdir install of `@arch-governance/architecture-profile@0.1.0`
revealed the emitter-relevant public surface (cleaned up after probe):

- **`PROFILE_VERSION = "agp_architecture_profile.v0.1"`** — the contract
  anchor.
- **40 total exports** including 14 evaluator functions, 13 error code
  constants, 13 typed error classes, query/outcome type pairs, and
  record-type aliases.
- **Record-type aliases relevant to the emitter:**
  - `TopologySnapshotRecord`
  - `ClosureGraphHashBindingRecord`
  - `AuthorityDelegationRecord`
  - `ArchitectureLifecycleTransitionRecord`
  - `ArchitectureFederationParticipantRecord`
  - `ArchitectureTrustPolicyParticipantRecord`
  - `ProducerAttestationRecord`
  - `ProducerKeyRegistryRecord`
- The architecture-profile is a thin alias/re-export layer over runtime
  primitives. Under the alias, runtime types like `SnapshotRecord` become
  `TopologySnapshotRecord`. The contract pins consumption to the alias
  layer only.

The probed package was **not** installed into the Arch-Engine repo. The
tempdir was deleted after inspection.

---

## 5. Arch-Engine Contract Inputs Found

The following types exist in `@arch-engine/core@1.0.1`'s public surface
and are normatively referenced as the emitter's input boundary:

| Type | Source file | Emitter use |
| --- | --- | --- |
| `TopologyGraph` | `packages/core/src/topology/TopologyGraph.ts` | primary input; carries `graphSurfaceVersion: "1.0.0"`, `graphSurfaceHash`, readonly nodes/edges |
| `TopologyNode` | `packages/core/src/topology/TopologyNode.ts` | `id: string`, `type: string`, optional `metadata` |
| `TopologyEdge` | `packages/core/src/topology/TopologyEdge.ts` | `from`, `to`, `type`, optional `metadata` |
| `TopologySnapshot` | `packages/core/src/topology/TopologySnapshot.ts` | wraps `TopologyGraph` with optional `lineageId` |
| `GovernanceReport` | `packages/core/src/topology/GovernanceReport.ts` | optional input from `arch-engine check` |
| `PolicyEvaluationResult` | `packages/core/src/topology/PolicyEvaluationResult.ts` | nested in `GovernanceReport.results` |
| `PolicyEvaluationDiagnostic` | `packages/core/src/topology/PolicyEvaluationDiagnostic.ts` | finding-level shape (code/message/severity) |
| `PolicyEvaluationSeverity` | `packages/core/src/topology/PolicyEvaluationSeverity.ts` | `'info' \| 'warning' \| 'error'` |
| `GraphStabilityIndex` | `packages/core/src/traversal/graph-stability-index.ts` | optional input from `arch-engine analyze`; carries a `generated_at: string` ⚠️ wall-clock that the contract explicitly excludes from record identity |
| `MonorepoExtractionResult` | `packages/adapter-monorepo/src/index.ts` | adapter-provenance source |

The current v1.0.1 CLI surface (`doctor`, `inspect`, `analyze`, `check`,
`explain`) is documented as the producer pipeline. The contract leaves
all five commands byte-for-byte unchanged.

### 5.1 closureGraphHash status

`closureGraphHash` exists internally at
`packages/core/src/transport/snapshotClosureGraphHash.ts` and is **NOT**
exported from the public root barrel of `@arch-engine/core@1.0.1`.
Confirmed by `grep "closureGraphHash" packages/core/src/index.ts` →
empty.

This is the foundation of the contract's Open Question Q1: does the
emitter use the public `graphSurfaceHash` (spec default), or wait for
`closureGraphHash` to be exposed publicly in v1.1.0? The contract
records both as acceptable paths.

---

## 6. Contract File Created

**File:** `docs/contracts/agp-emitter-contract.md`

**Size:** ~1140 lines (specification-grade, dense, with tables and
explicit normative MUST / MUST NOT language).

**Sections:**

1. Status — draft v0.1, target package, target release line, predecessor
   docs.
2. Purpose — why the bridge exists; mental model diagram.
3. Non-Goals — 8 explicit exclusions.
4. Package Boundary — name, allowed dep, forbidden imports table,
   rationale.
5. Input Contract — primary input shape (TopologyGraph), optional
   secondary inputs, validation rules, what NOT to require, command-origin
   matrix, deterministic-timestamp policy on the input boundary.
6. Output Contract — top-level shape, `AgpRecordBatch`, profile-version
   anchor, source linkage, `emittedAt` policy, sort orders, diagnostics
   vs. warnings, unsupported-input / no-partial-silent-success rules,
   serialization rules.
7. Record Mapping — graph identity, node, edge, closure hash, finding,
   stability, adapter provenance, plus an explicit "what does NOT map"
   table for the v0.1 record-kind subset.
8. Determinism Requirements — sort orders, JSON canonicalization,
   forbidden non-determinism sources, path normalization, hash
   canonicalization, replay obligation.
9. Error and Diagnostic Contract — 12 `AGP_EMITTER_*` error codes with
   severities, fail-closed default, error class shape.
10. CLI Integration Contract — explicit "v0.1 ships no CLI changes",
    informational future flags table, backward-compatibility
    constraints, exit-code policy deferral.
11. Package / Versioning Strategy — `0.1.0` initial version, exact pin
    on `architecture-profile@0.1.0`, minor-release-alignment guidance.
12. Test Contract — happy-path fixtures, failure-path tests, determinism
    tests, public API boundary tests, import-boundary tests, snapshot
    tests.
13. Conformance / Import Boundary Tests — whitelist, required boundary
    test set, anti-duplicate / anti-copy rules, profile-bypass test.
14. Security / Privacy — path normalization, secret-emission rules with
    a default redaction-key list, repository-identifier policy,
    deterministic-but-private identifier rules, network/filesystem
    isolation.
15. Migration Plan — 7-step path from v1.0.1 to first emitter release;
    no public surface change before the deliberate publish.
16. Open Questions — Q1–Q8 with spec defaults.
17. Acceptance Criteria for Implementation Pass — 13 verifiable
    criteria.

---

## 7. Boundary Decision

**Allowed runtime dependency:** `@arch-governance/architecture-profile`
exact-pinned to `0.1.0`.

**Allowed Arch-Engine consumption (typings only):**
- `@arch-engine/core` (`import type { ... }`)
- node built-ins (`node:crypto`, `node:path`, etc.)

**Forbidden dependencies / imports:**

| Forbidden | Why |
| --- | --- |
| `@arch-governance/runtime` | runtime is the AGP evaluator; emitter never evaluates |
| `@arch-governance/runtime/*` | bypasses profile aliasing layer |
| `@arch-governance/architecture-profile/*` | profile exports only `.`; subpaths not contractual |
| Locally copied AGP types | breaks single-source-of-truth |
| Vendored AGP source code | same |
| Internal `agp-protocol/agp` repo paths | not on npm; not contractual |
| Post-v1.0 experimental Arch-Engine packages (`@arch-engine/sdk`, `@arch-engine/agp-foundation`, etc.) | not in published workspace set |

The contract enforces this with §13's import-boundary tests (static
import grep, bundled-output grep, package-metadata test, type-source
test, profile-bypass test).

---

## 8. Open Questions

The eight open questions surfaced in `docs/contracts/agp-emitter-contract.md`
section 16, summarized:

| # | Question | Spec default | Material? |
| --- | --- | --- | --- |
| Q1 | Use `graphSurfaceHash` (public) or push to expose `closureGraphHash` from `@arch-engine/core`? | Use `graphSurfaceHash`; consider exposing `closureGraphHash` in v1.1.0 as a careful additive change. | **YES** — this is the most material question. |
| Q2 | Emitter at `0.1.0` or aligned with `1.1.0`? | `0.1.0`. | mild |
| Q3 | Ship CLI flags in same release as the package? | No — package first, CLI flags later. | mild |
| Q4 | JSON object output or NDJSON streaming? | JSON object (additive NDJSON later if needed). | mild |
| Q5 | Reuse existing closure hash or recompute? | Reuse verbatim. | mild |
| Q6 | Federation / trust-policy / lifecycle: stub `[]` or omit keys? | Stub `[]` with INFO diagnostics. | mild |
| Q7 | `AgpEmitterError` class shape? | Brand-new class extending `Error`. | mild |
| Q8 | Producer-attestation requires both `producer` and `producerKey`? | Yes. | mild |

The implementation pass can proceed under the spec defaults if the human
does not object. Q1 is the only one that meaningfully changes the
implementation cost: option (b) (publicly export `closureGraphHash`)
adds a small, deliberate change to `@arch-engine/core`'s public surface
in v1.1.0; option (a) (the default) does not.

---

## 9. Recommended Next Mission

Default recommendation: **Arch-Engine AGP Emitter MVP Implementation Pass**.

That pass would:

1. Create `packages/agp-emitter/` (initially `private: true`).
2. Implement the input/output shapes per §5–§6.
3. Implement the record-mapping per §7 within the architecture-profile
   public surface only.
4. Implement determinism guarantees per §8.
5. Wire up the `AGP_EMITTER_*` diagnostics per §9.
6. Add the test surface per §12.
7. Add the import-boundary tests per §13.
8. Write the audit at
   `audits/ARCH_ENGINE_AGP_EMITTER_MVP_IMPLEMENTATION_AUDIT.md`.
9. **Stop short of** flipping `private: false`, bumping versions,
   publishing, or modifying the public CLI. Those are separate
   gated steps per §15.

If the human concludes that the contract has gaps or that Q1's option
(b) is preferred, the alternative next mission is:

**Arch-Engine Topology Surface Hardening Pass** — a deliberate, careful
additive update to `@arch-engine/core`'s public surface that exposes
`closureGraphHash` (and possibly other internals identified during this
spec) for v1.1.0. The freeze tests are intentionally additive-aware
(any new export needs a snapshot update with explicit human approval),
so this pass would be small but visible.

If the human prefers parallel work, both can run independently — the
emitter MVP can use `graphSurfaceHash` today, and a later emitter 0.2.0
can opt into `closureGraphHash` once `@arch-engine/core@1.1.0` exposes
it.

---

## 10. Commands Run

| # | Command | Purpose |
| --- | --- | --- |
| 1 | `git status --short` | confirm clean tree |
| 2 | `git branch --show-current` → `main` | confirm branch |
| 3 | `git log --oneline -n 12` | confirm v1.0.1 release-prep at HEAD |
| 4 | `git tag --list "arch-engine-v1.0.1"` | confirm tag exists |
| 5 | `cat packages/core/src/topology/TopologyGraph.ts` | extract input contract |
| 6 | `cat packages/core/src/topology/TopologyNode.ts` | extract input contract |
| 7 | `cat packages/core/src/topology/TopologyEdge.ts` | extract input contract |
| 8 | `cat packages/core/src/topology/TopologySnapshot.ts` | secondary input |
| 9 | `cat packages/core/src/topology/GovernanceReport.ts` | optional input |
| 10 | `cat packages/core/src/topology/PolicyEvaluationResult.ts` | optional input |
| 11 | `cat packages/core/src/topology/PolicyEvaluationDiagnostic.ts` | optional input |
| 12 | `cat packages/core/src/topology/PolicyEvaluationSeverity.ts` | confirm severity vocabulary |
| 13 | `grep -nE "closureGraphHash" packages/core/src/index.ts` | confirm closureGraphHash NOT publicly exported |
| 14 | `grep -nE "TopologyGraph\|graphSurfaceVersion\|graphSurfaceHash\|closureGraphHash" packages/core/src/index.ts` | enumerate public topology surface |
| 15 | `head -130 packages/core/tests/publicSurface.snapshot.test.ts` | confirm v1.0.1 approved 110-symbol export set |
| 16 | `cat packages/adapter-monorepo/src/index.ts \| head -160` | extract `MonorepoExtractionResult` shape, `AuthorityDomain` enum |
| 17 | `grep -A 30 "interface GraphStabilityIndex"` | confirm stability fields, identify `generated_at` wall-clock leak |
| 18 | `cat schemas/cli-output-contract.json \| head -60` | confirm existing JSON output contract |
| 19 | `npm view @arch-governance/architecture-profile@0.1.0 --json` | confirm AGP profile metadata |
| 20 | `npm view @arch-governance/runtime@1.7.0 --json` | confirm AGP runtime metadata |
| 21 | tempdir install + `import * as p` probe of `architecture-profile@0.1.0` | enumerate 40 public exports, 8 record-kind aliases, `PROFILE_VERSION` value |
| 22 | `head -80 node_modules/@arch-governance/architecture-profile/dist/index.d.ts` (in tempdir) | inspect type-alias structure |
| 23 | `grep -E "type\|interface\|export\|...Record" node_modules/@arch-governance/runtime/dist/index.d.ts` (in tempdir) | confirm runtime record types runtime-side |
| 24 | `rm -rf $TMPDIR` | tempdir cleaned |
| 25 | `ls docs/contracts/` | confirm location for new spec |
| 26 | Write `docs/contracts/agp-emitter-contract.md` | create deliverable |
| 27 | Write `audits/ARCH_ENGINE_AGP_EMITTER_CONTRACT_SPECIFICATION_AUDIT.md` | create this audit |
| 28 | `git status --short` (post-pass) | confirm only docs added |
| 29 | `grep -R "@arch-governance/architecture-profile" package.json packages/*/package.json` | confirm no dependency added |
| 30 | `grep -R "@arch-governance/runtime" package.json packages/*/package.json` | confirm no dependency added |

Working tree post-pass: two new files under `docs/contracts/` and
`audits/`. No source code, no `package.json`, no lockfile changed.

---

*End of contract-specification audit.*
