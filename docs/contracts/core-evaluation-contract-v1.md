# Core Evaluation Contract v1

## 1. Overview
The Core Evaluation Contract v1 establishes the formal, deterministic runtime boundaries for the Arch-Engine policy-pack execution layer. By stabilizing the execution context, capability negotiation, findings taxonomy, and capability registry, this contract ensures that adapter executions are replay-safe, dataset federations are strict, and policy pack evaluations remain isolated and fail-closed.

## 2. Execution Context Invariants
The `PolicyExecutionContext` serves as the immutable runtime environment for all policy evaluations. 
- **Immutable Boundary**: The context is deeply frozen during execution; no lazy property mutation or adapter-level augmentation is permitted.
- **Structural Hashing**: The `computeExecutionContextHash()` strictly generates a stable SHA-256 serialization. It enforces canonical key ordering and trims undefined fields to guarantee reproducibility and federation caching.
- **Dependency Isolation**: The graph surface uses `graphSurfaceHash` to definitively tie the executed logic to a specific structural topology representation.

## 3. Capability Negotiation & Policy Pack Invariants
The `PolicyPackRunner` strictly acts as a negotiation boundary executor:
- **Matrix Validation**: Before any evaluation runs, it explicitly verifies capability alignments via `verifyEvaluationCompatibilityMatrix()`.
- **Enforcement Dimensions**: Matches dataset capabilities against policy pack requirements, including `supports_directionality`, `rest_contract_pack`, and `journey_pack`.
- **Fail-Closed Semantics**: If a mismatch is detected, the evaluation strictly aborts, returning a synthesized `success = false` result with structured diagnostic capability mismatch errors. Silent downgrade fallbacks are permanently disabled.

## 4. Taxonomy Normalization Invariants
The findings taxonomy is frozen within `normalizePolicyPackFinding()`.
- **Invariant Schema**: Strictly enforces properties: `severity`, `confidence`, `category`, `scope`, `authorityBoundaryCrossing`, `mutationClass`, `policyPackId`, `policyRuleId`, and `evaluationMode`.
- **No String Sentinels**: Missing data is safely preserved as `undefined` rather than noisy string defaults (e.g., `"unknown"`).
- **Taxonomy Structural Hash**: The `computeFindingStructuralHash()` provides cross-run deduplication and stability.

## 5. Capability Registry Invariants
The `CapabilityRegistry` strictly manages the capability authority surface.
- **Integrity Enforcement**: `verifyCapabilityRegistryIntegrity()` validates that registered capabilities are purely unique and correctly aligned with dataset, policy pack, and adapter capability profiles.
- **Stable Resolution**: Requires strict sorting and denies duplicate overriding capability registrations.
