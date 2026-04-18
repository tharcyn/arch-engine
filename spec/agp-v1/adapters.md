# AGP v1 Adapter Contract Specification

## Overview
The Adapter Contract defines the ecosystem entry boundary. It enforces how third-party plugins (e.g., GitHub, Kubernetes) must interact with the AGP Execution Kernel.

## Specification Areas
1. **Adapter Lifecycle Expectations**: Strict initialization and teardown rules.
2. **Capability Advertisement Semantics**: Declaring read/write schemas correctly.
3. **Execution Determinism Requirements**: Banning asynchronous side-effects during evaluation.
4. **Capsule Compatibility Requirements**: Enforcing serialization safety.
5. **Certification Envelope Requirements**: Proving compliance through cryptographic badging.
6. **Provider Conformance Expectations**: SLAs for capability delivery.
