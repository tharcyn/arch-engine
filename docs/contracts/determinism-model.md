# Determinism Model

This document explains how Arch-Engine mathematically preserves deterministic mutation intent end-to-end: across evaluation, artifact construction, export sealing, execution planning, and adapter execution telemetry.

## What Determinism Means In Arch-Engine

Determinism in Arch-Engine asserts that identical inputs must yield identical architectural outcomes without side effects.

- **Deterministic evaluation**: Given identical files and policy rules, the engine will always generate identical invariant violation suggestions.
- **Deterministic artifact generation**: Identical suggestions generate an identical patch representation.
- **Deterministic export surfaces**: Identical artifacts always yield identical integrity hashes, regardless of execution time or local machine path.
- **Deterministic execution plans**: Identical payloads will always derive identical provider operations (like calculating the exact same target branch name).
- **Deterministic adapter outcomes**: The resulting execution footprint enforces a rigid lifecycle enum, abstracting away any noisy provider API fluctuations.

## Why Determinism Matters

Determinism is the foundational requirement for scalable automation. It enables:

- **CI reproducibility**: An architectural failure on a developer's laptop is perfectly reproducible in the CI pipeline.
- **Parallel pipeline safety**: Multiple pipeline runs can evaluate policies concurrently without spawning race conditions or duplicated infrastructure state.
- **Artifact replay protection**: Prevents executing an orphaned payload against a mismatched repository environment.
- **Mutation correctness guarantees**: Operators can trust that what was previewed is mathematically identical to what is executed upstream.

## Evaluation Determinism

Evaluation relies on binding the context perfectly:

- **Topology dataset identity binding**: Ties the result perfectly to the specific graph extraction state.
- **Policy pack compatibility binding**: Locks the evaluation to exact policy schema versions and pack signatures.
- **Violation fingerprint stability**: Creates unique structural signatures for every detected drift, immune to file ordering changes.

## Policy Patch Artifact Determinism

To ensure the patch artifact remains immutable after evaluation, the engine leverages specific cryptographic checkpoints:

- `evaluationContextFingerprint`: Summarizes the entire state of the evaluation environment.
- `policyFileFingerprint`: Captures the hash of the policy file that spawned the mutation, ensuring the codebase hasn't drifted between evaluation and execution.
- `exportArtifactIntegrityHash`: Seals the entire payload for secure transport.

## Export Artifact Determinism

The `exportArtifactIntegrityHash` guarantees transport integrity by adhering to strict canonical hashing rules:

- **Sorted keys**: Ensures JSON property ordering cannot artificially alter the hash.
- **Semantic fields only**: Only structural mutation logic contributes to the hash.
- **Environment excluded**: Local filesystem paths or OS variations are stripped.
- **Presentation excluded**: Console coloring, terminal formatting, and UI metadata are ignored.
- **Timestamps excluded**: Execution chronologies are dropped, proving time independence.

## Repository Identity Canonicalization Determinism

Identities are often sourced heuristically and messily. The adapter layer strictly canonicalizes identities before performing matching logic:

- **org/repo normalization**: Collapses varied structures into a clean logical `owner/repo` identifier.
- **Host prefix stripping**: Drops `github.com/` or `gitlab.com/`.
- **Git transport normalization**: Reconciles SSH `git@...` and HTTP `https://...` prefixes into identical logical formats.

## Execution Plan Determinism

Execution plans translate the artifact into provider commands perfectly predictably.

- **Branch naming invariant**: Enforces `arch-engine/policy-update/<targetProfile>/<shortIntegrityHash>`.
- **Shared integrity suffix derivation**: Relies on `@arch-engine/adapter-shared` to deterministically slice the suffix out of the sealed payload, meaning branch calculations are mathematically identical across GitLab, GitHub, or any other provider.
- **Schema version binding**: Guarantees the plan formulation relies on a statically known schema, eliminating runtime parsing ambiguity.

## Execution Boundary Determinism

The system cleanly bifurcates offline predictability from online variability:

- **Offline evaluation phase deterministic**: Graph parsing, policy resolving, artifact creating, hashing, and branch derivation require zero network requests. This allows perfectly repeatable diagnostic runs.
- **Adapter execution phase provider-bound**: Once the plan translates to `execute`, it crosses into the provider boundary where network-level nondeterminism is managed.

## Adapter Outcome Determinism

To shield CI pipelines from API-level variance, the telemetry return path imposes the `AdapterExecutionOutcome` lifecycle guarantees:

- `dry-run`
- `refused`
- `pr-created`
- `pr-reused`

This collapses complex execution paths (like API timeouts or rate limit backoffs managed via Octokit retries) back into an unfluctuating, deterministic operational outcome.

## Determinism vs Provider Mutation Reality

While Arch-Engine's core remains perfectly deterministic, provider APIs inherently introduce nondeterminism (e.g., rate limits, network faults, manual UI interventions, and upstream git conflicts). 

Adapters act as the buffer layer: they interface with the unpredictable mutation reality of the provider but forcefully normalize the resulting telemetry, ensuring that despite the chaos of HTTP networks, the final CI pipeline consumption remains perfectly deterministic.
