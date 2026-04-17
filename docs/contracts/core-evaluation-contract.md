# Core Evaluation Contract

## 1. Overview
The Core Evaluation Contract defines the deterministic bounds, runtime normalization guarantees, and structural invariants enforced by the `PolicyPackRunner` and `PolicyExecutionContext` during the evaluation of policy packs. This contract ensures that the core engine layer is as robust, deterministic, and strict as the external-facing Adapter Protocol v1.

## 2. Capability Manifest and Invocation Context
All policy evaluations must be provided a deeply frozen `PolicyExecutionContext` that includes:
- A `TopologyGraph` structure representation.
- A `PolicyRelevantDiff` indicating elements changed within the evaluation scope.
- A `capabilityManifest` dictating the operational context and supported feature sets.

The runner assumes the responsibility of enforcing these boundaries and decoupling the policy implementations from direct infrastructure dependencies.

## 3. Structural Normalization Guarantee
The `PolicyPackRunner` guarantees structural normalization of any evaluation output to the canonical `NormalizedPolicyPackEvaluationResult` format.
To support a multi-versioned ecosystem without runtime panics, the runner handles multiple evaluation result shapes safely:
- **Legacy Output (`status`/`findings`)**: Output strictly defining a boolean `status` and an array of `findings`.
- **Modern Protocol v1 Output (`success`/`diagnostics`)**: Output returning `success` and `diagnostics` complying with `PolicyPackEvaluationResult`.

### 3.1. Normalization Invariants
- Diagnostics are mapped reliably regardless of legacy or modern shapes.
- Missing optional properties in diagnostic objects (e.g., `surface`, `classification`) default to `undefined` rather than generating noisy arbitrary string outputs (like `"unknown"`), keeping telemetry surfaces precise.
- The system prevents panics during normalization. 

## 4. Fail-Closed Resilience
If an evaluation results in an unexpected exception or the structure completely violates both legacy and modern contracts, the system gracefully enforces fail-closed semantics. It catches the unhandled exception, suppresses internal stack leakage, and fabricates a synthesized `success = false` evaluation result containing an unhandled exception diagnostic, capturing the exception string deterministically.

## 5. Execution Integrity
No side effects, mutation of the injected context view, or arbitrary data leakages are permitted during execution. Any direct manipulation of the `TopologyGraph` or context references will trigger a runtime violation or silently fail due to `Object.freeze()` application prior to context handover.
