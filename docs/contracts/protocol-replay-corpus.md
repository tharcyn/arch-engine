# Protocol Replay Corpus

This document outlines the purpose, constraints, and lifecycle of the **Adapter Protocol Replay Corpus**, located within `@arch-engine/adapter-conformance`.

## Purpose of the Replay Corpus

The replay corpus exists to guarantee the cross-version stability of **Adapter Protocol v1**. While standard unit tests verify adapter implementation logic, the replay corpus freezes the **observable boundary outputs** (the protocol itself). It provides a deterministic, automated suite of regression tests ensuring that identical `FederationEvaluationPolicyPullRequestPayload` objects yield identical execution paths and telemetry shapes across all providers.

This suite ensures that:

- Core lifecycle normalization mapping never drifts.
- Standard telemetry snapshots (`AdapterExecutionResultBase`) remain structurally consistent.
- Branch naming heuristics remain mathematically sound and immutable.
- Provider-specific adapters interpret standard artifacts symmetrically.
- Execution plan deterministic hashes remain stable across Arch-Engine versions.

## Frozen Invariants

The replay fixtures guarantee stability for the following cross-provider execution constraints:

- **Execution Plans**: Identical payloads always yield the exact same deterministic plan structure (`targetProfile`, `branchName`, `producerIdentity`, etc.).
- **Branch Naming**: The branch naming suffix (`arch-engine/policy-update/.../<hash>`) must be functionally immutable to prevent cross-CI PR duplication.
- **Repository Verification Semantics**: Execution must predictably refuse or warn (advisory) across specific repository context mismatches.
- **Schema Compatibility Enforcement**: Payloads presenting an unsupported schema must always trigger explicit execution refusal (`SCHEMA_MISMATCH` - see [Refusal Reasons](refusal-reasons.md)).
- **Lifecycle Normalization**: Normalization into `dry-run`, `refused`, `pr-created`, and `pr-reused` must never be circumvented by provider-specific implementations.
- **Telemetry Shape**: Execution results must strictly follow the required field presence and nullability guarantees as defined in [Execution Telemetry](execution-telemetry.md).

## Fixture Update Safety Guidance

**CRITICAL RULE: Fixtures change ONLY when the Adapter Protocol version changes.**

Replay fixtures are **not** unit tests; they are protocol contracts encoded as data.

- Do **NOT** update fixtures when an adapter implementation changes internally.
- Do **NOT** update fixtures to "make tests pass" during a refactor.
- Do **NOT** modify the deterministic fields (`exportArtifactIntegrityHash`, `pullRequestPayloadSchemaVersion`) of existing payload fixtures.

If an adapter refactor breaks a replay test, the adapter has violated the protocol. The adapter code must be reverted or fixed.

### How Protocol Version Upgrades Interact with Fixtures

When a new protocol version (e.g., Adapter Protocol v2) is drafted:

1. A new `fixtures/protocol-v2/` directory must be created.
2. The core fixtures must be duplicated and updated to reflect the new version properties.
3. The conformance test suite must be parameterized or extended to optionally validate the v2 boundary.

Until an explicit protocol bump, all v1 fixtures are considered permanently frozen.
