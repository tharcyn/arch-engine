# Execution Walkthrough — policy-pack-minimal

A step-by-step guide to running, verifying, and understanding the
deterministic policy enforcement example.

---

## 1. Purpose

This example demonstrates five core capabilities of `@arch-engine/core`:

- **Tier-based architecture enforcement** — domains assigned to `high`, `medium`,
  and `low` tiers, with automatic cross-tier violation detection
- **Domain boundary protection** — path-prefix domain resolution matches entities
  to their architectural layer
- **Violation detection** — a forbidden `frontend → infrastructure` edge is
  identified with full provenance metadata
- **Canonical ordering** — policy evaluation produces identically-ordered output
  regardless of input arrival order
- **Deterministic snapshot replay** — the same policy + topology input always
  produces the exact same output, byte-for-byte

---

## 2. File Structure Overview

| File | Role |
|---|---|
| `manifest.json` | Pack metadata: name, version, schema authority references (`https://schemas.arch-engine.dev/`) |
| `policy.yml` | Architecture enforcement policy defining 3 domains, 2 allow rules, 1 forbid rule |
| `topology.json` | Dependency graph with 6 nodes across 3 layers and 6 edges (1 violation) |
| `expected-output.snapshot.json` | Byte-stable expected evaluation output — the replay reference |
| `README.md` | High-level overview and architecture diagram |

---

## 3. Programmatic Execution

### Loading and Evaluating

```typescript
import { evaluatePolicy } from '@arch-engine/core';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as yaml from 'yaml';

// 1. Load and parse the policy
const policyYml = fs.readFileSync('policy.yml', 'utf-8');
const rawConfig = yaml.parse(policyYml);

// 2. Compute the canonical policy hash
function canonicalPolicyHash(config) {
  function sortObj(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sortObj);
    return Object.keys(obj).sort().reduce((acc, key) => {
      acc[key] = sortObj(obj[key]);
      return acc;
    }, {});
  }
  const stableJSON = JSON.stringify(sortObj(JSON.parse(JSON.stringify(config))));
  return crypto.createHash('sha256').update(stableJSON).digest('hex');
}

const policyHash = canonicalPolicyHash(rawConfig);
// => "3d382cb1afbb8b548df4960de145cc9311ea50f7b2fca12267e567e496fa07aa"

// 3. Compose a single-policy stack (minimal example uses direct config)
const composedPolicy = {
  version: rawConfig.version,
  mode: rawConfig.mode,
  domains: rawConfig.domains,
  rules: {
    allow: rawConfig.rules.allow.map((r, i) => ({
      ...r,
      originPolicyId: 'policy-pack-minimal',
      originRuleId: r.id,
      compositionDepth: 0,
      originPolicyChain: ['policy-pack-minimal'],
      mergeAuthority: 'local'
    })),
    forbid: rawConfig.rules.forbid.map((r, i) => ({
      ...r,
      originPolicyId: 'policy-pack-minimal',
      originRuleId: r.id,
      compositionDepth: 0,
      originPolicyChain: ['policy-pack-minimal'],
      mergeAuthority: 'local'
    }))
  },
  effectiveHash: policyHash
};

// 4. Load the topology
const topology = JSON.parse(fs.readFileSync('topology.json', 'utf-8'));

// 5. Evaluate
const result = evaluatePolicy(
  topology.edges,
  composedPolicy,
  'policy-pack-minimal',
  policyHash
);

// 6. Compare to expected snapshot
const expected = JSON.parse(
  fs.readFileSync('expected-output.snapshot.json', 'utf-8')
);

console.log('Violations:', result.violations.length);     // => 1
console.log('Allow matches:', result.allowMatches.length); // => 5
console.log('Matched edges:', result.matchedEdges);        // => 6
```

### Verifying Snapshot Equivalence

```typescript
// Strip the _meta field (documentation-only, not part of engine output)
const { _meta, ...expectedCore } = expected;

// Compare deterministic fields
console.assert(
  result.policyHash === expectedCore.policyHash,
  'policyHash mismatch — determinism regression'
);
console.assert(
  result.violations.length === expectedCore.violations.length,
  'Violation count mismatch'
);
console.assert(
  JSON.stringify(result.policyRuleHits) === JSON.stringify(expectedCore.policyRuleHits),
  'Rule hit count mismatch'
);
```

---

## 4. Determinism Guarantees

### policyHash Stability

The `policyHash` is computed by:

1. Serializing the `PolicyConfig` to JSON
2. Sorting all object keys recursively via `Object.keys(obj).sort()`
3. Hashing the canonical JSON string with SHA-256

This produces an identical hash for identical policy content regardless of:
- JavaScript object key insertion order
- YAML parser implementation
- Operating system
- Node.js version
- Locale settings

**Hash for this example:**
```
3d382cb1afbb8b548df4960de145cc9311ea50f7b2fca12267e567e496fa07aa
```

### Snapshot Replay Stability

The expected output snapshot contains **no environment-sensitive values**:

| Excluded | Reason |
|---|---|
| Timestamps | Would change per run |
| Filesystem paths | Would change per machine |
| Process IDs | Would change per execution |
| Locale-dependent orderings | Eliminated by binary codepoint comparison |

### Canonical Ordering Guarantees

All sorting in `@arch-engine/core` uses binary codepoint comparison
(`a < b ? -1 : a > b ? 1 : 0`), which is:

- **Spec-guaranteed** by the ECMAScript specification (UTF-16 code unit ordering)
- **Deterministic** across all JavaScript engines, Node versions, and operating systems
- **Aligned** with `Buffer.compare()` used in `stableCanonicalStringify`

### Environment Independence

The evaluation result depends **only** on:

1. The policy definition (content-addressed via `policyHash`)
2. The topology edges (input graph)
3. The evaluation strategy version (currently `1`)

It does **not** depend on: clock time, hostname, filesystem layout, installed
packages, network state, or environment variables.

---

## 5. Expected Output Characteristics

| Property | Value | Explanation |
|---|---|---|
| `matchedEdges` | 6 | All 6 topology edges evaluated |
| `violations` | 1 | `frontend/app.ts → infrastructure/database.ts` |
| `allowMatches` | 5 | The 5 permitted edges matched allow rules |
| `policyRuleHits` | `{ "no-cross-layer-imports": 1 }` | Single forbid rule fired once |
| `policyMode` | `"enforce"` | Policy runs in enforcement mode |
| `policyVersion` | `1` | Schema version 1 |

### The Violation

```
frontend/app.ts → infrastructure/database.ts
```

| Field | Value |
|---|---|
| `violationCategory` | `explicit_forbid` |
| `ruleId` | `no-cross-layer-imports` |
| `severity` | `error` |
| `tierSource` | `high` |
| `tierTarget` | `low` |
| `tierDelta` | `2` (skipped the `medium` services layer) |
| `mergeAuthority` | `local` |

---

## 6. Verification Checklist

Use this checklist to confirm deterministic replay correctness:

- [ ] **policyHash matches**: `3d382cb1afbb8b548df4960de145cc9311ea50f7b2fca12267e567e496fa07aa`
- [ ] **Violation count**: exactly 1
- [ ] **Violation edge**: `frontend/app.ts → infrastructure/database.ts`
- [ ] **Violation rule**: `no-cross-layer-imports`
- [ ] **Violation severity**: `error`
- [ ] **Violation tierDelta**: `2`
- [ ] **Allow match count**: exactly 5
- [ ] **Matched edge count**: exactly 6
- [ ] **policyMode**: `enforce`
- [ ] **evaluationStrategyVersion**: `1`
- [ ] **Rule hits**: `{ "no-cross-layer-imports": 1 }`
- [ ] **Output is byte-identical** to `expected-output.snapshot.json` (excluding `_meta`)

---

## 7. Failure Conditions

If any verification check fails, the difference indicates one of the following:

| Symptom | Likely Cause |
|---|---|
| policyHash differs | Policy content was modified, or canonical serialization algorithm changed |
| Violation count differs | Topology edges were added/removed, or rule matching logic changed |
| Violation ordering differs | Non-deterministic sorting introduced (e.g. `localeCompare` regression) |
| Allow match count differs | Allow rule patterns were modified, or rule precedence changed |
| tierDelta differs | Domain tier definitions or tier arithmetic changed |
| mergeAuthority differs | Composition resolver merge semantics changed |
| Snapshot structure differs | `PolicyEvaluationResult` type definition changed |
| Extra/missing fields | Export surface was widened or narrowed |

**Any of these differences should be treated as a regression and investigated
before release.**
