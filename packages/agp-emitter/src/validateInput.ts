/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/agp-emitter — Input contract validation
 * ═══════════════════════════════════════════════════════════
 *
 *  Enforces the input contract from spec §8:
 *    - schemaVersion === "arch-engine.cli.v2"
 *    - command ∈ { inspect, analyze, check }
 *    - archEngineVersion is a non-empty string
 *    - exitCode ∈ {0,1,2,3,5}
 *    - data.topology.canonical is present and well-shaped
 *    - data.adapter, when present, is well-shaped
 *    - data.drift, when present, is well-shaped
 *    - diagnostics, when present, is an array
 *    - no absolute paths anywhere in the envelope
 *
 *  Throws `AgpEmitterError` with the canonical AGP_EMITTER_* codes
 *  documented in the conformance README. Never throws raw
 *  `TypeError` / `RangeError` — every reject is structured.
 */

import { AgpEmitterError } from './errors.js';
import { rejectAbsolutePathsIn } from './paths.js';
import type {
  ArchEngineJsonV2Envelope,
  SupportedArchEngineCommand,
} from './types.js';

const SUPPORTED_COMMANDS: ReadonlySet<string> = new Set([
  'inspect',
  'analyze',
  'check',
]);

const VALID_EXIT_CODES: ReadonlySet<number> = new Set([0, 1, 2, 3, 5]);

/**
 * Parse + validate an Arch-Engine JSON v2 envelope. The function
 * is strict on the **input boundary** but tolerates additional
 * envelope keys (`summary`, `artifacts`, `nextActions`, etc.) —
 * the emitter consumes only the parts it maps.
 *
 * Returns a typed envelope reference; throws on validation failure.
 */
export function validateInputEnvelope(value: unknown): {
  envelope: ArchEngineJsonV2Envelope;
  command: SupportedArchEngineCommand;
} {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new AgpEmitterError({
      code: 'AGP_EMITTER_INPUT_PARSE_FAILED',
      message:
        'Input must be a JSON object (the top-level Arch-Engine JSON v2 envelope).',
      fix: 'Re-run arch-engine with --json --json-schema=v2 --output <file> and pass the resulting file.',
    });
  }
  const env = value as Record<string, unknown>;

  // schemaVersion
  if (env.schemaVersion !== 'arch-engine.cli.v2') {
    throw new AgpEmitterError({
      code: 'AGP_EMITTER_UNSUPPORTED_SCHEMA_VERSION',
      message: `Input is not Arch-Engine JSON v2. Expected schemaVersion === 'arch-engine.cli.v2'; got ${printableJsonValue(env.schemaVersion)}.`,
      fix: 'Re-run arch-engine with --json --json-schema=v2 to produce the v2 envelope, then re-invoke the emitter on the v2 output.',
      details: {
        field: 'schemaVersion',
        expected: 'arch-engine.cli.v2',
        observed: env.schemaVersion ?? null,
      },
    });
  }

  // command
  const command = env.command;
  if (typeof command !== 'string') {
    throw new AgpEmitterError({
      code: 'AGP_EMITTER_UNSUPPORTED_COMMAND',
      message: `Input envelope.command must be a string; got ${printableJsonValue(command)}.`,
      fix: 'Re-run arch-engine inspect/analyze/check with --json --json-schema=v2.',
      details: { field: 'command', observed: command ?? null },
    });
  }
  if (!SUPPORTED_COMMANDS.has(command)) {
    throw new AgpEmitterError({
      code: 'AGP_EMITTER_UNSUPPORTED_COMMAND',
      message: `AGP MVP supports only inspect/analyze/check inputs; got command=${JSON.stringify(command)}.`,
      fix: 'doctor and explain are intentionally out of MVP scope. Use inspect/analyze/check.',
      details: {
        field: 'command',
        observed: command,
        expected: 'inspect | analyze | check',
      },
    });
  }

  // archEngineVersion
  if (typeof env.archEngineVersion !== 'string' || env.archEngineVersion.length === 0) {
    throw new AgpEmitterError({
      code: 'AGP_EMITTER_INPUT_PARSE_FAILED',
      message: 'Input envelope.archEngineVersion must be a non-empty string.',
      details: { field: 'archEngineVersion', observed: env.archEngineVersion ?? null },
    });
  }

  // exitCode
  if (typeof env.exitCode !== 'number' || !VALID_EXIT_CODES.has(env.exitCode)) {
    throw new AgpEmitterError({
      code: 'AGP_EMITTER_INPUT_PARSE_FAILED',
      message: `Input envelope.exitCode must be one of 0/1/2/3/5; got ${printableJsonValue(env.exitCode)}.`,
      details: { field: 'exitCode', observed: env.exitCode ?? null },
    });
  }

  if (typeof env.status !== 'string' || env.status.length === 0) {
    throw new AgpEmitterError({
      code: 'AGP_EMITTER_INPUT_PARSE_FAILED',
      message: 'Input envelope.status must be a non-empty string.',
      details: { field: 'status', observed: env.status ?? null },
    });
  }

  // data
  if (!env.data || typeof env.data !== 'object' || Array.isArray(env.data)) {
    throw new AgpEmitterError({
      code: 'AGP_EMITTER_MISSING_TOPOLOGY',
      message: 'Input envelope.data is missing or malformed.',
      fix: 'inspect/analyze/check JSON v2 always emits a data object; the input is not v2 if data is missing.',
    });
  }
  const data = env.data as Record<string, unknown>;

  // data.topology.canonical
  const topology = (data.topology as Record<string, unknown> | undefined) ?? undefined;
  const canonical = topology
    ? (topology.canonical as Record<string, unknown> | undefined)
    : undefined;
  if (!canonical || typeof canonical !== 'object' || Array.isArray(canonical)) {
    throw new AgpEmitterError({
      code: 'AGP_EMITTER_MISSING_TOPOLOGY',
      message:
        'Input envelope.data.topology.canonical is missing. The AGP emitter requires the canonical-topology block (locked in JSON v2 since v1.2.0).',
      fix: 'Re-run arch-engine inspect/analyze/check with --json --json-schema=v2.',
    });
  }
  if (!Array.isArray(canonical.nodes)) {
    throw new AgpEmitterError({
      code: 'AGP_EMITTER_MISSING_TOPOLOGY',
      message:
        'data.topology.canonical.nodes must be an array.',
      details: { field: 'data.topology.canonical.nodes', observed: canonical.nodes ?? null },
    });
  }
  if (!Array.isArray(canonical.edges)) {
    throw new AgpEmitterError({
      code: 'AGP_EMITTER_MISSING_TOPOLOGY',
      message: 'data.topology.canonical.edges must be an array.',
      details: { field: 'data.topology.canonical.edges', observed: canonical.edges ?? null },
    });
  }

  // data.adapter (optional; if present, validate basic shape)
  if (data.adapter !== undefined) {
    validateAdapterShape(data.adapter);
  }

  // data.drift (optional; if present, validate basic shape)
  if (data.drift !== undefined) {
    validateDriftShape(data.drift);
  }

  // diagnostics
  if (env.diagnostics !== undefined && !Array.isArray(env.diagnostics)) {
    throw new AgpEmitterError({
      code: 'AGP_EMITTER_INPUT_PARSE_FAILED',
      message: 'Input envelope.diagnostics must be an array (or absent).',
      details: { field: 'diagnostics', observed: env.diagnostics ?? null },
    });
  }

  // Final whole-tree path scan.
  rejectAbsolutePathsIn(env, 'JSON v2 input');

  return {
    envelope: env as unknown as ArchEngineJsonV2Envelope,
    command: command as SupportedArchEngineCommand,
  };
}

function validateAdapterShape(adapter: unknown): void {
  if (!adapter || typeof adapter !== 'object' || Array.isArray(adapter)) {
    throw new AgpEmitterError({
      code: 'AGP_EMITTER_INVALID_ADAPTER_METADATA',
      message: 'data.adapter must be an object when present.',
      details: { field: 'data.adapter', observed: adapter },
    });
  }
  const a = adapter as Record<string, unknown>;
  for (const required of ['name', 'version', 'packageManager', 'workspaceKind', 'confidence']) {
    if (typeof a[required] !== 'string' || (a[required] as string).length === 0) {
      throw new AgpEmitterError({
        code: 'AGP_EMITTER_INVALID_ADAPTER_METADATA',
        message: `data.adapter.${required} must be a non-empty string.`,
        details: { field: `data.adapter.${required}`, observed: a[required] ?? null },
      });
    }
  }
  if (a.metadata !== undefined && (a.metadata === null || typeof a.metadata !== 'object' || Array.isArray(a.metadata))) {
    throw new AgpEmitterError({
      code: 'AGP_EMITTER_INVALID_ADAPTER_METADATA',
      message: 'data.adapter.metadata must be an object when present.',
      details: { field: 'data.adapter.metadata', observed: a.metadata },
    });
  }
}

function validateDriftShape(drift: unknown): void {
  if (!drift || typeof drift !== 'object' || Array.isArray(drift)) {
    throw new AgpEmitterError({
      code: 'AGP_EMITTER_INVALID_DRIFT_BLOCK',
      message: 'data.drift must be an object when present.',
      details: { field: 'data.drift', observed: drift },
    });
  }
  const d = drift as Record<string, unknown>;
  for (const key of ['baseline', 'topology', 'violations', 'signal']) {
    if (!d[key] || typeof d[key] !== 'object') {
      throw new AgpEmitterError({
        code: 'AGP_EMITTER_INVALID_DRIFT_BLOCK',
        message: `data.drift.${key} is missing or malformed.`,
        details: { field: `data.drift.${key}`, observed: d[key] ?? null },
      });
    }
  }
}

function printableJsonValue(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '<unprintable>';
  }
}
