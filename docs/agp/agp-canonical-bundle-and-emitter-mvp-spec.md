# AGP Canonical Bundle and Emitter MVP Specification

## 1. Status

| Field | Value |
| --- | --- |
| Document state | **Draft v1.0 — for review; backed by machine-readable JSON Schemas** |
| Document date | 2026-05-13 |
| Author | Claude Opus 4.7 (1M context), specification pass |
| Target Arch-Engine release line | v1.5.0 or v1.6.0 (minor; emitter ships behind explicit command/flag) |
| Implementation status | Spec-only. No source has been written, no package created, no dependency added. |
| Machine-readable schemas | [`docs/agp/schemas/v1/`](./schemas/v1/) — JSON Schema Draft 2020-12, normative for record/snapshot/bundle SHAPE. |
| Conformance corpus | [`docs/agp/conformance/v1/`](./conformance/v1/) — 5 valid + 8 invalid fixtures + verifier rules. |
| Open-question defaults | [`docs/agp/agp-schema-open-question-defaults.md`](./agp-schema-open-question-defaults.md) — defaults for OQ-1..10 locked by the schema pass. |
| AGP repo extraction plan | [`docs/agp/agp-repo-extraction-plan.md`](./agp-repo-extraction-plan.md) — when/what moves to a separate AGP repo. |
| Predecessor specs in this repo | [`docs/cli/baseline-comparison-spec.md`](../cli/baseline-comparison-spec.md), [`docs/adapters/multi-adapter-surface-spec.md`](../adapters/multi-adapter-surface-spec.md), [`docs/contracts/public-surface-contract.md`](../contracts/public-surface-contract.md), [`docs/contracts/determinism-contract.md`](../contracts/determinism-contract.md) |
| Predecessor audits | [`audits/ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_REAL_REPO_TRIAL.md`](../../audits/ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_REAL_REPO_TRIAL.md), [`audits/release/ARCH_ENGINE_V1_4_0_MINOR_RELEASE_PREFLIGHT.md`](../../audits/release/ARCH_ENGINE_V1_4_0_MINOR_RELEASE_PREFLIGHT.md) |
| Schema pass audit | [`audits/ARCH_ENGINE_AGP_SPEC_EXTRACTION_AND_SCHEMA_PASS_AUDIT.md`](../../audits/ARCH_ENGINE_AGP_SPEC_EXTRACTION_AND_SCHEMA_PASS_AUDIT.md) |

### Normative boundary

The prose of this document remains normative for **canonicalization
rules** (§10) and **hashing/identity equations** (§11). The
machine-readable schemas in `docs/agp/schemas/v1/` are normative for
the **shape** of every record envelope, every family payload, the
snapshot manifest, and the convenience bundle. Where the prose and a
schema differ, the schema wins on shape and the prose wins on
hashing/canonicalization — and the divergence is a spec bug to be
filed. The schema pass audit lists the cross-refs.

### Supersession

This document **supersedes** [`docs/contracts/agp-emitter-contract.md`](../contracts/agp-emitter-contract.md) (Draft v0.1, dated 2026-05-06) for the canonical-bundle direction.

- The old contract assumed AGP = consumption-via-`@arch-governance/architecture-profile` package model and treated emitter output as a batch of typed records that an external runtime ingests.
- This spec redirects to **AGP = deterministic, record-oriented, content-addressed evidence bundle on disk**, with explicit projections out to SLSA / in-toto / Sigstore / SPDX / CycloneDX rather than dependency on a separate runtime package.
- The old contract is retained in-tree for traceability per the mission's "do not delete old docs" rule; future implementation work proceeds from this spec.

The four short stubs under `docs/contracts/agp-*.md` (`agp-v1-public-specification.md`, `agp-foundation-charter.md`, `agp-specification-runtime.md`, `agp-public-specification-portal.md`) describe AGP's *governance* layer and are orthogonal — they are neither superseded nor extended here.

---

## 2. Product Thesis

**AGP is a deterministic architecture evidence protocol.**

A single AGP bundle answers, end-to-end, the questions a release reviewer, CI gate, supply-chain consumer, or future architecture-intelligence consumer actually asks:

- **What architecture was observed?** — typed nodes and edges in a property-graph model.
- **Which inputs were declared?** — adapter identity, package-manager hints, workspace shape.
- **Which adapter/extractor produced the facts?** — `@arch-engine/adapter-{monorepo, pnpm, yarn-pnp}` version, confidence, reasons.
- **Which records make up the architecture graph?** — content-addressed records, sorted, each independently hashable.
- **What changed against a baseline?** — drift records anchored to baseline and current snapshot digests.
- **Which diagnostics affected trust?** — `ARCH_ENGINE_*` codes with severity, ciBlocking, fix.
- **Which policy findings exist?** — blocking-violation records keyed by stable id.
- **Which provenance proves where/how it was produced?** — command, archEngineVersion, input digest, git context.
- **Can the bundle be independently verified?** — yes: record hashes verify; snapshot digest verifies; no external runtime required.

### AGP is NOT

- a pretty CLI report
- a graph database
- an LLM summary
- a package-manager adapter
- a replacement for SBOM / SLSA / in-toto / Sigstore / SPDX / CycloneDX

### AGP IS

- a canonical record bundle
- a deterministic architecture fact model
- an evidence / provenance layer
- a foundation for policy, CI gates, release attestation, and (later) architecture intelligence

### Core flow

```
scan repo
  → extract deterministic architecture graph        (existing Arch-Engine)
  → emit typed factual records                       (this spec)
  → attach evidence + provenance                     (this spec)
  → hash and verify bundle                           (this spec; verifier later)
  → optionally attest / sign                         (deferred)
  → support policy, drift, CI, release evidence,
    and future ML observations                       (policy + observations later)
```

---

## 3. Scope

In scope for this MVP spec:

- Bundle file layout on disk.
- Record families and their schemas (10 families).
- Input contract from Arch-Engine JSON v2.
- Canonicalization rules.
- Hashing and identity rules.
- Mapping from JSON v2 to AGP records.
- Three-plane separation: factual, evidence, trust.
- Verification model (the future verifier's required behavior).
- Provenance and attestation boundaries.
- ML observation boundary.
- CLI integration strategy (package-first; later explicit subcommand).
- AGP-repo vs Arch-Engine-repo split.
- Acceptance criteria for the future implementation pass.

Out of scope: see §4 Non-Goals.

---

## 4. Non-Goals

MVP explicitly excludes:

- graph database
- ML extraction
- code execution
- `.pnp.cjs` / `.pnp.loader.mjs` execution
- full source AST extraction
- Sigstore signing
- SLSA conformance claim
- SHACL / RDF projection
- OPA policy engine
- incremental fact DAG
- Rust sidecar
- formal proofs (TLA+, Quint, Alloy)
- CLI flag changes
- new commands
- new error codes
- modifying JSON v1 or JSON v2 default behavior
- modifying adapter selection behavior
- adding `@arch-governance/*` dependencies

---

## 5. Research-Informed Design Principles

The ten principles directly informing this spec (full distillation in the companion roadmap doc):

1. **Property-graph-shaped core.** Typed nodes + typed edges as the canonical fact model; JSON-native; optional future SHACL/RDF/GQL projections, not the MVP canonical.
2. **Record-oriented bundle.** Sorted `records.ndjson` + `snapshot.json` manifest beats one giant nested JSON — enables incremental reuse, stable diffing, and per-record verification.
3. **Three-plane separation.**
   - **Factual graph:** deterministic observed nodes/edges. Always included in snapshot digest.
   - **Evidence graph:** diagnostics, observations, source pointers, ML hypotheses. Recorded separately.
   - **Trust graph:** provenance, builder, signer, attestation, policy outcome. Recorded separately.
4. **Determinism.** Every derived value is a function of declared inputs only. No host paths, temp paths, locale, random UUIDs, `Date.now()`, traversal-order dependence, or repo-code execution in factual mode. Stable sort everywhere.
5. **Canonicalization and hashing.** RFC 8785 JCS-style canonical JSON for record payload bytes. BLAKE3 (versioned) for per-record internal hashes; SHA-256 for public subject / snapshot digests (compatibility with OCI / SLSA / in-toto / Sigstore). Graph-shape hashes are versioned and explicitly non-authoritative.
6. **Supply-chain projections, not adoption.** AGP core is independent of SLSA, in-toto, Sigstore, GitHub artifact attestations, SPDX, CycloneDX, OCI descriptors, purl. The bundle *projects outward* via deferred projection records, never inward.
7. **ML isolation.** ML never mutates the factual snapshot. ML outputs are observation records with model identity, prompt version, context record IDs, confidence, justification. Toggling ML must not change `snapshotDigest`.
8. **Incrementality.** v2+ supports content-addressed fact DAGs (file → manifest → syntax → semantic → graph → snapshot). MVP defines the boundary; implementation is later.
9. **Formal methods, selectively.** Determinism and invalidation invariants suit Quint/TLA+ later. Alloy-style bounded graph checks suit policy reasoning later. MVP does not overbuild proofs.
10. **Elegance constraint.** Bundle first. Verifier second. Attestation later. ML later. Graph DB later. No feature soup.

---

## 6. Canonical Bundle Layout

### 6.1 MVP layout (required)

```
agp/
  snapshot.json          ← REQUIRED — manifest + summary + counts
  records.ndjson         ← REQUIRED — sorted record stream
```

### 6.2 Deferred layout (v2+ — defined but not required for MVP)

```
agp/
  snapshot.json
  records.ndjson
  diagnostics/
    issues.ndjson        ← OPTIONAL — verbose diagnostic copy; redundant with diagnostic records inside records.ndjson, retained for tooling convenience
  projections/
    arch-engine-json-v2.json    ← OPTIONAL — verbatim source JSON v2 (provenance-friendly)
    in-toto.predicate.json      ← OPTIONAL — projection only
    slsa.provenance.json        ← OPTIONAL — projection only
    spdx-3.0.relationships.json ← OPTIONAL — projection only
    cyclonedx.bom.json          ← OPTIONAL — projection only
  attestations/
    snapshot.dsse.json   ← OPTIONAL — DSSE envelope over snapshot.json bytes
    snapshot.sigstore.json ← OPTIONAL — Sigstore bundle (later)
```

### 6.3 Convenience single-JSON form (allowed, non-canonical)

A **bundle-equivalent single JSON** MAY be emitted for human inspection or for transports that prefer one file:

```
agp/
  bundle.json
```

Shape:

```jsonc
{
  "$schema":     "https://arch-engine.dev/agp/v1/bundle.schema.json",
  "snapshot":    { …snapshot.json contents… },
  "records":     [ …each NDJSON line, in same order, parsed as objects… ],
  "diagnostics": { …optional verbose copies… }
}
```

`bundle.json` is **non-canonical**: its `snapshotDigest` MUST equal the `snapshotDigest` computed over `snapshot.json` bytes alone. It is purely a packaging convenience.

### 6.4 File and encoding rules

| Rule | Value |
| --- | --- |
| Encoding | UTF-8, no BOM |
| Line endings (`records.ndjson`) | LF only (`\n`) |
| `snapshot.json` formatting | RFC 8785 JCS canonical (no trailing newline, no indent) |
| `records.ndjson` line formatting | one JCS-canonical record per line, then `\n` |
| Path style | repo-relative POSIX (forward slash) |
| Permissions | not part of canonical bundle |
| Filesystem metadata | not part of canonical bundle |
| Compression | not part of canonical bundle (transport concern) |
| `$schema` references | OPTIONAL; consumers MUST tolerate absence |

### 6.5 Media types

| Component | Media type |
| --- | --- |
| `snapshot.json` | `application/vnd.archengine.agp.snapshot.v1+json` |
| `records.ndjson` | `application/vnd.archengine.agp.records.v1+ndjson` |
| `bundle.json` | `application/vnd.archengine.agp.bundle.v1+json` |
| `attestations/snapshot.dsse.json` | `application/vnd.dev.sigstore.bundle.v0.3+json` (DSSE wrapper) |
| Projections | their native upstream media types |

---

## 7. Record Families

All records share an outer envelope:

```jsonc
{
  "schemaVersion": "agp.record.v1",
  "family":        "<family>",
  "kind":          "<family-specific kind>",
  "id":            "agp:<family>:<kind>:<payloadHash>",
  "payloadHash":   "b3:<64-hex>",
  "payload":       { …family-specific fields… }
}
```

`id`, `payloadHash`, and `schemaVersion`/`family`/`kind` are **never** part of the payload that gets hashed. See §11.

### 7.1 `snapshot` family

| Field | Value |
| --- | --- |
| `family` | `snapshot` |
| `kind` | `manifest` |
| Included in factual digest? | **No** — the `snapshot` record IS the manifest of factual records; its digest IS `snapshotDigest`. |
| Required | Yes — exactly one per bundle. |
| Lives in | `snapshot.json` (not in `records.ndjson`). |

`payload` fields:

```jsonc
{
  "agpVersion":          "1.0.0",
  "schemaVersion":       "agp.snapshot.v1",
  "archEngineVersion":   "1.4.0",
  "sourceCommand":       "inspect",          // inspect|analyze|check|drift
  "sourceSchemaVersion": "arch-engine.cli.v2",
  "sourceExitCode":      0,
  "sourceStatus":        "passed",
  "emittedAt":           "2026-05-13T08:00:00Z",  // ISO 8601 UTC, second precision, EXCLUDED from snapshotDigest
  "records": [
    {
      "family":      "node",
      "kind":        "package",
      "id":          "agp:node:package:b3:<hash>",
      "payloadHash": "b3:<hash>"
    },
    …
  ],
  "counts": {
    "node":             45,
    "edge":            177,
    "adapter_evidence":   1,
    "diagnostic":         1,
    "drift":              0,
    "policy_finding":     0,
    "provenance":         1,
    "observation":        0,
    "attestation":        0
  },
  "shapeHash":          { "algorithm": "agp-wl1-blake3-v1", "value": "b3:<hash>" }, // OPTIONAL, non-authoritative
  "graphSurfaceHash":   "sha256:<hash>",   // verbatim from JSON v2 source — non-authoritative; AGP identity is snapshotDigest
  "snapshotDigest":     "sha256:<hash>",   // SELF-REFERENCE: computed over snapshot.json bytes with snapshotDigest=""
  "featureGates": {
    "observations": false,
    "attestations": false,
    "projections":  false,
    "policy":       false
  }
}
```

### 7.2 `node` family

| Field | Value |
| --- | --- |
| `family` | `node` |
| `kind` | `package` (MVP); `workspace`, `module`, `service`, `file`, `domain` reserved for v2+. |
| Included in factual digest? | **Yes** |
| Identity inputs | `(kind, id, type, attributes)` |

```jsonc
{
  "family": "node",
  "kind":   "package",
  "id":     "agp:node:package:b3:<hash>",
  "payloadHash": "b3:<hash>",
  "payload": {
    "nodeId":     "@yarn-pnp-basic/api",   // verbatim from canonical-topology nodes[].id
    "type":       "package",
    "attributes": {
      "workspacePath": "apps/api"          // repo-relative POSIX; OPTIONAL — only when adapter surfaces it
    }
  }
}
```

### 7.3 `edge` family

| Field | Value |
| --- | --- |
| `family` | `edge` |
| `kind` | `depends_on` (MVP); `contains`, `imports`, `owns`, `calls`, `generated_from` reserved for v2+. |
| Included in factual digest? | **Yes** |
| Identity inputs | `(kind, from, to, type, attributes)` |

```jsonc
{
  "family": "edge",
  "kind":   "depends_on",
  "id":     "agp:edge:depends_on:b3:<hash>",
  "payloadHash": "b3:<hash>",
  "payload": {
    "edgeIdLegacy": "e_03555127",          // verbatim from canonical-topology edges[].id — informational only
    "from":         "@yarn-pnp-basic/web",
    "to":           "@yarn-pnp-basic/shared",
    "type":         "workspace_dependency",
    "attributes": {
      "dependencyKind": "dependency",      // dependency|devDependency|peerDependency|optionalDependency
      "protocol":       "workspace"        // workspace|portal|link|catalog|semver
    }
  }
}
```

### 7.4 `adapter_evidence` family

| Field | Value |
| --- | --- |
| `family` | `adapter_evidence` |
| `kind` | `selected` (MVP); `runner_up`, `declined` reserved. |
| Included in factual digest? | **Yes** — adapter identity is part of the factual basis. |
| Identity inputs | The full canonicalised adapter payload. |

```jsonc
{
  "family": "adapter_evidence",
  "kind":   "selected",
  "id":     "agp:adapter_evidence:selected:b3:<hash>",
  "payloadHash": "b3:<hash>",
  "payload": {
    "name":             "@arch-engine/adapter-yarn-pnp",
    "version":          "0.1.0",
    "packageManager":   "yarn",
    "workspaceKind":    "yarn-pnp",
    "confidence":       "HIGH",
    "reasons":          [".pnp.cjs present", ".yarnrc.yml#nodeLinker is pnp", …],
    "warnings":         [],
    "alsoDetected":     [],
    "metadata": {                                  // adapter-specific sub-block, verbatim
      "yarnPnp": {
        "packageManagerVersion": "4.2.1",
        "pnpFilePresent":        true,
        "pnpLoaderPresent":      true,
        "yarnrcPresent":         true,
        "nodeLinker":            "pnp",
        "nodeLinkerSource":      "yarnrc",
        "workspacesPresent":     true,
        "workspacesObjectForm":  false,
        "rawGlobs":              ["packages/*"],
        "excludedGlobs":         [],
        "matchedGlobs":          ["packages/api", …]
      }
    }
  }
}
```

Adapter-family variants for the v1.4.0 surface:

| Adapter | `metadata.<key>` populated |
| --- | --- |
| `@arch-engine/adapter-yarn-pnp@0.1.0` | `yarnPnp` |
| `@arch-engine/adapter-pnpm@0.1.1` | `pnpm` |
| `@arch-engine/adapter-monorepo@1.3.1` | (none — monorepo adapter does not surface a metadata sub-block in v1.3.1) |

### 7.5 `diagnostic` family

| Field | Value |
| --- | --- |
| `family` | `diagnostic` |
| `kind` | the `ARCH_ENGINE_*` code (lowercased, dash-separated, e.g. `pnp_resolution_deferred`). |
| Included in factual digest? | **Yes** — diagnostics affect trust. |
| Identity inputs | `(code, severity, message, path, details)` |

```jsonc
{
  "family": "diagnostic",
  "kind":   "pnp_resolution_deferred",
  "id":     "agp:diagnostic:pnp_resolution_deferred:b3:<hash>",
  "payloadHash": "b3:<hash>",
  "payload": {
    "code":       "ARCH_ENGINE_PNP_RESOLUTION_DEFERRED",
    "severity":   "WARNING",
    "ciBlocking": false,
    "title":      "Yarn PnP resolution is deferred.",
    "message":    "Detected Yarn PnP files (.pnp.cjs, .pnp.loader.mjs). …",
    "fix":        "The v0.1.0 Yarn PnP adapter does not execute `.pnp.cjs`. …",
    "details":    { "pnpFilePresent": true, "pnpLoaderPresent": true },
    "docsHint":   "adapters",
    "scope":      "bundle"   // bundle|node:<id>|edge:<id> — defaults to "bundle"
  }
}
```

The 22 codes locked in `packages/cli/src/error-codes.ts` are the MVP `kind` vocabulary. Future codes extend `kind` additively.

### 7.6 `drift` family

| Field | Value |
| --- | --- |
| `family` | `drift` |
| `kind` | `node_added` / `node_removed` / `node_changed` / `edge_added` / `edge_removed` / `edge_changed` / `violation_new` / `violation_resolved` / `violation_persisted` / `severity_changed` / `signal_delta` |
| Included in factual digest? | **Yes** for the `kind`s above; **No** for the per-bundle `summary` mirror (lives in `snapshot.payload.driftSummary`). |
| Identity inputs | family-specific (see below) |

One record per individual delta. Mass surfaces (`addedNodes[]` etc. from `data.drift.topology`) explode into N records. The advantage: each delta is independently addressable, hashable, and diffable across runs.

```jsonc
{
  "family": "drift",
  "kind":   "edge_added",
  "id":     "agp:drift:edge_added:b3:<hash>",
  "payloadHash": "b3:<hash>",
  "payload": {
    "baseline":        { "snapshotDigest": "sha256:<prev>", "graphSurfaceHash": "sha256:<prev-shape>" },
    "current":         { "snapshotDigest": "sha256:<curr>", "graphSurfaceHash": "sha256:<curr-shape>" },
    "edge": {
      "from": "@x/foo",
      "to":   "@x/bar",
      "type": "workspace_dependency"
    }
  }
}
```

For `signal_delta`:

```jsonc
{
  "family": "drift",
  "kind":   "signal_delta",
  "payload": {
    "baseline": { "snapshotDigest": "…" },
    "current":  { "snapshotDigest": "…" },
    "deltas": {
      "scoreDelta":              -0.02,
      "coverageDelta":           null,
      "connectivityDelta":       null,
      "confidenceDelta":         null,
      "violationsDelta":           1,
      "graphSurfaceHashChanged": true
    }
  }
}
```

### 7.7 `policy_finding` family

| Field | Value |
| --- | --- |
| `family` | `policy_finding` |
| `kind` | `blocking_violation` / `advisory` / `waived` |
| Included in factual digest? | **Yes** — outcome of `check`. |
| Identity inputs | `(ruleId, edgeOrNodeRef, severity, code)` |

```jsonc
{
  "family": "policy_finding",
  "kind":   "blocking_violation",
  "id":     "agp:policy_finding:blocking_violation:b3:<hash>",
  "payloadHash": "b3:<hash>",
  "payload": {
    "findingId":    "v_<stable-hex>",       // matches data.violations[].id when present
    "ruleId":       "rest.contract.no-cross-domain-call",
    "severity":     "BLOCKING",
    "ciBlocking":   true,
    "code":         "ARCH_ENGINE_BLOCKING_VIOLATION",
    "category":     "rest-contract",
    "edgeRef":      { "from": "@x/web", "to": "@x/db", "type": "workspace_dependency" },
    "policyPack":   "@arch-engine/governance-pack-rest-contract@1.3.0",
    "details":      { … pack-specific structured details … }
  }
}
```

### 7.8 `provenance` family

| Field | Value |
| --- | --- |
| `family` | `provenance` |
| `kind` | `extraction` (MVP); `signing`, `build`, `pipeline` reserved for v2+. |
| Included in factual digest? | **No** — provenance is trust-plane, varies per run. |
| Identity inputs | `(builder, inputDigest, archEngineVersion, command)` |
| Lives in factual snapshot manifest? | The provenance record's `id` is listed in `snapshot.payload.records[]`, but the snapshot digest is computed over the canonical snapshot payload with provenance entries *excluded from the hashed subset* — see §11.5. |

```jsonc
{
  "family": "provenance",
  "kind":   "extraction",
  "id":     "agp:provenance:extraction:b3:<hash>",
  "payloadHash": "b3:<hash>",
  "payload": {
    "command":          "inspect",
    "archEngineVersion":"1.4.0",
    "inputDigest":      "sha256:<hash>",   // hash of the source JSON v2 envelope bytes
    "inputCommand":     "inspect",         // JSON v2 envelope.command
    "git": {                                // OMITTED entirely when repo redaction is on
      "commit":         "<40-hex>",
      "branch":         "main",
      "dirty":          false
    },
    "ci": {                                 // OMITTED when not in CI
      "provider":       "github-actions",
      "runId":          "12345678",
      "ref":            "refs/heads/main"
    },
    "redaction": {
      "repoRoot":       "redacted",
      "homeDir":        "redacted",
      "absolutePaths":  "rejected"
    }
  }
}
```

### 7.9 `observation` family

| Field | Value |
| --- | --- |
| `family` | `observation` |
| `kind` | observer-specific (e.g. `llm_summary`, `heuristic_authority_hint`, `cluster_suggestion`) |
| Included in factual digest? | **No** — observations are evidence-plane, non-authoritative. |
| Identity inputs | `(observerType, model, modelVersion, promptVersion, contextRecordIds, body)` |

MVP defines the shape but Arch-Engine v1.x SHOULD NOT emit observation records by default. The shape exists so a third-party tool can write a bundle-compatible observation without forking the spec.

```jsonc
{
  "family": "observation",
  "kind":   "llm_summary",
  "id":     "agp:observation:llm_summary:b3:<hash>",
  "payloadHash": "b3:<hash>",
  "payload": {
    "observer": {
      "type":          "llm",                // llm|heuristic|external_scanner|manual
      "model":         "claude-opus-4.7",
      "modelVersion":  "4.7-1m",
      "promptVersion": "agp.observe.v1"
    },
    "context": {
      "recordIds": ["agp:node:package:b3:…", "agp:edge:depends_on:b3:…"]
    },
    "body": {
      "kind":          "summary",
      "text":          "…"
    },
    "confidence":  0.78,
    "justification":"…",
    "createdAt":   "2026-05-13T09:00:00Z"   // wall-clock allowed, EXCLUDED from factual snapshotDigest by construction
  }
}
```

**Rule:** toggling observation emission MUST NOT change `snapshotDigest`. Observation records are part of `records.ndjson` but the snapshot's `records[]` manifest separates `factual` IDs (in the hashed subset) from `evidence` IDs (out of the hashed subset). See §11.5.

### 7.10 `attestation` family

| Field | Value |
| --- | --- |
| `family` | `attestation` |
| `kind` | `dsse_envelope` (deferred), `sigstore_bundle` (deferred), `gh_artifact_attestation` (deferred), `in_toto_predicate` (deferred). |
| Included in factual digest? | **No** — attestation is trust-plane. |
| MVP requirement | Define the boundary; do not require emission. |

```jsonc
{
  "family": "attestation",
  "kind":   "dsse_envelope",
  "id":     "agp:attestation:dsse_envelope:b3:<hash>",
  "payloadHash": "b3:<hash>",
  "payload": {
    "subject": {
      "digest": { "sha256": "<snapshotDigest hex>" }
    },
    "predicateType": "https://arch-engine.dev/agp/v1/snapshot",
    "envelope":      "<base64 DSSE envelope bytes>",
    "verified":      false
  }
}
```

### 7.11 Identity summary table

| Family | In `records.ndjson`? | In factual digest? | Plane |
| --- | --- | --- | --- |
| `snapshot` | **No** (lives in `snapshot.json`) | n/a — it IS the digest | manifest |
| `node` | Yes | **Yes** | factual |
| `edge` | Yes | **Yes** | factual |
| `adapter_evidence` | Yes | **Yes** | factual |
| `diagnostic` | Yes | **Yes** | factual |
| `drift` | Yes | **Yes** | factual |
| `policy_finding` | Yes | **Yes** | factual |
| `provenance` | Yes | **No** | trust |
| `observation` | Yes | **No** | evidence |
| `attestation` | Yes | **No** | trust |

---

## 8. Input Contract

The emitter consumes Arch-Engine JSON v2 **only**. It does not rescan repositories.

### 8.1 Accepted inputs

Files produced by any of:

```
arch-engine inspect --json --json-schema=v2 --output <file>
arch-engine analyze --json --json-schema=v2 --output <file>
arch-engine check   --json --json-schema=v2 --output <file>
arch-engine check   --json --json-schema=v2 --baseline <baseline-file> --output <file>
```

### 8.2 Required fields on input

The emitter MUST verify all of:

- `schemaVersion === "arch-engine.cli.v2"`
- `archEngineVersion` is a non-empty string
- `command ∈ { "inspect", "analyze", "check" }`
- `status` present
- `exitCode` is an integer in `{ 0, 1, 2, 3, 5 }`
- `data.topology.canonical` present, with `nodes[]`, `edges[]`, `graphSurfaceHash`, `graphSurfaceVersion` fields
- `data.adapter` present when `command !== "explain"` (in v1.4.0, all three accepted commands emit `data.adapter`)
- `diagnostics` is an array (possibly empty)
- `summary` present
- `data.drift` present **iff** the source was `check` with `--baseline`

### 8.3 Explicit rejections

The emitter MUST reject (exit non-zero, emit no partial bundle):

- JSON v1 input (`schemaVersion` missing or not `arch-engine.cli.v2`)
- `data.topology.canonical` missing or malformed
- `data.adapter` missing on a command that should have it
- `command === "explain"` (explain has different semantics; no factual graph required)
- Unknown `command`
- Malformed adapter metadata (e.g. missing `name`, `confidence`)
- Malformed drift block when present
- Top-level keys with the wrong types
- Input that fails JCS canonicalization (NUL bytes, invalid UTF-8, etc.)

### 8.4 Input validation diagnostics

Emitter-level diagnostics are themselves recorded as `diagnostic` records on the output, prefixed by code namespace `AGP_EMITTER_*`:

| Code | Severity | When |
| --- | --- | --- |
| `AGP_EMITTER_INPUT_NOT_V2` | ERROR | `schemaVersion !== "arch-engine.cli.v2"` |
| `AGP_EMITTER_INPUT_MISSING_CANONICAL_TOPOLOGY` | ERROR | `data.topology.canonical` absent |
| `AGP_EMITTER_INPUT_UNSUPPORTED_COMMAND` | ERROR | `command` not in `{ inspect, analyze, check }` |
| `AGP_EMITTER_INPUT_MALFORMED_ADAPTER` | ERROR | `data.adapter` shape invalid |
| `AGP_EMITTER_INPUT_MALFORMED_DRIFT` | ERROR | `data.drift` present but malformed |
| `AGP_EMITTER_INPUT_ABSOLUTE_PATH_LEAK` | ERROR | input JSON contained an absolute path |
| `AGP_EMITTER_BUNDLE_NONCANONICAL` | INTERNAL | output would have been non-canonical (this is an emitter bug) |

These codes are emitter-namespace; they do not extend `ARCH_ENGINE_*` and they do not flow back into Arch-Engine's vocabulary.

---

## 9. Output Contract

A successful emit produces:

1. `<output-dir>/snapshot.json` — RFC 8785 JCS canonical, no trailing whitespace.
2. `<output-dir>/records.ndjson` — one JCS-canonical record per line, sorted (see §10.4), each line terminated by `\n`.

Both files together constitute the canonical bundle.

If `--bundle-json` (future option) is passed, additionally produce:

3. `<output-dir>/bundle.json` — convenience single-JSON form per §6.3.

### 9.1 Determinism guarantee

Given the same JSON v2 input bytes and the same emitter version:

- `records.ndjson` is byte-identical.
- `snapshot.json` is byte-identical **except** for:
  - `payload.emittedAt`
  - `payload.records[N].provenance` IDs (if `git`/`ci` context changed across runs)
- `snapshotDigest` is byte-identical (it is computed over a canonical projection that excludes `emittedAt` and the provenance subset — see §11.5).

### 9.2 Failure modes

| Mode | Behavior |
| --- | --- |
| Input validation failure | Exit non-zero. No partial bundle written. Diagnostics flushed to stderr (or to a designated error JSON). |
| I/O failure | Exit non-zero. Partial files MAY exist; emitter MUST NOT advertise the bundle as valid until both files are written and `snapshotDigest` has been computed and stamped. |
| Canonicalization failure | Exit non-zero with `AGP_EMITTER_BUNDLE_NONCANONICAL`. |

---

## 10. Canonicalization Rules

### 10.1 Encoding

- UTF-8 only.
- No BOM.
- Strings normalized to **Unicode Normalization Form C (NFC)** before hashing. The emitter MUST refuse input that contains characters outside NFC after `String.prototype.normalize('NFC')`.

### 10.2 Path normalization

- All paths in payloads are **repo-relative POSIX** (forward slash).
- Absolute paths are **rejected** by the emitter (`AGP_EMITTER_INPUT_ABSOLUTE_PATH_LEAK`).
- Temp paths (`/var/folders/`, `/tmp/`, Windows drive letters) are also rejected.
- Symbolic-link traversal is not part of canonicalization — paths reflect the on-disk relative path as recorded by Arch-Engine.

### 10.3 JSON canonicalization

Each record's `payload` is hashed over its **RFC 8785 JCS** serialization:

- No insignificant whitespace.
- Object keys sorted lexicographically by UTF-16 code unit.
- Number serialization per RFC 8785 §3.2 (no `+0`, no exponent for integers in safe range, etc.).
- String escapes minimal and consistent.

`snapshot.json` is itself emitted in JCS form. `records.ndjson` lines are each JCS-canonical objects.

### 10.4 Sort order

`records.ndjson` lines are sorted by the **lexicographic tuple**:

1. `family` (string)
2. `kind` (string)
3. `payload.<primaryKey>` (family-specific, see below)
4. `payloadHash` (string)

Family primary keys for sort:

| Family | `<primaryKey>` |
| --- | --- |
| `node` | `nodeId` |
| `edge` | `(from, to, type)` joined by `\|` |
| `adapter_evidence` | `name` |
| `diagnostic` | `(severity-rank-desc, code, message)` joined by `\|` (highest severity first) |
| `drift` | `(baseline.snapshotDigest, current.snapshotDigest, kind-subkey)` |
| `policy_finding` | `findingId` |
| `provenance` | `command` (typically one record per bundle) |
| `observation` | `(observer.type, observer.model, observer.modelVersion, body.kind)` joined |
| `attestation` | `kind` (typically one record per bundle) |

### 10.5 Wall-clock policy

- `snapshot.payload.emittedAt` MAY be present (ISO 8601 UTC, second precision). It is **excluded** from `snapshotDigest`.
- `observation.payload.createdAt` MAY be present. It is **excluded** from factual digest by construction (observation records are evidence-plane).
- No other record carries wall-clock data in factual mode.

### 10.6 Host data redaction

- Repo root paths absent from payloads.
- Home directory paths absent.
- Locale never serialised.
- Hostname never serialised.
- User names never serialised.
- Environment variables never serialised.

The emitter MUST scan every string field for absolute-path patterns and reject the input rather than silently strip.

### 10.7 Canonicalization failure

If a record cannot be canonicalized (e.g. contains a `BigInt`, a `NaN`, a circular reference, a non-NFC string after normalization), the emitter MUST:

- Emit nothing.
- Exit with `AGP_EMITTER_BUNDLE_NONCANONICAL`.
- Surface the offending record's identity (without leaking content if the content itself is the cause).

---

## 11. Hashing and Identity Rules

### 11.1 Hash algorithm choices

| Use | Algorithm | Encoding |
| --- | --- | --- |
| Per-record `payloadHash` | BLAKE3 (versioned) | `b3:<64-hex>` |
| `snapshotDigest` | SHA-256 | `sha256:<64-hex>` |
| `inputDigest` (provenance) | SHA-256 | `sha256:<64-hex>` |
| `shapeHash` (optional) | versioned algorithm string, e.g. `agp-wl1-blake3-v1` | `b3:<64-hex>` |

**Why BLAKE3 internal?** Faster, modern, content-addressed friendly, and we control the verifier — no compatibility cost.

**Why SHA-256 public?** Compatibility with OCI descriptors, SLSA provenance subjects, in-toto, Sigstore, GitHub artifact attestations, SPDX 3.0. The public subject digest is the value external tools will compare against; using SHA-256 here keeps AGP composable.

**Why graph-shape hash is not root identity?** The graph shape hash answers "is the architecture the same shape?" — useful for cache reuse, baseline comparison, sanity. But two different bundles can validly share a shape hash (different diagnostics, different adapter, different provenance, same graph). The root identity must capture the full factual state, not just the shape.

### 11.2 Payload-hash domain

For every non-snapshot record:

```
payloadHash = b3( JCS_canonicalize(payload) )
```

`payload` is the record's `payload` field only. `id`, `payloadHash`, `schemaVersion`, `family`, `kind` are **never** in the hash domain.

The record `id` is then constructed as:

```
id = "agp:" + family + ":" + kind + ":" + payloadHash
```

### 11.3 Snapshot digest

`snapshotDigest` is computed over a deterministic projection of `snapshot.json`'s payload:

1. Take `snapshot.json` parsed as JSON.
2. Project the payload to its `factualSubset`:
   - Include: `agpVersion`, `schemaVersion`, `archEngineVersion`, `sourceCommand`, `sourceSchemaVersion`, `sourceExitCode`, `sourceStatus`, `records[]` filtered to factual families, `counts`, `shapeHash`, `graphSurfaceHash`, `featureGates`.
   - Exclude: `emittedAt`, `snapshotDigest` (self-reference), and any `records[]` entries whose family is in `{ provenance, observation, attestation }`.
3. JCS-canonicalize the projection.
4. `snapshotDigest = "sha256:" + sha256(projection-bytes).hex`.
5. Write `snapshotDigest` into `snapshot.json` AFTER computation.

`records.ndjson` is hashed implicitly via the record-id list inside the projected `records[]`. The verifier reconstructs the projection and re-hashes; tampering with any factual record's bytes changes its `payloadHash`, which changes the `records[]` entry, which changes `snapshotDigest`.

### 11.4 Verifying a record

```
1. Parse the line.
2. Recompute payloadHash := b3(JCS_canonicalize(payload)).
3. Assert payloadHash matches the record's payloadHash.
4. Assert id == "agp:" + family + ":" + kind + ":" + payloadHash.
```

### 11.5 Verifying the snapshot

```
1. Parse snapshot.json.
2. Save the embedded snapshotDigest.
3. Set snapshot.payload.snapshotDigest := "".
4. Drop snapshot.payload.emittedAt.
5. Filter snapshot.payload.records[] to factual families only.
6. JCS-canonicalize.
7. Recompute sha256.
8. Assert "sha256:" + recomputed == embedded.
```

### 11.6 Algorithm upgrades

Hash algorithm upgrades are governed by:

- The `payloadHash` prefix (`b3:`, etc.) declares the algorithm. Future bundles MAY use `b4:` or a new prefix; verifiers MUST reject unknown prefixes rather than guess.
- The `snapshotDigest` prefix (`sha256:`) is similarly declarative.
- The `shapeHash.algorithm` field is explicit.
- An AGP minor version bump is required to add a new hash algorithm; an AGP major version bump is required to remove one.

### 11.7 Schema version upgrades

- The outer envelope's `schemaVersion: "agp.record.v1"` is the contract for the record envelope itself.
- The `snapshot.payload.agpVersion: "1.0.0"` is the contract for the bundle protocol.
- Per-family schema evolution lives in the family payload (e.g. an `edge` record with new optional `attributes.protocol_subtype` is still `agp.record.v1`).
- Breaking changes bump `agpVersion` major.

---

## 12. Arch-Engine JSON v2 Mapping

The mapping is **mechanical and total**. For an input that passes §8 validation, the output bundle has a fully determined record set.

### 12.1 Source-to-record table

| JSON v2 source | AGP family / kind | Count |
| --- | --- | --- |
| `data.topology.canonical.nodes[i]` | `node:package` | 1 per node |
| `data.topology.canonical.edges[i]` | `edge:depends_on` | 1 per edge |
| `data.topology.canonical.graphSurfaceHash` | `snapshot.payload.graphSurfaceHash` (verbatim, non-authoritative) | 0 (not a record) |
| `data.adapter` (entire block) | `adapter_evidence:selected` | 1 |
| `diagnostics[i]` | `diagnostic:<kind-from-code>` | 1 per diagnostic |
| `data.drift.topology.addedNodes[i]` | `drift:node_added` | 1 each |
| `data.drift.topology.removedNodes[i]` | `drift:node_removed` | 1 each |
| `data.drift.topology.changedNodes[i]` | `drift:node_changed` | 1 each |
| `data.drift.topology.addedEdges[i]` | `drift:edge_added` | 1 each |
| `data.drift.topology.removedEdges[i]` | `drift:edge_removed` | 1 each |
| `data.drift.topology.changedEdges[i]` | `drift:edge_changed` | 1 each |
| `data.drift.violations.new[i]` | `drift:violation_new` | 1 each |
| `data.drift.violations.resolved[i]` | `drift:violation_resolved` | 1 each |
| `data.drift.violations.persisted[i]` | `drift:violation_persisted` | 1 each |
| `data.drift.violations.severityChanged[i]` | `drift:severity_changed` | 1 each |
| `data.drift.signal` | `drift:signal_delta` | 1 (when any delta is non-null) |
| `data.violations[i]` (from `check`) | `policy_finding:blocking_violation` (or `advisory` / `waived`) | 1 each |
| `archEngineVersion`, `command`, `inputDigest`, git/CI context | `provenance:extraction` | 1 |
| `artifacts[]` | `provenance.payload.artifacts[]` (informational only) | 0 (not records) |
| `summary` | `snapshot.payload.summary` | 0 (not records) |
| `emittedAt` | `snapshot.payload.emittedAt` (excluded from digest) | 0 |

### 12.2 Adapter-specific metadata

The adapter's `metadata` sub-block is carried verbatim into the `adapter_evidence` record's `payload.metadata`:

| Adapter | sub-block key | shape |
| --- | --- | --- |
| `@arch-engine/adapter-yarn-pnp@^0.1.0` | `yarnPnp` | 11 fields documented in v1.4.0 release notes |
| `@arch-engine/adapter-pnpm@^0.1.0` | `pnpm` | as per v1.3.1 spec (`packageManagerVersion`, `workspaceFile`, `lockfilePresent`, `catalogsDetected`, `excludedGlobs`, `matchedGlobs`) |
| `@arch-engine/adapter-monorepo@^1.3.1` | (none) | adapter does not surface a metadata sub-block in v1.3.x |

Future adapters add their own sub-block keys (e.g. `bun`, `deno`). The emitter MUST NOT inspect adapter-specific keys beyond passing them through.

### 12.3 Path normalization

- All `workspacePath`, `path` fields in payloads are repo-relative POSIX.
- Arch-Engine v1.4.0 already enforces this — the emitter MUST re-check and reject absolute paths rather than trust the input.

### 12.4 Edge attributes

The `edge:depends_on` record's `payload.attributes` carries:

| Field | Source |
| --- | --- |
| `dependencyKind` | `data.adapter.metadata.<adapter>.edges[edgeId].kind` when present; otherwise `"dependency"` |
| `protocol` | `data.adapter.metadata.<adapter>.edges[edgeId].protocol` when present; otherwise `"semver"` |

The monorepo adapter does not surface per-edge metadata; for monorepo-sourced bundles, `attributes` is `{ "dependencyKind": "dependency", "protocol": "semver" }`.

### 12.5 `graphSurfaceHash` relationship to `snapshotDigest`

- `graphSurfaceHash` is preserved verbatim in `snapshot.payload.graphSurfaceHash` for cross-reference with Arch-Engine baselines.
- It is **not** authoritative for AGP. Two valid bundles can share a `graphSurfaceHash` (same topology, different diagnostics / adapter / drift) and have different `snapshotDigest`s.
- The reverse is not true: same `snapshotDigest` ⇒ same bundle (modulo the documented digest-excluded fields).

### 12.6 Drift mapping

Baseline-aware bundles (from `check --baseline`) carry:

- One `drift:<kind>` record per individual topology / violation delta.
- One `drift:signal_delta` record summarising scalar deltas.
- The `data.drift.baseline` block is captured in each drift record's `payload.baseline` for self-containment — a single drift record carries its own baseline anchor so it remains meaningful in isolation.

---

## 13. Evidence and Observation Boundary

This boundary is the most important architectural decision in the spec.

### 13.1 Two distinct concepts

| Plane | What lives here | Effect on `snapshotDigest` |
| --- | --- | --- |
| **Factual** | nodes, edges, adapter_evidence, diagnostics (deterministic), drift, policy_finding | **In** |
| **Evidence** | observations (LLM, heuristic, external scanner output, manual annotation) | **Out** |
| **Trust** | provenance, attestation | **Out** |

### 13.2 ML / LLM rules

- LLM outputs MAY produce `observation` records. They MUST NOT produce or mutate `node`, `edge`, `diagnostic`, `drift`, `policy_finding`, or `adapter_evidence` records.
- Every observation record carries `observer.type`, `observer.model`, `observer.modelVersion`, `observer.promptVersion` (if applicable), `context.recordIds[]`, `confidence`, and `justification`.
- Toggling whether observations are emitted MUST NOT change `snapshotDigest`. The verifier's check in §11.5 enforces this by excluding observation IDs from the hashed `records[]` projection.

### 13.3 Heuristic / external-scanner rules

Same as LLM — observations only. A non-LLM scanner that wants to flag "this looks like a god-package" emits an observation, not a diagnostic.

### 13.4 Policy interaction

- Policy MAY consume observation records as an input signal.
- If a policy rule's decision depends on an observation, the resulting `policy_finding` record's `payload` MUST include `derivedFromObservation: true` and reference the observation IDs in `payload.evidenceRecordIds[]`.
- Without that flag, a `policy_finding` is presumed to be derived from factual records only.
- A `policy_finding` derived from observations remains *in* the factual digest; the **decision** is part of the architecture's factual state even if some of its evidence was non-factual. The non-factuality is disclosed via the flag.

---

## 14. Provenance Boundary

### 14.1 MVP provenance fields

```jsonc
{
  "command":          "inspect",
  "archEngineVersion":"1.4.0",
  "inputDigest":      "sha256:<hash>",
  "inputCommand":     "inspect",
  "git":              { …optional… },
  "ci":               { …optional… },
  "redaction": {
    "repoRoot":      "redacted",
    "homeDir":       "redacted",
    "absolutePaths": "rejected"
  }
}
```

### 14.2 Required vs optional

| Field | Required? |
| --- | --- |
| `command` | yes |
| `archEngineVersion` | yes |
| `inputDigest` | yes |
| `inputCommand` | yes |
| `git.commit` | if available (read via `git rev-parse HEAD`; no network) |
| `git.branch` | if available |
| `git.dirty` | if available (boolean from `git status --porcelain` length check) |
| `ci.provider` | if env-detected (GitHub Actions, GitLab CI, CircleCI, Jenkins, …) |
| `ci.runId` | if env-detected |
| `ci.ref` | if env-detected |
| `redaction` | always present (declares policy) |

### 14.3 Redaction policy

- Repo root path: **never serialised**.
- Home directory: **never serialised**.
- Environment variables: **never serialised** except the documented CI-provider whitelist (provider name, run ID, ref).
- Network: **never accessed**. Provenance is filesystem + git-binary-only.

### 14.4 Provenance is not factual

The provenance record's payload changes across runs (different `inputDigest`, different `ci.runId`). It is intentionally **outside** the factual digest. The verifier checks provenance for shape and consistency but does not require byte-identical provenance for two bundles emitted from the same JSON v2 input.

---

## 15. Attestation Boundary

### 15.1 MVP: define the boundary; do not require

The MVP emitter does NOT sign, attest, or wrap the bundle in a DSSE envelope. The `attestation` record family exists in the schema so future tools can layer on top without forking the bundle format.

### 15.2 Future attestation ecosystem

AGP's attestation surface is designed to **project into** these ecosystems, not depend on any single one:

| Ecosystem | Projection record kind | Notes |
| --- | --- | --- |
| DSSE | `attestation:dsse_envelope` | Subject is `{ sha256: <snapshotDigest> }`, predicate type `https://arch-engine.dev/agp/v1/snapshot`. |
| Sigstore | `attestation:sigstore_bundle` | Keyless via Fulcio; transparency log via Rekor. |
| GitHub artifact attestations | `attestation:gh_artifact_attestation` | Wraps DSSE; uses GitHub OIDC. |
| in-toto | `attestation:in_toto_predicate` | `predicateType` declared per-predicate. |
| SLSA | (projection only — no record family) | `projections/slsa.provenance.json` lives in `agp/projections/` and references `snapshotDigest`. |
| SPDX 3.0 | (projection only) | `projections/spdx-3.0.relationships.json`. |
| CycloneDX | (projection only) | `projections/cyclonedx.bom.json`. |
| OCI descriptor | (referenced by digest) | `oci-descriptor.json` is OPTIONAL transport metadata. |

### 15.3 AGP core is ecosystem-independent

The bundle MUST remain valid and verifiable **without** any of the above. Adoption is a separate concern from existence.

---

## 16. Verification Model

The MVP spec defines the verifier's required behavior; implementation lives in a later mission.

### 16.1 Verifier inputs

- `snapshot.json` bytes
- `records.ndjson` bytes
- (optional) `attestations/snapshot.dsse.json` bytes

### 16.2 Verifier required checks

```
1. records.ndjson parses as one JCS-canonical JSON object per line.
2. Every record's schemaVersion is supported.
3. Every record's payloadHash equals b3(JCS(record.payload)).
4. Every record's id equals "agp:" + family + ":" + kind + ":" + payloadHash.
5. snapshot.json parses.
6. snapshot.payload.agpVersion is supported.
7. Every snapshot.payload.records[].id exists as a line in records.ndjson.
8. Every line in records.ndjson is referenced exactly once in snapshot.payload.records[].
9. records.ndjson lines are sorted per §10.4.
10. snapshotDigest verifies per §11.5.
11. No record payload contains an absolute path (regex scan).
12. No record payload uses an undeclared hash algorithm prefix.
13. Optional attestation subject digest matches snapshotDigest.
```

### 16.3 Verifier verdicts

| Verdict | Condition |
| --- | --- |
| `valid` | All checks pass. |
| `valid_with_warnings` | All hard checks pass, but optional integrity (e.g. attestation subject) is absent or unverified. |
| `invalid` | A hard check fails. |
| `unsupported_schema` | `agpVersion` or a record's `schemaVersion` is from a future major. |
| `tampered` | `snapshotDigest` mismatch, or a record's `payloadHash` mismatch, or a record exists in `records.ndjson` that is not in the manifest, or vice versa. |

### 16.4 Verifier non-goals

The MVP verifier does NOT:

- Re-extract the architecture.
- Re-run policy rules.
- Verify Sigstore signatures (deferred).
- Verify SLSA provenance (deferred — projection consumer's job).

---

## 17. Policy Model

### 17.1 Policy input shape

AGP policy evaluates **over bundles**, not over raw CLI JSON v2. Specifically:

- Policy input = `{ snapshot: <snapshot.json>, records: [<parsed lines from records.ndjson>] }`.
- Policy MAY filter the records to specific families.
- Policy MUST NOT mutate factual records.

### 17.2 Policy outputs

- Policy outcomes are emitted as `policy_finding` records.
- A policy_finding's `payload.policyPack` identifies the pack and version.
- A policy_finding's `payload.findingId` is stable across runs against the same factual graph + same policy pack version.

### 17.3 Reproducibility

A policy decision MUST be reproducible from `(bundle, policy_pack_version)` alone. Policy MUST NOT depend on:

- wall-clock
- environment variables
- random seeds
- network access
- repo-code execution

### 17.4 Future projections

- OPA / Rego compatibility — `bundle.json` can be loaded directly as Rego input.
- SHACL / RDF projection — for graph-shape constraints, the bundle can be projected into an RDF graph where `node` records become `rdf:type :Package` and `edge` records become triples.

Both are deferred. MVP defines the policy *input* shape but not a Rego-compatible projection.

---

## 18. Incrementality and Fact DAG Roadmap

### 18.1 MVP: monolithic emit

The MVP emitter reads one JSON v2 envelope and emits one bundle. No file-level caching, no record-level reuse.

### 18.2 v2+ fact DAG

Content-addressed stages (each stage is a content-addressed fact):

| Stage | Identity input | Why |
| --- | --- | --- |
| 1. Repo inventory | (commit, paths) | Foundation. |
| 2. File facts | (path, content-sha256) | Reuse across runs that didn't touch the file. |
| 3. Manifest facts | (file fact hashes of package.json, lockfiles) | Reuse when manifests are unchanged. |
| 4. Syntax facts (optional) | (file fact hash, parser version) | Reuse when neither the file nor the parser changed. |
| 5. Semantic package facts | (manifest fact hashes, adapter version) | The current Arch-Engine extraction's output, made content-addressed. |
| 6. Graph record facts | (semantic package fact hashes) | What today is `node` and `edge` records. |
| 7. Snapshot manifest | (sorted record hashes + provenance) | What today is `snapshot.json`. |

### 18.3 Invalidation

- Touching a non-architecture file: invalidates only its file fact and any manifest that referenced it. No graph rebuild needed.
- Changing a lockfile: invalidates manifest, syntax, semantic, and graph facts that referenced it; but only those.
- Whitespace-only edits to a `package.json` that don't change parsed content: invalidate the file fact (content hash changed) but NOT the manifest fact (parsed-canonical hash unchanged), so the graph record is preserved.

### 18.4 Stable diff IDs

Each record's `id` is content-addressed, so the set difference `(bundle_A.records, bundle_B.records)` is intrinsically a stable diff. A drift record's identity already captures `(baseline.snapshotDigest, current.snapshotDigest, …)`, so a third re-run that produces neither bundle still references both digests stably.

### 18.5 MVP scope statement

Section 18 is **roadmap only**. The MVP emitter is monolithic. The incrementality story exists in the spec so future implementation can land it additively without churning the bundle format.

---

## 19. CLI Integration Strategy

### 19.1 Options evaluated

| Option | Shape | Notes |
| --- | --- | --- |
| **A. Package-only converter** | `npx @arch-engine/agp-emitter emit --from report.json --out agp/` | Cleanest. Independent of CLI release cycle. |
| **B. CLI flag** | `arch-engine check --json --json-schema=v2 --emit-agp --output agp/` | Couples check semantics to AGP. |
| **C. Standalone CLI command** | `arch-engine emit-agp --from report.json --output agp/` | New command on the CLI surface; goes through release prep. |
| **D. Separate CLI binary** | `npx arch-engine-agp emit --from report.json` | Confusing dual-binary surface. |

### 19.2 MVP recommendation

**Option A** for the MVP, **Option C** after MVP is verified.

1. **MVP (v0 — private/experimental):** ship `@arch-engine/agp-emitter@0.1.0` as a new optional package. The package exposes a programmatic API (`emitAgpBundle(jsonV2: object, outDir: string)`) and a CLI binary (`agp-emit`). The package may live behind the `experimental` npm dist-tag during the verifier shake-out.
2. **v1 — public CLI integration:** add `arch-engine emit-agp --from <report-json> --output <dir>` as a new top-level CLI command. New command, no new flag on `check` / `inspect` / `analyze`. Targets v1.5.0 or v1.6.0 as an additive minor release.

### 19.3 Why option A first

- **Keeps the CLI stable.** The five-command surface (`doctor`, `inspect`, `analyze`, `check`, `explain`) does not gain a sixth command until the bundle contract is verified in the wild.
- **Supports offline conversion.** Users can run `arch-engine check --json --json-schema=v2 --output report.json` on a build machine and then run `@arch-engine/agp-emitter` somewhere else (artifact-attestation pipeline, signing host) without re-running Arch-Engine.
- **Avoids changing `check` semantics.** No new flag means no new failure mode for existing CI integrations.
- **Makes the verifier easier.** Conformance against a separate emitter is cleaner than conformance against a CLI flag that interacts with `--baseline`, `--ci`, `--quiet`, etc.

### 19.4 Why option C eventually

Once the emitter package is real-repo-trialled, ergonomics call for "one tool, one pipeline." `arch-engine emit-agp` keeps users on the same binary they already trust, and the new subcommand can be peer-dependency-gated on `@arch-engine/agp-emitter` the same way `@arch-engine/adapter-yarn-pnp` is gated today.

---

## 20. AGP Repo Boundary

### 20.1 Recommended split

| Repo | Owns |
| --- | --- |
| **Arch-Engine** (this repo) | Extractor runtime, adapters, JSON v2, AGP emitter *implementation*, CLI integration, test fixtures, real-repo trial corpora. |
| **AGP** (separate repo, deferred) | Protocol spec (this document, lifted), canonical record JSON schemas, canonicalization/hashing rules as machine-readable docs, verifier conformance corpus, compatibility policy, formal invariant specs (later). |

### 20.2 Recommended sequence

1. **Now:** spec in Arch-Engine (`docs/agp/agp-canonical-bundle-and-emitter-mvp-spec.md` — this document).
2. **After spec review:** extract the protocol-grade subset into the AGP repo as a frozen v1 specification. The AGP repo becomes the canonical home for the spec; Arch-Engine's `docs/agp/` keeps a link and a "see AGP repo for the canonical spec; this repo holds the emitter implementation contract" pointer.
3. **Implementation pass:** implement the emitter in Arch-Engine against the frozen AGP v1 spec.
4. **Upstream conformance corpus:** the emitter's fixture-derived golden bundles become the AGP repo's verifier conformance corpus.

### 20.3 Why split

- Specification stability ≠ implementation velocity. The Arch-Engine repo iterates fast; the AGP spec wants to be slow and reviewed.
- Multi-implementor friendly. A second emitter (Rust, Go, Java) can be written against the AGP repo without forking Arch-Engine.
- Governance separation. The AGP foundation charter (`docs/contracts/agp-foundation-charter.md`) treats AGP as a multi-organisation protocol; the repo split honors that.

### 20.4 What stays in Arch-Engine permanently

- The emitter package (`@arch-engine/agp-emitter`).
- All `@arch-engine/*` packages (adapters, CLI, governance packs).
- JSON v2 envelope shape.
- Real-repo trial audits.

---

## 21. Security and Privacy Rules

### 21.1 Bundle MUST NOT contain

- Absolute paths.
- Home directory paths.
- Hostnames.
- User names.
- Environment variable contents.
- Network state (no fetches, no DNS).
- Wall-clock data outside `snapshot.payload.emittedAt` and `observation.payload.createdAt`, both excluded from the factual digest.
- Source code contents (a `node` record names the package, it does NOT carry source).
- Lockfile contents (only adapter-surfaced metadata about the lockfile).

### 21.2 Bundle MAY contain

- Repo-relative POSIX paths.
- Package names (from `package.json#name`).
- Workspace globs (already public per `pnpm-workspace.yaml` / `package.json#workspaces`).
- Git commit hash + branch name (per provenance opt-in).
- CI provider name + run ID (per provenance opt-in).

### 21.3 Redaction policy declaration

Every bundle declares its redaction policy in `provenance.payload.redaction`:

```jsonc
{
  "repoRoot":      "redacted" | "verbatim_local",
  "homeDir":       "redacted" | "verbatim_local",
  "absolutePaths": "rejected" | "stripped" | "allowed"
}
```

MVP default: `{ "redacted", "redacted", "rejected" }`. The "verbatim_local" mode is reserved for explicit `--unsafe-local` future emitter flag; it is **never** the default and the future implementation MUST treat it as a developer-only option.

### 21.4 Privacy implications for ML

Observation records are bound by the same rules. An LLM observation's `justification` field MUST NOT carry source code or absolute paths. The future emitter SHOULD validate observation contents against the same path-scan rules before accepting them into a bundle.

---

## 22. Compatibility and Versioning

### 22.1 AGP protocol version

`snapshot.payload.agpVersion` follows SemVer. The MVP locks `1.0.0`.

| Change type | Bump |
| --- | --- |
| Add an optional field to a record payload | patch |
| Add a new record family | minor |
| Add a new record `kind` to an existing family | minor |
| Add a new hash algorithm prefix | minor |
| Add a new projection type | minor |
| Remove or rename a required field | major |
| Change the snapshot digest derivation | major |
| Change the canonicalization algorithm | major |

### 22.2 Schema version compatibility

A verifier MUST:

- Accept any bundle whose `agpVersion` major matches the verifier's supported major(s).
- Accept future minor versions and ignore unknown optional fields.
- Reject bundles whose `agpVersion` major is higher than supported (`unsupported_schema` verdict).

### 22.3 Arch-Engine JSON v2 compatibility

The emitter accepts JSON v2 from any Arch-Engine version `>= 1.2.0` (when JSON v2 was locked). Newer JSON v2 envelopes with additive fields are tolerated.

### 22.4 Adapter compatibility

The emitter handles unknown `data.adapter.metadata.<key>` sub-blocks by passing them through verbatim. It does NOT interpret adapter-specific keys.

---

## 23. Test Plan

(Spec only — no implementation in this pass.)

### 23.1 Unit tests

- JCS canonicalization of every record family fixture.
- BLAKE3 / SHA-256 hash verification.
- Sort order across mixed-family record sets.
- Identity construction (id == "agp:family:kind:payloadHash").
- Snapshot digest derivation including the exclusion projection.
- Path-leak rejection.
- NFC normalization rejection.

### 23.2 Integration tests

- Input: a fixture JSON v2 envelope (one per command: inspect, analyze, check, check+baseline).
- Output: deterministic byte-identical bundle on repeat invocations.
- Output: snapshot digest stable across emittedAt-only differences.
- Output: rejected absolute-path inputs.
- Output: rejected JSON v1 inputs.
- Output: rejected unsupported commands.

### 23.3 Real-repo trial corpus

The 11 real-repo trial inputs from
[`audits/ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_REAL_REPO_TRIAL.md`](../../audits/ARCH_ENGINE_ADAPTER_PASS_3_YARN_PNP_REAL_REPO_TRIAL.md)
become the v1 emitter's real-repo trial corpus. Each repo's `inspect` JSON v2 → bundle → verifier-pass loop is the acceptance suite.

### 23.4 Conformance corpus (for the AGP repo)

A directory of `(input.json v2, expected/<snapshot.json, records.ndjson>)` pairs. The AGP repo hosts this corpus; multiple-implementor emitters validate against it.

### 23.5 Determinism stress tests

- Re-run on same input N=100 times: byte-identical bundles.
- Run on inputs with shuffled top-level key order: byte-identical bundles.
- Run on inputs with shuffled `records[]` order (where order is semantically meaningless): byte-identical bundles.

---

## 24. Acceptance Criteria

### 24.1 Spec acceptance (this pass)

This document is accepted when it covers, in normative detail:

- ✓ bundle layout
- ✓ record families (10)
- ✓ input contract
- ✓ output contract
- ✓ canonicalization rules
- ✓ hashing and identity rules
- ✓ verification model
- ✓ Arch-Engine JSON v2 → AGP record mapping
- ✓ provenance boundary
- ✓ attestation boundary
- ✓ ML observation boundary
- ✓ AGP repo split
- ✓ implementation sequence
- ✓ non-goals
- ✓ open questions

### 24.2 Future implementation acceptance (next mission)

The MVP emitter implementation is accepted when:

- Same JSON v2 input → byte-identical bundle (modulo `emittedAt` and provenance subset).
- Every record's `payloadHash` independently verifies.
- `snapshotDigest` verifies against the canonical projection.
- No absolute-path leakage in any output.
- JSON v1 inputs are rejected with `AGP_EMITTER_INPUT_NOT_V2`.
- Malformed JSON v2 inputs are rejected with the appropriate `AGP_EMITTER_INPUT_*` code.
- `inspect` / `analyze` / `check` inputs all supported.
- `check --baseline` drift block produces individual `drift:*` records.
- pnpm, yarn-pnp, and monorepo `data.adapter.metadata` blocks pass through into `adapter_evidence.payload.metadata`.
- No runtime AGP dependency in the default CLI path until the explicit `arch-engine emit-agp` subcommand exists.

---

## 25. Implementation Sequence

### Phase A — Spec extraction to AGP repo (1 short pass)

1. Extract sections 6–17 of this document into the AGP repo as the canonical AGP v1 spec.
2. Add JSON schemas for each record family.
3. Add the conformance corpus (small fixture set).

### Phase B — `@arch-engine/agp-emitter@0.1.0` (1 implementation pass)

1. New workspace package under `packages/agp-emitter/`.
2. No dependency on `@arch-governance/*`.
3. Programmatic API + CLI binary (`agp-emit`).
4. Tests against the conformance corpus + Arch-Engine fixture JSON v2.
5. Real-repo trial against the 11 v1.4.0 trial JSON outputs.

### Phase C — `@arch-engine/agp-verifier@0.1.0` (1 implementation pass)

1. New workspace package.
2. Implements §16.2 verification.
3. CLI binary (`agp-verify`).
4. Tests against the conformance corpus.

### Phase D — CLI integration (1 minor release pass)

1. Add `arch-engine emit-agp --from <json> --output <dir>` command to `@arch-engine/cli`.
2. Optional peer dependency on `@arch-engine/agp-emitter`.
3. v1.5.0 minor release.

### Phase E — Projections + attestation (multi-pass, deferred)

1. SLSA / in-toto / SPDX / CycloneDX projections.
2. DSSE / Sigstore attestation.
3. GitHub artifact attestation flow.

### Phase F — Incrementality / fact DAG (deferred to v2+)

1. File-fact caching.
2. Manifest-fact caching.
3. Record-fact caching.
4. Stable diff IDs.

---

## 26. Open Questions

The following questions are **non-blocking** for the implementation pass — defaults are recommended in this spec — but flagged for stakeholder review.

| # | Question | Spec default | Why open |
| --- | --- | --- | --- |
| OQ-1 | Should `bundle.json` (convenience single-file) be MVP or deferred? | Deferred. Emit `snapshot.json` + `records.ndjson` only in MVP. | One vs two files for the same canonical bytes; transport-vs-canonicality boundary. |
| OQ-2 | Should `policy_finding.payload.findingId` reuse Arch-Engine's `data.violations[].id` or compute its own from `(ruleId, edgeRef, severity, code)`? | Reuse Arch-Engine's id when present; compute deterministically otherwise. | Cross-tool stability vs self-containment. |
| OQ-3 | Should adapter-`metadata.monorepo` ship as an empty object or be omitted entirely for monorepo-sourced bundles? | Omit. v1.3.x monorepo adapter does not produce one. | Schema regularity vs adapter-truth. |
| OQ-4 | Should `shapeHash` be required or optional in MVP `snapshot.json`? | Optional. Required iff input had `graphSurfaceHash`. | Backward compat with Arch-Engine baselines. |
| OQ-5 | Should `provenance.git.dirty` reflect *bundle-emit-time* or *Arch-Engine-extraction-time* git state? | Bundle-emit-time. The emitter is the producer of the provenance record. | Could lead to confusing "clean bundle, dirty source" cases. |
| OQ-6 | Should the emitter package be private/experimental or public from v0.1.0? | Private/experimental for the first three months; public after one real-repo trial pass on the bundle output. | Risk of locking shape too early. |
| OQ-7 | Should AGP repo be created in this pass or after spec review? | After spec review. | Premature repo creation locks governance shape. |
| OQ-8 | Should `observation` records be allowed in MVP bundles, gated behind a `--with-observations` flag, even if Arch-Engine doesn't produce any? | No. MVP emits factual + trust planes only. Observations are deferred until at least one observer exists. | YAGNI vs structural completeness. |
| OQ-9 | Should `attestation` records live in `records.ndjson` or in a separate `attestations/` directory? | Both. The DSSE-wrapped file lives in `attestations/`; a thin `attestation:dsse_envelope` record in `records.ndjson` references it by path + sha256. | Discoverability vs canonical single-file location. |
| OQ-10 | Should the verifier itself be in Arch-Engine repo or AGP repo? | Arch-Engine repo (implementation), with a TypeScript reference implementation shipped from AGP repo at a different cadence. | Implementation-vs-conformance split. |

---

*End of AGP Canonical Bundle and Emitter MVP Specification.*
