# Remediation Agent Runtime Contract

The Arch-Engine Autonomous Remediation Agent enables self-healing topologies without manual engineering intervention.

## Declarations

Arch-Engine supports:
1. **Continuous Topology Convergence Agents**: Long-running workers that independently negotiate drift, generate repair plans, and apply patches safely.
2. **Autonomous Remediation Execution**: Agents actively resolve dataset compatibility matrices, identity collisions, and authority boundary violations leveraging the previously established `RecommendationEngine` and `PatchPreviewEngine`.
