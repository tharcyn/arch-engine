/**
 * ═══════════════════════════════════════════════════════════
 *  Example: Module Graph Adapter
 * ═══════════════════════════════════════════════════════════
 *
 *  Demonstrates how to build a minimal adapter for
 *  @arch-engine/core. This adapter reads module dependency
 *  edges from a static analysis tool's JSON output.
 *
 *  Adapters are framework-agnostic and can bridge any
 *  language scanner into the engine's capability registry.
 *
 *  Lifecycle:
 *    1. onInitialize()          — receive context, load config
 *    2. onCapabilityNegotiation() — declare what you provide
 *    3. onRegistryFreeze()      — finalize before execution
 *    4. onGraphExtraction()     — extract topology edges
 */

import type {
  ArchitectureAdapter,
  AdapterManifest,
  AdapterPack,
  AdapterContext,
  CapabilityMap,
} from '@arch-engine/core';

// ─── Adapter Implementation ────────────────────────────

const ModuleGraphAdapter: ArchitectureAdapter = {
  manifest: {
    adapter_id: 'module-graph',
    adapter_name: 'Module Graph Analyzer',
    adapter_language: 'typescript',
    engine_version: '1.0.0',
    capability_schema: '1.0.0',
    reasoning_protocol: '1.0.0',
  } satisfies AdapterManifest,

  async onInitialize(context: AdapterContext) {
    context.log(`[${context.adapter_id}] Initialized with config: ${JSON.stringify(context.config)}`);
  },

  /**
   * Declare which of the 10 topology layers this adapter provides.
   *
   * Coverage levels:
   *   'full'    — adapter provides complete, authoritative data
   *   'partial' — adapter provides some data with known gaps
   *   'none'    — adapter does not contribute to this layer
   *   'unknown' — adapter's coverage is undetermined
   */
  async onCapabilityNegotiation(): Promise<CapabilityMap> {
    return {
      surfaceTopology: 'none',
      handlerResolution: 'none',
      invocationEdges: 'full',         // we resolve import/require chains
      eventEdges: 'none',
      dataAccessEdges: 'partial',      // we detect some data access patterns
      mutationTopology: 'none',
      authorityMetadata: 'none',
      contractSurface: 'none',
      frontendTopology: 'none',
      modelRelationships: 'none',
    };
  },

  async onRegistryFreeze(context: AdapterContext) {
    context.log(`[${context.adapter_id}] Registry frozen — capabilities locked`);
  },

  async onGraphExtraction() {
    // Called during pipeline execution.
    // Use this hook to perform final graph extraction work,
    // e.g. reading scanner output files and populating edges.
  },
};

// ─── Pack Assembly ──────────────────────────────────────

/**
 * Adapters are grouped into packs with trust scores.
 *
 * Trust categories determine conflict resolution priority:
 *   'ast'        — static analysis (highest trust)
 *   'reflection' — runtime reflection
 *   'runtime'    — runtime instrumentation
 *   'heuristic'  — pattern matching / naming conventions
 *   'manual'     — human-declared edges
 *   'spec'       — specification-derived (e.g. OpenAPI)
 */
export const examplePack: AdapterPack = {
  pack_id: 'example-static-analysis',
  adapters: [ModuleGraphAdapter],
  trust_scores: [
    {
      adapter_id: 'module-graph',
      base_trust: 0.85,
      category: 'ast',
      rationale: 'Static import resolution from TypeScript AST — deterministic and verifiable',
    },
  ],
};

// ─── Usage ──────────────────────────────────────────────

/*
import { EngineRunner, parseEngineManifest } from '@arch-engine/core';
import { examplePack } from './module-graph-adapter';

const manifest = parseEngineManifest({ ... });
const runner = new EngineRunner(manifest);

// Load the adapter pack
await runner.loadAdapterPack(examplePack);

// Execute with topology data
const result = await runner.executePipeline({
  adjacencyMap: { ... },
  edgesByAdapter: {
    'module-graph': [
      { source: 'OrderService', target: 'PaymentGateway', type: 'invokes', adapter_id: 'module-graph' },
      { source: 'OrderService', target: 'InventoryService', type: 'writes_to', adapter_id: 'module-graph' },
    ],
  },
});

console.log(result.coverageIndex.overall_coverage);
console.log(result.stabilityIndex.topology_reliability_score);
*/
