# State Mutation Topology Contract

This contract freezes the explicit taxonomy of side-effects that the architecture reasoning substrate recognizes. Any adapter contributing to `providesDataMutationTopology` or `providesDataAccessEdges` must bind to one of these invariant semantic models.

## Vocabulary Hierarchy

The mutation taxonomy is organized as a **parent→child hierarchy**. Abstract parent types serve as fallbacks when the mutation substrate cannot be determined. Concrete subtypes carry the full weight and authority semantics.

### Write Hierarchy

```
writes_state (abstract fallback — ONLY when substrate is unknown)
├── repository_write   (concrete: RDBMS persistent boundary)
├── cache_write         (concrete: Redis/Memcached volatile KV)
└── external_write      (concrete: 3rd-party API boundary)
```

### Read Hierarchy

```
reads_state (abstract fallback — ONLY when substrate is unknown)
├── repository_read    (concrete: RDBMS query)
├── cache_read          (concrete: KV read)
└── external_read       (concrete: 3rd-party API fetch)
```

### Mutation Types (no hierarchy — standalone)

```
creates_state           (insertion: idempotent risk)
deletes_state           (destruction: irreversible risk)
dispatches_state_change (bridge: sync→async handoff point)
eventual_state_change   (deferred: pub/sub propagation)
async_state_change      (deferred: queue/job execution)
```

## Adapter Responsibility Matrix

| Adapter | Emits | Role |
| :--- | :--- | :--- |
| `DataMutationCapabilityAdapter` | `reads_state`, `writes_state`, `async_state_change` | Abstract parent types when substrate is **unknown** |
| `DataAccessDirectionalityAdapter` | `repository_*`, `cache_*`, `external_*` | Concrete subtypes when substrate is **deterministic** |

### Hierarchy Invariant

> **If `DataAccessDirectionalityAdapter` emits a concrete subtype for a source→target pair, `DataMutationCapabilityAdapter` MUST NOT emit the abstract parent for the same pair.**
>
> This prevents blast-radius double-counting. The `DataMutationCapabilityAdapter` enforces this by checking `isKnownSubstrate()` before emitting abstract edges.

## Taxonomy & Binding Definitions

| Edge Type | Semantics | Authority Implication | Weight |
| :--- | :--- | :--- | :--- |
| `reads_state` | Pure selection operator. No side-effects. Abstract read fallback. | None. Always allowed across boundaries. | 0.1 |
| `repository_read` | RDBMS query. No primary side effects. | None. Allowed across boundaries. | 0.1 |
| `cache_read` | External KV read operation. No primary side effects. | None. Allowed across boundaries. | 0.05 |
| `external_read` | Subsystem integration fetch. Rate limiting risks but no local state mutation. | None. Allowed across boundaries. | 0.2 |
| `writes_state` | Generic modification of data without granular assertion. Abstract write fallback. | **High.** Warrants enforcement inspection. | 1.5 |
| `repository_write` | A native, direct RDBMS persistent boundary violation. Immediate disk impact. | **Critical.** Central component of authority graphs. | 5.0 |
| `cache_write` | Mutable state change mapped strictly to volatility engines (Redis/Memcached). | **Moderate.** Risk is synchronization failure, not persistent poisoning. | 1.1 |
| `external_write` | Escaping mutability. Writing side-effects to Stripe, external gateways. | **Critical.** Financial / Consistency barrier. | 5.0 |
| `creates_state` | Hard idempotent insertion. Appends row/entry securely. | **High.** Must map to specific domain logic. | 1.5 |
| `deletes_state` | Destructive reduction. Irreversible state reduction. | **Critical.** Heavily guarded operation. | 2.0 |
| `dispatches_state_change` | Syntactic sugar wrapper. Captures the bridge point where sync calls an async block. | **Traceable.** Extends blast radius branch. | 1.0 |
| `eventual_state_change` | Mutation propelled via Pub/Sub or distributed events. | **Deferred High.** Evaluated downstream. | 0.5 |
| `async_state_change` | Mutation pushed asynchronously onto message queues or jobs. | **Deferred High.** Evaluated at consumer boundary. | 0.5 |

## Contract Invariants for Reasoners

1. **NO Semantic Blurring**: An adapter cannot alias `repository_write` lazily to `writes_state` if the intent is a strict database write. `writes_state` serves as the abstract fallback *only* when the adapter lacks deterministic confidence on the mutation destination.
2. **NO Double-Counting**: A source→target pair MUST produce at most ONE mutation edge. The concrete subtype takes precedence over the abstract parent. This is enforced by the hierarchy guard in `DataMutationCapabilityAdapter.classifyMutation()`.
3. **Authority Enforcement Thresholds**: The Governance API evaluates boundaries exclusively against authority-sensitive types (see `isAuthoritySensitive()` in `edge-confidence.ts`). Read operations bypass authority blocks implicitly to encourage distributed querying.
4. **Traversal Expansion**: Concrete write subtypes (`repository_write`, `external_write`) carry full 5.0× blast radius weight. The abstract `writes_state` carries only 1.5× to reflect substrate uncertainty.
5. **Taxonomy Predicates**: Downstream consumers MUST use the predicate functions (`isWriteMutation()`, `isReadOnly()`, `isAuthoritySensitive()`, `isMutationEdge()`) from `edge-confidence.ts` instead of substring matching (e.g., `edge.type.includes('write')`).

---
_This file acts as a canonical reasoning fixture for Phase 6 Pipeline Enforcement._
