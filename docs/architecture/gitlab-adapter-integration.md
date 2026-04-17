# GitLab Adapter Integration Architecture

## Overview
The GitLab adapter (`@arch-engine/adapter-gitlab`) serves as the first fully-conformant alternative provider implementation for Arch-Engine's Adapter Protocol v1. It implements the shared `AdapterConformanceTestCase` interface and successfully proves the protocol's multi-provider and federation-safe capabilities natively. 

## Protocol v1 Mapping
GitLab maps seamlessly into Adapter Protocol v1 abstractions:
- **Planning Surface**: `buildGitlabMergeRequestPlan` accepts the standard `FederationEvaluationPolicyPullRequestPayload` and maps it directly to a `GitlabMergeRequestExecutionPlan`.
- **Execution Surface**: `executeGitlabMergeRequestPlan` accepts the mapped plan, invokes the `@gitbeaker/rest` API, and outputs a canonical `GitlabMergeRequestExecutionResult`.
- **Outcome Normalization**: All results are mapped directly back to the strict `AdapterExecutionResultBase` surface, completely abstracting provider quirks. 

## Provider-Specific Normalization
Internal differences are strictly normalized inside the adapter boundaries:
1. **Terminology Abstraction**: GitLab's "Merge Requests" are seamlessly abstracted. The shared adapter pipeline sees them universally as abstract pull-request execution variants.
2. **Repository Identity (Hint) Normalization**: `parseGitlabRepositoryHint` elegantly resolves complex namespace configurations (e.g. `group/subgroup/project`) mapping them into stable, strictly partitioned `repositoryNamespace` and `repositoryName` equivalents. 
3. **Execution Payload Handling**: GitBeaker API idiosyncrasies and nested project identities do not leak outside of the adapter module execution block.

## Shared Invariants (GitHub vs GitLab)
The GitLab adapter rigidly respects all architectural invariants proven by the GitHub adapter:
- **Fail-Closed Verification**: Strong repository mismatch returns `REPOSITORY_IDENTITY_MISMATCH` exclusively. Both environments strictly enforce advisory matching boundaries for dry-run overrides.
- **Determinism**: Identical evaluation payloads generate structurally equivalent branches, commit identifiers, and adapter outcomes regardless of the Git provider.
- **Structural Identity Safety**: All generated branches and commit metadata map canonically, ensuring deterministic identity hashes.

## Conformance Harness Validation
Cross-provider safety is proven via the central `@arch-engine/adapter-conformance` package. The GitLab adapter passes all `30` invariant checks natively. This guarantees that:
- GitLab correctly implements identity matching boundaries.
- GitLab correctly supports dry-run without performing structural mutations.
- Execution telemetry shape exactly mirrors GitHub constraints, avoiding any silent string coercion or optional-chaining structural bugs.

## Importance for Future Providers
By successfully implementing GitLab via strict conformance testing rather than ad hoc assertions, Arch-Engine has practically proven that **the Adapter Protocol v1 is truly provider-neutral**. The seam isolates all external logic, confirming that future expansion to Bitbucket or Azure DevOps requires solely mapping internal abstractions to the shared `AdapterExecutionResultBase` type and adhering to the `runAdapterConformanceSuite()`.
