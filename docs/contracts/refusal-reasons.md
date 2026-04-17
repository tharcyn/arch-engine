# Refusal Reason Contract

This document defines the canonical `refusalReason` vocabulary allowed under **Adapter Protocol v1**. 

## What Are Refusal Reasons?
A refusal reason is a machine-consumable string that explains why a provider adapter rejected a `FederationEvaluationPolicyPullRequestPayload` and emitted an `adapterOutcome` of `"refused"`. See [Execution Telemetry](execution-telemetry.md) for structural guarantees regarding this field.

## Why Refusal Reasons Are Protocol-Level Contract Fields
`refusalReason` strings are structural bounds of the Arch-Engine protocol. 
* **Stability:** CI pipelines, bots, and JSON consumers branch on these values to trigger auto-remediation, alert humans, or halt workflows.
* **Symmetry:** Adapters must not invent unique names for standard failures (e.g., `SCHEMA_MISMATCH` vs `unsupported_schema`).
* **Replayability:** The automated protocol replay corpus guarantees that byte-for-byte identical failure payloads yield exact string equality across multiple provider adapters (GitHub, GitLab, etc.).

## Canonical Refusal Reason Vocabulary

Refusal reasons are strictly classified into two categories: **Protocol-Level** and **Provider-Specific**.

### Protocol-Level Refusal Reasons

These failure classes are intrinsic to the Arch-Engine evaluation boundary. Adapters must map identical failure shapes to these exact strings:

#### Schema Compatibility
* `SCHEMA_MISMATCH`: The payload's `pullRequestPayloadSchemaVersion` is unsupported by the adapter.
* `MISSING_EXPORT_SCHEMA_VERSION`: The payload lacks a required structural schema definition.

#### Integrity / Branch Derivation
* `missing_integrity_hash_for_branch_suffix`: The payload is missing the critical cryptographic hash needed to prevent duplicate branch collisions.
* `MISSING_PRODUCER_IDENTITY`: The identity of the producing engine is missing.

#### Repository Verification
* `repository_identity_mismatch_with_runtime_context`: The `repositoryHint` within the payload failed to match the authoritative CI runtime environment variable (e.g., `GITHUB_REPOSITORY` or `CI_PROJECT_PATH`) during a live execution.
* `MISSING_REPOSITORY_HINT`: No repository target was provided.
* `MALFORMED_REPOSITORY_HINT`: The repository target string was malformed and unparseable.

### Provider-Specific Refusal Reasons

Provider-specific conditions are permitted *only* when the failure is intrinsically coupled to the external provider's unique platform constraints (e.g., authentication, API connectivity). 

**Adapters must never create provider-specific variants for protocol-wide failure classes.**

Examples of permitted provider-specific strings:
* `MISSING_GITHUB_TOKEN`
* `MISSING_GITLAB_TOKEN`
* `OCTOKIT_EXECUTION_FAILED`
* `COMMIT_CREATION_FAILED`
* `MERGE_REQUEST_CREATION_FAILED`
* `MISSING_FILE_ON_DISK`

## Versioning Rule
**Refusal reason vocabulary is permanently frozen as part of Adapter Protocol v1.**

Any addition, removal, or renaming of a protocol-level refusal reason constitutes a breaking change. These strings may only be mutated during an explicit bump to Adapter Protocol v2. Provider adapters attempting to deviate from this vocabulary will be rejected by the `@arch-engine/adapter-conformance` replay corpus.
