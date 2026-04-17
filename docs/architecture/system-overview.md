# System Overview

Arch-Engine is a deterministic architecture reasoning and execution substrate. It does not exist merely to parse rules or run scripts; it exists to construct a mathematically verifiable truth about a codebase's topology, derive intent for how that topology must evolve to meet policy invariants, and execute that mutation intent predictably across disparate physical environments.

## What Arch-Engine Is

Arch-Engine fundamentally:
1. **Evaluates architecture structure** without executing source code.
2. **Detects invariant drift** using modular governance policy packs.
3. **Generates policy patch artifacts** to programmatically resolve drift.
4. **Exports deterministic execution payloads** that securely encapsulate mutation intent.
5. **Delegates mutation through provider adapters** to translate intent into platform-specific reality (e.g., Pull Requests).

The conceptual pipeline operates sequentially:

```text
topology dataset
  → capability negotiation
      → invariant evaluation
          → suggestion surface
              → patch artifact
                  → export artifact
                      → execution plan
                          → provider adapter
                              → execution telemetry
```

## System Layering Model

The architecture relies on strict boundaries to separate immutable topology derivation from mutative side-effects.

* **Topology Layer**: Responsible for extracting a deterministic, environment-agnostic dependency graph (the dataset) from physical workspaces.
* **Policy Evaluation Layer**: Ingests the topology and subjects it to capability-negotiated invariant checks via registered policy packs.
* **Suggestion Surface Layer**: Derives logical resolutions for any identified invariant drift.
* **Patch Artifact Layer**: Formalizes the suggestion surface into a structural mutation contract.
* **Export Surface Layer**: Seals the patch artifact with cryptographic integrity hashes, schema versions, and producer identities into a portable JSON payload.
* **Execution Plan Layer**: The initial adapter boundary where provider-neutral payloads are translated into logical execution plans (e.g., target branches, repository contexts) without making network calls.
* **Adapter Layer**: The generalized interface defining repository verification, dry-run safety semantics, and cross-provider invariants.
* **Provider Execution Layer**: The physical execution boundary (e.g., the GitHub Adapter's Octokit integration) responsible for instantiating branch and PR/MR mutations safely.
* **Execution Telemetry Layer**: A structured return envelope enforcing the `adapterOutcome` lifecycle contract to make upstream orchestrators aware of precisely what occurred.

## Deterministic Execution Boundary Model

Arch-Engine isolates execution into strict phases to protect determinism.

* **Offline Evaluation Phase**: Deriving topology, evaluating policies, and building suggestions requires zero network connectivity. Given the same files and rules, the output is mathematically identical.
* **Artifact Construction Phase**: Assembling the patch artifact binds the state cryptographically. 
* **Export Sealing Phase**: Emitting the export artifact locks the artifact's identity. From this moment, the payload is fully deterministic and portable.
* **Adapter Execution Boundary**: Adapters ingest the sealed payload. They calculate branch names and verify repository context locally, retaining offline determinism.
* **Provider Mutation Boundary**: The *only* point where nondeterminism is permitted. The system communicates over HTTP APIs to origin servers (e.g., GitHub), navigating rate limits, concurrent merges, or network timeouts.

## Provider Adapter Substrate Model

Arch-Engine delegates mutation to provider adapters rather than mutating APIs directly from the core.

* **Why Adapters Exist**: Isolates fragile network operations and provider-specific schemas away from the deterministic policy core.
* **Why Execution is Delegated**: Allows the engine to be run locally in purely diagnostic modes, or safely piped into orchestrators.
* **Why Payloads are Provider-Neutral**: Ensures the engine does not care if the target is GitHub, GitLab, or Bitbucket.
* **Why Adapters Must Verify Repository Identity**: Prevents a valid payload from being accidentally or maliciously applied to the wrong repository fork or organizational mirror.
* **Why Adapters Return Normalized Lifecycle Outcomes**: Eliminates inference logic. Through the `adapterOutcome` signal (`dry-run`, `refused`, `pr-created`, `pr-reused`), CI pipelines can understand the operation outcome synchronously without parsing boolean combinations.

## Trust Model Summary

Trust in Arch-Engine is established through explicit bindings rather than assumed environment correctness.

* **Schema Version Enforcement**: Ensures structural compatibility between the payload generator and the execution adapter.
* **Producer Identity Binding**: Guarantees traceability of the engine version that authored the mutation.
* **Export Artifact Integrity Hashing**: Cryptographically seals the semantic mutation intent, making tampering mathematically obvious.
* **Repository Identity Normalization**: Translates chaotic user-provided hints (SSH URLs, local package references) into logical entity definitions.
* **Runtime Repository Verification**: Hard-fails the execution if the physical pipeline environment does not match the logical repository identity intended by the payload.
* **Branch Naming Determinism**: Forces identical payloads to target identical branch names using hash suffixes, eliminating collisions natively.
* **Duplicate PR Suppression Guarantees**: Intelligently updates existing upstream state without creating spam PRs, permitting safe pipeline retries.

For detailed specifics on how the artifact secures this trust, refer to the [Policy Patch Artifact Lifecycle](./policy-patch-artifact-lifecycle.md).
