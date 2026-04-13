import type { CapabilityMap } from '../adapters/capability-registry';

/**
 * ═══════════════════════════════════════════════════════════
 *  Architecture Adapter SDK — Public Contracts
 * ═══════════════════════════════════════════════════════════
 *
 *  Provides framework-agnostic types to bridge code scanners
 *  and language parsers into the engine's capability registry.
 */

export interface AdapterContext {
  adapter_id: string;
  config: Record<string, unknown>;
  log: (message: string) => void;
}

export interface AdapterManifest {
  adapter_id: string;
  adapter_name: string;
  adapter_language: string;
  
  /** Contract bindings required to successfully load */
  engine_version: string;
  capability_schema: string;
  reasoning_protocol: string;
}

export interface ArchitectureAdapter {
  readonly manifest: AdapterManifest;

  /** Initialize adapter context */
  onInitialize(context: AdapterContext): void | Promise<void>;

  /**
   * Return declared coverage levels before runtime freeze.
   */
  onCapabilityNegotiation(): CapabilityMap | Promise<CapabilityMap>;

  /**
   * Final opportunity to finalize descriptors or hints
   * right before runtime execution locks the registry.
   */
  onRegistryFreeze(context: AdapterContext): void | Promise<void>;

  /**
   * Graph hook to extract semantic topology boundaries (edges, metadata).
   */
  onGraphExtraction(): void | Promise<void>;
}

export interface AdapterPack {
  pack_id: string;
  adapters: ArchitectureAdapter[];
  trust_scores: Array<{
    adapter_id: string;
    base_trust: number;
    category: 'ast' | 'reflection' | 'runtime' | 'heuristic' | 'manual' | 'spec';
    rationale: string;
  }>;
}
