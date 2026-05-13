/**
 * ═══════════════════════════════════════════════════════════
 *  Invalid-fixture tests for @arch-engine/agp-emitter
 * ═══════════════════════════════════════════════════════════
 *
 *  Each fixture MUST be rejected with a specific AGP_EMITTER_*
 *  error code. The mapping mirrors the conformance corpus rules.
 */

import { describe, expect, test } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { emitAgpBundle, isAgpEmitterError } from '../src/index.js';

const FIX_DIR = path.join(__dirname, 'fixtures', 'invalid-input');

function readFixture(name: string): { parsed: unknown; raw: Buffer } {
  const filePath = path.join(FIX_DIR, name);
  const raw = fs.readFileSync(filePath);
  return { parsed: JSON.parse(raw.toString('utf8')), raw };
}

describe('emitAgpBundle — rejects invalid inputs', () => {
  test('rejects JSON v1 input with AGP_EMITTER_UNSUPPORTED_SCHEMA_VERSION', () => {
    const { parsed, raw } = readFixture('json-v1.json');
    try {
      emitAgpBundle(parsed, raw);
      throw new Error('expected emit to throw');
    } catch (err) {
      expect(isAgpEmitterError(err)).toBe(true);
      if (isAgpEmitterError(err)) {
        expect(err.code).toBe('AGP_EMITTER_UNSUPPORTED_SCHEMA_VERSION');
      }
    }
  });

  test('rejects unsupported command (doctor) with AGP_EMITTER_UNSUPPORTED_COMMAND', () => {
    const { parsed, raw } = readFixture('unsupported-command.json');
    try {
      emitAgpBundle(parsed, raw);
      throw new Error('expected emit to throw');
    } catch (err) {
      expect(isAgpEmitterError(err)).toBe(true);
      if (isAgpEmitterError(err)) {
        expect(err.code).toBe('AGP_EMITTER_UNSUPPORTED_COMMAND');
      }
    }
  });

  test('rejects missing topology with AGP_EMITTER_MISSING_TOPOLOGY', () => {
    const { parsed, raw } = readFixture('missing-topology.json');
    try {
      emitAgpBundle(parsed, raw);
      throw new Error('expected emit to throw');
    } catch (err) {
      expect(isAgpEmitterError(err)).toBe(true);
      if (isAgpEmitterError(err)) {
        expect(err.code).toBe('AGP_EMITTER_MISSING_TOPOLOGY');
      }
    }
  });

  test('rejects absolute path in input metadata with AGP_EMITTER_ABSOLUTE_PATH_REJECTED', () => {
    const { parsed, raw } = readFixture('absolute-path-in-input.json');
    try {
      emitAgpBundle(parsed, raw);
      throw new Error('expected emit to throw');
    } catch (err) {
      expect(isAgpEmitterError(err)).toBe(true);
      if (isAgpEmitterError(err)) {
        expect(err.code).toBe('AGP_EMITTER_ABSOLUTE_PATH_REJECTED');
      }
    }
  });

  test('rejects non-object input', () => {
    try {
      emitAgpBundle('not an object', undefined);
      throw new Error('expected emit to throw');
    } catch (err) {
      expect(isAgpEmitterError(err)).toBe(true);
      if (isAgpEmitterError(err)) {
        expect(err.code).toBe('AGP_EMITTER_INPUT_PARSE_FAILED');
      }
    }
  });

  test('rejects null input', () => {
    try {
      emitAgpBundle(null, undefined);
      throw new Error('expected emit to throw');
    } catch (err) {
      expect(isAgpEmitterError(err)).toBe(true);
      if (isAgpEmitterError(err)) {
        expect(err.code).toBe('AGP_EMITTER_INPUT_PARSE_FAILED');
      }
    }
  });

  test('rejects malformed adapter metadata', () => {
    const malformed: Record<string, unknown> = {
      schemaVersion: 'arch-engine.cli.v2',
      archEngineVersion: '1.4.0',
      command: 'inspect',
      status: 'passed',
      exitCode: 0,
      diagnostics: [],
      data: {
        topology: { canonical: { graphSurfaceHash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000', graphSurfaceVersion: '1.0.0', nodes: [], edges: [] } },
        adapter: { name: '', version: '0.1.0', packageManager: 'pnpm', workspaceKind: 'pnpm-workspace', confidence: 'HIGH', reasons: [], warnings: [], alsoDetected: [], metadata: {} },
      },
    };
    try {
      emitAgpBundle(malformed, undefined);
      throw new Error('expected emit to throw');
    } catch (err) {
      expect(isAgpEmitterError(err)).toBe(true);
      if (isAgpEmitterError(err)) {
        expect(err.code).toBe('AGP_EMITTER_INVALID_ADAPTER_METADATA');
      }
    }
  });
});
