# Reference Policy Pack Example

This is the canonical infrastructure-grade reference policy pack for `@arch-engine/core`. It demonstrates the deterministic execution constraints required to safely participate in runtime semantic identity construction and federation portability mapping.

## Overview

This pack strictly adheres to all invariants codified within:

- `policy-pack-contract.md`
- `registry-layout-contract.md`
- `determinism-contract.md`

It validates that execution primitives perform deterministically under strict architectural inspection constraints.

This example pack participates explicitly in:

- overlay merge participation
- authority-tier eligibility
- provenance lineage participation
- closureGraphHash participation
- snapshot compatibility
- registry portability

## Demonstrated Behaviors

### 1. Deterministic Execution Identity

The `manifest.json` and base policy definitions are constructed to cleanly participate in the `closureGraphHash` payload construction logic.

### 2. Overlay Merge Grammar

The `frontend-overlay.policy.json` clearly illustrates both `severity` suppression mechanics and additive graph expansion cleanly. It honors merge precedence laws exactly without corrupting implicit base definitions.

### 3. Authority-Tier Eligibility Participation

The pack binds itself to `CoreEcosystem` to securely test invocation filtering, illustrating how the engine guards unverified structural propagation dynamically.

### 4. Snapshot Replay Compatibility

By using strictly JSON-defined structural constants and removing temporal mutations, this directory exports identically across environments when serialized by `snapshot inspect`.

### 5. Registry-Federation Portability

Because `metadata` and `signatures` fall strictly outside the semantic closure block, this exact same payload can be ferried securely across federated infrastructure without invalidating the deterministic execution fingerprint.
