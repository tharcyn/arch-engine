# Federation CLI Contract

This document formalizes the automation interface guarantees for the Arch-Engine Federation CLI. The federation CLI acts as a machine-readable governance automation surface that CI/CD pipelines, policy orchestrators, and trust frameworks can rely upon.

## 1. Automation Safety & Determinism

The Federation CLI guarantees the following automation invariants:
- **Zero Console Formatting in JSON Mode**: When invoked with `--json`, no ANSI characters, whitespace banners, or extraneous text will be printed to `stdout`.
- **Key and Array Ordering**: Output JSON properties and arrays are deterministically sorted. Subsequent executions with identical inputs produce bit-for-bit identical JSON blobs.
- **Backwards Compatibility**: New schema fields may be added over time, but existing fields, their type contracts, and hierarchical nesting will not be mutated or removed.

## 2. Exit Code Semantics

The CLI guarantees the following deterministic exit codes for federation execution:

| Code | Status | Description |
|------|--------|-------------|
| `0` | Success | The operation succeeded. Capability intersection passes and topology merged cleanly. |
| `1` | Evaluation Failure | Normal evaluation execution failed (e.g. policy violations found). |
| `2` | Identity Collision | Unresolvable identity collision between providers detected. |
| `3` | Capability Deficit | The capability intersection is insufficient to evaluate required policy packs. |
| `4` | Ingestion Failure | Dataset ingestion, formatting, or parsing failed. |
| `5` | Provider Unavailable | One or more requested provider adapters failed to load or were missing. |
| `6` | Schema Incompatibility | Schema incompatibilities detected during provider merge. |

## 3. Schema Invariants

All JSON responses are structurally protected by snapshot tests.

### `FederationInspectResultJSON`
Guarantees exposure of:
- `topologyStats`: `{ mergedNodeCount, mergedEdgeCount }`
- `capabilityIntersection`, `capabilityUnion`, `missingCapabilities`, `requiredCapabilities`
- `identityCollisionSummary`: Complete array of unresolvable collisions detailing `collisionType` and `collisionProviders`.
- `federationExecutionHash`: Contract-stable execution context identifier.

### `FederationExplainResultJSON`
Guarantees exposure of:
- `findings`: Array of deduplicated findings, retaining `providerProvenance` and `datasetProvenance` arrays.
- `ruleExecutionEligibilityMatrix`: Maps which capabilities constrained which rules.
- `providerContributionSummary` & `datasetContributionSummary`: Aggregates the volumetric contribution of each identity source.

### `FederationDoctorResultJSON`
Guarantees exposure of:
- Internal pipeline status checks (`ingestionRouterStatus`, `capabilityMatrixStatus`, `identityResolutionStatus`, `provenanceMergeStatus`, `federationCompatibilityStatus`).

## 4. Integration Expectations

Any downstream system orchestrating Arch-Engine (e.g., GitHub Actions, GitLab CI pipelines) must:
1. Always utilize the `--json` flag when parsing output.
2. Check the exit code *before* attempting to parse `stdout` (as `stderr` might contain fatal Node.js panics).
3. Recognize the distinction between an evaluation failure (`exit 1`) and a federation merge failure (`exit 2`, `exit 3`).

*The Federation CLI is officially certified as a stable governance automation surface.*
