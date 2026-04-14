# Examples

Executable examples demonstrating `@arch-engine/core` capabilities.

Each example is a self-contained directory with its own policy, topology,
expected output, and documentation. Examples are designed to be:

- **Deterministic** — identical inputs always produce identical outputs
- **Self-verifying** — expected output snapshots enable automated replay verification
- **Standalone** — no external registry or network dependencies required
- **Educational** — each example explains the specific enforcement behavior it demonstrates

---

## Available Examples

### [policy-pack-minimal](./policy-pack-minimal/)

A minimal three-layer architecture policy demonstrating:

| Capability | What It Proves |
|---|---|
| Layer enforcement | `frontend → services → infrastructure` dependency direction |
| Tier precedence | Higher-tier domains cannot import from lower-tier domains |
| Violation detection | Forbidden `frontend → infrastructure` edge detected deterministically |
| policyHash stability | SHA-256 canonical hash is reproducible across environments |
| Snapshot replay | Expected output is byte-stable across runs and Node versions |

**Start here** if you are evaluating `@arch-engine/core` for the first time.

See [policy-pack-minimal/run-example.md](./policy-pack-minimal/run-example.md) for a
step-by-step execution walkthrough.

### [multi-policy-composition](./multi-policy-composition/)

Two independently meaningful policies — a base architecture ruleset and a
data-isolation overlay — composed into a single deterministic result.

| Capability | What It Proves |
|---|---|
| Severity escalation | Base `warning` escalated to `error` by overlay via strict resolution |
| Additive rule injection | Overlay adds `no-reverse-dependencies`, absent from base |
| Provenance chains | `originPolicyChain` traces each rule through the composition stack |
| Domain inheritance | Base domains flow through unchanged when overlay omits them |
| Composition hash stability | `policyHash` is deterministic over the composed structure |
| Snapshot replay | Expected output is byte-stable across runs and environments |

**Read this** after policy-pack-minimal to understand how the engine composes
multiple policies rather than evaluating a single one.

### [trusted-fallback](./trusted-fallback/)

A capability federation example demonstrating provider fallback resolution
with mirror equivalence, trust scoring, and deterministic single-candidate
selection.

### [federation-overlay](./federation-overlay/)

Federation-aware overlay execution with mirror fallback routing, demonstrating
that policies from different registries compose deterministically.

| Capability | What It Proves |
|---|---|
| Cross-registry composition | Base from `registry-central` + overlay from `registry-partner` |
| Mirror fallback determinism | Mirror path produces byte-identical evaluation output |
| Trust-tier enforcement | Registry ceiling + per-seam authority grants |
| Closure hash parity | Identical hash regardless of routing path (primary vs mirror) |
| Provenance chains | Registry-qualified `originPolicyChain` traces across registries |
| Seam execution telemetry | `overlaySourceId`, `authorityTier`, `mirrorFallbackUsed` recorded |

**Read this** after multi-policy-composition to understand how the engine
federates across registry boundaries with governed fallback routing.

### [signed-policy-pack](./signed-policy-pack/)

Signature-backed overlay authority enforcement demonstrating that cryptographic
authenticity gates policy composition.

| Capability | What It Proves |
|---|---|
| Unsigned overlay rejection | Missing signature blocks authority at `SIGNED_EXTERNAL_PACK` tier |
| Signed overlay acceptance | Valid `ed25519` envelope passes verification and enables composition |
| Authority-tier elevation | Signature verification unlocks seam grant elevation to `TRUSTED_POLICY_PACK` |
| Signature envelope structure | Base64-encoded JSON with `algorithm`, `keyId`, `signature`, `signedPayloadDigest` |
| Transport exclusion from closure hash | Signature metadata does not enter closure graph fingerprint |

**Read this** after federation-overlay to understand how cryptographic
signatures gate overlay execution authority.

### [snapshot-replay-certification](./snapshot-replay-certification/)

Deterministic execution replay certification demonstrating that closure graph hash
reproduction guarantees semantic execution identity portability.

| Capability | What It Proves |
|---|---|
| Execution snapshot portability | Captured evaluation output can be re-run and verified across environments |
| Closure graph hash reproducibility | Immutable exact parity of cryptographic structural execution hashes |
| Transport invariant mapping | Replicated structures reject non-semantic context markers (timestamps, registry URIs) |
| Authority tier preservation | Trust boundary allocations persist effectively into deterministic traces |

**Read this** after signed-policy-pack to understand how structural hashing guarantees 
safety across asynchronous CI boundary evaluations.

---

## Adding New Examples

Each example directory should contain:

| File | Purpose |
|---|---|
| `README.md` | High-level overview and architecture context |
| `manifest.json` | Pack metadata and schema authority references |
| `policy.yml` or equivalent | Policy definition |
| `topology.json` or equivalent | Input graph / provider descriptors |
| `expected-output.snapshot.json` | Byte-stable expected output for replay verification |
| `run-example.md` | Step-by-step execution walkthrough |

Expected output snapshots must contain **no timestamps, filesystem paths,
or environment-dependent values**.
