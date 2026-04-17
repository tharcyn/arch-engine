# Adapter Execution Outcome Contract

The `AdapterExecutionOutcome` is a globally standardized lifecycle signal emitted by all Arch-Engine provider adapters. It serves as the single authoritative classification of an execution attempt.

## Normalized Values

The contract is strictly limited to four outcomes:

- `dry-run`: The adapter operated in non-mutating preview mode. No downstream network calls were executed to modify provider state.
- `refused`: The adapter deliberately halted execution due to unmet requirements (e.g., repository context mismatch, missing schemas, or lack of credentials).
- `pr-created`: The adapter successfully executed the plan and originated a new Pull Request / Merge Request in the provider system.
- `pr-reused`: The adapter successfully pushed changes to an existing branch that already had an active Pull Request / Merge Request open, preventing a duplicate from being created.

## Why Normalized Lifecycle Signals Exist

Automation systems (like GitHub Actions, GitLab CI, or bot orchestrators) need to interpret the result of an adapter's execution run. Relying on disparate combinations of nested booleans (`pullRequestCreated=false` combined with `existingPullRequestDetected=true`) places an unreasonable interpretation burden on downstream tooling. 

By unifying all outcomes into the `AdapterExecutionOutcome` enum, CI pipelines can immediately switch/case on a single value to determine whether they should block a pipeline, print a URL, or log a warning.

## Cross-Provider Invariant

This vocabulary is a cross-provider contract. Future providers (such as GitLab or Bitbucket) MUST use this exact enum. Adapters must **never** introduce new lifecycle vocabulary or provider-specific variants to this signal. The simplicity and rigidity of this contract ensure that any orchestrator tooling built around Arch-Engine will work cleanly with any provider adapter out of the box.
