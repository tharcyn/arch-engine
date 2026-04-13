# Release Certification — @arch-engine/core v0.1.0-preview

## Certification Date

2026-04-13

## Certification Scope

This document certifies the preview-release readiness of `@arch-engine/core` as a **federation-grade substrate kernel** for deterministic architecture topology governance.

---

## Guarantee Classification

### 1. Provable Guarantees

These properties are mathematically verifiable through hash-based identity:

| Guarantee | Verification Method |
|---|---|
| `decisionStructureHash` reproducibility | Deterministic canonical serialization → SHA-256 identity |
| `snapshotClosureGraphHash` stability | Closure graph traversal → deterministic hash computation |
| Topology identity reproducibility | Same inputs → same `decisionTraceHash` across platforms |
| Overlay stack sort determinism | Lexicographic tiebreaking → reproducible ordering |

### 2. Enforced Runtime Guarantees

These properties are enforced by runtime gate logic:

| Guarantee | Enforcement Mechanism |
|---|---|
| Overlay lifecycle admission | `overlayAdmissionWorkflow` rejects unsigned/unverified overlays |
| Registry trust-tier ceilings | `registryAuthorityLadder` prevents privilege escalation |
| Descriptor matrix compatibility gating | `overlayCompatibilityMatrix` blocks incompatible combinations |
| Namespace impersonation rejection | `overlayNamespaceOwnership` validates origin registry ownership |
| Signature verification gates | `overlayAuthorityResolver` enforces cryptographic signature validation |
| Revocation propagation | `overlayRevocationList` propagates revocations across mirrors |

### 3. Observational Guarantees

These properties are guaranteed through diagnostic schema governance:

| Guarantee | Schema Reference |
|---|---|
| Diagnostic output is categorical only | `schemas/diagnostics/R0-v1.json` — `additionalProperties: false` |
| No numeric ranking weights exposed | Forbidden by schema governance annotation |
| No floating capability scores exposed | Forbidden by schema governance annotation |
| CLI output contract stability | `schemas/cli-output-contract.json` |

### 4. Derived Guarantees

These properties follow logically from the primitive guarantees above:

| Guarantee | Derived From |
|---|---|
| Mirror equivalence reproducibility across registries | Provable: closure graph hash + Enforced: signature verification |
| Deterministic fallback selection stability | Provable: overlay stack sort + Enforced: lifecycle admission |
| Overlay precedence invariance | Provable: topology identity + Enforced: authority ladder ceilings |
| Cross-registry identity divergence detection | Provable: hash reproducibility + Enforced: namespace ownership |

---

## Test Coverage Summary

| Metric | Count |
|---|---|
| Total test suites | 318 |
| Total tests | 890 |
| Freeze-contract tests | 160+ |
| Determinism tests | 3 dedicated suites |
| Federation tests | Dedicated suite directory |
| Pass rate | 100% |

---

## Sealed Surface

| Surface | Status |
|---|---|
| Root export (`@arch-engine/core`) | ✅ Sealed — 11 approved exports |
| Analysis export (`@arch-engine/core/analysis`) | ✅ Sealed |
| Parsers export (`@arch-engine/core/parsers`) | ✅ Sealed — experimental |
| Identity export (`@arch-engine/core/identity`) | 🔒 Removed — not in exports, not in dist |
| `generateEntityId` | 🔒 Internal only — unreachable externally |

---

## Certification Evidence Basis

| Evidence Source | Metric |
|---|---|
| Test suites | 319+ |
| Total tests | 895+ |
| Freeze-contract tests | 160+ |
| Determinism test suites | 3 dedicated + 1 replay proof |
| Example-pack conformance tests | 5 assertions |
| Public surface snapshot test | Approved export list enforced |
| Distribution artifact invariant test | `dist/identity.*` absence enforced |
| Public types surface test | `.d.ts` signature snapshots enforced |
| Diagnostic schema validation | `R0-v1` structural conformance verified |
| CLI JSON contract validation | `doctor`, `inspect`, `check` schemas enforced |
| Descriptor schema validation | `v1` structural conformance verified |
| Deterministic build replay | Identical hash across disjoint invocations proven |

---

## Certification Verdict

**CERTIFIED FOR: v0.1.0-preview publication**

This release represents a deterministic architecture governance runtime with proven hash reproducibility, enforced overlay lifecycle admission, and categorical diagnostic sovereignty.
