# Preview Scope — @arch-engine/core v0.1.0-preview

## Purpose

This document explicitly declares the boundaries of the v0.1.0-preview release to prevent scope confusion and over-reliance on features not yet stabilized.

---

## IN SCOPE

The following capabilities are included in this preview and have associated test coverage and stability contracts:

### Deterministic Topology Governance
- Topology identity computation (deterministic hashing)
- Decision structure hash reproducibility
- Snapshot closure graph hash stability
- Canonical serialization determinism

### Overlay Lifecycle Admission
- Overlay admission workflow with signature verification
- Lifecycle state machine (active → deprecated → superseded → revoked)
- Namespace ownership validation
- Authority ladder ceiling enforcement
- Revocation propagation across mirrors

### Capability Federation (F-12)
- Capability negotiation with deterministic ordering
- Descriptor matrix compatibility gating
- Mirror equivalence enforcement
- Trust envelope validation
- Registry provenance verification
- Authority grant scope enforcement
- Seam-scoped trust resolution

### Diagnostic Sovereignty
- Categorical diagnostic output (no numeric leakage)
- Schema-governed diagnostic surfaces (`R0-v1`)
- CLI output contract stability
- Observational-only diagnostic guarantees

### CLI Subsystem
- `doctor` — environment readiness diagnosis
- `inspect` — canonical topology summary
- `check` — full pipeline execution with policy evaluation
- `analyze` — stability scoring and blast radius
- `explain` — reasoning trace and policy explanation

---

## OUT OF SCOPE

The following capabilities are **NOT included** in this preview. Do not depend on them:

### Production Routing Enforcement
- No live traffic routing integration
- No request-path governance
- No runtime proxy or middleware hooks

### Multi-Repo Federation Handshake Protocol
- No cross-repository federation negotiation
- No distributed registry synchronization
- No federation membership protocol
- No cross-instance trust chain propagation

### Ecosystem Registry Marketplace
- No public registry hosting
- No overlay marketplace discovery
- No community-contributed overlay distribution
- No registry SLA enforcement

### Graph Database Persistence
- No persistent topology storage
- No historical topology diff analysis
- No time-series topology regression tracking (beyond file-based artifacts)

---

## Stability Classifications

| Feature Area | Preview Stability |
|---|---|
| Core hash determinism | `stable-preview` |
| Overlay lifecycle admission | `stable-preview` |
| Federation negotiation (F-12) | `stable-preview` |
| Diagnostic schema (R0-v1) | `stable-preview` |
| Parsers namespace | `experimental-preview` |
| CLI `analyze` / `explain` | `experimental-preview` |
