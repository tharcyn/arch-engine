# Policy Pack: Minimal Three-Layer Architecture

A minimal, executable example demonstrating deterministic architecture enforcement
with `@arch-engine/core`.

## What This Example Demonstrates

1. **Layered architecture enforcement** — three layers (frontend → services → infrastructure)
   with explicit allow/forbid rules
2. **Deterministic violation detection** — a forbidden cross-layer import
   (`frontend/app.ts → infrastructure/database.ts`) is detected identically on every run
3. **Policy composition** — domain tiers, allow rules, and forbid rules composed into
   a single evaluation decision
4. **Snapshot reproducibility** — the expected output is byte-stable across runs,
   environments, and Node versions
5. **Canonical hash stability** — `policyHash` is computed from a deterministic
   canonical JSON serialization of the policy, producing the same hash for identical
   policy content regardless of key ordering

## Architecture Layers

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

## Allowed Dependencies

| From | To | Rule |
|---|---|---|
| `frontend/*` | `services/*` | `frontend-to-services` (allow) |
| `services/*` | `infrastructure/*` | `services-to-infrastructure` (allow) |

## Forbidden Dependencies

| From | To | Rule | Severity |
|---|---|---|---|
| `frontend/*` | `infrastructure/*` | `no-cross-layer-imports` | error |

## The Violation

The topology includes one intentional violation:

```
frontend/app.ts → infrastructure/database.ts
```

This edge bypasses the services layer, importing directly from infrastructure.
The policy engine detects this as an `explicit_forbid` violation with:

- **Rule**: `no-cross-layer-imports`
- **Severity**: `error`
- **Tier delta**: 2 (high → low, skipping medium)
- **Origin policy chain**: `["policy-pack-minimal"]`

## How to Run

This example uses the `evaluatePolicy` and `composePolicies` functions from
`@arch-engine/core`. A minimal invocation:

```typescript
import { evaluatePolicy } from '@arch-engine/core';
import { composePolicies } from '@arch-engine/core';
import topology from './topology.json';
import policyConfig from './policy-parsed.json'; // parsed PolicyConfig

// 1. Compose the policy stack (single policy in this example)
const composed = composePolicies([{
  policyId: 'policy-pack-minimal',
  config: policyConfig,
  hash: '3d382cb1afbb8b548df4960de145cc9311ea50f7b2fca12267e567e496fa07aa'
}]);

// 2. Evaluate against topology edges
const result = evaluatePolicy(
  topology.edges,
  composed,
  'policy-pack-minimal',
  composed.effectiveHash
);

// 3. Result matches expected-output.snapshot.json exactly
console.log(JSON.stringify(result, null, 2));
```

## Expected Deterministic Behavior

Running this evaluation produces **exactly** the output in
`expected-output.snapshot.json`:

- **1 violation** detected (`no-cross-layer-imports`)
- **5 allow matches** (all permitted edges)
- **6 matched edges** (total topology edges evaluated)
- **policyHash**: `3d382cb1afbb8b548df4960de145cc9311ea50f7b2fca12267e567e496fa07aa`

## Replay Determinism Guarantee

The following properties are guaranteed stable across replays:

| Property | Guarantee |
|---|---|
| `policyHash` | Identical for identical policy content — computed via canonical JSON key-sort + SHA-256 |
| `violations` array | Same order, same fields, same values |
| `allowMatches` array | Same order (edge evaluation order) |
| `policyRuleHits` | Same counts |
| `tierDelta` | Deterministic arithmetic (sourceRank - targetRank) |
| `originPolicyChain` | Deterministic composition traversal |

**No timestamps, filesystem paths, or environment-dependent values appear in the output.**

If any field in the output differs between runs, a determinism regression has occurred
and should be reported as a bug.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Pack metadata and schema authority references |
| `policy.yml` | Architecture enforcement policy (3 layers, 3 rules) |
| `topology.json` | Example dependency graph with 1 violation |
| `expected-output.snapshot.json` | Byte-stable expected evaluation output |
| `README.md` | This file |
