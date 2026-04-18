# Simulation Runtime Contract

The Arch-Engine Simulation Runtime establishes a deterministic \"what-if\" evaluation API, allowing predictive impact forecasting without mutating underlying repository structures, registry indexes, or running CI pipelines.

## Guarantees

1. **Topology Simulation Guarantee**: Edits to edges, boundaries, and communication paths surface exact rule and finding drop-offs predictably.
2. **Capability Sandbox Guarantee**: Adding capabilities into the sandbox exposes execution-mode eligibility expansions and suppressed rules reliably.
3. **Dataset Scenario Guarantee**: Simulated schema upgrades reliably forecast federation behavior shifts before data producers commit format changes.
4. **Promotion Sandbox Guarantee**: Bundle promotions and lockfile lineage operations simulate safely against active registry snapshots.
5. **Determinism Safety**: All simulated states isolate via \`SimulationExecutionContext\` and absolutely prevent real filesystem persistence.

This transitions the system from reactive to predictive governance.
