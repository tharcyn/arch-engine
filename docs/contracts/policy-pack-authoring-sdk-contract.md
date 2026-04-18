# Policy Pack Authoring SDK Contract

The `@arch-engine/sdk` acts as the definitive contract bridge between third-party authors and the Arch-Engine execution substrate. It ensures that any externally developed policy pack mathematically aligns with the registry, evaluation context, and execution mode expectations before ever being compiled into a `.archpack`.

## 1. Deterministic Scaffolding

When authors use `arch-engine pack init`, the generated codebase is not arbitrary. It conforms strictly to the `PolicyPackManifestTemplate` schema.
- Dependencies, capabilities, and compatibility vectors are sorted and frozen to prevent hash-drift caused by non-deterministic key ordering.

## 2. Capability Negotiation Helpers

Instead of manually constructing arrays of capability strings, the SDK exposes `declareRequiredCapabilities` and `declareOptionalCapabilities`. These helpers assert uniqueness, resolve namespace collisions, and statically prepare the pack for the `CapabilityIntersection` validation gate during evaluation.

## 3. Dataset Compatibility Guards

The `declareSupportedDatasetSchemas` module allows a pack to state explicit schema affinities (e.g. `topology-export-v2`). The validation layer ensures the pack correctly negotiates with the federated nodes.

## 4. Execution Mode Safety

Execution boundaries (`single-provider`, `multi-provider`, `federated`, `offline`, `bundle-only`) define the architectural scope of the pack. A pack declaring `single-provider` will fail to execute if fed a federated topology. The SDK validation hooks ensure this is caught at compilation rather than evaluation.

## 5. Built-in Bundle Integrations

The SDK exposes helpers inside `@arch-engine/sdk/bundles` to wrap the local pack into a registry-ready payload, ensuring that the generated `.archpack` fulfills all publishing lifecycle and promotion tier requirements automatically.
