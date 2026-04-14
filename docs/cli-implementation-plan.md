# CLI Implementation Plan — @arch-engine/core

## 1. Purpose of the CLI Implementation Plan

This document defines how CLI commands interact and map directly to deterministic execution primitives.

The CLI serves exclusively as an observation and verification interface mapping. The CLI **MUST NOT** mutate execution identity. It securely and predictably composes `EngineRunner` orchestration explicitly, exposing underlying structures neutrally.

## 2. CLI Architecture Overview

The CLI operates as a thin orchestration wrapper.

- **`EngineRunner` as execution core**: All validation commands map to the core graph executor.
- **Adapter registry as discovery surface**: Plugins map securely without invalidating identity bounds.
- **Snapshot pipeline as replay validation surface**: Replay equality tests directly invoke the core.
- **Registry federation verification as trust surface**: Domain routing resolves independently of structural loads.

## 3. Command-to-Engine Primitive Mapping Model

CLI operations specifically wrap native execution pathways reliably:

- **`inspect`** → topology closure extraction.
- **`check`** → policy evaluation pipeline.
- **`explain`** → overlay merge algebra trace.
- **`snapshot`** → replay identity validation.
- **`verify`** → registry trust verification.
- **`capability`** → adapter registry enumeration.
- **`identity`** → `closureGraphHash` participation inspection.

Each command maps natively without violating identity-neutral boundaries.

### Command Execution Boundary Matrix

| Command    | Execution Participation     | Identity Participation              | Transport Sensitivity | Snapshot Equivalent |
| ---------- | --------------------------- | ----------------------------------- | --------------------- | ------------------- |
| inspect    | topology observation        | none                                | none                  | yes                 |
| check      | policy evaluation           | indirect (rule activation topology) | none                  | yes                 |
| explain    | merge trace inspection      | none                                | none                  | yes                 |
| snapshot   | replay validation           | full                                | none                  | canonical           |
| verify     | trust-envelope validation   | eligibility-only                    | registry-aware        | yes                 |
| capability | adapter discovery           | none                                | none                  | yes                 |
| identity   | closureGraphHash inspection | full                                | none                  | canonical           |

This matrix explicitly defines deterministic execution participation
boundaries for CLI commands.

CLI commands expose execution identity surfaces but never mutate
topology closure inputs.

Transport-layer routing metadata remains identity-neutral
across all CLI inspection commands.

## 4. EngineRunner Integration Strategy

The CLI utilizes the core runner defensively:

- **EngineRunner lifecycle usage**: Instantiates the minimal required boundary context safely.
- **Topology closure invocation surface**: Evaluates explicit target nodes deterministically.
- **Policy evaluation invocation surface**: Passes execution shapes identically to production evaluation pathways securely.
- **Merge algebra explain-ability invocation surface**: Surfaces pre-hashed topology traces explicitly.
- **Identity inspection invocation surface**: Executes exactly up to the `closureGraphHash` serialization boundary.

## 5. Capability Adapter Discovery Lifecycle Wiring

Align with: `capability-model.md`

- **Adapter registry initialization sequence**: Hooked before `EngineRunner`.
- **Adapter negotiation lifecycle**: Maps cleanly to fallback paths.
- **Fallback-safe discovery ordering**: Discovery routing prioritizes stability.
- **Identity-neutral observation boundaries**: Tooling bypasses hashes.

## 6. Snapshot Replay Validation Wiring

Align with: `determinism-contract.md`

- **Snapshot serialization boundary**: Stable artifact extraction.
- **Snapshot replay execution boundary**: Stable context injection.
- **`closureGraphHash` comparison surface**: Exact matching guarantees.
- **Execution envelope verification surface**: Exact identity boundaries.

## 7. Registry Federation Verification Wiring

Align with: `registry-federation-contract.md`

- **Registry provenance routing inspection**: Tracks network logic neutrally.
- **Mirror fallback neutrality verification**: Tracks resolution path reliably.
- **Signature envelope validation surface**: Evaluates payloads safely.
- **Authority-tier eligibility verification**: Inspects validation levels securely.

## 8. Overlay Merge Explain-ability Wiring

Align with: `execution-model.md`

- **Overlay precedence inspection surface**: Exposes graph structure accurately.
- **Suppression participation inspection**: Exposes stripped constraints reliably.
- **Additive structural expansion inspection**: Exposes appended nodes cleanly.
- **Merge trace generation model**: Generates identical logs defensively.

## 9. Identity Inspection Wiring

Align with: `identity-surface-contract.md`

- **`closureGraphHash` inspection surface**: Dumps evaluation root boundaries precisely.
- **Identity-participating inputs inspection**: Dumps structural logic.
- **Identity-neutral transport metadata verification**: Dumps transport routing state.
- **Execution envelope boundary exposure**: Accurately bounds the fingerprint safely.

## 10. Policy-Pack Validation Wiring

Align with: `policy-pack-contract.md`, `reference-policy-pack-authoring.md`, `reference-policy-pack-example-blueprint.md`

- **Manifest validation surface**: Strict schema typing boundaries.
- **Overlay compatibility validation surface**: Strict merge boundary requirements.
- **Authority-tier eligibility validation surface**: Accurate mapping requirements reliably.
- **Snapshot compatibility validation surface**: Accurately maps structures.

## 11. CLI Output Stability Model

- **Stable JSON output grammar**: Output boundaries locked.
- **Machine-readable output expectations**: Compatible interfaces firmly preserved.
- **CI pipeline compatibility expectations**: Predictably parseable securely.
- **Registry operator automation compatibility expectations**: Tools remain un-breaking cleanly.

## 12. Error Handling Model

- **Deterministic error classification expectations**: Identical execution guarantees.
- **Policy evaluation error reporting surface**: Accurate isolation bounds exactly reliably.
- **Registry verification error reporting surface**: Diagnostic isolation correctly mapped.
- **Adapter discovery failure reporting surface**: Fallback observation mapped properly.

### CLI Identity Neutrality Statement

The CLI operates strictly as an observation-layer execution surface.

No CLI command mutates:

- topology closure inputs
- overlay merge ordering
- authority-tier eligibility participation
- provenance lineage participation
- closureGraphHash identity formation

CLI commands expose deterministic execution identity,
validate snapshot replay equivalence,
and verify registry trust participation surfaces
without participating in semantic identity construction.

## 13. CLI Implementation Guarantees

- CLI remains identity-neutral
- CLI remains execution-safe
- CLI exposes deterministic topology inspection surfaces only
- CLI preserves snapshot replay equivalence guarantees
- CLI maintains federation-neutral verification behavior
