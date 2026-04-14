# Federation Overlay

A self-contained example demonstrating deterministic federation-aware overlay
execution with mirror fallback routing and trust-tier-aware composition
in `@arch-engine/core`.

## What This Example Proves

Federated overlays compose safely and predictably, even when sourced from
different registry identities and resolved through alternate routing paths.

Specifically:

1. **Cross-registry composition** — a base policy from `registry-central` composes
   with an overlay from `registry-partner`, and the output carries registry-qualified
   provenance chains (`originPolicyChain`)
2. **Mirror fallback determinism** — when `registry-partner` is unavailable, the
   engine resolves the same overlay from `registry-partner-mirror` via the
   `overlay::transport::mirrorBoundary` seam, producing byte-identical output
3. **Trust-tier-aware execution** — the overlay's effective authority tier is
   determined by the registry ceiling (partner = `SIGNED_EXTERNAL_PACK`) and
   per-seam authority grants, not by the overlay's self-declared tier
4. **Closure hash parity** — the closure graph hash is identical regardless of
   whether the overlay was resolved via the primary registry or the mirror,
   because mirror routing metadata is explicitly excluded from hash input

## Federation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  registry-central (CORE_INTERNAL)                           │
│    └── base-architecture policy                             │
├─────────────────────────────────────────────────────────────┤
│  registry-partner (SIGNED_EXTERNAL_PACK)                    │
│    └── data-isolation overlay                               │
│                                                             │
│  registry-partner-mirror (SIGNED_EXTERNAL_PACK)             │
│    └── data-isolation overlay (mirror copy)                 │
│                                                             │
│  ┌─ mirrorBoundary seam ────────────────────────────────┐   │
│  │  If registry-partner unavailable:                    │   │
│  │    → resolve from registry-partner-mirror            │   │
│  │    → verify content equivalence                      │   │
│  │    → identical composition result                    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## What Federation Overlay Means

In a federated policy environment, policies are not all stored in one place.
Different registries — operated by different teams, organizations, or
infrastructure providers — publish policy overlays that compose on top of
a base policy.

The engine must guarantee that:
- Policies from different registries compose deterministically
- The provenance of every rule traces back to its source registry
- Trust boundaries prevent untrusted registries from escalating authority
- Mirror registries produce identical results when primary registries are unavailable

## What Mirror Routing Means

Mirror routing is a governed fallback path. When the primary registry for
an overlay is unavailable, the engine may resolve the overlay from a
pre-configured mirror registry instead.

Mirror fallback is not a silent best-effort retry. It is a governed
operation that:

1. Routes through the `overlay::transport::mirrorBoundary` seam
2. Enforces content equivalence between primary and mirror manifests
3. Records mirror provenance in execution telemetry
4. Preserves closure hash identity — mirror metadata does not affect the hash

## The Three Registries

| Registry | Trust Tier | Role |
|----------|-----------|------|
| `registry-central` | `CORE_INTERNAL` (4) | Primary registry — publishes the base architecture policy |
| `registry-partner` | `SIGNED_EXTERNAL_PACK` (2) | Partner registry — publishes the data-isolation overlay |
| `registry-partner-mirror` | `SIGNED_EXTERNAL_PACK` (2) | Mirror of partner registry — serves identical overlay content |

## How Trust-Tier Affects Execution

The engine enforces a two-level authority model:

**Registry authority ceiling**: Each registry has a maximum trust tier.
`registry-partner` is `SIGNED_EXTERNAL_PACK` (tier 2) — overlays from this
registry cannot exceed this ceiling regardless of what they declare.

**Per-seam authority grants**: A seam can grant elevated authority to specific
overlays. In this example, the `overlay::policy::enforcement` seam grants
`maxTier: TRUSTED_POLICY_PACK` (tier 3) to the data-isolation overlay, allowing
it to execute enforcement-level merge operations.

The effective authority is: `min(globalTier, seamGrant.maxTier)`

This means a partner registry overlay can execute at `TRUSTED_POLICY_PACK` (3)
on seams that explicitly grant it, but cannot reach `CORE_INTERNAL` (4).

## The Policies

### Base Policy (`base-policy.yml` — from registry-central)

| Type | Rule ID | From → To | Severity |
|------|---------|-----------|----------|
| allow | `frontend-to-services` | `frontend → services` | notice |
| allow | `services-to-infrastructure` | `services → infrastructure` | notice |
| forbid | `no-cross-layer-imports` | `frontend → infrastructure` | **warning** |

### Overlay Policy (`overlay-policy.yml` — from registry-partner)

| Type | Rule ID | From → To | Severity |
|------|---------|-----------|----------|
| forbid | `no-cross-layer-imports` | `frontend → infrastructure` | **error** |
| forbid | `no-reverse-dependencies` | `infrastructure → frontend` | error |

### Mirror Policy (`mirror-policy.yml` — from registry-partner-mirror)

Byte-identical to `overlay-policy.yml`. Content equivalence is the
foundation of mirror fallback safety.

## The Two Violations

### Violation 1 — Severity Escalation (cross-registry)

```
frontend/app.ts → infrastructure/database.ts
```

| Field | Value |
|-------|-------|
| `severity` | `error` (escalated from `warning` by partner overlay) |
| `mergeAuthority` | `resolved-severity` |
| `originPolicyChain` | `["registry-central/base-architecture", "registry-partner/data-isolation"]` |
| `inheritedFromPolicyId` | `registry-central/base-architecture` |

The provenance chain shows both registries contributed to this rule's final form.

### Violation 2 — Additive Rule (partner registry only)

```
infrastructure/cache.ts → frontend/app.ts
```

| Field | Value |
|-------|-------|
| `severity` | `error` |
| `mergeAuthority` | `additive` |
| `originPolicyChain` | `["registry-partner/data-isolation"]` |

The provenance chain shows this rule exists only because the partner registry overlay added it.

## Why Closure Hash Parity Proves Safety

The closure graph hash is computed from:

```
SHA-256(seamId | overlaySourceId | overlayVersion | mergeMode | authorityTier)
```

The following fields are **explicitly excluded** from the hash:

| Excluded Field | Reason |
|----------------|--------|
| `mirrorSourceId` | Transport metadata — does not affect policy content |
| `mirrorFallbackUsed` | Routing metadata — does not affect policy content |
| `mirrorEquivalenceVerified` | Verification metadata — does not affect policy content |
| `signatureKeyId` | Cryptographic metadata — does not affect policy content |
| `stackPosition` | Observational metadata — does not affect policy content |

Because mirror metadata is excluded, the closure hash is **identical** whether
the overlay was resolved from the primary registry or the mirror:

```
Primary path: 1b0edfde2efaea91dc8630f2dede48c3e1d8a9bc42c6d779b1c4ac543ed41bd8
Mirror path:  1b0edfde2efaea91dc8630f2dede48c3e1d8a9bc42c6d779b1c4ac543ed41bd8
```

This is the fundamental federation safety guarantee: routing does not affect identity.

## Why Mirror Metadata Is Excluded from the Closure Graph Hash

The closure graph hash represents **semantic policy execution structure** — what
policies executed, in what merge mode, at what authority level, and in what
order. It answers the question: *what did the engine do?*

It does **not** represent:

- Which registry served the policy content
- Whether the primary registry or a mirror was used
- How many network hops the resolution required
- Whether a fallback path was activated
- What availability state the registries were in

This distinction is deliberate. Transport routing is a **delivery concern**.
Semantic execution is a **determinism concern**. These two concerns must remain
independent for federation to work.

### Transport ≠ Semantics

A policy resolved from `registry-partner` and the same policy resolved from
`registry-partner-mirror` are semantically identical — they contain the same
rules, the same severity levels, and the same domain definitions. The engine
composes them identically and produces identical evaluation output.

The closure graph hash captures the **semantic identity** of this execution:

```
Hash input:  seamId | overlaySourceId | overlayVersion | mergeMode | authorityTier
```

The `overlaySourceId` is the **logical policy identity** (`registry-partner/data-isolation`),
not the **physical transport origin**. This is why the hash remains stable: the
logical identity does not change when a mirror serves the content.

Mirror routing metadata — `mirrorSourceId`, `mirrorFallbackUsed`,
`mirrorEquivalenceVerified` — describes *how the content arrived*, not
*what the content is*. Including it in the hash would conflate delivery
with identity.

### Concrete Example

In this example, two resolution paths produce the same closure graph hash:

```
Primary path:
  registry-partner → overlay-policy.yml → compose → evaluate
  Closure hash: 1b0edfde2efaea91dc8630f2dede48c3e1d8a9bc42c6d779b1c4ac543ed41bd8

Mirror path:
  registry-partner-mirror → mirror-policy.yml → compose → evaluate
  Closure hash: 1b0edfde2efaea91dc8630f2dede48c3e1d8a9bc42c6d779b1c4ac543ed41bd8
```

Both paths resolve to `overlaySourceId: "registry-partner/data-isolation"` and
`authorityTier: 3`. The hash input is identical because the semantic execution
structure is identical. The transport path is irrelevant.

### Formal Invariant

> **Closure graph hash represents semantic policy execution structure only.**
> **Transport routing decisions — including mirror fallback activation,**
> **registry availability state, and resolution path selection — must not**
> **influence closure graph identity.**

This invariant is enforced by the engine's fingerprint identity exclusion list,
which explicitly omits all transport-layer telemetry fields from hash computation.

### What Would Break If Mirror Metadata Participated in the Hash

If `mirrorFallbackUsed` or `mirrorSourceId` were included in the closure graph
hash input, four federation guarantees would fail:

| Guarantee | How It Breaks |
|-----------|---------------|
| **Offline replay validation** | Snapshots captured via primary path would fail verification when replayed via mirror path, even though the policy content is identical |
| **Deterministic federation routing** | The same policy stack would produce different hashes depending on registry availability at evaluation time, making execution non-reproducible |
| **Availability-safe registry fallback** | Mirror fallback would invalidate existing snapshots, turning a transport-layer recovery mechanism into a semantic-layer breaking change |
| **Portable snapshot verification** | Snapshots could only be verified against the specific registry path that produced them, eliminating cross-environment portability |

Each of these failures stems from the same root cause: transport metadata
leaking into semantic identity. The engine prevents this by design.

This invariant enables replay-safe federation routing and registry-independent
policy verification.

## How Provenance Surfaces Registry Origin

Every rule in the composed output carries an `originPolicyId` that includes the
registry prefix:

| Field | Primary Path | Mirror Path |
|-------|-------------|-------------|
| `originPolicyId` | `registry-partner/data-isolation` | `registry-partner/data-isolation` |
| `originPolicyChain[0]` | `registry-central/base-architecture` | `registry-central/base-architecture` |

The `originPolicyId` identifies the logical policy identity, not the physical
registry that served it. This is why provenance chains are identical regardless
of routing path.

## How to Verify

1. **Composition determinism**: Compare `evaluationResult` against the output of
   composing `base-policy.yml` + `overlay-policy.yml` and evaluating against
   `topology.json`. Every field must match.

2. **Mirror parity**: Compare `evaluationResult` against the output of composing
   `base-policy.yml` + `mirror-policy.yml`. The output must be byte-identical
   because `mirror-policy.yml` is byte-identical to `overlay-policy.yml`.

3. **Closure hash parity**: Verify that
   `federationTransport.closureHashParity.closureHashParityVerified` is `true`
   and both hash values are identical.

4. **Trust-tier consistency**: Verify that `seamExecutionTelemetry.authorityTier`
   is `3` (`TRUSTED_POLICY_PACK`), showing the seam grant elevated the partner
   registry's ceiling.

## What Drift Would Look Like

| Symptom | Likely Cause |
|---------|--------------|
| `policyHash` differs between primary and mirror paths | Mirror content is not equivalent — mirror integrity compromised |
| `closureHashParity` is `false` | Mirror metadata leaked into hash input — fingerprint isolation regression |
| `authorityTier` changed | Registry trust store or seam authority grants modified |
| `originPolicyChain` differs between paths | Policy identity binding changed — not routing independent |
| `mirrorEquivalenceVerified` is `false` | Mirror content diverged from primary — mirror sync failure |
| `activationDecision` is `REJECTED` | Trust-tier ceiling or seam grant prevents execution |
| Any evaluation field differs between paths | Composition or evaluation is not routing-independent |

## How This Differs from Other Examples

| | policy-pack-minimal | multi-policy-composition | **federation-overlay** |
|---|---|---|---|
| **Policy count** | 1 | 2 | 2 + 1 mirror |
| **Registries** | 1 (local) | 1 (local) | **3 (central + partner + mirror)** |
| **Composition** | None | Merge + severity resolution | **Cross-registry merge + severity resolution** |
| **Mirror fallback** | No | No | **Yes — governed mirrorBoundary seam** |
| **Trust-tier enforcement** | No | No | **Yes — registry ceiling + seam grants** |
| **Closure hash surface** | No | No | **Yes — parity verification across paths** |
| **Telemetry surface** | No | No | **Yes — seam execution records** |
| **Key insight** | Engine detects violations | Engine composes policies | **Engine federates safely across registries** |

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Pack metadata with federation context (registry identities) |
| `base-policy.yml` | Base architecture from registry-central |
| `overlay-policy.yml` | Data isolation overlay from registry-partner |
| `mirror-policy.yml` | Mirror copy from registry-partner-mirror (byte-identical to overlay) |
| `topology.json` | Dependency graph with 7 edges (5 allowed, 2 violations) |
| `expected-output.snapshot.json` | Evaluation result + federation transport telemetry + closure hash parity |
| `README.md` | This file |
