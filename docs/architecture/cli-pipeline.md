# CLI Pipeline Composition

Arch-Engine's CLI design is intentionally decoupled. Rather than supplying monolithic commands that do everything from local file parsing to remote HTTP API mutation, the CLI exposes discrete, single-responsibility stages. These stages pipe outputs sequentially to compose the deterministic execution pipeline.

## CLI Pipeline Overview

The complete end-to-end execution flow transitions through several conceptual boundaries:

1. `suggest` (diagnostic)
2. `generate-policy-patch` (artifact logic)
3. `export-policy-patch` (artifact sealing)
4. `emit-policy-pr` (provider-neutral formatting)
5. `github create-policy-pr` (provider mutation)

## Evaluation Stage Commands

The evaluation boundary derives facts without executing mutation logic.

- **`suggest`**: This command performs topology extraction and invariant evaluation. It simply outputs a surface of architectural suggestions (e.g., "Change layer mapping"). It contains no execution capability.

## Patch Construction Stage Commands

- **`generate-policy-patch`**: Ingests suggestion surfaces and structurally binds them into a deterministic mutation intent artifact. It calculates internal dependencies and structural replacements but stops short of formatting for transport.

## Export Stage Commands

- **`export-policy-patch`**: Takes the internal patch representation and transforms it into an execution-portable export artifact. It assigns the `exportArtifactIntegrityHash`, `policyFileFingerprint`, and binds the `executionContextFingerprint`.

## Payload Emission Stage Commands

- **`emit-policy-pr`**: The bridge between the core evaluation engine and the external adapter layer. It translates the sealed export artifact into the `FederationEvaluationPolicyPullRequestPayload` format, organizing commit messages, branches, and semantic body content entirely provider-agnostic.

## Adapter Execution Stage Commands

- **`github create-policy-pr`**: The final physical execution boundary. It parses the JSON payload output by `emit-policy-pr` and executes the provider-specific logic.

It is responsible for:
- Execution plan construction offline.
- Runtime repository verification (e.g., matching the hint against `GITHUB_REPOSITORY`).
- Target branch construction (incorporating the integrity suffix).
- Duplicate PR suppression logic.
- Emitting the execution telemetry return surface.

## JSON Pipeline Composition Model

The CLI pipeline is explicitly designed to be chained using standard POSIX pipes. By combining the `emit-policy-pr` `--json` flag, we stream structured intent directly into the provider adapter.

```bash
arch-engine policies emit-policy-pr --json | arch-engine github create-policy-pr
```

This pipes the structurally sealed, offline-deterministic payload exactly up to the network boundary in a single readable CI action.

## Dry-Run Default Safety Model

By default, the `create-policy-pr` command (and all future provider execution commands) operate in `dry-run` mode.

Execution explicitly requires the `--execute` flag. Without it, the pipeline evaluates everything up to the final network request and halts, ensuring accidental CI runs or local developer tests cannot accidentally push ghost branches.

## Execution Telemetry Consumption Model

To prevent CI from relying on fragile string-matching against stdout logs, the adapter boundary explicitly supports telemetry surfacing.

Using `--json-output-plan` on the execution command forces the output to yield a structured `AdapterExecutionResultBase` payload.

Automations can parse this output to query the `adapterOutcome` directly, deterministically switching CI behavior based strictly on the lifecycle classification (`dry-run`, `refused`, `pr-created`, `pr-reused`).

## Future Provider Compatibility

This composition pattern scales cleanly to future provider integrations.

Expectations for parity:
- **GitLab adapter**: `arch-engine gitlab create-policy-mr` will behave identically, ingest the identical pipeline output, and return the identical telemetry schema.
- **Bitbucket adapter**: `arch-engine bitbucket create-policy-pr` will maintain absolute parity.

Because the system pushes all provider complexity exclusively into the final adapter execution stage, the upstream topology, policy, and export commands never need to be rewritten or retested to support a new CI/CD provider ecosystem.
