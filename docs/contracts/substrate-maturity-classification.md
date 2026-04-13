# Substrate Maturity Classification — @arch-engine/core

## Classification

**Federation-Grade Substrate Kernel**

**Enforcement Scope:** CI Topology Enforcement

> Production routing enforcement is out of scope for this preview. This classification applies to CI-time topology governance, architecture drift detection, and offline federation reasoning.

## Classification Justification

This classification is supported by four evidence pillars:

### 1. Deterministic Topology Identity

The engine produces reproducible topology identity hashes across platforms and executions.

**Evidence:**
- 318 test suites, 890 total tests — 100% pass rate
- 160+ freeze-contract tests specifically guarding hash stability
- 3 dedicated determinism test suites (`chainOrdering`, `hashParity`, `serializationCanonical`)
- `decisionStructureHash` proven stable across serialization boundaries
- `snapshotClosureGraphHash` proven stable across closure graph mutations
- Canonical serialization determinism verified via sort-order-independent JSON normalization

### 2. Overlay Lifecycle Enforcement

The engine enforces a complete overlay lifecycle state machine with admission gating.

**Evidence:**
- Overlay admission workflow with 5-gate validation pipeline
- Signature verification gates with cryptographic digest binding
- Namespace ownership validation preventing impersonation
- Authority ladder ceiling enforcement preventing privilege escalation
- Lifecycle state transitions: `active → deprecated → superseded → revoked`
- Revocation propagation across mirror registries
- Zero-overlay parity guaranteed (engine behaves identically with no overlays applied)

### 3. Capability Federation Ordering (F-12)

The engine implements deterministic capability negotiation with ordered resolution.

**Evidence:**
- F-12 capability manifest contract tests
- F-12 handler identity binding verification
- F-12 mirror privilege escalation prevention
- F-12 negotiation determinism freeze tests
- F-12 seam trust ceiling enforcement
- F-12 signature enforcement gates
- F-12 registry provenance validation
- Trust envelope ceiling enforcement across registry boundaries

### 4. Diagnostic Sovereignty

The engine's diagnostic output is governed by a formal schema preventing numeric leakage.

**Evidence:**
- `schemas/diagnostics/R0-v1.json` — categorical-only diagnostic schema
- `additionalProperties: false` enforced on diagnostic output objects
- Explicitly forbidden: numeric ranking weights, floating capability scores, trust coefficients, descriptor match gradients
- Diagnostic surfaces are observational only — cannot influence execution identity
- `freeze_diagnostics_do_not_mutate_execution_identity.test.ts` — proves diagnostic isolation
- `freeze_capability_diagnostics_no_score_leakage.test.ts` — proves no numeric leakage

---

## Maturity Comparison

| Maturity Level | Description | Status |
|---|---|---|
| Library | Reusable code with API contract | ✅ Exceeded |
| Framework | Opinionated execution model | ✅ Exceeded |
| Runtime | Self-contained execution environment | ✅ Achieved |
| Substrate Kernel | Deterministic, auditable, federation-ready | ✅ Achieved |
| Production Platform | Full ecosystem with marketplace and SLAs | ❌ Out of scope for preview |

## Classification Date

2026-04-13
