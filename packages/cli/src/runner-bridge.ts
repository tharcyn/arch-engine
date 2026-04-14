/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Runner Bridge
 * ═══════════════════════════════════════════════════════════
 *
 *  Strict contract:
 *  - Instantiate EngineRunner.
 *  - Load resolved config / autodiscovery result.
 *  - Return normalized execution result with timing telemetry.
 *
 *  It does NOT perform output formatting, policy logic, or
 *  command-specific branching.
 */

import {
  EngineRunner,
  parseEngineManifest,
  type EngineExecutionResult,
  type EngineExecutionState,
} from '@arch-engine/core';

import type { ExecutionMetrics } from './snapshot.js';

// ─── Lazy Adapter Resolution ────────────────────────────
// The monorepo adapter is an optional peer dependency.
// It must never be statically imported at module scope —
// CLI startup (--version, --help) must succeed without it.

type AdapterModule = typeof import('@arch-engine/adapter-monorepo');

export async function loadMonorepoAdapter(): Promise<AdapterModule> {
  try {
    return await import('@arch-engine/adapter-monorepo');
  } catch {
    throw new Error(
      'This command requires @arch-engine/adapter-monorepo.\n\n' +
      'Install it with:\n\n' +
      '  npm install @arch-engine/adapter-monorepo\n',
    );
  }
}

// ─── Result Contract ────────────────────────────────────

export interface BridgeExecutionResult {
  engineResult: EngineExecutionResult;
  extractionMetadata: import('@arch-engine/adapter-monorepo').ExtractionMetadata;
  adjacencyMap: Record<string, string[]>;
  isAutodiscovered: boolean;
  autodiscoveryMessage?: string;
  durationMs: number;
  executionMetrics: ExecutionMetrics;
}

/**
 * Execute the full pipeline: adapter extraction → engine reasoning.
 * Uses the monorepo adapter for zero-config topology extraction.
 * Captures per-phase timing telemetry.
 */
export async function executeRunnerBridge(
  cwd: string,
  discoveryResult: import('./autodiscovery.js').DiscoveryResult,
): Promise<BridgeExecutionResult> {
  const totalStart = Date.now();

  // 1. Resolve adapter lazily, then run extraction (timed)
  const adapter = await loadMonorepoAdapter();
  const extractionStart = Date.now();
  const extraction = adapter.runMonorepoExtraction(cwd);
  const extractionMs = Date.now() - extractionStart;

  // 2. Create engine manifest
  const manifest = parseEngineManifest({
    engine_id: 'arch-engine-cli',
    engine_version: '1.0.0-rc.3',
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

  const runner = new EngineRunner(manifest, {
    logger: discoveryResult.isFallback ? () => {} : console.log,
  });

  // 3. Map adapter output to EngineExecutionState
  const state: EngineExecutionState = {
    adjacencyMap: extraction.adjacencyMap,
    routeServiceMap: extraction.routeServiceMap,
    crossings: extraction.authorityCrossings,
    edgesByAdapter: extraction.edgesByAdapter,
  };

  // 4. Execute reasoning pipeline (timed)
  const pipelineStart = Date.now();
  const engineResult = await runner.executePipeline(state);
  const pipelineMs = Date.now() - pipelineStart;

  const totalMs = Date.now() - totalStart;

  return {
    engineResult,
    extractionMetadata: extraction.metadata,
    adjacencyMap: extraction.adjacencyMap,
    isAutodiscovered: discoveryResult.isFallback,
    autodiscoveryMessage: discoveryResult.message,
    durationMs: totalMs,
    executionMetrics: {
      extractionMs,
      pipelineMs,
      totalMs,
    },
  };
}
