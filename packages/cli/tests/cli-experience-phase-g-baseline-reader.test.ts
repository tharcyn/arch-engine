/**
 * ═══════════════════════════════════════════════════════════
 *  CLI Experience Phase G — Baseline reader unit tests
 * ═══════════════════════════════════════════════════════════
 *
 *  Pins the contract of `readBaselineReport` against the
 *  v1.2.0 spec (docs/cli/baseline-comparison-spec.md §6, §8).
 *  No subprocess; we exercise the reader function directly.
 */

import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  readBaselineReport,
  BaselineReadError,
  compareSemver,
} from '../src/baseline-reader.js';

const RUNTIME_VERSION = '1.2.0';

let tmpRoot = '';

beforeAll(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-phaseG-reader-'));
});

afterAll(() => {
  if (tmpRoot && fs.existsSync(tmpRoot)) {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

function writeBaseline(name: string, body: unknown): string {
  const file = path.join(tmpRoot, `${name}.json`);
  fs.writeFileSync(file, typeof body === 'string' ? body : JSON.stringify(body), 'utf8');
  return file;
}

/** Build a minimal v2 envelope that should parse successfully. */
function validV2Envelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 'arch-engine.cli.v2',
    command: 'check',
    archEngineVersion: '1.2.0',
    emittedAt: '2026-05-11T00:00:00.000Z',
    status: 'passed',
    exitCode: 0,
    data: {
      topology: {
        canonical: {
          graphSurfaceVersion: '1.0.0',
          graphSurfaceHash: 'abc123',
          nodes: [{ id: '@x/a' }, { id: '@x/b' }],
          edges: [{ id: 'e_aabbccdd', from: '@x/a', to: '@x/b', type: 'workspace_dependency' }],
        },
      },
    },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════
//  Path / file existence
// ═══════════════════════════════════════════════════════════

describe('Phase G — baseline reader: path validation', () => {
  test('non-existent file → ARCH_ENGINE_BASELINE_NOT_FOUND', () => {
    expect(() =>
      readBaselineReport(path.join(tmpRoot, 'does-not-exist.json'), 'check', RUNTIME_VERSION),
    ).toThrow(BaselineReadError);
    try {
      readBaselineReport(path.join(tmpRoot, 'does-not-exist.json'), 'check', RUNTIME_VERSION);
    } catch (err) {
      if (err instanceof BaselineReadError) {
        expect(err.diagnostic.code).toBe('ARCH_ENGINE_BASELINE_NOT_FOUND');
      } else throw err;
    }
  });

  test('directory path → ARCH_ENGINE_BASELINE_NOT_FOUND', () => {
    const dirPath = fs.mkdtempSync(path.join(tmpRoot, 'a-dir-'));
    expect(() => readBaselineReport(dirPath, 'check', RUNTIME_VERSION)).toThrow(
      BaselineReadError,
    );
    try {
      readBaselineReport(dirPath, 'check', RUNTIME_VERSION);
    } catch (err) {
      if (err instanceof BaselineReadError) {
        expect(err.diagnostic.code).toBe('ARCH_ENGINE_BASELINE_NOT_FOUND');
      } else throw err;
    }
  });

  test('trailing slash → ARCH_ENGINE_BASELINE_NOT_FOUND', () => {
    try {
      readBaselineReport('some-path/', 'check', RUNTIME_VERSION);
      expect.unreachable('should have thrown');
    } catch (err) {
      if (err instanceof BaselineReadError) {
        expect(err.diagnostic.code).toBe('ARCH_ENGINE_BASELINE_NOT_FOUND');
      } else throw err;
    }
  });

  test('empty path → ARCH_ENGINE_BASELINE_NOT_FOUND', () => {
    try {
      readBaselineReport('', 'check', RUNTIME_VERSION);
      expect.unreachable('should have thrown');
    } catch (err) {
      if (err instanceof BaselineReadError) {
        expect(err.diagnostic.code).toBe('ARCH_ENGINE_BASELINE_NOT_FOUND');
      } else throw err;
    }
  });
});

// ═══════════════════════════════════════════════════════════
//  JSON parsing
// ═══════════════════════════════════════════════════════════

describe('Phase G — baseline reader: JSON parsing', () => {
  test('non-JSON content → ARCH_ENGINE_BASELINE_INVALID', () => {
    const p = writeBaseline('not-json', 'this is not json {');
    try {
      readBaselineReport(p, 'check', RUNTIME_VERSION);
      expect.unreachable('should have thrown');
    } catch (err) {
      if (err instanceof BaselineReadError) {
        expect(err.diagnostic.code).toBe('ARCH_ENGINE_BASELINE_INVALID');
      } else throw err;
    }
  });

  test('JSON array (not object) → ARCH_ENGINE_BASELINE_INVALID', () => {
    const p = writeBaseline('array', [1, 2, 3]);
    try {
      readBaselineReport(p, 'check', RUNTIME_VERSION);
      expect.unreachable('should have thrown');
    } catch (err) {
      if (err instanceof BaselineReadError) {
        expect(err.diagnostic.code).toBe('ARCH_ENGINE_BASELINE_INVALID');
      } else throw err;
    }
  });

  test('JSON null → ARCH_ENGINE_BASELINE_INVALID', () => {
    const p = writeBaseline('null', null);
    try {
      readBaselineReport(p, 'check', RUNTIME_VERSION);
      expect.unreachable('should have thrown');
    } catch (err) {
      if (err instanceof BaselineReadError) {
        expect(err.diagnostic.code).toBe('ARCH_ENGINE_BASELINE_INVALID');
      } else throw err;
    }
  });
});

// ═══════════════════════════════════════════════════════════
//  Schema / command checks
// ═══════════════════════════════════════════════════════════

describe('Phase G — baseline reader: schema validation', () => {
  test('wrong schemaVersion → ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA', () => {
    const p = writeBaseline('wrong-schema', validV2Envelope({ schemaVersion: 'arch-engine.cli.v1' }));
    try {
      readBaselineReport(p, 'check', RUNTIME_VERSION);
      expect.unreachable('should have thrown');
    } catch (err) {
      if (err instanceof BaselineReadError) {
        expect(err.diagnostic.code).toBe('ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA');
      } else throw err;
    }
  });

  test('missing schemaVersion → ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA', () => {
    const env = validV2Envelope() as Record<string, unknown>;
    delete env.schemaVersion;
    const p = writeBaseline('no-schema', env);
    try {
      readBaselineReport(p, 'check', RUNTIME_VERSION);
      expect.unreachable('should have thrown');
    } catch (err) {
      if (err instanceof BaselineReadError) {
        expect(err.diagnostic.code).toBe('ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA');
      } else throw err;
    }
  });

  test('unsupported command (doctor) → ARCH_ENGINE_BASELINE_COMMAND_MISMATCH', () => {
    const p = writeBaseline('doctor', validV2Envelope({ command: 'doctor' }));
    try {
      readBaselineReport(p, 'check', RUNTIME_VERSION);
      expect.unreachable('should have thrown');
    } catch (err) {
      if (err instanceof BaselineReadError) {
        expect(err.diagnostic.code).toBe('ARCH_ENGINE_BASELINE_COMMAND_MISMATCH');
      } else throw err;
    }
  });

  test('missing archEngineVersion → ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA', () => {
    const env = validV2Envelope() as Record<string, unknown>;
    delete env.archEngineVersion;
    const p = writeBaseline('no-version', env);
    try {
      readBaselineReport(p, 'check', RUNTIME_VERSION);
      expect.unreachable('should have thrown');
    } catch (err) {
      if (err instanceof BaselineReadError) {
        expect(err.diagnostic.code).toBe('ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA');
      } else throw err;
    }
  });

  test('missing data.topology.canonical → ARCH_ENGINE_BASELINE_INVALID', () => {
    const env = validV2Envelope() as Record<string, unknown>;
    (env.data as any).topology.canonical = undefined;
    delete (env.data as any).topology.canonical;
    const p = writeBaseline('no-canonical', env);
    try {
      readBaselineReport(p, 'check', RUNTIME_VERSION);
      expect.unreachable('should have thrown');
    } catch (err) {
      if (err instanceof BaselineReadError) {
        expect(err.diagnostic.code).toBe('ARCH_ENGINE_BASELINE_INVALID');
      } else throw err;
    }
  });
});

// ═══════════════════════════════════════════════════════════
//  Success paths
// ═══════════════════════════════════════════════════════════

describe('Phase G — baseline reader: success paths', () => {
  test('valid check baseline → returns typed result', () => {
    const p = writeBaseline('valid-check', validV2Envelope({ command: 'check' }));
    const result = readBaselineReport(p, 'check', RUNTIME_VERSION);
    expect(result.envelope.schemaVersion).toBe('arch-engine.cli.v2');
    expect(result.envelope.command).toBe('check');
    expect(result.canonicalTopology.nodes.length).toBe(2);
    expect(result.canonicalTopology.edges.length).toBe(1);
    expect(result.warning).toBeUndefined();
  });

  test('valid analyze baseline serves a check run', () => {
    const p = writeBaseline('valid-analyze', validV2Envelope({ command: 'analyze' }));
    const result = readBaselineReport(p, 'check', RUNTIME_VERSION);
    expect(result.envelope.command).toBe('analyze');
  });

  test('valid inspect baseline serves a check run', () => {
    const p = writeBaseline('valid-inspect', validV2Envelope({ command: 'inspect' }));
    const result = readBaselineReport(p, 'check', RUNTIME_VERSION);
    expect(result.envelope.command).toBe('inspect');
  });

  test('relative path resolves against process.cwd()', () => {
    // Write a baseline at a relative location.
    const cwdBefore = process.cwd();
    process.chdir(tmpRoot);
    try {
      writeBaseline('rel-target', validV2Envelope());
      const result = readBaselineReport('./rel-target.json', 'check', RUNTIME_VERSION);
      expect(result.envelope.schemaVersion).toBe('arch-engine.cli.v2');
      expect(path.isAbsolute(result.resolvedPath)).toBe(true);
    } finally {
      process.chdir(cwdBefore);
    }
  });
});

// ═══════════════════════════════════════════════════════════
//  Newer-than-runtime warning
// ═══════════════════════════════════════════════════════════

describe('Phase G — baseline reader: newer-than-runtime warning', () => {
  test('baseline emitted by newer runtime → WARNING diagnostic, no throw', () => {
    const p = writeBaseline('newer', validV2Envelope({ archEngineVersion: '99.0.0' }));
    const result = readBaselineReport(p, 'check', RUNTIME_VERSION);
    expect(result.warning).toBeDefined();
    expect(result.warning!.severity).toBe('WARNING');
    expect(result.warning!.code).toBe('ARCH_ENGINE_BASELINE_UNSUPPORTED_SCHEMA');
  });

  test('baseline emitted by same runtime → no warning', () => {
    const p = writeBaseline('same', validV2Envelope({ archEngineVersion: RUNTIME_VERSION }));
    const result = readBaselineReport(p, 'check', RUNTIME_VERSION);
    expect(result.warning).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════
//  Semver compare helper
// ═══════════════════════════════════════════════════════════

describe('Phase G — semver compare helper', () => {
  test('1.2.0 > 1.1.9', () => {
    expect(compareSemver('1.2.0', '1.1.9')).toBeGreaterThan(0);
  });
  test('1.2.0 == 1.2.0', () => {
    expect(compareSemver('1.2.0', '1.2.0')).toBe(0);
  });
  test('1.1.0 < 1.2.0', () => {
    expect(compareSemver('1.1.0', '1.2.0')).toBeLessThan(0);
  });
  test('handles pre-release suffix', () => {
    expect(compareSemver('1.2.0-rc.1', '1.2.0')).toBe(0); // pre-release compares as base
  });
});
