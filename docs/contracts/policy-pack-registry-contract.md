# Policy Pack Registry Contract

This document specifies the contract guarantees for the Arch-Engine Policy Pack Registry, formalizing how policy evaluation capabilities are discovered, negotiated, and scheduled within both single-provider and multi-provider execution models. 

## 1. Governance Extension Surface

The **Policy Pack Registry** acts as the primary extension mechanism for the Arch-Engine governance capability ecosystem. It transitions the runtime from manual evaluation wiring to deterministic capability negotiation.

## 2. Policy Pack Manifest Contract

Every policy pack is governed by a strict, immutable JSON-compatible manifest (`RegistryPolicyPackManifest`):
- `policyPackId`: Unique capability identifier (e.g. `authority-pack`).
- `policyPackVersion`: Strict SemVer identifier.
- `supportedCapabilities`: Engine or adapter capabilities utilized by the pack.
- `requiredCapabilities`: Capabilities strictly necessary for evaluation eligibility.
- `supportedDatasetSchemas`: Acceptable data shapes.
- `supportedExecutionModes`: Declarative operational modes (`single-provider`, `multi-provider-federated`).

## 3. Capability Resolution Guarantees

The registry implements a **Fail-Closed Negotiation Engine**.
Packs are strictly rejected if:
1. The execution context lacks an intersecting capability defined in `requiredCapabilities`.
2. The datasets lack intersection with `supportedDatasetSchemas`.
3. The execution mode (e.g., federated merge) is absent from `supportedExecutionModes`.

Resolution returns deterministic sets of both `eligible` and `blocked` policy packs alongside their precise blocking criteria.

## 4. Version Negotiation Determinism

Version resolution strictly conforms to Semantic Versioning (SemVer) ranges. In the event multiple compatible versions of the same `policyPackId` are discovered, the engine guarantees deterministic selection of the highest eligible SemVer.

## 5. Automation-Safe CLI Operations

Registry interrogation commands:
- `arch-engine registry list`
- `arch-engine registry inspect <pack-id>`
- `arch-engine registry resolve --providers <...>`

These surfaces respect the **Federation CLI Contract** constraints:
- Deterministic JSON output schemas.
- Non-zero exit codes upon failure (e.g., `1` for empty pack lists, `2` for capability mismatch, `3` for schema mismatch, `4` for version un-resolvability).
