# Trusted Fallback — Canonical Example Topology

This example demonstrates the deterministic fallback selection behavior of `@arch-engine/core` when:

1. A **primary provider** is temporarily unavailable (maintenance window)
2. A **mirror-equivalent fallback provider** exists with identical capabilities
3. The resolution strategy is `authority-first` with `mirrorEquivalenceEnabled`

## Topology Structure

```
seam-payment-core
├── primary-provider     (signed, authoritative, UNAVAILABLE)
└── fallback-provider    (signed, mirror, AVAILABLE)
```

## Expected Deterministic Output

```json
{
  "providerSelected": "fallback-provider",
  "fallbackUsed": true,
  "mirrorEquivalent": true,
  "conflictDetected": false,
  "resolutionOutcome": "deterministic"
}
```

## Key Invariants Demonstrated

| Invariant | Status |
|---|---|
| Mirror equivalence enforcement | ✅ Active |
| Overlay lifecycle admission | ✅ Both providers pass admission |
| Registry trust-tier ceiling | ✅ Both within `signed` ceiling |
| Descriptor matrix compatibility | ✅ Both satisfy `payment-processing` + `audit-logging` |
| Deterministic selection | ✅ Same result on every execution |

## Files

| File | Purpose |
|---|---|
| `descriptor-matrix.json` | Capability descriptor requirements and compatibility matrix |
| `providers/primary.json` | Primary provider (unavailable) |
| `providers/fallback.json` | Fallback mirror provider (available) |
| `requirements/seam-requirements.json` | Seam capability requirements |
| `execution-config.json` | Execution mode and resolution strategy |
| `topology.json` | Full topology definition |
| `expected-output.json` | Canonical expected execution output |

## Conformance Testing

This example is validated by `tests/example-pack-conformance.test.ts`, which asserts the topology resolution matches `expected-output.json` exactly.
