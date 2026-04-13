/**
 * ═══════════════════════════════════════════════════════════
 *  Engine Manifest — Types & Validation
 * ═══════════════════════════════════════════════════════════
 *
 *  Pure computational manifest parsing and validation.
 *  No filesystem dependencies — all I/O is the consumer's
 *  responsibility.
 *
 *  The fs-based `loadEngineManifest` overload lives in
 *  manifest-fs.ts for workspace-internal usage only.
 */

// ─── Engine Manifest Types ──────────────────────────────

export interface EngineManifest {
  engine_id: string;
  engine_version: string;
  schema_versions: {
    capability_schema: string;
    topology_schema: string;
    entity_identity_schema: string;
    reasoning_protocol: string;
    adapter_contract: string;
    mutation_model: string;
    authority_model: string;
    confidence_model: string;
  };
  supported_adapter_contract_versions: string[];
  minimum_adapter_contract_version: string;
  models: {
    mutation_hierarchy: string;
    authority_scoring: string;
    confidence_propagation: string;
  };
}

// ─── Compatibility Result ───────────────────────────────

export interface CompatibilityResult {
  compatible: boolean;
  adapter_id: string;
  adapter_contract_version: string;
  engine_version: string;
  errors: string[];
  warnings: string[];
}

// ─── Semver Comparison ──────────────────────────────────

function parseSemver(version: string): [number, number, number] {
  const cleaned = version.replace(/-.+$/, '');
  if (!/^\d+\.\d+\.\d+$/.test(cleaned)) {
    throw new Error(
      `Invalid semver version: '${version}'. Expected format: MAJOR.MINOR.PATCH`
    );
  }
  const parts = cleaned.split('.').map(Number);
  if (parts.some(p => Number.isNaN(p))) {
    throw new Error(
      `Invalid semver version: '${version}'. Components must be numeric.`
    );
  }
  return [parts[0], parts[1], parts[2]];
}

function semverGte(a: string, b: string): boolean {
  const [aMajor, aMinor, aPatch] = parseSemver(a);
  const [bMajor, bMinor, bPatch] = parseSemver(b);
  if (aMajor !== bMajor) return aMajor > bMajor;
  if (aMinor !== bMinor) return aMinor > bMinor;
  return aPatch >= bPatch;
}

// ─── Manifest Parser (Pure — No I/O) ───────────────────

/**
 * Parse and validate a raw engine manifest object.
 * This is the primary public API — accepts pre-loaded data,
 * not file paths. The consumer is responsible for I/O.
 *
 * @param raw  Parsed JSON object (e.g. from JSON.parse)
 * @returns    Validated EngineManifest
 * @throws     Error if manifest is structurally invalid
 */
export function parseEngineManifest(raw: Record<string, unknown>): EngineManifest {
  const required = ['engine_id', 'engine_version', 'schema_versions', 'supported_adapter_contract_versions', 'minimum_adapter_contract_version', 'models'];
  for (const field of required) {
    if (!(field in raw)) {
      throw new Error(`Engine manifest missing required field: ${field}`);
    }
  }

  const schemaVersions = raw.schema_versions as Record<string, unknown>;
  const schemaRequired = ['capability_schema', 'topology_schema', 'entity_identity_schema', 'reasoning_protocol', 'adapter_contract', 'mutation_model', 'authority_model', 'confidence_model'];
  for (const field of schemaRequired) {
    if (!(field in schemaVersions)) {
      throw new Error(`Engine manifest schema_versions missing: ${field}`);
    }
  }

  const models = raw.models as Record<string, unknown>;
  const modelRequired = ['mutation_hierarchy', 'authority_scoring', 'confidence_propagation'];
  for (const field of modelRequired) {
    if (!(field in models)) {
      throw new Error(`Engine manifest models missing: ${field}`);
    }
  }

  return raw as unknown as EngineManifest;
}

/**
 * Load engine manifest from filesystem.
 * 
 * WORKSPACE-INTERNAL: This function requires Node.js `fs`.
 * External consumers should use `parseEngineManifest()` with
 * their own file-loading strategy.
 *
 * @param manifestPath  Absolute path to engine-manifest.json
 * @returns             Parsed and validated manifest
 * @throws              Error if manifest is missing or malformed
 */
export function loadEngineManifest(manifestPath: string): EngineManifest {
  // Dynamic require to avoid polluting the bundle for consumers
  // who only use parseEngineManifest()
  const fs = require('fs');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Engine manifest not found at: ${manifestPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  return parseEngineManifest(raw);
}

/**
 * Validate adapter compatibility against engine manifest.
 *
 * @param manifest   Loaded engine manifest
 * @param adapter    Adapter descriptor with contract version
 * @returns          Compatibility result
 */
export function validateAdapterCompatibility(
  manifest: EngineManifest,
  adapter: { 
    adapter_id: string; 
    engine_version: string;
    capability_schema: string;
    reasoning_protocol: string;
  },
): CompatibilityResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Engine version
  if (!semverGte(manifest.engine_version, adapter.engine_version)) {
    errors.push(`Adapter '${adapter.adapter_id}' requires engine version >= ${adapter.engine_version}, but running ${manifest.engine_version}`);
  }

  // 2. Capability schema version (MUST exactly match)
  if (adapter.capability_schema !== manifest.schema_versions.capability_schema) {
    errors.push(`Adapter '${adapter.adapter_id}' capability_schema version mismatch: ${adapter.capability_schema} !== ${manifest.schema_versions.capability_schema}`);
  }

  // 3. Reasoning protocol version (Adapter <= Engine)
  if (!semverGte(manifest.schema_versions.reasoning_protocol, adapter.reasoning_protocol)) {
    errors.push(`Adapter '${adapter.adapter_id}' reasoning_protocol version ${adapter.reasoning_protocol} exceeds engine version ${manifest.schema_versions.reasoning_protocol}`);
  }

  return {
    compatible: errors.length === 0,
    adapter_id: adapter.adapter_id,
    adapter_contract_version: adapter.engine_version,
    engine_version: manifest.engine_version,
    errors,
    warnings,
  };
}
