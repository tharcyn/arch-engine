# @arch-engine/core

**Deterministic architecture governance runtime.**

Enforce dependency direction, detect authority boundary violations, compute topology stability, and reconcile conflicting graph edges across multiple code scanners — in a single deterministic, reproducible pipeline.

[![npm version](https://img.shields.io/npm/v/@arch-engine/core)](https://www.npmjs.com/package/@arch-engine/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

---

## What Does It Do?

`@arch-engine/core` is an architecture graph validation substrate. You feed it a dependency graph (entity adjacency map), and it returns:

- **Topology stability score** — a composite reliability metric for your dependency graph
- **Blast-radius analysis** — confidence-weighted impact classification for every entity
- **Authority boundary crossings** — detected violations where one domain directly mutates another
- **Edge reconciliation** — conflict resolution when multiple scanners produce overlapping edges
- **Adapter coverage gaps** — which topology layers need better scanner coverage
- **Identity parity** — cross-language entity identity drift detection

The engine is **framework-agnostic**. It doesn't scan your code directly — instead, it consumes topology data from **adapters** (code scanners, static analyzers, OpenAPI parsers) and reasons over the combined graph.

## Who Should Use This?

- **Platform teams** maintaining multi-service architectures who need automated governance
- **Architecture reviewers** who want deterministic, repeatable architecture fitness checks
- **SDK authors** building code intelligence tooling and needing a topology reasoning layer
- **Monorepo maintainers** who want to enforce dependency direction and boundary contracts

---

## Quickstart

```typescript
import { EngineRunner, parseEngineManifest } from '@arch-engine/core';
import type { EngineExecutionState, AdjacencyNode } from '@arch-engine/core';

// 1. Create an engine manifest (defines schema versions + models)
const manifest = parseEngineManifest({
  engine_id: 'my-project',
  engine_version: '1.0.0',
  schema_versions: {
    capability_schema: '1.0.0',
    topology_schema: '1.0.0',
    entity_identity_schema: '1.0.0',
    reasoning_protocol: '1.0.0',
    adapter_contract: '1.0.0',
    mutation_model: '1.0.0',
    authority_model: '1.0.0',
    confidence_model: '1.0.0',
  },
  supported_adapter_contract_versions: ['1.0.0'],
  minimum_adapter_contract_version: '1.0.0',
  models: {
    mutation_hierarchy: 'canonical-v1',
    authority_scoring: 'trust-weighted-v1',
    confidence_propagation: 'minimum-path-v1',
  },
});

// 2. Instantiate the runner
const runner = new EngineRunner(manifest);

// 3. Build your topology input
const state: EngineExecutionState = {
  adjacencyMap: {
    OrderService: {
      entity_id: 'svc_order-service_a1b2c3d4',
      reads_state: [], writes_state: ['InventoryService'],
      creates_state: [], deletes_state: [],
      dispatches_state_change: [], eventual_state_change: [],
      async_state_change: [],
      repository_read: [], repository_write: [],
      cache_read: [], cache_write: [],
      external_read: [], external_write: [],
      reads_from: ['ProductCatalog'], writes_to: ['InventoryService'],
      invokes: ['PaymentGateway'], emits: ['OrderPlaced'],
      subscribes_to: [],
      contracts_with: [], consumes: [], exposes: [],
      uses_layout: [], requires_permission: [], requires_role: [],
      redirects_to: [],
      reachable_from_routes: ['POST|/api/orders'],
      mutation_authority: true,
      blast_radius: 'CROSS_SERVICE',
    },
  },
  edgesByAdapter: {},  // no adapters loaded — engine still runs
};

// 4. Execute the reasoning pipeline
const result = await runner.executePipeline(state);

// 5. Read analysis output
console.log('Stability:', result.stabilityIndex.topology_reliability_score);
console.log('Coverage:', result.coverageIndex.overall_coverage);
console.log('Identity parity:', result.identityParity.overall_status);
```

> **Note:** Adapters are optional. The engine runs without any adapters loaded — you just won't get cross-adapter reconciliation or consensus confidence boosts. This is useful for single-scanner environments.

---

## Namespaces

| Import Path | Purpose | Stability |
|-------------|---------|-----------|
| `@arch-engine/core` | Execution entrypoint, adapter SDK, graph schema | **Stable** |
| `@arch-engine/core/analysis` | Impact simulation, confidence classification, decay | **Stable** |
| `@arch-engine/core/parsers` | Markdown document ingestors | **⚠️ Experimental** |

### Using Sub-Namespaces

```typescript
// Analysis — impact simulation and confidence scoring
import { ImpactSimulator, classifyEdgeConfidence } from '@arch-engine/core/analysis';

// Parsers — experimental markdown format ingestors
// ⚠️ These assume specific Markdown table/heading conventions
// and are not yet generalized for arbitrary formats.
import { parseModelIndex, parseServiceIndex } from '@arch-engine/core/parsers';
```

---

## Stability Guarantees

| Symbol | Stability | Notes |
|--------|-----------|-------|
| `EngineRunner` | **Stable** | Sole execution authority. Public API frozen. |
| `EngineExecutionState` | **Stable** | New optional fields = minor bump. New required fields = major bump. |
| `EngineExecutionResult` | **Stable** | Removing/renaming fields = major bump. Adding fields = minor bump. |
| `AdjacencyNode` | **Stable** | 29-field canonical contract with `extensions` escape hatch. |
| `BlastRadius` | **Stable** | 5-member string union. |
| `RouteServiceMap` | **Stable** | Forward/reverse lookup maps. |
| `AuthorityCrossing` | **Stable** | 5-field boundary crossing record. |
| `RouteServiceEntry` | **Stable (evolution-sensitive)** | Index signature and diagnostic fields may be refined. Primary versioning watch point. |
| `analysis` namespace | **Stable** | ImpactSimulator, confidence predicates, decay functions. |
| `parsers` namespace | **⚠️ Experimental** | Function signatures may change. Return types are untyped (`any[]`) for 7 of 11 functions. |

---

## Writing Your First Adapter

Adapters bridge your code scanners into the engine's capability registry. Each adapter declares what topology layers it can provide, and the engine uses that information for capability negotiation, coverage scoring, and gap analysis.

Here's a minimal adapter that reads a module dependency graph:

```typescript
import type {
  ArchitectureAdapter,
  AdapterManifest,
  AdapterContext,
  CapabilityMap,
} from '@arch-engine/core';

/** Adapter that reads a module dependency graph from static analysis output */
const ModuleGraphAdapter: ArchitectureAdapter = {
  manifest: {
    adapter_id: 'module-graph',
    adapter_name: 'Module Graph Analyzer',
    adapter_language: 'typescript',
    engine_version: '1.0.0',
    capability_schema: '1.0.0',
    reasoning_protocol: '1.0.0',
  },

  async onInitialize(context: AdapterContext) {
    context.log('Module graph adapter initialized');
  },

  // Declare which topology layers this adapter provides
  async onCapabilityNegotiation(): Promise<CapabilityMap> {
    return {
      surfaceTopology: 'none',
      handlerResolution: 'none',
      invocationEdges: 'full',        // we provide dependency edges
      eventEdges: 'none',
      dataAccessEdges: 'partial',     // we detect some data access patterns
      mutationTopology: 'none',
      authorityMetadata: 'none',
      contractSurface: 'none',
      frontendTopology: 'none',
      modelRelationships: 'none',
    };
  },

  async onRegistryFreeze(context: AdapterContext) {
    context.log('Registry frozen — capabilities locked');
  },

  async onGraphExtraction() {
    // This hook is called during pipeline execution.
    // Use it to perform any final graph extraction work.
  },
};

export default ModuleGraphAdapter;
```

### Packing Adapters

Adapters are grouped into **packs** with trust scores:

```typescript
import type { AdapterPack } from '@arch-engine/core';
import ModuleGraphAdapter from './module-graph-adapter';

export const myAdapterPack: AdapterPack = {
  pack_id: 'my-static-analysis',
  adapters: [ModuleGraphAdapter],
  trust_scores: [
    {
      adapter_id: 'module-graph',
      base_trust: 0.85,
      category: 'ast',       // AST-based = high trust
      rationale: 'Static import resolution from TypeScript AST',
    },
  ],
};
```

### Loading Packs

```typescript
const runner = new EngineRunner(manifest);
await runner.loadAdapterPack(myAdapterPack);

const result = await runner.executePipeline(state);
// result now includes cross-adapter reconciliation data
```

---

## How This Differs From Graph Libraries

| Concern | graphlib / dagre | dependency-cruiser | madge | Nx Graph | **@arch-engine/core** |
|---------|-----------------|-------------------|-------|----------|-----------------------|
| **Graph structure** | Generic DAG | Import graph | Import graph | Project graph | Typed entity adjacency with 29 edge categories |
| **Authority boundaries** | ❌ | ❌ | ❌ | Partial (project boundaries) | ✅ First-class authority crossing detection |
| **Multi-scanner reconciliation** | ❌ | ❌ | ❌ | ❌ | ✅ Cross-adapter edge reconciliation with trust ranking |
| **Confidence scoring** | ❌ | ❌ | ❌ | ❌ | ✅ Per-edge confidence with propagation and decay |
| **Topology stability metric** | ❌ | ❌ | ❌ | ❌ | ✅ Composite reliability score from agreement, variance, coverage |
| **Blast-radius analysis** | ❌ | ❌ | ❌ | ❌ | ✅ Confidence-weighted impact classification |
| **Capability negotiation** | ❌ | ❌ | ❌ | Plugin system | ✅ Formal adapter capability registry with freeze semantics |
| **Framework-agnostic** | ✅ | Node.js | Node.js | Nx-specific | ✅ Any language, any framework via adapters |

**In short:** Graph libraries give you structure. `@arch-engine/core` gives you **architectural reasoning** — it answers "is this dependency graph healthy?" rather than "what does this dependency graph look like?"

---

## Origin

Originally extracted from a production architecture reasoning engine used to validate a multi-portal vending intelligence platform with 500+ entities across PHP and TypeScript codebases. The engine has been hardened through continuous enforcement of authority boundaries, mutation topology invariants, and cross-language identity parity across multiple deployment cycles.

---

## Distribution

- **ESM** + **CJS** dual-format (via tsup)
- Full `.d.ts` type declarations for all namespaces
- `exports` map with deep-import blocking
- Zero runtime dependencies beyond `@arch-engine/schema`
- `ajv` as optional peer dependency (for manifest validation)

## License

[MIT](./LICENSE)
