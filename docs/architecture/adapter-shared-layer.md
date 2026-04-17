# Shared Adapter Layer

The `packages/adapters/shared` module represents the foundational common denominator across all Arch-Engine provider adapters. It enforces telemetry consistency, naming invariants, and execution taxonomy before any provider-specific code is introduced.

## Why the Shared Layer Exists

Without a shared layer, individual adapters (like GitHub and GitLab) risk drifting in how they report successes, how they format their JSON telemetry strings, or how they enforce branch names. The shared layer prevents "provider divergence" by forcing all adapters to inherit the exact same architectural primitives.

## What Belongs in Shared
Only cross-provider, highly stable contracts and deterministic pure functions belong in the shared layer:

- **`AdapterExecutionOutcome`**: The strict `"dry-run" | "refused" | "pr-created" | "pr-reused"` lifecycle enum.
- **`AdapterExecutionResultBase`**: The base telemetry struct enforcing fields like `executionMode`, `executionPerformed`, and `branchReused`.
- **`buildShortIntegritySuffix`**: The pure function ensuring all adapters slice payload integrity hashes exactly the same way to derive target branch suffixes.

*Design Rule:* The shared layer must remain minimal and exceptionally stable. It should rarely be mutated. 

## What Must Remain Provider-Specific
Anything requiring network calls, provider-specific configuration semantics, or custom API types is expressly banned from the shared layer. 

- **Repository Verification Logic**: Checking `GITHUB_REPOSITORY` vs `CI_PROJECT_PATH` remains localized to the provider adapters since environments physically differ.
- **Provider SDKs**: `Octokit` stays in the GitHub adapter.
- **Provider Execution Context**: Emitting `pullRequestUrl` vs `mergeRequestIid` is handled by extending the `AdapterExecutionResultBase` locally inside the specific provider package.
