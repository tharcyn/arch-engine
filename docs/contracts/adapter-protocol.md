# Adapter Protocol v1 Specification

This document is the authoritative specification describing the required behavior of all provider adapters within Arch-Engine. It defines execution semantics, telemetry guarantees, repository verification requirements, schema compatibility enforcement, branch naming invariants, duplicate PR suppression guarantees, deterministic execution boundaries, CLI interaction expectations, and adapter outcome lifecycle normalization.

## 1. Purpose of Adapter Protocol

Provider adapters exist within Arch-Engine to translate sealed, provider-neutral mutation intents into safe, provider-specific operations (e.g., creating branches, commits, and pull/merge requests on GitHub or GitLab). 

Arch-Engine rigorously separates policy evaluation from provider execution. By the time a policy patch artifact reaches an adapter, the evaluation is fully resolved, deterministic, and immutable. Adapters act as deterministic boundary translators; they do not perform policy logic or topology generation. Instead, they operate strictly downstream of artifact construction, ensuring that the resolved intent is safely and predictably executed on the target environment.

## 2. Protocol Scope

**What Adapter Protocol v1 governs:**
* Execution plan construction (translating payloads into execution instructions)
* Repository identity verification
* Schema compatibility enforcement
* Branch naming invariants
* Duplicate Pull Request (PR) or Merge Request (MR) suppression behavior
* Execution telemetry guarantees
* Lifecycle outcome normalization
* Dry-run safety boundary enforcement

**What the protocol does NOT govern:**
* Provider API availability (e.g., GitHub/GitLab uptime)
* Network reliability
* Provider rate limiting
* Authentication provisioning or token lifecycle management

## 3. Adapter Execution Model

The adapter execution pipeline follows a strict, sequential lifecycle:

1. **`FederationEvaluationPolicyPullRequestPayload`** ingestion
2. **Execution plan construction**
3. **Repository verification**
4. **Optional execution boundary crossing**
5. **Provider mutation** (if executing)
6. **Normalized telemetry return**

**Execution plan construction is deterministic.** Adapters map the sealed payload to a standardized internal instruction set without side effects.
**Provider execution is optional and guarded.** By default, adapters only dry-run unless explicitly instructed to mutate.
**Telemetry restores determinism after provider mutation.** Because network operations and provider states are inherently non-deterministic, adapters convert non-deterministic provider responses into a structured, highly predictable execution result.

## 4. Execution Modes

Provider adapters operate under two primary execution modes:

* **Dry-Run Mode**: 
  * MUST NOT mutate provider state (no branch creation, commit creation, or PR/MR creation).
  * MUST perform complete repository verification.
  * MUST still produce fully-formed execution telemetry indicating what *would* have occurred.
  * **Invariant**: Dry-run is the default execution mode.

* **Execute Mode**: 
  * MAY mutate provider state (e.g., network calls to push commits or open pull requests).
  * MUST perform repository verification prior to any mutation.
  * MUST produce execution telemetry representing the actual lifecycle outcome.

## 5. Repository Identity Verification Contract

Adapters rely on specific repository payload properties (`repositoryHint`, `repositoryHintSource`, and `repositoryIdentityAdvisory`) matched against runtime repository identity signals (e.g., `GITHUB_REPOSITORY` or `CI_PROJECT_PATH`) to protect against cross-repository artifact replay vulnerabilities.

**Enforcement Rules:**
* **Strong identity mismatch**: MUST produce an execution refusal.
* **Weak identity mismatch (dry-run)**: MUST produce an execution advisory during dry-run.
* **Weak identity mismatch (execute mode)**: MUST produce an execution refusal during execute mode.

When refusing execution due to identity mismatch, adapters must yield the canonical refusal reason (see [Refusal Reasons](refusal-reasons.md)):
`repository_identity_mismatch_with_runtime_context`

## 6. Schema Compatibility Enforcement Contract

Execution payloads define their structure via `pullRequestPayloadSchemaVersion`. Adapters MUST validate this version before building execution plans.

**Enforcement Rules:**
* Unsupported schema versions MUST produce a structured execution refusal.
* Adapters MUST NOT silently downgrade schema interpretation.
* Adapters MUST NOT partially execute incompatible payloads.
* Adapters MUST NOT attempt compatibility guessing or heuristic fallback parsing.

In the event of a schema refusal, adapters MUST explicitly return a corresponding `refusalReason` (see [Refusal Reasons](refusal-reasons.md)).

## 7. Branch Naming Determinism Invariant

To ensure collision-free replay safety across CI environments, adapters MUST enforce a deterministic branch naming pattern.

**Required Branch Structure:**
`arch-engine/policy-update/<targetProfile>/<shortIntegrityHash>`

**Invariants:**
* `shortIntegrityHash` MUST derive directly from the payload's `exportArtifactIntegrityHash`.
* Branch naming MUST be completely deterministic.
* Branch naming MUST be provider-neutral.
* Branch naming MUST NOT include timestamps.
* Branch naming MUST NOT include randomness (e.g., UUIDs or nonces).

## 8. Duplicate Pull Request Suppression Contract

Adapters must explicitly prevent the creation of duplicate PR/MR objects for identical payloads. The provider must resolve the state of the target deterministic branch before mutation.

**Behavioral Requirements:**
* **Existing branch + existing PR/MR** → `adapterOutcome = 'pr-reused'`
* **Existing branch + no PR/MR** → `adapterOutcome = 'pr-created'` (Push new commit and open PR)
* **Missing branch** → `adapterOutcome = 'pr-created'`

Adapters MUST NOT create duplicate PR/MR objects for identical payloads.

## 9. Lifecycle Outcome Normalization

Adapters convert specific provider mutation results into standard Arch-Engine lifecycle signals using the `AdapterExecutionOutcome` vocabulary. 

**Allowed Values:**
* `dry-run`
* `refused`
* `pr-created`
* `pr-reused`

Adapters **MUST NOT** introduce provider-specific outcome variants. Forms such as `mr-created`, `merge-request-created`, or `pull-request-created` are strictly prohibited. This ensures the lifecycle vocabulary remains provider-neutral by design and can be universally interpreted by CI pipelines.

## 10. Execution Telemetry Contract

All execution results MUST conform to the `AdapterExecutionResultBase` interface guarantees.

**Required Telemetry MUST include:**
* `executionMode`
* `executionPerformed`
* `branchName`
* `repositoryContextVerified`
* `repositoryIdentityAdvisory`
* `adapterOutcome`

**Provider-Specific Extensions:**
Provider adapters MAY extend telemetry with provider-specific identifiers to ease debugging or direct deep-linking, such as:
* `pullRequestNumber` (GitHub)
* `mergeRequestIid` (GitLab)
* `commitSha`

Provider extensions MUST NOT modify base telemetry semantics. All required fields must act as the primary source of truth for execution evaluation.

## 11. Deterministic Execution Boundary Model

The Arch-Engine adapter execution model contains distinct boundaries of certainty. 

Execution plan construction is entirely deterministic; it processes a sealed artifact payload into intent. However, the subsequent provider mutation layer is non-deterministic (subject to network variance, provider API state, existing repositories, etc.). 

The execution telemetry layer converts this non-deterministic provider uncertainty into structured, deterministic lifecycle outcomes (`adapterOutcome`). This normalization restores a deterministic interpretation layer for CI platforms observing the execution.

## 12. CLI Integration Contract

Provider adapters MUST expose interaction surfaces for CLI orchestration. 

Adapters MUST support execution via:
`arch-engine <provider> create-policy-pr` (or equivalent provider-specific mutation command)

**Adapters MUST support:**
* `stdin` payload input
* File payload input
* `--dry-run` flag
* `--execute` flag
* `--json-output-plan` flag

**Invariant**: The default CLI behavior MUST be dry-run.

## 13. Conformance Harness Enforcement Role

Adapter Protocol v1 compliance is rigorously validated via the centralized `@arch-engine/adapter-conformance` package.

The conformance harness enforces the following invariants:
* Repository verification parity
* Schema compatibility enforcement
* Branch naming determinism
* Duplicate PR/MR suppression
* Telemetry structure compatibility
* Lifecycle outcome normalization

Adapters failing conformance harness validation are **not protocol compliant** and cannot be safely invoked by Arch-Engine CI pipelines.

## 14. Provider Extension Model

Arch-Engine is designed to support future provider adapters (e.g., Bitbucket, Azure DevOps, self-hosted Git providers, or internal enterprise providers).

**Extension Requirements:**
* New adapters MUST extend `AdapterExecutionResultBase`.
* New adapters MUST implement identical repository verification semantics.
* New adapters MUST pass universal conformance harness validation.

## 15. Protocol Versioning Strategy

This document formally defines **Adapter Protocol v1**.

Future protocol versions MAY introduce:
* New standard telemetry fields
* New lifecycle states
* New verification invariants

Protocol version changes MUST remain backward compatible where possible to prevent disruption across legacy adapter integrations.

## 16. Relationship to Other Architecture Contracts

Adapter Protocol v1 sits as the integration boundary between the policy patch artifact construction layer and the specific provider mutation layer.

It natively extends and references the following architecture contracts:
* `determinism-model.md`
* `execution-guarantees.md`
* `adapter-execution-result.md`
* `adapter-execution-outcome.md`
* `execution-telemetry.md`
* `refusal-reasons.md`
* `writing-a-provider-adapter.md`
* `policy-patch-artifact-lifecycle.md`

## 17. Protocol Summary

The core invariants of the Adapter Protocol v1 can be summarized as:

- [x] **Repository verification enforced**: Cross-repository replay vulnerabilities prevented.
- [x] **Schema compatibility enforced**: Strict rejection of incompatible payloads.
- [x] **Branch naming deterministic**: Predictable, immutable collision prevention.
- [x] **Duplicate PR suppression guaranteed**: Idempotent mutation execution.
- [x] **Telemetry normalized**: Consistent shape regardless of underlying provider execution.
- [x] **Lifecycle outcomes standardized**: Strict vocabulary (`dry-run`, `refused`, `pr-created`, `pr-reused`).
- [x] **Dry-run safe by default**: Never mutates without explicit intent.
