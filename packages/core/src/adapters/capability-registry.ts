/**
 * ═══════════════════════════════════════════════════════════
 *  Adapter Capability Registry — Stage 7A Identity Freeze
 * ═══════════════════════════════════════════════════════════
 *
 *  Framework-agnostic adapter registry with:
 *    - Normalized capability map (10 semantic layers)
 *    - Explicit registration (no built-in adapters)
 *    - Registration validation + freeze semantics
 *    - Adapter compatibility checking
 *
 *  Adapters are registered by adapter packs (e.g. vendoor, laravel, rails).
 *  Core engine starts with ZERO adapters and discovers nothing implicitly.
 *
 *  Forward-portable to: @arch-engine/core/contracts
 */

// ─── Capability Coverage Level ──────────────────────────

export type CoverageLevel =
  | 'full'       // Adapter provides complete, authoritative data
  | 'partial'    // Adapter provides some data with known gaps
  | 'none'       // Adapter does not provide this capability
  | 'unknown';   // Adapter's coverage for this capability is undetermined

// ─── Normalized Capability Map ──────────────────────────
//
// 10 semantic layers. No verbose prefixes.
// Consolidations from v0:
//   providesFrontendLinkage + providesFrontendConsumersTopology → frontendTopology
//   providesInvocationEdges + providesInvocationEdgesTopology → invocationEdges
//   providesJobDispatchEdges → absorbed into invocationEdges
//     (job dispatch remains distinguishable via edge.type = "service_dispatches_job")

export interface CapabilityMap {
  /** Route/endpoint topology (route registration, surface discovery) */
  surfaceTopology: CoverageLevel;

  /** FQCN handler identity resolution */
  handlerResolution: CoverageLevel;

  /** Dependency invocation chains (includes job dispatch, structured topology) */
  invocationEdges: CoverageLevel;

  /** Event emission/subscription topology */
  eventEdges: CoverageLevel;

  /** Data access edges (reads_from, writes_to) */
  dataAccessEdges: CoverageLevel;

  /** Mutation hierarchy edges (writes_state, reads_state, creates_state, etc.) */
  mutationTopology: CoverageLevel;

  /** Authority ownership, boundaries, and mutation authority */
  authorityMetadata: CoverageLevel;

  /** API contract surface (OpenAPI, GraphQL, etc.) */
  contractSurface: CoverageLevel;

  /** Frontend consumer-to-handler linkage */
  frontendTopology: CoverageLevel;

  /** ORM/model relationship graph edges */
  modelRelationships: CoverageLevel;
}

// ─── Adapter Capability Descriptor ──────────────────────

export interface AdapterCapabilityDescriptor {
  /** Unique adapter identifier */
  adapter_id: string;

  /** Human-readable adapter name */
  adapter_name: string;

  /** Language/runtime: 'php', 'typescript', 'runtime', 'spec' */
  adapter_language: string;

  /** Semantic version of the adapter */
  adapter_version: string;

  /** Normalized capability map */
  capabilities: CapabilityMap;

  /** Entity types this adapter produces */
  entity_types: string[];

  /** Output files this adapter generates */
  output_files: string[];
}

// ─── Registration Result ────────────────────────────────

export interface AdapterRegistrationResult {
  registered: boolean;
  adapter_id: string;
  validation_errors: string[];
  warnings: string[];
}

// ─── Registry ───────────────────────────────────────────

/**
 * Central registry of adapter capability descriptors.
 *
 * Starts EMPTY — no built-in adapters.
 * Adapters are registered via adapter packs:
 *
 *   const registry = new AdapterCapabilityRegistry();
 *   registerVendoorAdapters(registry);
 *   registry.freeze();
 */
export class AdapterCapabilityRegistry {
  private adapters: Map<string, AdapterCapabilityDescriptor> = new Map();
  private frozen = false;

  /**
   * Register an adapter descriptor with validation.
   *
   * @param descriptor Adapter capability descriptor
   * @returns Registration result with validation status
   */
  register(descriptor: AdapterCapabilityDescriptor): AdapterRegistrationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Frozen check
    if (this.frozen) {
      errors.push(`Registry is frozen — cannot register adapter '${descriptor.adapter_id}'`);
      return { registered: false, adapter_id: descriptor.adapter_id, validation_errors: errors, warnings };
    }

    // Required field validation
    if (!descriptor.adapter_id || descriptor.adapter_id.trim().length === 0) {
      errors.push('adapter_id must be non-empty');
    }

    if (!descriptor.adapter_version || !/^\d+\.\d+\.\d+/.test(descriptor.adapter_version)) {
      errors.push(`adapter_version must be semver-parseable, got: '${descriptor.adapter_version}'`);
    }

    if (!descriptor.entity_types || descriptor.entity_types.length === 0) {
      warnings.push(`Adapter '${descriptor.adapter_id}' has empty entity_types — consider populating for coverage diagnostics`);
    }

    // Capability validation: at least one non-'none' capability
    const capKeys = Object.keys(descriptor.capabilities) as (keyof CapabilityMap)[];
    const hasCapability = capKeys.some(k => descriptor.capabilities[k] !== 'none');
    if (!hasCapability) {
      warnings.push(`Adapter '${descriptor.adapter_id}' has all capabilities set to 'none' — it provides no data surfaces`);
    }

    // Duplicate detection
    if (this.adapters.has(descriptor.adapter_id)) {
      warnings.push(`Adapter '${descriptor.adapter_id}' is being re-registered — previous registration overwritten`);
    }

    if (errors.length > 0) {
      return { registered: false, adapter_id: descriptor.adapter_id, validation_errors: errors, warnings };
    }

    this.adapters.set(descriptor.adapter_id, descriptor);
    return { registered: true, adapter_id: descriptor.adapter_id, validation_errors: [], warnings };
  }

  /**
   * Freeze the registry — no further registrations allowed.
   * Call after all adapter packs have registered.
   */
  freeze(): void {
    this.frozen = true;
  }

  /** Check if the registry is frozen */
  isFrozen(): boolean {
    return this.frozen;
  }

  /** Get a specific adapter's capabilities */
  get(adapterId: string): AdapterCapabilityDescriptor | undefined {
    return this.adapters.get(adapterId);
  }

  /** Get all registered adapters */
  getAll(): AdapterCapabilityDescriptor[] {
    return Array.from(this.adapters.values());
  }

  /** Get adapters that provide a specific capability at a given level */
  getProvidersOf(
    capability: keyof CapabilityMap,
    minLevel: CoverageLevel = 'partial',
  ): AdapterCapabilityDescriptor[] {
    const levelOrder: CoverageLevel[] = ['none', 'unknown', 'partial', 'full'];
    const minIdx = levelOrder.indexOf(minLevel);

    return this.getAll().filter(a => {
      const capLevel = a.capabilities[capability];
      return levelOrder.indexOf(capLevel) >= minIdx;
    });
  }

  /** Export registry snapshot for telemetry output */
  toSnapshot(): Record<string, {
    adapter_name: string;
    adapter_language: string;
    entity_types: string[];
    capabilities: Record<string, CoverageLevel>;
  }> {
    const snapshot: Record<string, any> = {};
    for (const [id, adapter] of this.adapters.entries()) {
      snapshot[id] = {
        adapter_name: adapter.adapter_name,
        adapter_language: adapter.adapter_language,
        entity_types: adapter.entity_types,
        capabilities: { ...adapter.capabilities },
      };
    }
    return snapshot;
  }
}
