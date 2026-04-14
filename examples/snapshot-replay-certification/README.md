# Snapshot Replay Certification

A self-contained example demonstrating deterministic execution replay certification
in `@arch-engine/core`.

## What This Example Proves

Execution snapshot portability and reproducibility. A snapshot generated in one
environment (`snapshot-original.json`) can be structurally re-evaluated against
its explicit inputs in a completely different environment (`snapshot-replay.json`)
and will produce a byte-identical closure graph hash.

Specifically:

1. **Execution snapshot portability** — semantic state travels across boundaries.
2. **Closure graph hash reproducibility** — the exact execution state yields the exact same canonical hash fingerprint.
3. **Authority-tier preservation** — the `TRUSTED_POLICY_PACK` tier survives replay perfectly.
4. **Telemetry invariance** — fields like `mergeAuthority` and `originPolicyChain` do not drift during a replay sequence.
5. **Registry-independent semantic identity preservation** — context changes (e.g., transport variables shown in `_replayContext`) do not break semantic parity.

## Replay Certification Invariant

> **Closure graph hash equality proves semantic execution identity preservation. It does NOT prove transport-layer equivalence.**

Because transport routing (which registry, which mirror, which host, which timestamp)
is excluded from the underlying closure graph hash, a successfully replayed hash
guarantees that the _exact same policy execution logic_ occurred, completely decoupled
from _how_ the files arrived on disk.

## Why Closure Graph Hash Equality Confirms Semantic Identity

The closure graph hash is built deterministically from the specific active execution
elements:

`Hash input: seamId | overlaySourceId | overlayVersion | mergeMode | authorityTier`

When `snapshot-original` maps to `1804245ce0b22a009efb4c1945aeacf0aaae19aa14bc8b5c928494b2beedee14`,
and `snapshot-replay` generates that exact same sequence and authority evaluation,
the output hashes will match exactly. The replay process effectively zeroes out the transport
side-effects and checks exclusively if the mathematical graph shape is unbroken.

## Why Replay Certification Enables Safety Workflows

| Capability                            | How Replay Determinism Enables It                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Offline Validation**                | You can prove a deployment's policy state on air-gapped infrastructure because semantic hashes do not require active registry communication.                  |
| **Multi-Repo Federation Safety**      | Different teams in different CI pipelines can compute the expected evaluation result for their shared overlays independently and trust it matches production. |
| **Registry-Independent Verification** | Shifting a policy registry from central to mirror does not invalidate the existing CI security snapshot.                                                      |
| **CI Drift Detection Workflows**      | Tooling can immediately detect if new environment variables or engine upgrades break backwards compatibility.                                                 |

## Files

| File                     | Purpose                                                      |
| ------------------------ | ------------------------------------------------------------ |
| `manifest.json`          | Pack metadata                                                |
| `policy-base.json`       | Base policy defining the architecture                        |
| `policy-overlay.json`    | Security overlay asserting authority                         |
| `snapshot-original.json` | Serialized explicit execution state generated originally     |
| `snapshot-replay.json`   | Captured execution state in secondary runtime/mirror context |
| `expected-output.json`   | Demonstration of parity checking structure across closures   |
| `run-example.md`         | Instruction guide for checking parity deterministically      |
| `README.md`              | This file                                                    |
