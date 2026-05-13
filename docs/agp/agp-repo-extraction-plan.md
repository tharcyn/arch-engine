# AGP Repo Extraction Plan

**Status:** Draft v1.0
**Spec:** [`agp-canonical-bundle-and-emitter-mvp-spec.md`](./agp-canonical-bundle-and-emitter-mvp-spec.md) §20
**OQ default this honors:** OQ-7 ("Create AGP repo in this pass? — No, after spec review.")
**Audience:** Arch-Engine maintainers + (future) AGP foundation working group.

This plan defines exactly **what moves** from Arch-Engine to a future
AGP repo, **what stays**, **in what order**, and **on what schedule**.
It does NOT create the AGP repo. The MVP spec, schemas, and conformance
corpus live in Arch-Engine for now; this plan ensures the move can
happen later without breaking the implementation arc.

---

## 1. What moves to the AGP repo

The AGP repo owns the **protocol** — specification, schemas, conformance corpus, compatibility policy:

| Move | Source in Arch-Engine | Destination in AGP repo |
| --- | --- | --- |
| MVP spec (canonical-bundle protocol) | `docs/agp/agp-canonical-bundle-and-emitter-mvp-spec.md` | `agp/spec/v1/agp-canonical-bundle.md` |
| Open-question defaults | `docs/agp/agp-schema-open-question-defaults.md` | `agp/spec/v1/open-question-defaults.md` |
| Schemas | `docs/agp/schemas/v1/` | `agp/spec/v1/schemas/` |
| Conformance corpus | `docs/agp/conformance/v1/` | `agp/spec/v1/conformance/` |
| Canonicalization details (broken out for stability) | spec §10 | `agp/spec/v1/canonicalization.md` |
| Hashing details | spec §11 | `agp/spec/v1/hashing.md` |
| Compatibility policy | spec §22 | `agp/spec/v1/compatibility.md` |
| Verifier reference implementation (later) | not yet present | `agp/reference/verifier/` (TypeScript reference impl, future) |
| Governance change process | (not yet written) | `agp/governance/change-process.md` |

---

## 2. What stays in Arch-Engine

The Arch-Engine repo owns the **implementation**:

| Stays | Lives in |
| --- | --- |
| Extractor runtime | `packages/core/`, `packages/cli/` |
| Adapter packages | `packages/adapter-{monorepo,pnpm,yarn-pnp}/` |
| JSON v2 envelope shape | `packages/cli/src/render-v2.ts` |
| Canonical topology | `packages/cli/src/canonical-topology.ts` |
| Drift engine | `packages/cli/src/drift.ts` |
| Error-code vocabulary | `packages/cli/src/error-codes.ts` |
| AGP emitter implementation (future package) | `packages/agp-emitter/` |
| AGP verifier implementation (future package) | `packages/agp-verifier/` |
| Test fixtures | `packages/cli/tests/fixtures/` |
| Adapter trial audits | `audits/` |
| Release notes | `docs/releases/` |
| Roadmap doc | `docs/agp/agp-research-informed-roadmap.md` |

**Note on the roadmap:** the strategic roadmap stays in Arch-Engine
because it's Arch-Engine product strategy, not AGP protocol. The AGP
repo's own roadmap (focused on protocol evolution) is a separate doc
that lives in `agp/governance/`.

---

## 3. Proposed AGP repo structure

```
agp/
├── spec/
│   └── v1/
│       ├── agp-canonical-bundle.md        ← protocol spec
│       ├── canonicalization.md            ← broken out from §10
│       ├── hashing.md                     ← broken out from §11
│       ├── compatibility.md               ← broken out from §22
│       ├── open-question-defaults.md
│       ├── schemas/
│       │   ├── README.md
│       │   ├── common.schema.json
│       │   ├── record.schema.json
│       │   ├── snapshot.schema.json
│       │   ├── agp-bundle.schema.json
│       │   └── <family>-record.schema.json (×9)
│       └── conformance/
│           ├── README.md
│           ├── valid/
│           │   └── … fixtures …
│           └── invalid/
│               └── … fixtures …
├── reference/
│   └── verifier/
│       ├── README.md
│       └── (TypeScript reference impl, later)
└── governance/
    ├── change-process.md           ← how the protocol evolves
    ├── working-groups.md           ← future, per agp-foundation-charter
    └── registry-policy.md          ← future, per registry-authority-bootstrap
```

---

## 4. Extraction order

The extraction happens in three sub-passes, scheduled across the
next few missions:

### Sub-pass A — Spec freeze (before emitter implementation)

1. Review the MVP spec internally and lock the 10 OQ defaults.
2. Create the AGP repo (empty).
3. Copy (don't move yet) the spec + schemas + conformance into the
   AGP repo.
4. The AGP repo's v1 spec becomes **frozen**: any change is a
   versioned amendment with conformance-corpus updates.

### Sub-pass B — Implementation pins frozen spec

1. The Arch-Engine emitter implementation pass references the
   AGP repo's frozen schemas via:
   - a git submodule under `packages/agp-emitter/spec/`, OR
   - a published `@agp/spec` npm package containing only the schemas
     + corpus, OR
   - vendored copies of schemas under `packages/agp-emitter/schemas/`
     with a CI check against the AGP repo HEAD.
2. The emitter package's tests load both Arch-Engine fixtures
   (`packages/cli/tests/fixtures/adapters/*`) and AGP corpus
   fixtures.

### Sub-pass C — Source migration

1. After two implementations validate against the AGP repo's
   conformance corpus, **delete** `docs/agp/schemas/v1/` and
   `docs/agp/conformance/v1/` from Arch-Engine and replace with a
   short pointer doc:

   ```markdown
   # AGP schemas + conformance

   The canonical AGP v1 schemas and conformance corpus live at
   <https://github.com/<org>/agp/tree/main/agp/spec/v1>.

   This Arch-Engine repo's `@arch-engine/agp-emitter` consumes them
   via …
   ```
2. Keep the **strategic** AGP docs in Arch-Engine
   (`agp-research-informed-roadmap.md`, `agp-repo-extraction-plan.md`
   itself — for traceability).
3. The MVP spec doc (`agp-canonical-bundle-and-emitter-mvp-spec.md`)
   stays in Arch-Engine **archived** with a supersession header
   pointing at the AGP repo. Same retention rule as
   `docs/contracts/agp-emitter-contract.md`.

---

## 5. Versioning model

The AGP repo owns one version dimension: the **protocol version**
(`agpVersion` field in snapshot.json). Arch-Engine owns the
**implementation version** (cli + emitter + verifier package
versions).

| Change | Protocol bump | Arch-Engine implementation bump |
| --- | --- | --- |
| Add a new record family | AGP minor | emitter minor (additive support) |
| Add a new record `kind` to an existing family | AGP minor | emitter minor |
| Add a new optional field | AGP patch (additive) | emitter patch |
| Tighten an existing field's enum | AGP minor (potentially breaking for downstream consumers) | emitter minor |
| Change the snapshot digest derivation | AGP major | emitter major |
| Change a hash algorithm | AGP minor (add new prefix) or major (remove old prefix) | emitter minor or major |

### Cross-cutting compatibility

- Arch-Engine emitter v0.x ↔ AGP v1: supported indefinitely.
- Arch-Engine emitter v1.x ↔ AGP v1: supported.
- Arch-Engine emitter v1.x ↔ AGP v2: requires either a new emitter
  major (`@arch-engine/agp-emitter@2.0.0`) or a multi-protocol
  emitter that supports both. Decision deferred.

---

## 6. Compatibility policy

Documented in `agp/spec/v1/compatibility.md` (future). Key invariants:

1. **Verifier acceptance.** A v1-conformant verifier MUST accept
   any bundle whose `agpVersion` major matches v1's major.
2. **Frozen schemas.** Once `agp/spec/v1/schemas/` is shipped to the
   AGP repo's `main`, the v1 schemas are frozen. Bugfix amendments
   are versioned as `v1.0.1`, etc., with a published changelog.
3. **Conformance corpus is normative.** A bundle that passes all
   v1 schema validation AND all v1 verifier checks MUST be accepted
   by every v1-conformant verifier.
4. **No silent format changes.** Any wire-format change requires a
   conformance corpus addition or a protocol version bump.

---

## 7. How Arch-Engine emitter depends on the frozen AGP schemas

Three options, ranked by simplicity:

### Option 1 (recommended): vendor schemas with a CI check

The emitter package contains:

```
packages/agp-emitter/
├── src/
├── schemas/
│   └── v1/    ← vendored copy of agp/spec/v1/schemas/
└── tests/
```

A CI job in Arch-Engine compares
`packages/agp-emitter/schemas/v1/` against the AGP repo's
`agp/spec/v1/schemas/` and fails if they drift.

**Pros:** offline-friendly, no extra runtime dependency, easy
debugging. **Cons:** requires the CI check.

### Option 2: git submodule

`packages/agp-emitter/spec/` is a git submodule pointing at a tag on
the AGP repo.

**Pros:** automatic version pinning. **Cons:** submodules are
notoriously hostile in npm workflows.

### Option 3: published `@agp/spec` package

The AGP repo publishes `@agp/spec@1.0.0` containing only the
`v1/` directory.

**Pros:** clean npm dependency. **Cons:** adds a new published
artifact, more release coordination.

The implementation pass picks one. **Default recommendation: Option 1
(vendor + CI check)** because it minimizes coupling at the cost of
one CI job.

---

## 8. How the conformance corpus prevents drift

The future `@arch-engine/agp-emitter` test suite includes:

```
packages/agp-emitter/tests/
└── conformance/
    ├── valid.test.ts      ← for each docs/agp/conformance/v1/valid/<fixture>:
    │                         1. read snapshot.json + records.ndjson
    │                         2. validate against schemas/v1/snapshot.schema.json + record.schema.json
    │                         3. assert bijection
    │                         4. assert sort order
    │                         5. (post-rebuild) assert digest validity
    └── invalid.test.ts    ← for each docs/agp/conformance/v1/invalid/<fixture>:
                              1. attempt to validate
                              2. assert validation FAILS
                              3. assert verifier verdict matches the README's expected verdict
```

The same suite runs against the AGP repo's corpus (when wired). A
hypothetical second emitter (Rust, Go) runs the same suite against
the AGP corpus only.

---

## 9. Governance separation

The Arch-Engine repo is governed by its maintainers (`tharcyn`
today). The AGP repo, per the existing
[`docs/contracts/agp-foundation-charter.md`](../contracts/agp-foundation-charter.md),
is governed by:

- `AGPStewardshipRuntime` — protocol evolution limits.
- `WorkingGroupBootstrapRuntime` — domain-scoped working groups.
- `ExtensionGovernanceRuntime` — proposal/review/ratification.
- `RegistryAuthorityBootstrapRuntime` — canonical registries.
- `SpecificationLifecycleRuntime` — backward-compatibility enforcement.

Sub-pass A (above) creates the AGP repo skeleton and the
`governance/change-process.md` document. Working-group instantiation,
foundation membership, and certification authority are out of scope
for the first sub-pass.

---

## 10. Open issues for the AGP repo bootstrap pass

The future "AGP Repo Bootstrap and Spec Import" mission needs to
decide:

| # | Question | Recommended default |
| --- | --- | --- |
| AGP-1 | Repo owner (single-maintainer vs foundation org)? | Single-maintainer until two organisations sign on. |
| AGP-2 | License (MIT vs Apache-2.0)? | Apache-2.0 (typical for spec repos). |
| AGP-3 | First protocol version published? | v1.0.0 (matches MVP spec). |
| AGP-4 | Reference verifier language? | TypeScript first (parity with Arch-Engine emitter). |
| AGP-5 | Versioning of schemas relative to protocol? | Locked together — schemas v1 ⇔ protocol v1. |
| AGP-6 | How to surface protocol changelog? | `agp/spec/v1/CHANGELOG.md` + GitHub releases. |

---

## 11. Risks of premature extraction

If we move to the AGP repo **before** the first emitter
implementation:

- Spec churn during emitter implementation requires AGP repo PR
  cycles.
- Spec ambiguity surfaces only at implementation time; iterating
  faster in one repo helps.
- Multi-implementor parity is unprovable until the first emitter
  exists.

If we extract **too late**:

- The implementation becomes the de facto spec.
- A second implementor has nothing to point at except Arch-Engine's
  source.

The sub-pass schedule (Sub-pass A before implementation, Sub-pass B
during implementation, Sub-pass C after one validated implementation)
balances these.

---

*End of AGP Repo Extraction Plan.*
