# Public API Freeze Contract — @arch-engine/core

## Version Anchor

This contract is anchored to `v0.1.0-preview` and governs all public-surface changes for the `@arch-engine/core` package.

## Semantic Versioning Policy

### Patch-Safe Changes (0.1.x)

The following changes are permitted under patch versions:

- Documentation updates
- Test additions or modifications
- Internal refactors that do not alter public exports
- Performance optimizations that preserve deterministic output
- Diagnostic schema clarifications (additive annotations only)

### Minor-Safe Changes (0.x.0)

The following changes require a minor version bump:

- Additive experimental APIs (new exports with `@experimental` designation)
- New CLI commands with `reserved` or `experimental-preview` stability
- Additive diagnostic schema fields (existing fields must not change)
- New example packs
- Registry adapter SDK extensions

### Major-Only Changes (x.0.0)

The following changes **require a major version bump**:

- **Identity semantics**: Any change to `generateEntityId` hash computation
- **Capability negotiation ordering**: Changes to F-12 federation evaluation order
- **Hash structure changes**: Modifications to `decisionStructureHash`, `decisionTraceHash`, or `snapshotClosureGraphHash` computation
- **Overlay admission semantics**: Changes to admission gate logic
- **Registry trust-tier ordering**: Modifications to authority ladder semantics
- **Descriptor matrix compatibility logic**: Changes to compatibility evaluation
- **Export surface removal**: Removing any symbol from the sealed export surface

## Stability Anchors

| Property | Stability Contract |
|---|---|
| `decisionStructureHash` | Deterministic — same inputs produce identical hash |
| Descriptor matrix parity | Compatibility evaluation is order-independent |
| Registry trust ordering | Authority ladder is monotonic and irreversible |
| Execution topology reproducibility | Same topology definition → same resolution output |

## Enforcement

- `tests/freeze/package_exports_snapshot.test.ts` — snapshots export map
- `tests/freeze/distribution_exports_surface.test.ts` — snapshots runtime exports
- `tests/publicSurface.snapshot.test.ts` — guards approved symbols
- `tests/no-dist-identity-artifacts.test.ts` — enforces identity sealing
- `tests/freeze/canonical_hash_contract_snapshot.test.ts` — hash stability
