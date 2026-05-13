# Arch-Engine AGP Canonical Bundle and Emitter Spec Audit

| Field | Value |
| --- | --- |
| Audit version | 1.0 |
| Author | Claude Opus 4.7 (1M context), specification pass |
| Date | 2026-05-13 |
| Mission | AGP Canonical Bundle and Emitter MVP Specification Pass |
| Spec under audit | [`docs/agp/agp-canonical-bundle-and-emitter-mvp-spec.md`](../docs/agp/agp-canonical-bundle-and-emitter-mvp-spec.md) |
| Roadmap under audit | [`docs/agp/agp-research-informed-roadmap.md`](../docs/agp/agp-research-informed-roadmap.md) |
| Predecessor (now superseded) | [`docs/contracts/agp-emitter-contract.md`](../docs/contracts/agp-emitter-contract.md) (Draft v0.1, 2026-05-06) |

---

## 1. Executive Verdict

**`AGP_CANONICAL_BUNDLE_SPEC_READY_WITH_OPEN_QUESTIONS`**

The MVP specification is complete enough to drive the next implementation
mission. It locks the canonical bundle shape, hashing and identity rules,
record families, the JSON v2 → AGP record mapping, and the three-plane
(factual / evidence / trust) invariant that protects determinism from
future ML / observation additions. The CLI integration strategy is
decided (package-first emitter, CLI subcommand later). The Arch-Engine /
AGP repo split is decided.

Ten open questions are recorded in the spec (§26), all with recommended
defaults. None of them gate the implementation pass; each can be locked
during code review without re-doing the spec.

No source code changed in this pass. No packages were created. No
versions were bumped. No `npm publish` ran. No git tag was created. The
only filesystem changes are the spec, the roadmap, and this audit.

---

## 2. Scope

This is an audit-only pass over a docs-only specification:

- 2 new documents under `docs/agp/`:
  - `agp-canonical-bundle-and-emitter-mvp-spec.md` (the normative spec)
  - `agp-research-informed-roadmap.md` (strategic distillation)
- 1 new audit under `audits/`:
  - `ARCH_ENGINE_AGP_CANONICAL_BUNDLE_AND_EMITTER_SPEC_AUDIT.md` (this file)

Out of scope per the mission constraints:

- No package implementation (`@arch-engine/agp-emitter` is named but not created).
- No CLI flag changes.
- No JSON v1 or JSON v2 modifications.
- No adapter modifications.
- No `@arch-governance/*` dependency additions.
- No version bumps.
- No publish.
- No tag.
- No code commits beyond docs.

---

## 3. Current Product Surface Reviewed

The spec is grounded in the actually-shipped Arch-Engine v1.4.0 surface:

| Surface element | Source confirmed |
| --- | --- |
| JSON v2 envelope shape | `packages/cli/src/render-v2.ts` lines 100–155 (alphabetised keys, JCS-like emission, `schemaVersion: "arch-engine.cli.v2"`). |
| Canonical topology | `packages/cli/src/canonical-topology.ts` (`graphSurfaceVersion: "1.0.0"`, sha256 `graphSurfaceHash`, sorted nodes/edges, `e_<8hex>` edge ids). |
| Drift block | `packages/cli/src/drift.ts` `buildDriftJsonBlock` (baseline/topology/violations/signal). |
| `ARCH_ENGINE_*` vocabulary | `packages/cli/src/error-codes.ts` (22 codes, severity/exit-code/ciBlocking semantics). |
| Adapter metadata sub-blocks | `data.adapter.metadata.{pnpm, yarnPnp}` confirmed against v1.3.1 and v1.4.0 audits. |
| Real-repo trial corpus | 11 repos from [`audits/ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_REAL_REPO_TRIAL.md`](./ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_REAL_REPO_TRIAL.md). |
| Published packages | `npm view` confirms `@arch-engine/cli@1.4.0`, `@arch-engine/adapter-monorepo@1.3.1`, `@arch-engine/adapter-pnpm@0.1.1`, `@arch-engine/adapter-yarn-pnp@0.1.0` all live. |
| HEAD tag | `arch-engine-v1.4.0` (commit `bc4dec8`) confirmed locally and on origin. |

The mapping table in spec §12 is verified against these sources.

### Pre-existing AGP material reviewed

| Document | Status after this pass |
| --- | --- |
| `docs/contracts/agp-emitter-contract.md` (Draft v0.1, 1179 lines) | **SUPERSEDED** by the new spec for the canonical-bundle direction. Retained in-tree per the "do not delete old docs" rule. The old contract's runtime-consumption model is replaced; its determinism / non-goals sections are absorbed into the new spec. |
| `docs/contracts/agp-v1-public-specification.md` (11 lines) | Orthogonal — describes AGP's *governance/reference-implementation* layer. Not affected. |
| `docs/contracts/agp-foundation-charter.md` (11 lines) | Orthogonal — describes the AGP foundation's stewardship runtime. Not affected. |
| `docs/contracts/agp-specification-runtime.md` (13 lines) | Orthogonal — describes the spec lifecycle runtime. Not affected. |
| `docs/contracts/agp-public-specification-portal.md` (11 lines) | Orthogonal — describes the public spec portal. Not affected. |
| `audits/ARCH_ENGINE_AGP_EMITTER_CONTRACT_SPECIFICATION_AUDIT.md` | Reviewed; historical context for the superseded contract. |
| `audits/ARCH_ENGINE_V1_REPO_AND_AGP_EMITTER_READINESS_AUDIT.md` | Reviewed; readiness review predating v1.0.0; historical context. |

---

## 4. Research Themes Applied

The mission's ten deep-research design principles were applied as follows:

| # | Principle | Where it lives in the spec |
| --- | --- | --- |
| 1 | Property-graph-shaped core | §7.2–7.3 (node + edge families) |
| 2 | Record-oriented bundle | §6 (NDJSON + manifest layout) |
| 3 | Three-plane separation | §7.11 (identity summary table) + §13 (boundary) |
| 4 | Determinism | §10 (canonicalization) + §11 (hashing) + §17.3 (policy reproducibility) |
| 5 | Canonicalization and hashing | §10–11 (JCS + BLAKE3 internal + SHA-256 public) |
| 6 | Supply-chain projections, not adoption | §15 (attestation boundary) + §6.2 (deferred projections) |
| 7 | ML isolation | §13 (evidence boundary) + §11.5 (digest projection excludes observations) |
| 8 | Incrementality | §18 (fact DAG roadmap, deferred) |
| 9 | Formal methods, selectively | Roadmap §7 (1–2 year) + §8 (2–5 year) |
| 10 | Elegance constraint | Roadmap §9 (10 non-negotiable elegance rules) |

---

## 5. Main Design Decisions

| Decision | Spec section | Rationale |
| --- | --- | --- |
| Canonical bundle = `snapshot.json` + `records.ndjson` (2 files) | §6.1 | Record-oriented enables incrementality / signing / diff. Two files keep transport simple. |
| Single-file `bundle.json` is convenience-only, non-canonical | §6.3 | Avoid the "two encodings, two hashes" trap. |
| RFC 8785 JCS for canonical JSON | §10.3 | Industry standard. Multi-implementor friendly. |
| BLAKE3 for internal `payloadHash`; SHA-256 for `snapshotDigest` | §11.1 | Internal speed + content-address ergonomics; external compatibility with OCI / SLSA / in-toto / Sigstore. |
| Record id = `agp:<family>:<kind>:<payloadHash>` | §11.2 | Self-describing, deduplication-friendly, debuggable. |
| Three-plane separation; observations + provenance + attestation OUT of factual digest | §11.5 + §13 | Locks ML safety as a structural invariant, not a runtime check. |
| Drift records are individual deltas, not nested blocks | §7.6 + §12.6 | Each delta is independently addressable / hashable / diffable. |
| Adapter `metadata` carried verbatim into `adapter_evidence.payload.metadata` | §12.2 | Future adapters extend without spec churn. |
| Path policy: repo-relative POSIX only; absolute paths rejected; NFC normalization | §10.1–10.2, §10.6 | Privacy + determinism + cross-platform consistency. |
| Provenance is trust-plane, excluded from factual digest | §14.4 | Allows the same JSON v2 to produce same `snapshotDigest` from different CI runs. |
| Attestation deferred; AGP core is signing-ecosystem-independent | §15 | Compatibility with DSSE / Sigstore / GitHub / SLSA without locking in any one. |
| Verifier is its own implementation pass; not bundled with emitter | §16 + §19.2 | Separation of concerns + multi-implementor parity. |
| Policy evaluates over bundle, not over CLI JSON | §17 | Decouples policy authoring from CLI release cycles. |
| Incremental fact DAG is v2+; MVP is monolithic | §18 | Land the bundle shape first; incrementality follows. |
| CLI integration via package-first; subcommand later | §19 | Keeps the five-command CLI surface stable. |
| Repo split: spec lives in AGP repo (after review); implementation lives in Arch-Engine | §20 | Spec stability ≠ implementation velocity. |

---

## 6. MVP Boundary

What the MVP emitter MUST do:

- Consume Arch-Engine JSON v2 from `inspect`, `analyze`, `check`, `check --baseline`.
- Produce `snapshot.json` + `records.ndjson`.
- Emit 7 record families (`node`, `edge`, `adapter_evidence`, `diagnostic`, `drift`, `policy_finding`, `provenance`).
- Reject JSON v1 / malformed JSON v2 / absolute paths.
- Be deterministic (byte-identical output modulo `emittedAt` / provenance subset).

What the MVP emitter MUST NOT do:

- Execute repo code.
- Run package-manager binaries.
- Read source code contents.
- Sign bundles.
- Project to SLSA / in-toto / SPDX / CycloneDX.
- Re-extract architecture (it consumes JSON v2; it does not rescan).
- Emit observation or attestation records.
- Depend on `@arch-governance/*`.

### MVP non-goals (locked)

Listed verbatim in spec §4: graph DB, ML extraction, code execution,
`.pnp.cjs` execution, full source AST, Sigstore signing, SLSA conformance
claim, SHACL/RDF projection, OPA engine, incremental fact DAG, Rust
sidecar, formal proofs, CLI flag changes, new commands, new error codes,
JSON v1/v2 modifications, adapter modifications, `@arch-governance` deps.

---

## 7. AGP Repo Boundary

The recommended split is documented in spec §20:

| Repo | Owns |
| --- | --- |
| **Arch-Engine** | Extractor runtime, adapters, JSON v2, AGP emitter *implementation*, CLI integration, test fixtures. |
| **AGP** (separate, deferred creation) | Protocol spec, canonical record JSON schemas, canonicalization/hashing rules, verifier conformance corpus, compatibility policy, formal invariant specs (later). |

Sequence:

1. Specify in Arch-Engine repo (this pass).
2. After spec review, extract protocol-grade subset into the AGP repo.
3. Implement emitter in Arch-Engine against the frozen AGP spec.
4. Upstream fixture-derived conformance corpus to the AGP repo.

This split respects the AGP foundation charter's existing stewardship
language (`docs/contracts/agp-foundation-charter.md` calls out
`AGPStewardshipRuntime`, `RegistryAuthorityBootstrapRuntime`,
`SpecificationLifecycleRuntime`) — the spec belongs in the place those
governance constructs live.

---

## 8. CLI Strategy Decision

**Decided: Option A (package-first emitter) for MVP, Option C (CLI subcommand) after MVP is verified.**

| Stage | Surface | Justification |
| --- | --- | --- |
| Stage 1 (MVP) | `@arch-engine/agp-emitter@0.1.0` + `agp-emit` CLI binary | Independent of CLI release cycle; supports offline conversion; the five-command CLI surface stays stable; verifier conformance is easier without flag interaction. |
| Stage 2 (after MVP trial) | `arch-engine emit-agp --from <json> --output <dir>` subcommand | Ergonomic "one tool, one pipeline"; gated on the emitter being a real-repo-trialled, optional peer. |
| **Explicitly rejected** | `arch-engine check --json --json-schema=v2 --emit-agp --output agp/` | Couples `check` semantics to AGP. Would create a new failure mode for existing CI integrations. |
| **Explicitly rejected** | A separate `arch-engine-agp` binary | Confusing dual-binary surface; defeats the unified CLI experience. |

---

## 9. Open Questions

All ten open questions from spec §26 are non-blocking. Recommended
defaults are in the spec; review or stakeholder confirmation can lock
each during the next implementation pass.

| # | Question | Recommended default |
| --- | --- | --- |
| OQ-1 | `bundle.json` convenience file in MVP? | Deferred. |
| OQ-2 | `policy_finding.findingId` source? | Reuse Arch-Engine's `data.violations[].id`; compute deterministically otherwise. |
| OQ-3 | `metadata.monorepo` empty object or omitted? | Omit. |
| OQ-4 | `shapeHash` required or optional? | Optional; required iff input had `graphSurfaceHash`. |
| OQ-5 | `provenance.git.dirty` reflects emit-time or extract-time? | Bundle-emit-time. |
| OQ-6 | Emitter package private/experimental or public at v0.1.0? | Private/experimental for three months; public after one real-repo bundle trial. |
| OQ-7 | Create AGP repo in this pass? | No — after spec review. |
| OQ-8 | Allow observation records in MVP bundles? | No — defer until an observer exists. |
| OQ-9 | Attestation records in `records.ndjson` or `attestations/`? | Both — thin record + separate DSSE file. |
| OQ-10 | Verifier in Arch-Engine or AGP repo? | Implementation in Arch-Engine; reference impl from AGP repo. |

---

## 10. Implementation Order

| Phase | Deliverable | Output |
| --- | --- | --- |
| A | Spec extraction to AGP repo | Frozen v1 spec + JSON schemas + small conformance corpus |
| B | `@arch-engine/agp-emitter@0.1.0` | Workspace package + `agp-emit` CLI binary |
| C | `@arch-engine/agp-verifier@0.1.0` | Workspace package + `agp-verify` CLI binary |
| D | CLI integration | `arch-engine emit-agp` subcommand; v1.5.0 minor release |
| E | Projections + attestation (multi-pass) | SLSA / in-toto / SPDX / CycloneDX projections; DSSE / Sigstore attestation |
| F | Incrementality / fact DAG (v2 protocol) | File-fact / manifest-fact / record-fact caching; stable diff IDs |

The full phase table is in spec §25. Phase A is the next mission.

---

## 11. Commands Run

```bash
# Phase 1 — repo state
pwd
git status --short
git log --oneline --decorate -n 12
npm view @arch-engine/cli@1.4.0 version                  # → 1.4.0
npm view @arch-engine/adapter-monorepo@1.3.1 version     # → 1.3.1
npm view @arch-engine/adapter-pnpm@0.1.1 version         # → 0.1.1
npm view @arch-engine/adapter-yarn-pnp@0.1.0 version     # → 0.1.0

# Phase 2 — read evidence
wc -l docs/contracts/agp-emitter-contract.md docs/contracts/agp-v1-public-specification.md …
sed -n '1,200p' packages/cli/src/render-v2.ts
sed -n '1,100p' packages/cli/src/canonical-topology.ts
sed -n '1,80p'  packages/cli/src/drift.ts
sed -n '320,400p' packages/cli/src/drift.ts
grep -E "^\s*'" packages/cli/src/error-codes.ts | head -25

# Phase 3 — inventory AGP material
find . -path ./node_modules -prune -o -type f \( -iname "*agp*" -o -iname "*emitter*" -o -iname "*governance*" \) -print

# Phase 20 — write spec
mkdir -p docs/agp
$EDITOR docs/agp/agp-canonical-bundle-and-emitter-mvp-spec.md

# Phase 21 — write roadmap
$EDITOR docs/agp/agp-research-informed-roadmap.md

# Phase 22 — write this audit
$EDITOR audits/ARCH_ENGINE_AGP_CANONICAL_BUNDLE_AND_EMITTER_SPEC_AUDIT.md

# Phase 23 — hygiene
git status --short
git diff --stat
```

No `npm install`, no `npm run build`, no `npm test`, no `npm publish`,
no `git tag`, no source changes.

---

## 12. Recommended Next Mission

**`ARCH_ENGINE_AGP_SPEC_EXTRACTION_AND_SCHEMA_PASS`**

Justification:

- The MVP spec is locked enough to be moved into the AGP repo as the
  canonical v1 specification.
- Before any code lands, the spec needs:
  - JSON schemas for each of the 10 record families
  - JSON schema for `snapshot.json`
  - A small, hand-curated conformance corpus (3–5 fixture pairs)
- The AGP repo creation is itself a deliberate governance step; doing
  it as a separate mission keeps it auditable.

### Alternative missions

- **`ARCH_ENGINE_AGP_EMITTER_MVP_IMPLEMENTATION_PASS`** — skip the
  schema extraction and go straight to `@arch-engine/agp-emitter@0.1.0`.
  Suitable if the team prefers to validate the spec via implementation
  before committing to schemas + conformance corpus. Risk: spec churn
  before schemas exist.
- **`ARCH_ENGINE_AGP_OPEN_QUESTION_RESOLUTION_PASS`** — hold a focused
  review on the 10 open questions and lock the recommended defaults
  (or amendments) before any implementation. Suitable if stakeholder
  alignment is the bottleneck.

The recommended path is the schema pass first because it:
- forces the spec into machine-readable form (catches ambiguity),
- creates the conformance corpus that the emitter implementation will
  test against (saves a re-test pass later),
- moves the protocol identity into the AGP repo (honors the foundation
  charter's governance separation).

---

*End of AGP Canonical Bundle and Emitter Spec Audit.*
