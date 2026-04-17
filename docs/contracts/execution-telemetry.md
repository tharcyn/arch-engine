# Execution Telemetry Contract

This document defines the canonical structure of `AdapterExecutionResultBase`. It formalizes the telemetry contract that all Arch-Engine provider adapters must satisfy when reporting execution outcomes.

## 1. Purpose of Execution Telemetry

Execution telemetry converts the inherent non-determinism of remote provider API mutations (e.g., network calls to GitHub or GitLab) into a structured, highly predictable lifecycle outcome. Telemetry provides the exact data interface necessary for downstream CI orchestrators and automated bots to understand what an adapter attempted and what actually occurred.

## 2. Why Telemetry Stability is Protocol-Critical

Bots and CI pipelines branch their logic based on telemetry values. If adapters unexpectedly omit a field, alter nullability rules, or emit a different structural shape, downstream automation scripts (like `jq` parsers) will silently fail or misinterpret the execution state. Stable telemetry acts as the strict contract boundary between provider-specific logic and platform automation.

## 3. Telemetry Contract Scope

This contract governs the shape, presence, nullability, and allowed values of properties within the `AdapterExecutionResultBase` object. It strictly applies to:
* Execution plan dry-runs
* Live provider mutations
* Structured refusal states
* CLI JSON execution output

## 4. Field Presence Guarantees

The following fields **MUST always exist** in any execution telemetry result:
* `executionMode`
* `executionPerformed`
* `branchName`
* `repositoryContextVerified`
* `repositoryIdentityAdvisory`
* `adapterOutcome`

They **MUST NOT**:
* Be omitted from the JSON output.
* Be renamed.
* Be replaced by provider-specific equivalents.
* Be conditionally excluded (even during early refusal exits).

## 5. Field Nullability Guarantees

Arch-Engine telemetry explicitly rejects `null`. 

Optional fields **MUST** follow: `undefined` when absent. 

They **MUST NOT** be:
* `null`
* `false` (when meant to be absent)
* An empty object `{}`
* An empty string `""` (except where an empty string is a valid, semantically meaningful identifier)

Adapters MUST NOT introduce alternate representations for absent optional fields.

## 6. Provider Extension Boundaries

Provider adapters may extend the telemetry payload with provider-specific context identifiers. Allowed optional provider fields include:

* `pullRequestNumber` (GitHub)
* `pullRequestUrl` (GitHub)
* `mergeRequestIid` (GitLab)
* `mergeRequestUrl` (GitLab)
* `commitSha`
* `existingPullRequestNumber`
* `existingPullRequestUrl`

**Extension Rules:**
* Provider extensions MUST be strictly additive.
* They MUST NOT conflict with or replace the core `AdapterExecutionResultBase` fields.
* When absent, they must strictly follow the nullability guarantee (`undefined`, never `null`).

## 7. Cross-Provider Structural Parity Requirements

The GitHub adapter, GitLab adapter, and any future adapters **MUST produce an identical `AdapterExecutionResultBase` structure for identical semantic outcomes.**

While provider-specific identifiers (e.g., `pullRequestNumber` vs. `mergeRequestIid`) may differ, the structural presence of the core required fields MUST NOT differ under any circumstance.

## 8. CLI JSON Output Expectations

When an adapter is invoked via CLI with the JSON output flag:
* `arch-engine github create-policy-pr --json-output-plan`
* `arch-engine gitlab create-policy-mr --json-output-plan`

The resulting stdout payload **MUST** output telemetry fully compatible with `AdapterExecutionResultBase`. This ensures pipeline-safe parsing, bot-safe orchestration, and perfectly stable `jq` filtering semantics.

## 9. Replay Corpus Enforcement Relationship

The telemetry grammar is actively enforced by the `@arch-engine/adapter-conformance` automated replay corpus. The corpus actively asserts byte-stable telemetry structures across releases, validating:
* Field presence invariants
* Nullability invariants
* `adapterOutcome` structural variants
* `executionMode` consistency

The replay corpus must detect structural drift immediately and fail the adapter build.

## 10. Protocol Versioning Rules

Execution telemetry structure is permanently frozen as part of **Adapter Protocol v1**.

Therefore:
* Field presence changes require a protocol version review.
* Field nullability changes require a protocol version review.
* Core field removal requires an explicit protocol version bump (e.g., to Protocol v2).

## Grammar Specifications

### executionMode

`executionMode` MUST be strictly limited to:
* `"dry-run"`
* `"execute"`

Adapters MUST NOT introduce custom modes such as `"preview"`, `"plan"`, `"simulate"`, or `"mutation"`.

### executionPerformed

`executionPerformed` semantics:
* MUST be `false` when `executionMode = "dry-run"`.
* MUST be `true` ONLY when a provider mutation is actively attempted.

Adapters MUST NOT:
* Infer `executionPerformed` merely from provider success.
* Tie `executionPerformed` exclusively to PR creation outcomes (e.g., it may be `true` even if PR creation failed, provided the mutation was attempted).

### adapterOutcome

`adapterOutcome` MUST always exist and is restricted to the following lifecycle variants:
* `dry-run`
* `refused`
* `pr-created`
* `pr-reused`

Adapters MUST NOT emit provider-specific lifecycle variants (e.g., `mr-created`, `merge-request-created`).

### refusalReason

`refusalReason` MUST be:
* `string | undefined`

It MUST NOT be:
* `null`
* `number`
* `object`
* `array`

This aligns precisely with the formal [Refusal Reasons](refusal-reasons.md) vocabulary freeze.

### Repository Verification Telemetry

The repository verification fields:
* `repositoryContextVerified`
* `repositoryIdentityAdvisory`

MUST always exist. These fields MUST NOT be omitted even during early-exit paths such as:
* Dry-run executions
* Schema compatibility refusals
* Provider token refusals
* Repository mismatch refusals

Telemetry structure must remain structurally complete across all possible adapter exit paths.
