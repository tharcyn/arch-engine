import { validateAdapterCompatibility } from '../manifest/manifest-loader';
import type { AdapterCapabilityRegistry } from '../adapters/capability-registry';
import type { AdapterPack, ArchitectureAdapter, AdapterContext } from './adapter-contract';
import type { EngineManifest } from '../manifest/manifest-loader';

// ─── Logger Contract ────────────────────────────────────

export type EngineLogger = (message: string) => void;

const NOOP_LOGGER: EngineLogger = () => {};

// ─── Instance-Scoped Adapter Lifecycle ──────────────────
//
//  DESIGN LAW: Module-level mutable state is forbidden.
//  All adapter lifecycle state MUST be scoped to an
//  EngineRunner instance via these functions.
//
//  These are NOT public API. They are internal helpers
//  called exclusively by EngineRunner instance methods.
// ────────────────────────────────────────────────────────

export async function _installAdapterPack(
  manifest: EngineManifest,
  registry: AdapterCapabilityRegistry,
  pack: AdapterPack,
  activeAdapters: ArchitectureAdapter[],
  logger: EngineLogger = NOOP_LOGGER
): Promise<void> {
  if (registry.isFrozen()) {
    throw new Error(`Engine Identity Freeze Violation: Cannot install adapter pack '${pack.pack_id}' post-freeze.`);
  }

  for (const adapter of pack.adapters) {
    await _registerCapabilityAdapter(manifest, registry, adapter, activeAdapters, logger);
  }
}

export async function _registerCapabilityAdapter(
  manifest: EngineManifest,
  registry: AdapterCapabilityRegistry,
  adapter: ArchitectureAdapter,
  activeAdapters: ArchitectureAdapter[],
  logger: EngineLogger = NOOP_LOGGER
): Promise<void> {
  if (registry.isFrozen()) {
    throw new Error(`Engine Identity Freeze Violation: Cannot register adapter '${adapter.manifest.adapter_id}' post-freeze.`);
  }

  const compatibility = validateAdapterCompatibility(manifest, adapter.manifest);
  
  if (!compatibility.compatible) {
    throw new Error(
      `Adapter Registration Failed: ${compatibility.adapter_id}\n` +
      compatibility.errors.map(e => ` - ${e}`).join('\n')
    );
  }

  // Hook 1: Initialize
  await adapter.onInitialize({
    adapter_id: adapter.manifest.adapter_id,
    config: {},
    log: logger
  });

  // Hook 2: Negotiate
  const caps = await adapter.onCapabilityNegotiation();

  // Registry ingestion
  registry.register({
    adapter_id: adapter.manifest.adapter_id,
    adapter_name: adapter.manifest.adapter_name,
    adapter_language: adapter.manifest.adapter_language,
    adapter_version: adapter.manifest.engine_version,
    capabilities: caps,
    entity_types: [],
    output_files: []
  });

  activeAdapters.push(adapter);
}

/**
 * Seals the engine boundaries and triggers final adapter lifecycles.
 */
export async function _freezeAdapterRegistry(
  registry: AdapterCapabilityRegistry,
  activeAdapters: ArchitectureAdapter[],
  logger: EngineLogger = NOOP_LOGGER
): Promise<void> {
  for (const adapter of activeAdapters) {
    await adapter.onRegistryFreeze({
      adapter_id: adapter.manifest.adapter_id,
      config: {},
      log: logger
    });
  }
  
  registry.freeze();
}
