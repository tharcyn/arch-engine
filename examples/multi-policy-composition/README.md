# Multi-Policy Composition

A self-contained example demonstrating deterministic composition of two
independent policy layers with `@arch-engine/core`.

## What This Example Proves

Two independently meaningful policies — a base architecture ruleset and a
data-isolation overlay — compose into a single deterministic result. The result
is replay-stable, human-auditable, and snapshot-verifiable.

Specifically, this example demonstrates:

1. **Severity escalation via composition** — a forbid rule defined in the base
   policy at `warning` severity is overridden by the overlay policy to `error`,
   using the engine's strict severity resolution law (most-severe wins)
2. **Additive rule injection** — the overlay introduces a rule that does not exist
   in the base, and it appears in the composed output with `mergeAuthority: "additive"`
3. **Domain inheritance** — the overlay defines no domains; all three architecture
   layers are inherited from the base unchanged
4. **Allow rule inheritance** — allow rules from the base flow through to the composed
   policy, retaining their original provenance
5. **Deterministic provenance chains** — every rule in the output carries an
   `originPolicyChain` tracing its lineage through the composition stack

## Architecture

```
┌──────────────────────────────────────────┐
│  frontend  (tier: high)                  │
│    app.ts, components/header.ts          │
├──────────────────────────────────────────┤
│  services  (tier: medium)                │
│    user-service.ts, auth-service.ts      │
├──────────────────────────────────────────┤
│  infrastructure  (tier: low)             │
│    database.ts, cache.ts                 │
└──────────────────────────────────────────┘
```

## The Two Policies

### Base Policy (`base-policy.yml`)

The organizational default. Establishes the three-layer architecture:

| Type | Rule ID | From → To | Severity |
|------|---------|-----------|----------|
| allow | `frontend-to-services` | `frontend → services` | notice |
| allow | `services-to-infrastructure` | `services → infrastructure` | notice |
| forbid | `no-cross-layer-imports` | `frontend → infrastructure` | **warning** |

This is a permissive baseline: cross-layer imports are forbidden but at warning
severity only.

### Overlay Policy (`overlay-policy.yml`)

A tighter policy layer applied on top of the base:

| Type | Rule ID | From → To | Severity |
|------|---------|-----------|----------|
| forbid | `no-cross-layer-imports` | `frontend → infrastructure` | **error** |
| forbid | `no-reverse-dependencies` | `infrastructure → frontend` | error |

The overlay does two things:
1. **Escalates** the existing `no-cross-layer-imports` rule from `warning` to `error`
2. **Adds** a new `no-reverse-dependencies` rule that the base did not define

## The Composition Conflict

The `no-cross-layer-imports` rule exists in both policies with different severities:

```
base:    no-cross-layer-imports  →  severity: warning
overlay: no-cross-layer-imports  →  severity: error
```

The engine resolves this deterministically using the **strict severity resolution law**:

> When two policies define the same rule with different severities,
> the most-severe value wins.

Result: `severity: error`, with `mergeAuthority: "resolved-severity"`.

This is not configurable per-evaluation — it is a fixed property of the
composition algebra. The same input always produces the same output.

## The Topology

Seven dependency edges across the three layers:

| # | Source | Target | Expected Result |
|---|--------|--------|-----------------|
| 1 | `frontend/app.ts` | `services/user-service.ts` | ✅ Allowed (base allow rule) |
| 2 | `frontend/app.ts` | `services/auth-service.ts` | ✅ Allowed (base allow rule) |
| 3 | `frontend/components/header.ts` | `services/user-service.ts` | ✅ Allowed (base allow rule) |
| 4 | `services/user-service.ts` | `infrastructure/database.ts` | ✅ Allowed (base allow rule) |
| 5 | `services/auth-service.ts` | `infrastructure/cache.ts` | ✅ Allowed (base allow rule) |
| 6 | `frontend/app.ts` | `infrastructure/database.ts` | ❌ **Violation** (severity escalated) |
| 7 | `infrastructure/cache.ts` | `frontend/app.ts` | ❌ **Violation** (overlay-added rule) |

## The Two Violations

### Violation 1 — Severity Escalation

```
frontend/app.ts → infrastructure/database.ts
```

| Field | Value | Why |
|-------|-------|-----|
| `ruleId` | `no-cross-layer-imports` | Same rule ID in both policies |
| `severity` | `error` | Escalated from `warning` by overlay |
| `mergeAuthority` | `resolved-severity` | Engine resolved a severity conflict |
| `originPolicyChain` | `["org/base-architecture", "org/data-isolation-overlay"]` | Both policies contributed |
| `inheritedFromPolicyId` | `org/base-architecture` | Original definition came from base |
| `compositionDepth` | `1` | Overlay is at stack depth 1 |

### Violation 2 — Additive Rule

```
infrastructure/cache.ts → frontend/app.ts
```

| Field | Value | Why |
|-------|-------|-----|
| `ruleId` | `no-reverse-dependencies` | New rule from overlay only |
| `severity` | `error` | Defined at error by overlay |
| `mergeAuthority` | `additive` | Rule did not exist in base |
| `originPolicyChain` | `["org/data-isolation-overlay"]` | Only overlay contributed |
| `compositionDepth` | `1` | Overlay is at stack depth 1 |
| `tierDelta` | `-2` | Reverse flow: low → high |

## Composition Determinism

The following properties are guaranteed stable across replays:

| Property | Guarantee |
|----------|-----------|
| `policyHash` | SHA-256 of the canonical composed policy — identical for identical inputs |
| `violations` array | Same order, same fields, same values |
| `allowMatches` array | Same order, same provenance metadata |
| `mergeAuthority` values | Deterministic based on composition depth and conflict type |
| `originPolicyChain` values | Deterministic based on stack traversal order |
| `tierDelta` values | Deterministic arithmetic (sourceRank − targetRank) |
| `policyRuleHits` | Same counts per rule ID |

**No timestamps, filesystem paths, or environment-dependent values appear in the output.**

## What Would Indicate Drift

If any of these change between runs, a regression has occurred:

| Symptom | Likely Cause |
|---------|--------------|
| `policyHash` differs | Canonical serialization or composition logic changed |
| `mergeAuthority` differs | Severity resolution law or composition relabeling changed |
| Violation count changes | Rule matching, evaluation precedence, or composition changed |
| `originPolicyChain` differs | Stack traversal or chain construction changed |
| `tierDelta` differs | Tier rank arithmetic or domain resolution changed |
| New/missing fields | `PolicyEvaluationResult` type was widened or narrowed |

## How to Verify

Compare the evaluation output against `expected-output.snapshot.json`,
excluding the `_meta` field (which is documentation-only, not engine output).

Every field in the snapshot is byte-stable. If any value differs, the
composition or evaluation logic has regressed.

## How This Differs from policy-pack-minimal

| | policy-pack-minimal | multi-policy-composition |
|---|---|---|
| **Policy count** | 1 | 2 (base + overlay) |
| **Composition** | No composition — single policy evaluated directly | Two-policy stack with merge, inheritance, and conflict resolution |
| **Violations** | 1 (cross-layer import) | 2 (severity-escalated + overlay-added) |
| **mergeAuthority** | `local` only | `resolved-severity`, `additive`, `inherited` |
| **originPolicyChain** | Single-element chains | Multi-element chains showing composition lineage |
| **Key insight** | The engine detects violations | The engine composes multiple policies deterministically |

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Pack metadata and schema authority references |
| `base-policy.yml` | Organizational baseline: 3 layers, 2 allows, 1 forbid at warning |
| `overlay-policy.yml` | Data isolation overlay: escalates 1 severity, adds 1 new forbid |
| `topology.json` | Dependency graph with 7 edges (5 allowed, 2 violations) |
| `expected-output.snapshot.json` | Byte-stable expected composition + evaluation output |
| `README.md` | This file |
