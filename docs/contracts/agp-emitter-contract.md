# Arch-Engine AGP Emitter Contract

## 1. Status

- **Document state:** Draft v0.1
- **Document date:** 2026-05-06
- **Target package:** `@arch-engine/agp-emitter` (does not yet exist)
- **Target Arch-Engine release line:** v1.1.0 or later (minor release)
- **Implementation status:** spec-only; no source has been written, no
  package created, no dependency added.
- **Predecessor specs:** `docs/contracts/public-surface-contract.md`,
  `docs/contracts/determinism-contract.md`,
  `docs/contracts/cli-surface-contract.md`.
- **Predecessor audits:**
  `audits/ARCH_ENGINE_V1_REPO_AND_AGP_EMITTER_READINESS_AUDIT.md`,
  `audits/ARCH_ENGINE_V1_0_1_PUBLIC_CONTRACT_STABILIZATION_AUDIT.md`,
  `audits/ARCH_ENGINE_V1_0_1_EXPORT_FREEZE_REPAIR_AUDIT.md`,
  `audits/release/ARCH_ENGINE_V1_0_1_PATCH_RELEASE_PREFLIGHT.md`.

This document is the *contract* the future implementation must satisfy. It
is normative on the input boundary, the output boundary, the import
boundary, the determinism guarantees, and the error vocabulary. It is not
implementation guidance.

---

## 2. Purpose

Arch-Engine v1.0.x extracts repository topology evidence: a deterministic
`TopologyGraph` (nodes, edges, `graphSurfaceHash`), per-policy-pack
`GovernanceReport` results, adapter-provenance metadata, and a
`GraphStabilityIndex` covering coverage, connectivity, and authority
crossings.

The Architecture Governance Protocol (AGP) v1 — published as
`@arch-governance/runtime@1.7.0` and `@arch-governance/architecture-profile@0.1.0`
— defines a deterministic vocabulary of architecture records (topology
snapshots, federation participants, authority delegations, lifecycle
transitions, hash bindings, producer attestations, key registries) plus
the evaluator pipelines that consume them.

The **AGP emitter** bridges these two: it converts a single
Arch-Engine-produced `TopologyGraph` (plus optional `GovernanceReport` and
adapter provenance) into a **stable batch of AGP architecture-profile
records** that any AGP-conformant evaluator can ingest. The emitter is
the *only* sanctioned bridge between the two ecosystems. Everything else
in `@arch-engine/*` stays Arch-Engine-native; everything in
`@arch-governance/*` stays AGP-native.

Mental model:

```
Arch-Engine (extraction & policy)        AGP (evidence vocabulary)
─────────────────────────────────       ─────────────────────────
TopologyGraph                                                 │
GovernanceReport            ─emitter─►  TopologySnapshotRecord
GraphStabilityIndex                     ClosureGraphHashBindingRecord
adapter provenance                      AuthorityDelegationRecord
                                        ArchitectureLifecycleTransitionRecord
                                        ProducerAttestationRecord
                                        ProducerKeyRegistryRecord
                                        ArchitectureFederationParticipantRecord
                                        ArchitectureTrustPolicyParticipantRecord
```

The emitter does not evaluate AGP records (that is the runtime's job). It
only **produces** them.

---

## 3. Non-Goals

The emitter MUST NOT:

- **Reimplement any part of `@arch-governance/runtime`.** No copies of
  evaluator logic, error classes, or pipeline state machines.
- **Import from `@arch-governance/runtime`** directly. The runtime is
  reachable transitively via `architecture-profile`, but the emitter must
  consume only the profile package.
- **Ship CLI integration in v0.1.** The first release is the package
  itself plus a programmatic API. CLI flag plumbing is a separate, later
  release scope (see §10).
- **Provide SaaS, dashboard, registry, or federation runtime features.**
  Those are out of the Arch-Engine product scope as documented in the
  `Out of scope` section of `README.md`.
- **Expand multi-language adapter support.** Adapters remain Arch-Engine's
  responsibility; the emitter consumes their output but does not add new
  language frontends.
- **Mutate the source repository.** The emitter is read-only over the
  topology graph. It produces a JSON-serializable output object; it
  doesn't write files unless the consumer asks via a future CLI flag, in
  which case the writing is the CLI's job, not the emitter's.
- **Auto-fix, suggest, or apply policy changes.** The emitter has no
  remediation behavior. Policy authoring stays in the existing governance
  packs.
- **Publish to npm itself.** The emitter is a normal scoped package with a
  human-driven release process matching the existing
  `@arch-engine/*@1.0.x` release flow.

---

## 4. Package Boundary

### 4.1 Future package identity

```
name:    @arch-engine/agp-emitter
scope:   @arch-engine
license: MIT (matches the rest of the @arch-engine/* surface)
type:    module
node:    >=18 (matches the rest of v1.0.x)
```

### 4.2 Allowed runtime dependency

Exactly one external AGP dependency:

```jsonc
{
  "dependencies": {
    "@arch-governance/architecture-profile": "0.1.0"
  }
}
```

Discussion of the version pinning strategy in §11.

### 4.3 Forbidden imports / dependencies

The emitter MUST NOT import from any of the following, and MUST NOT
declare them as a dependency, peer dependency, or optional dependency:

| Forbidden | Rationale |
| --- | --- |
| `@arch-governance/runtime` | The runtime is the AGP evaluator engine. The emitter never evaluates; it only produces records. Pulling the runtime directly bypasses the profile-aliasing layer that protects the emitter from runtime-internal renames. |
| `@arch-governance/runtime/*` (any subpath) | Same reason; deep imports also bypass the profile package's intentional aliasing. |
| `@arch-governance/architecture-profile/*` (any subpath) | The profile package exports only `.`. Subpath imports are not part of the public contract and may break without semver. |
| Any AGP type or function copied locally and renamed | Defeats single-source-of-truth. Future profile updates would silently diverge. |
| Any "vendored" AGP source code | Same as above. |
| Any private `agp-protocol/agp` repo internals | These are not on npm. They are not a public contract. |
| `@arch-engine/sdk`, `@arch-engine/agp-foundation`, `@arch-engine/agp-spec`, `@arch-engine/kernel`, `@arch-engine/capsule`, etc. | These are post-v1.0 experiments under `packages/` that are not in the published workspace set. They are not part of any contract. |

### 4.4 Allowed Arch-Engine consumption

The emitter MAY depend on:

- `@arch-engine/core` for typings of `TopologyGraph`, `TopologyNode`,
  `TopologyEdge`, `TopologySnapshot`, `GovernanceReport`,
  `PolicyEvaluationResult`, `PolicyEvaluationDiagnostic`,
  `PolicyEvaluationSeverity`, `GraphStabilityIndex`, and adapter-related
  types. Pinned to `^1.0.1` or higher minor as the rest of the workspace
  evolves.
- Standard library only otherwise (`node:crypto`, `node:path`, etc.). No
  network calls. No filesystem writes (the consumer writes if needed).

### 4.5 Why this boundary

`architecture-profile` is the only AGP surface designed for adoption.
The runtime's API surface is internal-shaped (it carries names like
`evaluateDataset*`, `SnapshotRecord`, `CapabilityDelegationRecord`)
and is intentionally re-aliased by the profile to architecture-domain
names (`evaluateTopologySnapshotPipeline`, `TopologySnapshotRecord`,
`AuthorityDelegationRecord`). Consumers that bind to the profile can
follow profile-version compatibility (`agp_architecture_profile.v0.1`);
consumers that bind to the runtime are exposed to runtime-internal
renames between profile versions.

The emitter's contract surface is therefore **the architecture-profile
public surface only**. No exceptions.

---

## 5. Input Contract

### 5.1 Primary input shape

The emitter consumes a `TopologyGraph` as its anchor input:

```ts
import type { TopologyGraph, TopologyNode, TopologyEdge }
  from '@arch-engine/core';

interface TopologyGraph {
  readonly graphSurfaceVersion: "1.0.0";
  readonly graphSurfaceHash: string;          // canonical identity
  readonly nodes: readonly TopologyNode[];
  readonly edges: readonly TopologyEdge[];
}

interface TopologyNode {
  readonly id: string;
  readonly type: string;
  readonly metadata?: Record<string, unknown>;
}

interface TopologyEdge {
  readonly from: string;
  readonly to: string;
  readonly type: string;
  readonly metadata?: Record<string, unknown>;
}
```

The emitter **MUST** treat the graph as immutable. It MUST NOT mutate
`nodes`, `edges`, or any nested `metadata`. Spreads or copies are required
when downstream transformation is needed.

### 5.2 Optional secondary inputs

```ts
interface AgpEmitterInput {
  // Required
  readonly graph: TopologyGraph;

  // Optional context — included as evidence when present
  readonly governanceReport?: GovernanceReport;          // from `arch-engine check`
  readonly stabilityIndex?: GraphStabilityIndex;         // from `arch-engine analyze`
  readonly adapterProvenance?: AdapterProvenance;
  readonly producer?: ProducerIdentity;

  // Required identity context
  readonly producerKey: ProducerKeyContext;
  readonly profileVersion: typeof PROFILE_VERSION;       // must be the value
                                                         // imported from
                                                         // architecture-profile
}

interface AdapterProvenance {
  readonly extractor: 'arch-engine';
  readonly extractorVersion: string;       // e.g. "1.1.0"
  readonly adapterIds: readonly string[];  // e.g. ["adapter-monorepo"]
  readonly extractionMode: 'structured' | 'fallback';
  readonly workspaceType: string;          // e.g. "yarn-npm"
}

interface ProducerIdentity {
  readonly producerId: string;             // stable opaque identifier;
                                           // never a wall-clock or random
  readonly producerLabel?: string;         // human-readable, optional
}

interface ProducerKeyContext {
  readonly keyId: string;
  // Any signing/verification data required by ProducerKeyRegistryRecord;
  // exact shape resolves to architecture-profile aliases at implementation time.
}
```

### 5.3 What the emitter MUST validate

The emitter MUST validate, at minimum, before producing any output:

1. `graph.graphSurfaceVersion === "1.0.0"`. If not, emit
   `AGP_EMITTER_UNSUPPORTED_GRAPH_VERSION` and refuse to produce records.
2. `graph.graphSurfaceHash` is a non-empty string. If absent or empty,
   emit `AGP_EMITTER_MISSING_GRAPH_HASH` and refuse.
3. `graph.nodes` is an array (possibly empty).
4. `graph.edges` is an array (possibly empty).
5. Every `TopologyEdge.from` and `TopologyEdge.to` resolves to a node
   present in `graph.nodes`. (Dangling edges are an
   `AGP_EMITTER_INVALID_EDGE` blocker.)
6. `profileVersion === PROFILE_VERSION`. If a caller passes a different
   profile version string, emit
   `AGP_EMITTER_UNSUPPORTED_PROFILE_VERSION`.
7. `producerKey.keyId` is non-empty.
8. No `metadata` value contains `Date.now()` outputs that are
   indistinguishable from wall-clock identity (see §8 — the emitter
   refuses inputs that obviously taint determinism).

### 5.4 What the emitter MUST NOT require

- A network connection.
- Filesystem read/write privileges (unless the consumer's own CLI flag
  performs the write; the emitter library itself returns objects).
- The repository's git working tree (the topology graph already encodes
  what is needed; git context is the consumer's job to attach via
  `producer` or `adapterProvenance`).

### 5.5 Command-origin context

The emitter is the same regardless of which Arch-Engine command produced
the graph (`inspect`, `analyze`, or `check`). The optional fields differ:

| Source command | `governanceReport` | `stabilityIndex` |
| --- | --- | --- |
| `arch-engine inspect` | absent | absent |
| `arch-engine analyze` | absent | present |
| `arch-engine check` | present | present (when policy evaluation produced one) |

Programmatic callers (using `extractTopologyGraph` directly via
`@arch-engine/core`) may pass any subset.

### 5.6 Deterministic timestamp policy on the input boundary

The emitter is sensitive to one piece of input drift: `GraphStabilityIndex`
includes a `generated_at: string` (ISO 8601). The emitter MUST NOT include
this field in any AGP record's identity-relevant fields. It MAY include it
in a non-identity diagnostic field (or omit it entirely). See §8 for
identity rules.

---

## 6. Output Contract

### 6.1 Top-level shape

The emitter produces a single JSON-serializable object:

```ts
interface AgpEmitterOutput {
  readonly profileVersion: typeof PROFILE_VERSION;
                          // exact value: "agp_architecture_profile.v0.1"

  readonly emitterVersion: string;
                          // semver of @arch-engine/agp-emitter, e.g. "0.1.0"

  readonly emitterCommit?: string;
                          // optional: short git SHA of @arch-engine/agp-emitter
                          // used for traceability; not part of record identity

  readonly emittedAt: string;
                          // ISO 8601, UTC, second-resolution. ALWAYS present.
                          // NEVER part of record identity. Useful only as
                          // out-of-band metadata.

  readonly sourceGraphSurfaceHash: string;
                          // verbatim copy of input graph.graphSurfaceHash;
                          // links every record to its source graph

  readonly records: AgpRecordBatch;

  readonly diagnostics: readonly AgpEmitterDiagnostic[];

  readonly warnings: readonly AgpEmitterWarning[];
}
```

### 6.2 Record batch shape

The batch groups records by AGP architecture-profile alias kind:

```ts
import type {
  TopologySnapshotRecord,
  ClosureGraphHashBindingRecord,
  AuthorityDelegationRecord,
  ArchitectureLifecycleTransitionRecord,
  ArchitectureFederationParticipantRecord,
  ArchitectureTrustPolicyParticipantRecord,
  ProducerAttestationRecord,
  ProducerKeyRegistryRecord,
} from '@arch-governance/architecture-profile';

interface AgpRecordBatch {
  readonly topologySnapshots: readonly TopologySnapshotRecord[];
  readonly closureGraphHashBindings: readonly ClosureGraphHashBindingRecord[];
  readonly authorityDelegations: readonly AuthorityDelegationRecord[];
  readonly architectureLifecycleTransitions: readonly ArchitectureLifecycleTransitionRecord[];
  readonly architectureFederationParticipants: readonly ArchitectureFederationParticipantRecord[];
  readonly architectureTrustPolicyParticipants: readonly ArchitectureTrustPolicyParticipantRecord[];
  readonly producerAttestations: readonly ProducerAttestationRecord[];
  readonly producerKeyRegistry: readonly ProducerKeyRegistryRecord[];
}
```

### 6.3 Profile version anchor

`output.profileVersion` MUST equal the value imported from
`@arch-governance/architecture-profile` at *compile time*, not a string
literal copied into the source. This ensures that a profile-package
upgrade in the implementation triggers either a deliberate emitter update
or a profile-version mismatch diagnostic.

```ts
import { PROFILE_VERSION } from '@arch-governance/architecture-profile';
// PROFILE_VERSION === "agp_architecture_profile.v0.1"
```

### 6.4 Source linkage

Every record MUST be reachable back to the source graph via either:

- the top-level `output.sourceGraphSurfaceHash`, or
- a record-internal field that uses the same hash as a key (e.g. inside
  `ClosureGraphHashBindingRecord`).

The emitter MUST NOT introduce a *new* graph identity. It is a pure
function of the input; the graph identity is the input's identity.

### 6.5 `emittedAt` policy

`output.emittedAt`:

- ALWAYS present (so consumers can diagnose stale output).
- ALWAYS in UTC, ISO 8601, second-resolution: `YYYY-MM-DDTHH:MM:SSZ`.
- NEVER part of any record's identity-contributing fields.
- NEVER a stable replay anchor — two emissions of the same input MAY
  differ only in `emittedAt` and MUST otherwise be byte-identical.

### 6.6 Stable ordering

Within each `records.<kind>` array, entries MUST be sorted by a record-kind-
specific canonical key (defined in §7). The sort MUST be a total order
(no ties produce nondeterminism). String sorts MUST use a fixed locale
("en", `localeCompare(a, b, "en")`) or, preferably, simple lexicographic
byte comparison — the implementation MUST commit to one and document it.
Recommended: byte-lex comparison for portability.

### 6.7 Diagnostics and warnings

```ts
type AgpEmitterDiagnosticSeverity = 'BLOCKING' | 'WARNING' | 'INFO';

interface AgpEmitterDiagnostic {
  readonly code: AgpEmitterErrorCode;            // see §9
  readonly severity: AgpEmitterDiagnosticSeverity;
  readonly message: string;
  readonly path?: string;            // dot-path into the input where
                                     // the issue was detected,
                                     // e.g. "graph.edges[42]"
}

interface AgpEmitterWarning extends AgpEmitterDiagnostic {
  readonly severity: 'WARNING' | 'INFO';
}
```

Distinguishing `diagnostics` and `warnings` arrays is intentional:

- `diagnostics` holds anything (BLOCKING, WARNING, INFO).
- `warnings` is a narrower view of `diagnostics` filtered to non-blocking
  entries. Consumers may consume either; we maintain both for ergonomic
  equivalence with the existing CLI output contract.

### 6.8 Unsupported-input behavior

If the emitter encounters a BLOCKING-severity diagnostic, it:

1. **MUST NOT** return a partially-populated `records` batch. Either all
   record kinds are populated according to the input, or the
   `records` field is the **empty batch** (each `records.<kind>` is `[]`).
2. **MUST** include the BLOCKING diagnostic in `diagnostics` and may
   include additional INFO entries explaining what *would* have been
   emitted.
3. **MUST** populate `diagnostics`, `profileVersion`, `emitterVersion`,
   `emittedAt`, and `sourceGraphSurfaceHash` (if the hash is present in
   the input — otherwise an empty string with a `AGP_EMITTER_MISSING_GRAPH_HASH`
   diagnostic).
4. **MAY** be invoked in two modes (impl detail; both must satisfy the
   above):
   - **Throw mode** (default for programmatic callers): on first BLOCKING,
     throw a typed error.
   - **Result mode** (opt-in via an option): never throws; always returns
     `AgpEmitterOutput` with `records = empty batch` and BLOCKING diagnostics.

### 6.9 No partial silent success

The emitter MUST NOT emit a record that contains placeholder, "best-effort",
or `null`-stand-in fields just to "produce something". A record either
satisfies the AGP architecture-profile shape exactly, or it is not emitted
and a diagnostic is recorded.

### 6.10 Serialization

The output MUST be JSON-serializable with `JSON.stringify` without any
custom replacer. No `BigInt`, no `Date` instances, no class instances —
only plain primitives, arrays, and objects.

---

## 7. Record Mapping

This section is **DRAFT**. The exact AGP architecture-profile aliases
exposed by `@arch-governance/architecture-profile@0.1.0` are derived from
runtime "dataset"-named primitives; some field names below are
implementation-derived and will be confirmed against the profile's
type aliases at implementation time. **The emitter MUST stay strictly
inside the exported architecture-profile public surface**: any field that
is not on a profile-exported type is forbidden.

### 7.1 Graph identity → architecture artifact identity

| Source (Arch-Engine) | Mapped to (AGP) |
| --- | --- |
| `graph.graphSurfaceHash` | `output.sourceGraphSurfaceHash` (top-level), and the canonical "topology fingerprint" within `ClosureGraphHashBindingRecord`. |
| `graph.graphSurfaceVersion` | Encoded as a constant in record metadata. The emitter MUST verify it equals `"1.0.0"` and MUST refuse otherwise (§5.3). |
| `output.sourceGraphSurfaceHash` | Used as the deterministic-ID prefix for every record (§8). |

### 7.2 Node → architecture component / artifact

| Source | AGP record | Notes |
| --- | --- | --- |
| `TopologyNode.id` | record's stable identity | byte-lex sort key |
| `TopologyNode.type` | record's component-kind field | values: `'package'`, `'service'`, `'library'`, `'application'`, etc., as the existing `AuthorityDomain` enum maps |
| `TopologyNode.metadata` | record's structured-metadata field | passed through unchanged after key sorting and path normalization (§8); no leakage of absolute paths |

Each node produces exactly one entry in `records.topologySnapshots` (or the
profile-exported equivalent containing per-node identity), and may
contribute auxiliary entries (`producerKeyRegistry`, etc.) when secondary
context is provided.

### 7.3 Edge → dependency / relationship record

| Source | AGP record | Notes |
| --- | --- | --- |
| `TopologyEdge.from` + `TopologyEdge.to` + `TopologyEdge.type` | identity tuple | sort key: `(from, to, type)` byte-lex |
| `TopologyEdge.type` | edge-kind field | values include `'workspace_dependency'` (per `@arch-engine/adapter-monorepo` v1.0.1) and any future edge types adapters add |
| `TopologyEdge.metadata` | structured-metadata field | path-normalized |

Edges contribute to `records.topologySnapshots` (or its
profile-exported equivalent) and to
`records.architectureLifecycleTransitions` only when an edge represents a
boundary transition that AGP's lifecycle vocabulary covers. **Pure
package→package dependency edges DO NOT produce lifecycle transition
records.**

### 7.4 Closure graph hash → topology closure binding

| Source | AGP record | Notes |
| --- | --- | --- |
| `graph.graphSurfaceHash` | `ClosureGraphHashBindingRecord` | exactly one entry per emitter run |
| Future: an Arch-Engine-exposed `closureGraphHash` (currently INTERNAL only — `core/src/transport/snapshotClosureGraphHash.ts` is not on the v1.0.x public surface) | Same record kind | preferred over `graphSurfaceHash` once exposed; see §16 |

The `ClosureGraphHashBindingRecord` is the emitter's primary *cryptographic*
linkage: it ties the snapshot identity to the graph identity to the
producer attestation, all within the AGP profile vocabulary.

### 7.5 Policy finding → governance record

| Source | AGP record | Notes |
| --- | --- | --- |
| `GovernanceReport.results[].policyPackId` | identifies producer of finding | |
| `PolicyEvaluationResult.success` | boolean status field | |
| `PolicyEvaluationDiagnostic.code` | finding's stable code | |
| `PolicyEvaluationDiagnostic.message` | finding's human-readable string | |
| `PolicyEvaluationDiagnostic.severity` | maps `'info' | 'warning' | 'error'` | severity vocabulary translation defined at impl time |

Findings flow into AGP records that the architecture-profile exports
explicitly. The emitter MUST NOT invent a "finding record" type that the
profile does not export. If no profile-exported alias is suitable for an
Arch-Engine finding, the implementation MUST drop it from the record
batch and record an INFO diagnostic explaining the loss — never silently
mint a new record type.

### 7.6 Stability / confidence → diagnostic record

`GraphStabilityIndex` carries:

- `topology_reliability_score: number` (0..1)
- `components.{agreement_ratio, confidence_variance, conflict_rate, authority_coverage, average_trust_weighted_confidence}`
- `blast_radius_analysis`
- `generated_at: string` ⚠️ wall-clock — NOT identity-relevant, see §8

These contribute as confidence-flavored fields inside the relevant
profile-exported records (e.g. as side metadata on the topology
snapshot). The emitter MUST NOT promote any stability metric to AGP's
trust-policy or attestation surface — those have their own profile
record kinds (`ArchitectureTrustPolicyParticipantRecord`,
`ProducerAttestationRecord`) that require their own input shapes.

### 7.7 Adapter provenance → producer / attestation

| Source | AGP record | Notes |
| --- | --- | --- |
| `AdapterProvenance.extractor` ("arch-engine") | producer identity | |
| `AdapterProvenance.extractorVersion` (e.g. "1.1.0") | producer-version field | |
| `AdapterProvenance.adapterIds` (e.g. ["adapter-monorepo"]) | adapter-set field | sorted byte-lex |
| `AdapterProvenance.extractionMode` ('structured' | 'fallback') | extraction-mode field | |
| `producer.producerId` | identity used by `ProducerAttestationRecord` | |
| `producerKey.keyId` | identity used by `ProducerKeyRegistryRecord` | |

If `producer` and/or `producerKey` are absent, the emitter MUST omit
`producerAttestations` and/or `producerKeyRegistry` from the batch (set
them to `[]`) and record an INFO diagnostic — these surfaces are
attestation-flavored and must not be filled with placeholder identities.

### 7.8 What does NOT map

Out of scope for the emitter (record-emission-wise), even though the
profile package exports them:

- `ArchitectureFederationParticipantRecord` — Arch-Engine v1.0.x does not
  emit federated graphs in its public CLI surface. The emitter MAY accept
  federation-context input in a future release, but v0.1 emits
  `architectureFederationParticipants: []` with an INFO diagnostic when
  no federation context is supplied.
- `ArchitectureTrustPolicyParticipantRecord` — Arch-Engine's trust-policy
  surface (`@arch-engine/core`'s `TrustPolicyConfig`) is not yet
  cross-mapped. v0.1 emits `architectureTrustPolicyParticipants: []` with
  an INFO diagnostic.
- `ArchitectureLifecycleTransitionRecord` — emitted only when a
  diff-input is supplied (a `TopologyDiffResult` from `diffTopologyGraphs`,
  which is on `@arch-engine/core`'s public surface). v0.1 supports a
  single-graph snapshot; lifecycle-transition emission is a v0.2+ feature.
- `ArchitectureReleaseContractV1` outcomes — not produced; this is a
  consumer-side evaluator output, not an emitter output.

---

## 8. Determinism Requirements

The emitter is a **pure function** of its input. Two invocations with the
same input MUST produce byte-identical outputs except for `emittedAt`.

### 8.1 Stable sort orders

| Array | Sort key | Comparator |
| --- | --- | --- |
| `records.topologySnapshots` | record's identity tuple | byte-lex |
| `records.closureGraphHashBindings` | binding's hash | byte-lex (only one entry typically) |
| `records.authorityDelegations` | identity tuple | byte-lex |
| `records.architectureLifecycleTransitions` | (from, to, kind) | byte-lex |
| `records.architectureFederationParticipants` | participant id | byte-lex |
| `records.architectureTrustPolicyParticipants` | participant id | byte-lex |
| `records.producerAttestations` | producer id | byte-lex |
| `records.producerKeyRegistry` | key id | byte-lex |
| `diagnostics` and `warnings` | (severity, code, path, message) | byte-lex on the joined string |

Within each record, when emitting a metadata object derived from a node's
or edge's `metadata`, the implementation MUST sort the object's own keys
byte-lex during canonicalization. (Note: `JSON.stringify` does not sort
keys; the implementation must canonicalize manually before producing
the record's identity hash, if any.)

### 8.2 Stable JSON serialization

Consumers commonly serialize the output with `JSON.stringify(output)`.
For that to be deterministic:

- The emitter MUST construct objects with keys in canonical order (sorted
  byte-lex within each level) when those objects are user-visible.
- The emitter MUST NOT emit `Set`, `Map`, or class instances. Only
  primitives, plain objects, and arrays.
- The emitter MUST NOT emit `undefined` values; absent fields are absent
  keys.
- The emitter MUST encode strings as UTF-8 without normalization changes
  (no NFC/NFD coercion).

### 8.3 Forbidden non-determinism sources

The emitter MUST NOT use, anywhere in record-identity-relevant code paths:

- `Date.now()`, `Date.parse(...)`, any `new Date(...)` for identity.
- `Math.random()`, `crypto.randomUUID()`, `crypto.randomBytes()` for
  identity.
- `process.env` reads for identity (the
  `@arch-engine/agp-emitter` build does not consume environment).
- `process.cwd()` or any current-working-directory reads for identity.
- `os.hostname()`, `os.platform()`, `process.pid`, etc.
- Locale-dependent string operations (e.g. `String.prototype.localeCompare`
  without an explicit locale).
- Filesystem reads.
- Network reads.

These are also forbidden in non-identity fields *unless* explicitly
enumerated in this contract (currently only `emittedAt` uses
`Date`-derived output, and only outside identity).

### 8.4 Path separator and casing normalization

When the emitter encounters file paths inside `metadata` (e.g. an adapter
that includes a `route` or `path` field):

- Path separator: convert to forward slash (`/`) regardless of host OS.
  POSIX-only output.
- Casing: preserve as-given. Do not lowercase or uppercase. (`'README.md'`
  must stay `'README.md'`, not `'readme.md'`.)
- Absolute paths: MUST be stripped of repository-root prefixes before
  emission. The emitter MAY accept a `repoRoot` option in its input that
  it strips from the start of any absolute path it discovers; if the
  option is absent and an absolute path is present, the emitter MUST
  emit `AGP_EMITTER_NON_DETERMINISTIC_INPUT` (severity: BLOCKING) with
  the path quoted.
- Symlink resolution: NOT performed. Trust the input's representation.

### 8.5 Hash input canonicalization

When the emitter needs to derive any record-internal hash (e.g. an
implementation-defined record id), the canonicalization rules are:

1. Object keys sorted byte-lex.
2. Strings emitted as JSON-escaped UTF-8.
3. Numbers emitted in their JavaScript-default decimal form (no
   precision-altering rounding).
4. Booleans as `true`/`false`.
5. Arrays in their already-sorted order (per §8.1).
6. `null` as `null`; `undefined` is forbidden.
7. The canonical form is then hashed with `node:crypto`'s `sha256` and
   prefixed with `output.sourceGraphSurfaceHash` to bind the record to
   its source graph.

### 8.6 Replay test obligation

The test contract (§12) requires a deterministic-replay test that calls
the emitter twice with identical input and asserts the two outputs are
byte-identical *after stripping `emittedAt` from both*.

---

## 9. Error and Diagnostic Contract

### 9.1 Error code vocabulary

The emitter defines its own error codes. They MUST be prefixed
`AGP_EMITTER_*` to clearly distinguish from AGP runtime error codes (which
the architecture-profile re-exports as `*_ERROR_CODES` constants). The
emitter MUST NOT reuse or overlap with the runtime's error-code strings.

| Code | Severity | Meaning |
| --- | --- | --- |
| `AGP_EMITTER_INVALID_GRAPH` | BLOCKING | `input.graph` is not an object, or its surface-version field is missing. |
| `AGP_EMITTER_UNSUPPORTED_GRAPH_VERSION` | BLOCKING | `graph.graphSurfaceVersion` is not `"1.0.0"`. |
| `AGP_EMITTER_MISSING_GRAPH_HASH` | BLOCKING | `graph.graphSurfaceHash` absent or empty. |
| `AGP_EMITTER_INVALID_NODE` | BLOCKING | A `TopologyNode` is missing `id`, has a non-string `id`, or has a non-string `type`. The diagnostic includes a path index. |
| `AGP_EMITTER_INVALID_EDGE` | BLOCKING | A `TopologyEdge` references a node not present in `graph.nodes`, has a non-string `from`/`to`/`type`, or has self-loops where the contract forbids them (impl-decision: spec defaults to allowing self-loops). |
| `AGP_EMITTER_UNSUPPORTED_PROFILE_VERSION` | BLOCKING | The caller passes a `profileVersion` that does not equal the imported `PROFILE_VERSION`. |
| `AGP_EMITTER_NON_DETERMINISTIC_INPUT` | BLOCKING | Input contains an absolute path the emitter cannot normalize, a wall-clock-shaped identity field, a `Date` instance, or any other forbidden non-determinism source. |
| `AGP_EMITTER_PROFILE_EVALUATION_FAILED` | BLOCKING | Reserved for the future case where the emitter calls a profile-exported `evaluateXxx` for input pre-validation and the evaluator throws. v0.1 implementations MAY skip pre-validation entirely; if they perform it, this is the right code. |
| `AGP_EMITTER_DROPPED_INPUT_RECORD` | INFO | An input field could not be mapped to any architecture-profile-exported record kind. The dropped data is identified by path. Output continues. |
| `AGP_EMITTER_PRODUCER_CONTEXT_INCOMPLETE` | WARNING | `producer` or `producerKey` was absent; producer-flavored record arrays are emitted as `[]`. |
| `AGP_EMITTER_FEDERATION_CONTEXT_ABSENT` | INFO | No federation context supplied; `architectureFederationParticipants` emitted as `[]`. |
| `AGP_EMITTER_TRUST_POLICY_CONTEXT_ABSENT` | INFO | No trust-policy context supplied; `architectureTrustPolicyParticipants` emitted as `[]`. |
| `AGP_EMITTER_LIFECYCLE_DIFF_ABSENT` | INFO | No diff context supplied; `architectureLifecycleTransitions` emitted as `[]`. |

### 9.2 Severity semantics

| Severity | Behavior |
| --- | --- |
| `BLOCKING` | Output `records` MUST be the empty batch. The emitter still returns a well-formed `AgpEmitterOutput` (or throws, depending on mode — see §6.8). |
| `WARNING` | Output `records` populated according to mapping rules; consumers should treat as non-fatal but log. |
| `INFO` | Diagnostic; not actionable; may be suppressed by consumers via verbosity flags in their CLIs. |

### 9.3 Fail-closed default

The emitter's default mode is **fail-closed**: any BLOCKING diagnostic
yields an empty `records` batch. The implementation MAY offer a
`partial: true` option in a future release that emits records for the
non-failing inputs alongside BLOCKING diagnostics for the rest, but v0.1
MUST NOT support partial emission.

### 9.4 Error class

The implementation SHOULD expose a single typed error class for throw
mode:

```ts
export class AgpEmitterError extends Error {
  readonly code: AgpEmitterErrorCode;
  readonly severity: 'BLOCKING';
  readonly diagnostic: AgpEmitterDiagnostic;
}
```

Throw-mode errors MUST set `severity: 'BLOCKING'`. Non-blocking
diagnostics MUST NOT throw.

---

## 10. CLI Integration Contract

The v0.1 emitter package SHIPS NO CLI INTEGRATION. The existing
v1.0.1 CLI commands (`doctor`, `inspect`, `analyze`, `check`,
`explain <target>`) MUST remain backward compatible byte-for-byte:
identical stdout, identical exit codes, identical `--json` output,
identical `cli-output-contract.json` schema.

CLI integration is a separate later release.

### 10.1 Future possible CLI surfaces (informational, not normative)

When the team is ready to wire the emitter into the CLI, the **smallest
backward-compatible** surface looks like:

| Future verb / flag | Default | Effect |
| --- | --- | --- |
| `arch-engine inspect --emit-agp` | off | After printing the existing `inspect` output, emit AGP records to stdout in JSON. |
| `arch-engine analyze --emit-agp` | off | Same, with stability-context. |
| `arch-engine check --emit-agp` | off | Same, with governance-report context. |
| `arch-engine check --agp-output <path>` | off | Write the AGP output to a file (consumer-side write; the emitter library still returns the object). |
| `arch-engine emit-agp` | (new verb) | Standalone verb that takes an existing topology snapshot file and emits AGP records. |

### 10.2 Backward-compatibility constraints

- v1.0.x default CLI behavior (no `--emit-agp` flag, no `--agp-output`)
  MUST remain unchanged.
- v1.0.x `--json` output schema MUST remain unchanged.
- AGP emission MUST be opt-in.
- A patch release (v1.0.2, v1.0.3) MUST NOT introduce CLI emitter
  flags. CLI flags land only in a minor release (v1.1.0+).
- The emitter package itself MAY be on npm at any time — a consumer of
  the library does not require the CLI flag plumbing.

### 10.3 Exit-code policy

If a future CLI flag enables AGP emission and a BLOCKING diagnostic
fires, the CLI's exit code policy is **separately defined** in
`cli-surface-contract.md` at that future release; this spec does not
prescribe it. The library-level emitter does not decide exit codes.

---

## 11. Package / Versioning Strategy

### 11.1 Package version

Recommended initial version: **`0.1.0`**.

Rationale:

- The emitter is a brand-new package, distinct from the established
  v1.0.x `@arch-engine/*` packages. It does not need to align with the
  rest of the workspace's version (those are products at 1.0.x; the
  emitter is a bridge in early life).
- AGP itself is at `architecture-profile@0.1.0` / `runtime@1.7.0`. The
  emitter SHOULD signal the same maturity tier on its own version digit.
- A `0.x` line allows a single iteration cycle (0.1, 0.2, ...) before
  the 1.0 emitter contract is locked.

The first Arch-Engine *product release* that bundles the emitter as an
opt-in package SHOULD be a **minor** release of the workspace —
suggested `arch-engine-v1.1.0`. The emitter itself stays at 0.1.0
inside that release, separate from the rest of `@arch-engine/*@1.1.x`.

### 11.2 AGP profile dependency pinning

Recommended dependency:

```jsonc
{
  "dependencies": {
    "@arch-governance/architecture-profile": "0.1.0"
  }
}
```

Note: **exact pin (no caret)** for the initial 0.1 line.

Rationale:

- `architecture-profile@0.1.0` is the only published version. There is no
  `0.1.x` patch line yet.
- AGP is in pre-1.0 territory. SemVer pre-1.0 explicitly allows minor
  bumps to break APIs. A caret `^0.1.0` would resolve to `0.1.x` only,
  but a future `0.2.0` (which CAN break the type aliases) would not be
  picked up — yet the emitter would still be type-correct against `0.1.x`,
  so this is fine for caret semantics.
- However, an exact pin is safer for the *first* release because it
  documents the exact AGP profile version the emitter was tested against,
  and any future profile bump becomes an explicit, deliberate emitter PR.

When AGP reaches `architecture-profile@1.0.0`, the emitter can switch to
`^1.0.0` and follow standard SemVer.

### 11.3 Minor-release alignment

The first release of `@arch-engine/agp-emitter@0.1.0` SHOULD be cut at
the same time as a minor `@arch-engine/*@1.1.0` workspace release that
publishes the emitter alongside. The emitter MAY ship in a patch line
of its own afterwards (`0.1.1`, `0.1.2`) without requiring a workspace
bump.

The emitter's own SemVer applies to its public API:

- 0.1.x changes: bug fixes, additive non-breaking improvements.
- 0.2.0: breaking changes to the input/output shape, the error vocabulary,
  or the AGP profile-version pin.
- 1.0.0: stable contract; SemVer rules apply per `public-surface-contract.md`.

---

## 12. Test Contract

The implementation MUST include the following tests, classified by
purpose:

### 12.1 Fixture-driven happy-path tests

| Test | Expected behavior |
| --- | --- |
| Empty graph (`nodes: []`, `edges: []`, valid `graphSurfaceHash`) | `records` populated as the empty batch (each kind `[]`); diagnostics include INFO entries for the absent contexts; no throws. |
| Single-node graph | `records.topologySnapshots` has one entry; other kinds remain `[]`. |
| Two-node graph with one edge | Edge sort order verified; `records.topologySnapshots` deterministic. |
| Real fixture from `examples/sample-monorepo` | End-to-end: extract, run through emitter, snapshot the output. |

### 12.2 Failure-path tests

| Test | Expected behavior |
| --- | --- |
| `graphSurfaceVersion: "0.9"` | BLOCKING `AGP_EMITTER_UNSUPPORTED_GRAPH_VERSION`; `records` empty; throw in throw-mode, return in result-mode. |
| `graphSurfaceHash: ""` | BLOCKING `AGP_EMITTER_MISSING_GRAPH_HASH`. |
| Edge whose `to` references a missing node | BLOCKING `AGP_EMITTER_INVALID_EDGE`; diagnostic path includes the offending edge index. |
| Caller passes `profileVersion: "agp_architecture_profile.v0.0"` | BLOCKING `AGP_EMITTER_UNSUPPORTED_PROFILE_VERSION`. |
| Node `metadata` contains an absolute path with no `repoRoot` option | BLOCKING `AGP_EMITTER_NON_DETERMINISTIC_INPUT`. |
| Node `metadata` contains a `Date` instance | BLOCKING `AGP_EMITTER_NON_DETERMINISTIC_INPUT`. |

### 12.3 Determinism / replay tests

| Test | Expected behavior |
| --- | --- |
| Call emitter twice with same input; strip `emittedAt`; compare with `JSON.stringify` | Byte-identical. |
| Call emitter with `repoRoot` set to two different paths but otherwise identical input where `repoRoot` is correctly stripped from absolute paths | Byte-identical (modulo `emittedAt`). |
| Call emitter on inputs that differ only in object-key insertion order | Byte-identical (key sort canonicalization). |
| Reorder `nodes` and `edges` arrays in the input (same set) | Byte-identical, because the emitter sorts internally. |

### 12.4 Public API boundary tests

| Test | Expected behavior |
| --- | --- |
| `Object.keys(import('@arch-engine/agp-emitter'))` matches the approved emitter export set | Approved set established at 0.1.0 release; tracked by a snapshot test similar to `core/tests/publicSurface.snapshot.test.ts`. |
| Importing an internal subpath (`@arch-engine/agp-emitter/internals/...`) fails | The package's `exports` map exposes only `.`. |
| The emitter's d.ts compiles against `@arch-governance/architecture-profile@0.1.0` cleanly with `tsc --noEmit` | Type-level conformance check. |

### 12.5 Import-boundary tests

See §13 for full requirements. At minimum, a test that scans the
emitter's bundled `dist/index.js` (or `dist/index.cjs`) and asserts that
no `require`/`import` of `@arch-governance/runtime` appears.

### 12.6 Snapshot tests

| Snapshot | Stable across | Anchor file |
| --- | --- | --- |
| Sorted `records.topologySnapshots` for a fixture | Node version, OS, locale | new `tests/__snapshots__/...` |
| Sorted `records.closureGraphHashBindings` for a fixture | Same | Same |
| Diagnostics ordering for a deliberately-malformed input | Same | Same |
| Full-output deterministic-stringify | Same (modulo `emittedAt`) | Same |

---

## 13. Conformance / Import Boundary Tests

### 13.1 Allowed imports (whitelist)

The emitter source code's set of external imports MUST be a subset of:

- `@arch-governance/architecture-profile` (the `.` entry only)
- `@arch-engine/core` (typings only — `import type { ... }`)
- node built-ins (`node:crypto`, `node:path` for input-path
  normalization, etc.)

### 13.2 Required boundary tests

The implementation MUST ship at least these conformance tests, all of
which MUST run as part of `npm test`:

1. **Static import grep.** Scan `packages/agp-emitter/src/**/*.ts`
   for any of the following patterns and fail the test if any match:
   - `from ['"]@arch-governance/runtime`
   - `from ['"]@arch-governance/runtime/`
   - `from ['"]@arch-governance/architecture-profile/`
   - `require\(['"]@arch-governance/runtime`
   - `require\(['"]@arch-governance/runtime/`
   - `require\(['"]@arch-governance/architecture-profile/`
2. **Bundled output grep.** Same patterns against `packages/agp-emitter/dist/`.
3. **Package metadata test.** `packages/agp-emitter/package.json`
   `dependencies`, `peerDependencies`, `optionalDependencies`,
   `devDependencies` MUST contain exactly `@arch-governance/architecture-profile`
   from the `@arch-governance/*` scope. Anything else is a test failure.
4. **Type-source test.** Every emitted type that originates from AGP
   MUST be re-imported from `@arch-governance/architecture-profile`. The
   d.ts test inspects the bundled `dist/index.d.ts` (or per-record
   declaration files) and asserts no string `from '@arch-governance/runtime'`
   remains.

### 13.3 No duplicate AGP types

The implementation MUST NOT define a local type alias whose name matches
an architecture-profile-exported type (e.g. defining a local
`TopologySnapshotRecord` interface). Such collisions are caught by a
boundary test that diffs the emitter's locally-defined type names against
the architecture-profile public surface.

### 13.4 No copied runtime code

The implementation MUST NOT contain any code that reproduces the runtime's
evaluator logic. A heuristic boundary test diffs SHA256 of strings >100
chars in the emitter source against a snapshot of the runtime source's
strings; significant overlap is suspicious. (Implementation discretion;
documented expectation.)

### 13.5 Profile-bypass test

A negative test: import `@arch-governance/architecture-profile`'s
`PROFILE_VERSION`, then verify it equals the value the emitter encodes in
its output. If the profile-package upgrades the value, this test fails
(forcing an explicit emitter-version bump).

---

## 14. Security / Privacy Considerations

### 14.1 Path normalization

Per §8.4, all paths are POSIX-converted, repository-root-stripped, and
casing-preserved. This both supports determinism and prevents leaking the
absolute filesystem layout of the producer's machine.

### 14.2 No secret emission

The emitter MUST NOT include in any output:

- Authentication tokens, API keys, signing keys, environment variables.
- Raw source code from the repository.
- Stack traces from the producer process.
- Email addresses or usernames discovered in `package.json` `author`
  fields, unless explicitly passed in via `producer.producerLabel`.

If `metadata` on a node or edge is observed to contain a key matching a
configurable redaction list (default: `/(secret|token|password|key|auth|credential)/i`),
the emitter MUST omit the value in the emitted record and record a
WARNING diagnostic with the path. The list is configurable but defaults
on. Implementation MUST NOT *replace* the value with a placeholder — it
omits the key entirely, because placeholders themselves can leak.

### 14.3 Repository identifier policy

`producer.producerLabel` and `repoRoot` MAY contain identifying repo
names. The emitter does NOT redact these by default; the consumer is
responsible. The implementation MUST, however, document this clearly in
its README and provide an opt-in `redactProducerLabel: true` option that
hashes the label.

### 14.4 Deterministic-but-private identifiers

Any record id that the emitter mints MUST be derived via `sha256` of
canonicalized inputs (see §8.5). This produces opaque, non-reversible,
deterministic identifiers; consumers cannot recover original metadata
from a record id without the original input.

### 14.5 Network and filesystem isolation

The library MUST NOT make network calls. The library MUST NOT read or
write files. The consumer (CLI, custom tool) is responsible for any I/O.

---

## 15. Migration Plan

The emitter is additive. Migration from v1.0.1 → first emitter release
follows the path below. **No step before §15.5 changes any public CLI or
package surface.**

| Step | Action | Surface impact |
| --- | --- | --- |
| 1 | Land this contract document in `main` (this PR / commit). | None — docs only. |
| 2 | Land emitter implementation as a new private workspace (`packages/agp-emitter/`, `private: true`) with full tests. | None — package is private. |
| 3 | Land emitter README, fixtures, snapshot tests. | None. |
| 4 | Land a programmatic-API example in `examples/agp-emitter/` showing how to consume the emitter. | None — examples already exist. |
| 5 | Flip `private` off, bump the emitter to `0.1.0`, add it to root `workspaces`, add the `@arch-governance/architecture-profile@0.1.0` dependency to *the emitter package only*, run a full release validation, publish as a minor `@arch-engine/*@1.1.0` workspace release. | Emitter is now a public npm package. CLI surface unchanged. Existing v1.0.x packages have backward-compatible v1.1.0 publishes (cli's peer-deps may bump but not break). |
| 6 | Later: add CLI flags per §10.1 in a v1.2.0 (or whatever minor follows). | New opt-in flags; existing flags unchanged. |
| 7 | Later: extend record kinds covered (federation, trust-policy, lifecycle diff) in emitter 0.2.0. | Emitter SemVer minor; profile compatibility re-verified. |

A consumer that does nothing sees zero behavior change. A consumer that
installs `@arch-engine/agp-emitter` and imports the API gets AGP records.
A consumer that wires the future `--emit-agp` flag opts into emission via
the CLI.

---

## 16. Open Questions

The following are recorded as open questions for human-review-and-decide
before the implementation pass starts.

### Q1. closureGraphHash exposure

Arch-Engine v1.0.x's public surface exposes `graphSurfaceHash` (on
`TopologyGraph`), but the deeper `closureGraphHash` lives in
`packages/core/src/transport/snapshotClosureGraphHash.ts` and is NOT in
the v1.0.x public exports. The AGP profile defines
`ClosureGraphHashBindingRecord` as if the producer can supply a closure
hash directly.

**Decision needed:** Does the emitter:

- (a) use `graphSurfaceHash` as the closure-binding source, accepting that
  the binding is "the topology surface fingerprint", not the deeper
  closure?
- (b) push to expose `closureGraphHash` through `@arch-engine/core`'s public
  surface in v1.1.0 (a careful additive change to the export freeze)?
- (c) accept a `closureGraphHash` field as an optional emitter input
  produced by an internal-API caller and skip the binding when absent?

**Spec default** (until the human picks): option (a). `graphSurfaceHash`
is the public, stable, deterministic identity. Option (b) is the right
long-term path; option (c) is an interim if (b) takes longer.

### Q2. Emitter version vs. workspace version

Should the emitter version with the rest of `@arch-engine/*` (start at
`1.1.0` aligned with a workspace minor), or stand on its own SemVer track
(start at `0.1.0`)?

**Spec default:** `0.1.0`. Rationale in §11.1.

### Q3. CLI integration in the same release as the package?

The package can ship without the CLI flags. Doing both in one release is
larger.

**Spec default:** package first (`@arch-engine/agp-emitter@0.1.0` in
`@arch-engine/*@1.1.0`); CLI flags in a later workspace minor.

### Q4. AGP output as JSON object vs. JSON Lines?

`AgpEmitterOutput` is a single object. AGP record collections could in
principle be streamed as NDJSON for very large graphs.

**Spec default:** single JSON object. Streaming is a later concern, and
batch emission keeps the contract simple. If streaming is ever needed,
it's a v0.2.0 additive feature that ships an `emitNdjson(input, sink)`
function in addition to the existing object-returning `emit(input)`.

### Q5. Hash canonicalization: reuse existing `closureGraphHash` or recompute?

Tied to Q1. If the closure hash is exposed publicly, the emitter SHOULD
reuse it verbatim, not recompute. If only `graphSurfaceHash` is available,
the emitter uses that.

**Spec default:** use the source-graph identity verbatim — never recompute
a hash that the source already provides.

### Q6. Federation, trust-policy, lifecycle: included in v0.1?

The architecture-profile exports record kinds for all three, but
Arch-Engine v1.0.x does not produce them. Stub-emit `[]` with INFO
diagnostics, or omit the array keys entirely?

**Spec default:** stub-emit `[]` with INFO diagnostics. Keys are always
present; arrays are empty when context is absent. Stable shape > minimal
shape.

### Q7. `AgpEmitterError` class shape

Should the throw-mode error type extend `Error`, mirror AGP runtime's
own `*PipelineError` shape, or define a brand-new AGP-emitter-only
error class?

**Spec default:** brand-new class extending `Error`. Mirroring runtime
errors would be a profile-bypass pattern.

### Q8. `producerKey` required even when `producer` absent?

The spec currently requires both for any producer-attestation output.

**Spec default:** producer-attestation and key-registry records require
*both* `producer` and `producerKey`. Either alone is insufficient and
yields `AGP_EMITTER_PRODUCER_CONTEXT_INCOMPLETE` (WARNING) with empty
arrays.

---

## 17. Acceptance Criteria for Implementation Pass

When the next mission "AGP Emitter MVP Implementation Pass" runs, it
satisfies this contract if and only if **every** item below is true:

| # | Criterion | Verifiable by |
| --- | --- | --- |
| 1 | New package `packages/agp-emitter/` exists with a private workspace `package.json` for the first commit. | `ls packages/agp-emitter/package.json` |
| 2 | `@arch-governance/architecture-profile@0.1.0` (or the agreed pin) appears in the emitter's `dependencies` and **NOWHERE ELSE** in the repo. | `grep -R '@arch-governance/architecture-profile' package.json packages/*/package.json` returns only the emitter's manifest |
| 3 | `@arch-governance/runtime` appears in NO `package.json`. | `grep -R '@arch-governance/runtime' package.json packages/*/package.json` returns nothing |
| 4 | Emitter source imports only from `@arch-governance/architecture-profile`, `@arch-engine/core` (types), and node built-ins. | Boundary test from §13 |
| 5 | `npm run build` passes; emitter `dist/` is built. | `npm run build` exit 0 |
| 6 | `npm run typecheck` passes (with emitter added to the typecheck list). | `npm run typecheck` exit 0 |
| 7 | `npm test` passes; the emitter test suite is green. | `npm test` exit 0 |
| 8 | Determinism replay test passes (§12.3). | dedicated test |
| 9 | Public-surface freeze tests for `@arch-engine/core` STILL pass (no changes to the v1.0.x public set). | existing freeze test suite |
| 10 | Existing CLI commands unchanged; `arch-engine --version`, `--help`, `doctor`, `inspect`, `analyze`, `check`, `explain` byte-identical to v1.0.1 baseline. | smoke test from `audits/release/ARCH_ENGINE_V1_0_1_PATCH_RELEASE_PREFLIGHT.md` |
| 11 | Fixture-driven snapshot tests stable on the consumer-side example. | snapshot test |
| 12 | Emitter README written; `examples/agp-emitter/` example written. | `ls` |
| 13 | An audit document `audits/ARCH_ENGINE_AGP_EMITTER_MVP_IMPLEMENTATION_AUDIT.md` records the implementation result. | file exists |

If any one of these fails, the implementation pass is not done. No
narrowing exceptions.

---

*End of contract.*
