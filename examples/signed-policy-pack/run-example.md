# Execution Walkthrough — signed-policy-pack

A step-by-step guide to running, verifying, and understanding the
signature-backed overlay authority enforcement example.

---

## 1. Purpose

This example demonstrates that `@arch-engine/core` enforces cryptographic
signatures as a gate in overlay authority resolution. An overlay claiming
`SIGNED_EXTERNAL_PACK` trust tier must present a valid signature to proceed
through the authority pipeline.

---

## 2. File Structure Overview

| File | Role |
|------|------|
| `manifest.json` | Pack metadata with schema authority references |
| `policy-base.json` | Base architecture policy (3 domains, 2 allow, 1 forbid at `warning`) |
| `policy-overlay-unsigned.json` | Overlay with no signature — rejected at authority resolution |
| `policy-overlay-signed.json` | Overlay with `ed25519` envelope — accepted and composed |
| `signature-envelope.json` | Reference: decoded envelope structure and digest components |
| `expected-output.json` | Contrasting outcomes for unsigned vs signed paths |

---

## 3. Programmatic Execution

### Path A — Unsigned Overlay (Rejection)

```typescript
import { evaluatePolicy } from '@arch-engine/core';
import type { ComposedPolicy } from '@arch-engine/core';

// 1. Load policies
const basePolicy = require('./policy-base.json');
const unsignedOverlay = require('./policy-overlay-unsigned.json');
const topology = require('./topology.json'); // use federation-overlay topology

// 2. Authority resolution for unsigned overlay
// overlaySignature is null → signatureVerificationMode: 'missing'
// trustAccepted: false → overlay REJECTED
// Result: base policy evaluated alone

// 3. Compose WITHOUT overlay (rejected)
const composedUnsigned: ComposedPolicy = {
  version: basePolicy.version,
  mode: basePolicy.mode,
  domains: basePolicy.domains,
  rules: {
    allow: basePolicy.rules.allow.map(r => ({
      ...r,
      originPolicyId: 'base-architecture',
      originRuleId: r.id,
      compositionDepth: 0,
      originPolicyChain: ['base-architecture'],
      mergeAuthority: 'local' as const
    })),
    forbid: basePolicy.rules.forbid.map(r => ({
      ...r,
      originPolicyId: 'base-architecture',
      originRuleId: r.id,
      compositionDepth: 0,
      originPolicyChain: ['base-architecture'],
      mergeAuthority: 'local' as const
    }))
  },
  effectiveHash: '...' // computed via canonical hash
};

// 4. Evaluate
const resultUnsigned = evaluatePolicy(
  topology.edges, composedUnsigned,
  'signed-policy-pack', composedUnsigned.effectiveHash
);

console.log('Unsigned — violations:', resultUnsigned.violations.length); // => 1
console.log('Unsigned — severity:', resultUnsigned.violations[0].severity); // => 'warning'
```

### Path B — Signed Overlay (Acceptance)

```typescript
// 1. Authority resolution for signed overlay
// overlaySignature is valid ed25519 envelope
// → signatureVerificationMode: 'verified'
// → trustAccepted: true
// → authorityTier elevated to TRUSTED_POLICY_PACK (3) by seam grant
// Result: overlay rules compose into final policy

// 2. Compose WITH overlay (accepted)
const composedSigned: ComposedPolicy = {
  version: basePolicy.version,
  mode: basePolicy.mode,
  domains: basePolicy.domains,
  rules: {
    allow: basePolicy.rules.allow.map(r => ({
      ...r,
      originPolicyId: 'base-architecture',
      originRuleId: r.id,
      compositionDepth: 0,
      inheritedFromPolicyId: 'base-architecture',
      originPolicyChain: ['base-architecture'],
      mergeAuthority: 'inherited' as const
    })),
    forbid: [
      {
        // Severity escalated: warning → error
        id: 'no-cross-layer-imports',
        from: 'frontend', to: 'infrastructure', severity: 'error',
        originPolicyId: 'registry-partner/security-overlay',
        originRuleId: 'no-cross-layer-imports',
        compositionDepth: 1,
        inheritedFromPolicyId: 'base-architecture',
        originPolicyChain: ['base-architecture', 'registry-partner/security-overlay'],
        mergeAuthority: 'resolved-severity' as const
      },
      {
        // Additive rule from overlay
        id: 'no-reverse-dependencies',
        from: 'infrastructure', to: 'frontend', severity: 'error',
        originPolicyId: 'registry-partner/security-overlay',
        originRuleId: 'no-reverse-dependencies',
        compositionDepth: 1,
        originPolicyChain: ['registry-partner/security-overlay'],
        mergeAuthority: 'additive' as const
      }
    ]
  },
  effectiveHash: '...' // computed via canonical hash
};

// 3. Evaluate
const resultSigned = evaluatePolicy(
  topology.edges, composedSigned,
  'signed-policy-pack', composedSigned.effectiveHash
);

console.log('Signed — violations:', resultSigned.violations.length); // => 2
console.log('Signed — severity:', resultSigned.violations[0].severity); // => 'error'
```

---

## 4. Verifying Expected Output

```typescript
const expected = require('./expected-output.json');

// Unsigned path assertions
console.assert(
  expected.unsignedOverlayPath.authorityResolution.trustAccepted === false,
  'Unsigned overlay must be rejected'
);
console.assert(
  expected.unsignedOverlayPath.signatureVerification.signatureVerificationMode === 'missing',
  'Verification mode must be "missing" for unsigned overlay'
);
console.assert(
  expected.unsignedOverlayPath.evaluationResult.violations === 1,
  'Unsigned path must produce exactly 1 violation'
);
console.assert(
  expected.unsignedOverlayPath.evaluationResult.violationDetails[0].severity === 'warning',
  'Unsigned path must preserve base severity (warning)'
);

// Signed path assertions
console.assert(
  expected.signedOverlayPath.authorityResolution.trustAccepted === true,
  'Signed overlay must be accepted'
);
console.assert(
  expected.signedOverlayPath.signatureVerification.signatureVerificationMode === 'verified',
  'Verification mode must be "verified" for signed overlay'
);
console.assert(
  expected.signedOverlayPath.evaluationResult.violations === 2,
  'Signed path must produce exactly 2 violations'
);
console.assert(
  expected.signedOverlayPath.evaluationResult.violationDetails[0].severity === 'error',
  'Signed path must escalate severity to error'
);
console.assert(
  expected.signedOverlayPath.authorityResolution.authorityTier === 3,
  'Signed path must elevate authority to TRUSTED_POLICY_PACK (3)'
);
```

---

## 5. Signature Envelope Verification

```typescript
// Decode the base64 envelope
const envelopeB64 = require('./policy-overlay-signed.json')
  ._overlayTransport.overlaySignature;
const decoded = JSON.parse(
  Buffer.from(envelopeB64, 'base64').toString('utf-8')
);

console.assert(decoded.algorithm === 'ed25519', 'Algorithm must be ed25519');
console.assert(decoded.keyId === 'partner-signing-key-001', 'Key ID must match');
console.assert(
  decoded.signedPayloadDigest ===
    '454011e613201dd89c80bb6e237bf0af38de5f9e92856bb030a9378c4a8b4815',
  'Payload digest must match canonical computation'
);
```

---

## 6. Verification Checklist

- [ ] **Unsigned overlay rejected**: `trustAccepted === false`
- [ ] **Rejection reason**: `"Signature missing for signed-tier claim"`
- [ ] **Verification mode**: `"missing"` for unsigned, `"verified"` for signed
- [ ] **Authority tier elevation**: unsigned stays at 2, signed reaches 3
- [ ] **Violation count**: 1 (unsigned) vs 2 (signed)
- [ ] **Severity**: `warning` (unsigned, base only) vs `error` (signed, escalated)
- [ ] **mergeAuthority**: `local` (unsigned) vs `resolved-severity` + `additive` (signed)
- [ ] **Envelope decodes**: base64 → valid JSON with all required fields
- [ ] **Payload digest stable**: matches `SHA-256(stableCanonicalStringify({...}))`
- [ ] **Signature fields excluded from closure hash**: verified by engine design

---

## 7. Failure Conditions

| Symptom | Likely Cause |
|---------|--------------|
| Unsigned overlay accepted | Signature gate disabled or bypassed |
| Signed overlay rejected | Trust store missing `registry-partner` entry |
| Same violations in both paths | Authority resolution not gating composition |
| `authorityTier` same (both 2) | Seam grant not applied after signature verification |
| `signatureVerificationMode` is `"bypass"` | `ALLOW_LEGACY_SIGNATURES` accidentally enabled |
| Envelope base64 fails to decode | Encoding corruption or line wrapping |
| Payload digest mismatch | `stableCanonicalStringify` or payload composition changed |
| Signature fields in closure hash | Fingerprint identity exclusion list regression |

**Any of these differences should be treated as a regression and investigated
before release.**
