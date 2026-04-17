# Adapter Execution Result Telemetry

The execution-result telemetry surface provides machine-readable metadata summarizing exactly what an adapter did during a given execution pass. This prevents downstream CI pipelines from needing to scrape standard output to infer execution state.

## AdapterExecutionResultBase

The core surface is standardized via the `AdapterExecutionResultBase` interface, which defines the cross-provider telemetry baseline.

### Provider-Neutral Fields

* `adapterOutcome`: The strictly normalized lifecycle classification (e.g., `pr-created`, `refused`).
* `executionMode`: Either `dry-run` or `execute`, reflecting the explicit permission mode of the adapter.
* `executionPerformed`: Boolean true if mutative actions were allowed and carried out.
* `repositoryContextVerified`: Boolean true if the payload's repository hint successfully matched the runtime execution environment.
* `repositoryIdentityAdvisory`: Optional boolean true if the context mismatch was handled gracefully as an advisory warning (allowed in dry-run mode).
* `branchName`: The deterministic string literal used for the target branch (e.g., `arch-engine/policy-update/ci/a1b2c3d`).
* `branchCreated`: Boolean true if a fresh branch was successfully pushed to the provider.
* `branchReused`: Boolean true if an existing branch was successfully updated (typically forced) to accept the new changes.
* `refusalReason`: An optional string constant emitted when `adapterOutcome === 'refused'`, declaring why execution aborted (e.g., `MISSING_GITHUB_TOKEN`).

### Provider-Specific Extensions

Individual adapters (like GitHub or GitLab) inherit from `AdapterExecutionResultBase` and enrich it with platform-specific context. 

For example, the GitHub Adapter extends the base with:
* `pullRequestNumber`
* `pullRequestUrl`
* `commitSha`

These specific artifacts remain isolated to their respective adapter interfaces and are intentionally excluded from the generic base type to avoid forcing irrelevant semantics onto entirely different providers.
