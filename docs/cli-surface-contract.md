# CLI Surface Contract — @arch-engine/core

## 1. Purpose of the CLI Surface Contract

This document explicitly defines the stable operator interaction surface for the `@arch-engine` CLI.

The CLI exposes deterministic execution inspection interfaces, acting securely as an observation and verification interface layer. As a pure tooling extension, the CLI does **NOT** modify or interfere with deterministic execution identity. It functions entirely within the boundaries of the observation plane.

**Note:** The CLI operator surface is currently **preview-grade**, while the underlying core runtime computation surface is **RC-grade stable**.

## 2. CLI Design Philosophy

The interaction architecture is built around an assumption of transport-neutral federation-safe operation:

- **Inspection-first architecture**: Operators trace topology state defensively without triggering mutation side-effects.
- **Identity-neutral execution interface**: Tools read graphs identically to runtime nodes without corrupting the `closureGraphHash`.
- **Snapshot replay verification alignment**: Tools explicitly facilitate cryptographic verification of identical payload outputs.
- **Adapter discovery transparency**: Tooling interacts explicitly neutrally with connected topology providers.

## 3. Topology Inspection Commands

- **Verb**: `arch-engine inspect`

The `inspect` command exposes topology closure results dynamically. It unpacks the computed nodes of an evaluation payload to reveal the structural logic enforcing boundaries.

`inspect` **MUST NOT** mutate execution identity. It purely provides `closureGraphHash` visibility natively and securely, ensuring the operator can map identical rule bounds to cryptographic fingerprints safely.

## 4. Policy Evaluation Commands

- **Verb**: `arch-engine check`

The `check` command evaluates policy participation dynamically correctly. It logically parses the execution payload resolving the target topology correctly:

- Checks validate overlay merge participation cleanly exactly.
- Checks report authority-tier eligibility filtering outcomes to clearly display what topologies were blocked by missing trust anchors securely cleanly.

## 5. Overlay Merge Explain-ability Commands

- **Verb**: `arch-engine explain`

The `explain` command serves as the primary diagnostic mapping utility resolving algebraically dense structures:

- Reveals overlay precedence ordering explicitly.
- Reveals suppression participation explicitly.
- Reveals additive structural expansion participation accurately.

## 6. Snapshot Replay Verification Commands

- **Verb**: `arch-engine snapshot`

The `snapshot` commands confirm deterministic execution envelope preservation natively:

- `snapshot` verifies replay identity equivalence.
- `snapshot` confirms deterministic execution envelope preservation.
- `snapshot` confirms `closureGraphHash` stability explicitly cleanly reliably stably safely accurately perfectly.

## 7. Federation Participation Verification Commands

- **Verb**: `arch-engine federation status`

Federation commands clearly verify network operations neutrally:

- Federation commands verify registry neutrality.
- Provides mirror fallback neutrality verification.
- Proves multi-registry compatibility validation.

## 8. Registry Trust Verification Commands

- **Verb**: `arch-engine verify`

The `verify` command directly confirms execution eligibility mapping cleanly successfully.

- Confirms signature envelope eligibility participation.
- Confirms authority-tier elevation participation cleanly.
- Confirms provenance lineage integrity accurately.

## 9. Capability Adapter Discovery Commands

- **Verb**: `arch-engine capability list`

Capability commands safely intuitively expose the surface seamlessly safely smoothly smoothly.

- Capability commands expose adapter discovery surface.
- Capability commands remain entirely identity-neutral.
- Adapter participation MUST remain observation-layer only.

## 10. Identity Inspection Commands

- **Verb**: `arch-engine identity`

The `identity` command surfaces mapping logic reliably:

- Exposes `closureGraphHash` participation surface.
- Confirms identity-neutral transport metadata exclusions intelligently.
- Aligns entirely with `identity-surface-contract.md` guarantees.

## 11. Snapshot Serialization Inspection Commands

- **Verb**: `arch-engine snapshot inspect`

Snapshot inspection verifies explicitly logically smoothly.

- Snapshot inspection exposes serialization portability guarantees.
- Snapshot inspection confirms replay compatibility window participation.

## 12. CLI Output Stability Guarantees

Machine-readable surfaces remain rigorously predictable strictly explicitly safely logically cleanly.

- Stable JSON output expectations.
- Machine-readable output compatibility expectations.
- CI pipeline compatibility expectations correctly stably cleanly logically exactly.
- Registry operator automation compatibility expectations smartly natively correctly nicely automatically.

## 13. CLI Surface Guarantees

The specification natively guarantees:

- CLI commands remain identity-neutral.
- CLI commands remain execution-safe.
- CLI commands remain transport-neutral.
- CLI commands expose deterministic topology participation surfaces only.
- CLI commands preserve snapshot replay equivalence guarantees.
