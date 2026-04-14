# Signed Policy Pack

A self-contained example demonstrating signature-backed overlay authority
enforcement in `@arch-engine/core`.

## What This Example Proves

Cryptographic signatures participate in overlay authority resolution. An
unsigned overlay claiming `SIGNED_EXTERNAL_PACK` authority is **rejected**
because its trust claim cannot be verified. The same overlay, with a valid
signature envelope, is **accepted** and its rules compose into the final
evaluation output.

Specifically:

1. **Unsigned overlay rejection** — an overlay from `registry-partner` without a
   signature is rejected at authority resolution with `signatureVerificationMode: "missing"`
2. **Signed overlay acceptance** — the same overlay content with a valid `ed25519`
   signature envelope passes verification and executes at `TRUSTED_POLICY_PACK` (tier 3)
3. **Authority-tier elevation via signature** — signature verification enables
   the seam authority grant to elevate the overlay from `SIGNED_EXTERNAL_PACK` (2)
   to `TRUSTED_POLICY_PACK` (3)
4. **Signature transport exclusion from closure hash** — signature metadata
   (`signatureKeyId`, `signatureAlgorithm`, `signatureTrustRoot`,
   `signedPayloadDigest`) does not enter the closure graph hash input

## Execution Scenario

### Path A — Unsigned Overlay

```
base-architecture (signed, CORE_INTERNAL)
  + security-overlay (UNSIGNED, claims SIGNED_EXTERNAL_PACK)
  → Authority resolution: REJECTED (signature missing)
  → Overlay rules: NOT applied
  → Violations: 1 (base severity only: warning)
```

### Path B — Signed Overlay

```
base-architecture (signed, CORE_INTERNAL)
  + security-overlay (SIGNED ed25519, SIGNED_EXTERNAL_PACK)
  → Authority resolution: ACCEPTED (signature verified)
  → Authority tier: elevated to TRUSTED_POLICY_PACK (3) by seam grant
  → Overlay rules: APPLIED (severity escalation + additive rule)
  → Violations: 2 (error severity, new reverse-dependency rule)
```

## Why Signature Affects Authority Resolution

The engine enforces a trust pipeline with five sequential gates:

```
1. Revocation check       → is the overlay revoked?
2. Namespace ownership    → does the registry own this namespace?
3. Registry authority     → what is the registry's ceiling tier?
4. Signature verification → is the overlay cryptographically signed?
5. Seam authority grant   → does the seam grant elevated authority?
```

Gate 4 is where the unsigned overlay fails. An overlay claiming
`SIGNED_EXTERNAL_PACK` authority must present a valid signature to proceed.
Without one, the authority resolver returns `trustAccepted: false` with
rejection reason: *"Signature missing for signed-tier claim."*

The signed overlay passes gate 4 with `verificationMode: "verified"`, then
gate 5 elevates its effective tier from 2 to 3 via the seam authority grant.

## The Signature Envelope

The signed overlay carries a base64-encoded JSON envelope:

```json
{
  "algorithm": "ed25519",
  "keyId": "partner-signing-key-001",
  "signature": "63mJq/hmcrTDCRwmmnLHrHwRgaBVbeede3dKJ1qSEmk=",
  "signedPayloadDigest": "454011e613201dd89c80bb6e237bf0af38de5f9e92856bb030a9378c4a8b4815"
}
```

The `signedPayloadDigest` is computed from:

```
SHA-256(stableCanonicalStringify({ overlaySourceId, overlayVersion, manifestHash }))
```

It includes the **logical identity** of the overlay but excludes
execution-time metadata (`mergeMode`, `authorityTier`, `stackPosition`).
This ensures the digest is stable across different seam configurations.

## The Two Paths Compared

| Property | Unsigned Path | Signed Path |
|----------|--------------|-------------|
| `signaturePresent` | `false` | `true` |
| `signatureValid` | `false` | `true` |
| `signatureVerificationMode` | `missing` | `verified` |
| `authorityTier` | 2 (SIGNED_EXTERNAL_PACK) | 3 (TRUSTED_POLICY_PACK) |
| `trustAccepted` | `false` | `true` |
| `activationDecision` | `REJECTED` | `EXECUTED` |
| `violations` | 1 (warning) | 2 (error + additive) |
| `mergeAuthority` | `local` only | `resolved-severity` + `additive` |
| `originPolicyChain` | `["base-architecture"]` | `["base-architecture", "registry-partner/security-overlay"]` |

## Why Signature Transport Metadata Does Not Affect Closure Hash

The closure graph fingerprint is computed from:

```
SHA-256(seamId | overlaySourceId | overlayVersion | mergeMode | authorityTier)
```

The following signature transport fields are **excluded**:

| Excluded Field | Reason |
|----------------|--------|
| `signatureKeyId` | Cryptographic key identity — delivery concern |
| `signatureAlgorithm` | Cryptographic algorithm — delivery concern |
| `signatureTrustRoot` | Trust store reference — delivery concern |
| `signatureEnvelopeValid` | Envelope parse state — verification concern |
| `signedPayloadDigest` | Content digest — verification concern |

**Why the closure hashes differ between paths**: The unsigned overlay is
REJECTED (no seam fingerprint emitted), while the signed overlay is EXECUTED
(fingerprint emitted). This means the execution structures are semantically
different — one path executed an overlay, the other did not.

The invariant is: signature **transport** metadata does not enter the hash.
Signature **presence** affects the hash indirectly because it changes the
authority resolution outcome, which changes the execution structure.

> **Formal invariant**: Signature transport metadata (algorithm, keyId,
> trustRoot, payloadDigest) must never participate in closure graph hash
> computation. Signatures affect authority resolution outcomes, and
> authority resolution outcomes affect execution structure, but the
> cryptographic transport layer itself is excluded from semantic identity.

## How to Verify

1. **Unsigned rejection**: Verify `unsignedOverlayPath.authorityResolution.trustAccepted`
   is `false` and `signatureVerification.signatureVerificationMode` is `"missing"`

2. **Signed acceptance**: Verify `signedOverlayPath.authorityResolution.trustAccepted`
   is `true` and `signatureVerification.signatureVerificationMode` is `"verified"`

3. **Authority elevation**: Verify unsigned `authorityTier` is `2` and signed
   `authorityTier` is `3`

4. **Violation difference**: Unsigned path produces 1 violation at `warning`;
   signed path produces 2 violations at `error`

5. **Envelope integrity**: Decode the base64 envelope string and verify
   `signedPayloadDigest` matches `SHA-256(stableCanonicalStringify({...}))`

## What Drift Would Look Like

| Symptom | Likely Cause |
|---------|--------------|
| Unsigned overlay accepted | Signature verification gate bypassed or disabled |
| Signed overlay rejected | Trust store missing registry entry, or envelope parsing changed |
| `authorityTier` unchanged between paths | Seam authority grant not applied after signature verification |
| Same violation count in both paths | Overlay composition not gated on authority resolution |
| Signature fields in closure hash | Fingerprint identity exclusion list regression |
| `signedPayloadDigest` differs | `stableCanonicalStringify` or SHA-256 computation changed |

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Pack metadata and schema authority references |
| `policy-base.json` | Base architecture policy (3 layers, 2 allows, 1 forbid at warning) |
| `policy-overlay-unsigned.json` | Overlay without signature (rejected at authority resolution) |
| `policy-overlay-signed.json` | Overlay with ed25519 signature envelope (accepted) |
| `signature-envelope.json` | Reference envelope structure and digest computation |
| `expected-output.json` | Contrasting unsigned (rejected) vs signed (accepted) outcomes |
| `run-example.md` | Step-by-step execution and verification walkthrough |
| `README.md` | This file |
