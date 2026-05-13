# AGP Research-Informed Roadmap

**Companion to:** [`docs/agp/agp-canonical-bundle-and-emitter-mvp-spec.md`](./agp-canonical-bundle-and-emitter-mvp-spec.md)
**Status:** Draft v1.0
**Audience:** Strategic stakeholders (product, engineering leadership, AGP foundation working group).
**Length budget:** 1 dense doc, not a second spec.

---

## 1. Executive Summary

Arch-Engine v1.4.0 has cleanly closed the "JavaScript workspace adapter" chapter. The strategic next move is to upgrade the output dimension, not the input dimension. AGP — designed as a **deterministic, record-oriented architecture evidence bundle** — turns Arch-Engine from an "architecture scanner" into an "architecture evidence producer" that composes with SLSA, in-toto, Sigstore, SPDX/CycloneDX, and future architecture-intelligence consumers without depending on any single one.

The spec pass that accompanies this roadmap (`agp-canonical-bundle-and-emitter-mvp-spec.md`) is intentionally conservative. It locks the canonical bundle (record-oriented, content-addressed, three-plane: factual / evidence / trust) and leaves attestation, ML, policy projection, incrementality, and graph-DB ambitions for later. The MVP is one emitter producing one bundle from one JSON v2 envelope. Everything else projects outward from that core.

---

## 2. What Research Changed

The research pass that informs this roadmap shifted three design defaults:

### 2.1 From "another JSON report" to "record-oriented evidence bundle"

The original direction (`docs/contracts/agp-emitter-contract.md`, Draft v0.1, 2026-05-06) treated AGP as a batch of typed records emitted into an external runtime package's evaluator. That model assumed AGP = consumption-via-`@arch-governance/architecture-profile`.

The shift: AGP is **artifacts on disk** (`snapshot.json` + `records.ndjson`) that any consumer can read, hash, verify, sign, and project. No runtime dependency. No mandatory evaluator. The artifact-as-protocol model maps directly onto SLSA / in-toto / Sigstore conventions.

### 2.2 From "one giant nested JSON" to "sorted record stream + manifest"

A single nested JSON snapshot is hostile to:
- incremental reuse (one byte change re-hashes the whole tree),
- stable diffing across whitespace-only changes,
- per-record signing and selective disclosure,
- multi-implementor consensus (parsers disagree on insignificant whitespace).

The record-oriented model (NDJSON + manifest with sorted record-hash list) inverts every one of those:
- a single record's content hash is the unit of cache reuse,
- diffing is set difference over record IDs,
- per-record signing / selective disclosure is structural,
- canonicalization is per-record JCS — easier to specify, easier to verify.

### 2.3 From "evaluator pipeline" to "three-plane separation"

The three planes (factual / evidence / trust) are not just a tidy taxonomy — they are the *invariant that allows ML to enrich Arch-Engine without compromising determinism*. The factual digest excludes the evidence plane by construction, so adding observation records, swapping models, changing prompts, and re-running heuristics cannot change `snapshotDigest`. ML becomes a strictly additive capability rather than an authority-laundering risk.

---

## 3. Design Principles to Adopt Now

| # | Principle | Why now |
| --- | --- | --- |
| 1 | **Property-graph-shaped core.** Nodes + edges as the canonical fact model, JSON-native. | Arch-Engine's `canonical-topology.ts` already emits this shape. Lifting it to AGP is mechanical. |
| 2 | **Record-oriented bundle.** NDJSON + manifest. | Enables every downstream capability (incrementality, signing, diff) without retrofit. |
| 3 | **Three-plane separation.** Factual / evidence / trust. | Necessary the moment ML or observations are admitted; cheap to lock now, expensive to retrofit. |
| 4 | **JCS canonical JSON + BLAKE3 internal + SHA-256 external.** | Industry standards align. Choosing now prevents re-hashing the corpus later. |
| 5 | **Per-record hash addressed as `agp:<family>:<kind>:<payloadHash>`.** | Self-describing identity; debuggable; multi-implementor friendly. |
| 6 | **Snapshot digest as the public subject.** SHA-256, OCI-compatible. | Lets SLSA / in-toto / Sigstore consume AGP without ceremony. |
| 7 | **No external runtime dependency.** | Arch-Engine ships an emitter; downstream consumers (verifier, attestor, observer) ship their own. The bundle is the contract. |
| 8 | **Bundle-emit-only MVP. No verifier. No signer. No projections.** | Elegance constraint. Land the artifact shape first; everything else is downstream. |

---

## 4. Ideas to Defer

| Idea | Defer to | Why defer |
| --- | --- | --- |
| Sigstore signing | v0.3 | Useful, but bundle-shape correctness must precede signing. |
| SLSA / in-toto projection | v0.4 | Projection is a transformation over a known-good bundle. |
| OPA / Rego policy engine | v0.5 | Policy MVP can operate over `bundle.json` directly. |
| SHACL / RDF graph projection | v0.6 | Useful for academic / standards integration; not in the critical-path. |
| Incremental fact DAG | v1.0 of v2 protocol | Huge win for large monorepos; non-trivial to specify. Land monolithic emitter first. |
| ML observations as default surface | v2 | Need at least one stable observer before opening the gate. |
| Rust sidecar | when bottleneck materialises | Not bottlenecked yet. |
| Formal proofs (TLA+, Quint, Alloy) | post-MVP, selectively | Use formal tools to verify *determinism* and *invalidation*, not to over-prove correctness. |
| Graph database backend | indefinite | AGP IS the canonical store. A graph DB is a downstream projection. |
| WebAssembly verifier | when 3+ implementors exist | Multi-implementor friendly, but premature for MVP. |

---

## 5. Ideas to Reject

These are tempting but actively harmful to AGP's positioning:

| Idea | Why reject |
| --- | --- |
| **AGP as a SaaS dashboard.** | Centralises the protocol's value in a service. AGP is artifacts. |
| **AGP locked to a specific signing ecosystem.** (e.g. only Sigstore) | Defeats the "ecosystem-independent" guarantee. |
| **AGP as a replacement for SBOM / SLSA / SPDX / CycloneDX.** | AGP is a different abstraction (architecture facts vs component manifest). Coexist; don't compete. |
| **AGP carrying source code or full ASTs.** | Privacy disaster. Architecture facts are public; source is not. |
| **AGP requiring a runtime to be useful.** | Defeats the artifact-as-protocol model. |
| **Vendor-extension records that bypass the schema.** | Erodes determinism and verifier coverage. |
| **In-protocol LLM prompt templates.** | Couples the protocol to a particular ML era. |
| **"Just emit a Prolog/Datalog database."** | The graph DB urge — see above. Project outward; do not be one. |
| **"AGP v1 covers everything."** | Feature soup. MVP is the bundle. |

---

## 6. 6–9 Month Roadmap

| # | Mission | Output |
| --- | --- | --- |
| 1 | **Spec review + AGP repo bootstrap** | The spec extracted into a separate AGP repo as the canonical v1; JSON schemas; conformance corpus (small fixture set). |
| 2 | **`@arch-engine/agp-emitter@0.1.0`** | Workspace package + `agp-emit` CLI binary. Tested against the 11 real-repo trial corpus. |
| 3 | **`@arch-engine/agp-verifier@0.1.0`** | Workspace package + `agp-verify` CLI binary. Implements §16.2 of the spec. |
| 4 | **Real-repo bundle trial** | Run the emitter against the 11-repo trial corpus; verify each bundle; record verdicts. |
| 5 | **v1.5.0 minor release** | Add `arch-engine emit-agp` subcommand; optional peer on the emitter package. |
| 6 | **Hygiene pass** | Address P3 items from the real-repo bundle trial. |

Total: ~6 missions, ~6–9 months calendar.

**Exit criteria:** the AGP bundle is real, verified, and consumable; CLI integration is live; conformance corpus is published.

---

## 7. 1–2 Year Roadmap

| # | Mission | Output |
| --- | --- | --- |
| 7 | **SLSA / in-toto projection pass** | `projections/slsa.provenance.json`, `projections/in-toto.predicate.json` written alongside the bundle. |
| 8 | **DSSE attestation pass** | `attestations/snapshot.dsse.json` envelope. Subject = snapshot digest. |
| 9 | **Sigstore keyless signing** | Sign DSSE envelopes via Fulcio / Rekor; integrate with GitHub OIDC. |
| 10 | **GitHub artifact attestation** | Wrap AGP bundles in GitHub's attestation flow. |
| 11 | **Policy MVP (OPA / Rego over bundle.json)** | First policy pack that evaluates directly against an AGP bundle, not a CLI report. |
| 12 | **Second emitter (Rust or Go)** | Validates the spec via conformance corpus + multi-implementor parity. |
| 13 | **SPDX 3.0 + CycloneDX projections** | Two more projection types in `agp/projections/`. |
| 14 | **First architecture intelligence observer** | An LLM-backed `observation:llm_summary` producer, gated behind the §13 boundary. |

Total: ~8 missions, ~12–24 months calendar.

**Exit criteria:** AGP bundles flow through real CI pipelines with signing and attestation; at least one independent emitter exists; first non-Arch-Engine observer ships.

---

## 8. 2–5 Year Frontier Roadmap

| Theme | What it looks like |
| --- | --- |
| **Incremental fact DAG (v2)** | File facts → manifest facts → semantic facts → graph facts → snapshot. Whitespace edits don't invalidate the graph. Large-monorepo CI cost drops by an order of magnitude. |
| **Formal verification of determinism** | Quint / TLA+ specs prove the invalidation rules of the fact DAG are sound. Alloy bounded-graph checks prove the canonical-topology contract. |
| **Federation of bundle indexes** | Multi-org registries (the AGP foundation's `RegistryAuthorityBootstrapRuntime` concept) mirror bundle indexes with provenance, similar to the Sigstore Rekor model. |
| **SHACL / RDF graph projection** | AGP bundles project into RDF for academic / regulatory / standards integration. |
| **Multi-language emitter ecosystem** | TypeScript (Arch-Engine), Rust (sidecar), Go (CI integration), Python (research), JVM (enterprise). Conformance corpus governs parity. |
| **Cross-organisation policy federation** | A policy pack published by org A can be evaluated against a bundle produced by org B with verifiable provenance. |
| **Architecture intelligence corpus** | Years of bundles become a research corpus for "what does a well-architected monorepo look like over time?" — but only as observations, never mutating facts. |
| **Anti-pattern detection** | Heuristic and ML observers identify architecture anti-patterns; policy packs gate on them per consumer preference. |
| **Graph DB / OLAP projections (read-only)** | Massive cross-org bundle archives projected into Neo4j / DuckDB / OLAP stores for query. The canonical AGP bundles remain artifacts; the DBs are downstream views. |

Total: open-ended; spec is designed to absorb without major-version bump.

**Exit criteria:** AGP is the canonical neutral substrate for architecture evidence across organisations and tools.

---

## 9. Elegance Rules

These are non-negotiable for the MVP and the 6–9 month roadmap.

1. **Bundle first. Verifier second. Attestation later. ML later. Graph DB later.** No reordering.
2. **No feature in the MVP that doesn't earn its way against the elegance test:** "if I removed this feature, would the bundle still satisfy the product thesis?" If yes, defer it.
3. **No CLI flag changes** in Arch-Engine until the emitter is real-repo-trialled. The emitter is its own binary in the package; the CLI subcommand follows later.
4. **No `@arch-governance/*` runtime dependency in the emitter.** The emitter writes files. Period.
5. **No source code or AST contents in the bundle.** Architecture facts only.
6. **No wall-clock in factual identity.** `emittedAt` and `createdAt` exist; they are explicitly excluded from `snapshotDigest`.
7. **No host data.** Repo root, home dir, env vars, hostname — never serialised.
8. **One canonical shape.** `bundle.json` is convenience; `snapshot.json` + `records.ndjson` is canonical. No third encoding.
9. **One source of truth per fact.** A node's name appears once. An edge's identity is derived. No duplicate denormalised fields.
10. **One digest algorithm per layer.** BLAKE3 internal, SHA-256 external. No "we support five hash algorithms in parallel" complexity.

---

## 10. Hardening Rules

For each future implementation pass, the hardening checklist:

1. Test every record family against canonical bytes (golden files).
2. Test determinism over N=100 re-runs on the same input.
3. Test rejection of every documented `AGP_EMITTER_INPUT_*` failure mode.
4. Test absolute-path leakage across every record type.
5. Test NFC normalization across non-ASCII fixture data.
6. Test that toggling observation emission does not change `snapshotDigest`.
7. Test that toggling provenance fields does not change `snapshotDigest`.
8. Test verifier against tampered bundles (one-byte flip, swapped lines, missing line).
9. Test conformance corpus against the implementation byte-for-byte.
10. Real-repo trial on the 11-repo corpus + at least 2 new repos per major release.

---

## 11. Product Positioning

### 11.1 What Arch-Engine + AGP becomes

```
Arch-Engine v1.x        deterministic extractor + JSON v2 reports.
Arch-Engine v1.5+       extractor + AGP emitter (additive).
Arch-Engine v2.x        extractor + AGP emitter + incrementality.
AGP v1 (separate repo)  the protocol specification + verifier conformance + JSON schemas.
```

### 11.2 Who consumes AGP bundles

| Consumer | Use |
| --- | --- |
| CI gates | Read `policy_finding` records + `drift:violation_new`. |
| Release pipelines | Embed `snapshot.dsse.json` as a release artifact attestation. |
| Supply-chain consumers | Project AGP → SLSA / in-toto / SPDX / CycloneDX. |
| Compliance / audit | Replay-verify historical bundles against historical policy packs. |
| Architecture intelligence (later) | Ingest bundles as a research corpus; emit observations. |
| Cross-org federation (later) | Mirror bundle indexes via AGP foundation registry. |

### 11.3 Differentiation

| Vs. | What AGP adds |
| --- | --- |
| SBOM (SPDX, CycloneDX) | AGP describes architecture facts (typed nodes + edges + policy outcomes), not component manifests. Projects to SBOM, doesn't replace it. |
| SLSA / in-toto | AGP is a domain-specific evidence shape that fits underneath the predicate layer. SLSA describes how artifacts were built; AGP describes what was inside them at the architecture level. |
| Sigstore | AGP is the *thing being signed*. Sigstore is the signing transport. |
| Snyk / Dependabot / Renovate / dependency-cruiser | AGP is a deterministic neutral artifact format. The above are tools. They could project their outputs into AGP. |
| Backstage software catalog | AGP is per-bundle, per-repo, per-commit. Backstage catalogs are organisational. They consume AGP. |

### 11.4 Strategic positioning

AGP is the **architecture-evidence neutral substrate**. The product thesis is to be to architecture what SBOM is to components, SLSA is to build provenance, and Sigstore is to signing transport. Each of those succeeded by being **minimal, neutral, and ecosystem-independent**. AGP follows the same pattern.

---

## 12. Risks

| # | Risk | Mitigation |
| --- | --- | --- |
| R1 | Spec churn before adoption. | Lock MVP small; expand only with conformance corpus evidence. |
| R2 | "It's just JSON" — easy to fork. | Conformance corpus + verifier as the actual authority. |
| R3 | Adoption by one ecosystem (e.g. GitHub) drags AGP into that ecosystem's shape. | Repo split + ecosystem-independent core in spec. |
| R4 | ML pressure to mutate facts. | Three-plane invariant is testable; verifier rejects observation-derived factual changes. |
| R5 | Schema-explosion across record families. | New families require AGP minor bump; the MVP locks 10 families and discourages adding new ones casually. |
| R6 | Performance regression on large monorepos (NDJSON serialisation cost). | Defer incrementality to v2; MVP measures and reports baseline cost. |
| R7 | Cross-implementor incompatibility (TypeScript vs Rust vs Go emitters drift). | Conformance corpus is the contract; CI parity across implementations. |
| R8 | Signing ecosystem lock-in via "convenient" Sigstore default. | Sigstore is one projection among many; AGP core stays attestation-agnostic. |
| R9 | Privacy leakage via observation justifications. | Same path-scan rules apply; verifier flags absolute paths anywhere in any record. |
| R10 | AGP foundation governance never crystallises; AGP becomes "just an Arch-Engine output format." | Acceptable downside. AGP-as-Arch-Engine-output-format is still strictly better than no AGP at all. |

---

*End of AGP Research-Informed Roadmap.*
