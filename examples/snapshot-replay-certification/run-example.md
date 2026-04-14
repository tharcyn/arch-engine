# Execution Walkthrough — snapshot-replay-certification

A step-by-step guide to running the replay verification check, ensuring that
closure graph hashes hold their execution identity.

---

## 1. Using the Engine to Compare Snapshots programmatically

### Generation (Original)

```typescript
import { evaluatePolicy, captureExecutionSnapshot } from '@arch-engine/core';

// 1. Load your original policies
const basePolicy = require('./policy-base.json');
const overlayPolicy = require('./policy-overlay.json');
const topology = require('../federation-overlay/topology.json');

// 2. Perform original evaluation
const originalEvaluation = evaluatePolicy(
  topology.edges, 
  [basePolicy, overlayPolicy],
  'snapshot-replay-certification'
);

// 3. Serialize to disk (simulated generation of snapshot-original.json)
const originalSnapshot = captureExecutionSnapshot(originalEvaluation);
console.log('Original Hash:', originalSnapshot.closureGraphHash);
// Output: 1804245ce0b22a009efb4c1945aeacf0aaae19aa14bc8b5c928494b2beedee14
```

### Replay & Verification (Different Environment)

```typescript
import { loadSnapshot, verifyExecutionSemanticParity } from '@arch-engine/core';

// 1. Load the original snapshot that must be upheld
const certifiedOriginal = require('./snapshot-original.json');

// 2. Simulate loading in a different environment with different transport path
const replaySnapshot = require('./snapshot-replay.json');

// 3. Verify exactly matching hash fingerprints
const isReplayParityValid = verifyExecutionSemanticParity(
    certifiedOriginal.closureGraphHash, 
    replaySnapshot.closureGraphHash
);

console.assert(
  isReplayParityValid === true, 
  'Closure hash mismatch: semantic replay failed!'
);
```

---

## 2. How to Verify Replay Determinism

You can manually inspect the JSON files generated to prove that determinism holds.

```bash
# Compare the hash strings
jq '.closureGraphHash' snapshot-original.json
jq '.closureGraphHash' snapshot-replay.json
```

**What a mismatch indicates:**
If `closureGraphHash` differs between generation and replay, it means the structural *execution semantics* changed. 
This occurs if:
1. Authority tier elevation rules were removed.
2. A merge behavior override failed.
3. The underlying rule arrays were mutated.

**How to debug a mismatch safely:**
Compare the exact `executionTelemetry` object in the original versus the replay.
Look specifically at `authorityTier`, `seamId`, and `mergeMode`. The hash relies exactly on these fields mathematically. Any difference in these values completely regenerates the closure fingerprint.

---

## 3. Failure Diagnostic Table

| Symptom | Likely Cause |
|---------|--------------|
| `hashesIdentical` is false | Replay environment failed to resolve same authority or inputs |
| `authorityTier` changed to 2 | Seam grant missing in replay environment |
| `originPolicyChain` missing overlay | Composition skipped the overlay completely in the replay run |
| Timestamp appears in output | Environment drift regression involving legacy timestamps |
| `mergeAuthority` changes to 'local' | Overlay was blocked and fell back to base policy behavior |
