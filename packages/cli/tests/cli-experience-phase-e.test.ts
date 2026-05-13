/**
 * ═══════════════════════════════════════════════════════════
 *  CLI Experience MVP — Phase E: JSON / Error-Language v1.0.3
 * ═══════════════════════════════════════════════════════════
 *
 *  Pinned tests for the v1.0.3 JSON / Error-Language polish
 *  layer specified in `docs/cli/json-error-language-spec.md`
 *  §15.1–§15.6.
 *
 *  Covers:
 *
 *  - §15.1  Unit-test coverage for error-codes.ts and
 *           format-error.ts (vocabulary, rendering, debug gate).
 *  - §15.2  Process-level tests: every command's --json carries
 *           a `diagnostics: []` array, populated correctly per
 *           scenario.
 *  - §15.3  JSON-shape backward compatibility: every existing
 *           v1.0.2 key still appears with the same value type;
 *           additive fields are present.
 *  - §15.4  Stack-trace policy: stack frames are hidden by
 *           default, surfaced only when DEBUG=arch-engine:* is set.
 *  - §15.5  Path normalisation: `artifactRelativePath` is POSIX,
 *           never absolute, never starts with `/`.
 *  - §15.6  Determinism: running the same command twice on the
 *           same fixture produces byte-identical --json output.
 *
 *  Stacks on Phase A + B + C + D-Lite. None of those tests
 *  should be perturbed by Phase E; this file only adds.
 */

import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  ARCH_ENGINE_ERROR_CODES,
  getArchEngineErrorMetadata,
  listArchEngineErrorCodes,
  type ArchEngineErrorCode,
} from '../src/error-codes.js';
import {
  buildDiagnostic,
  diagnosticFromUnknownError,
  diagnosticToJson,
  exitCodeForDiagnostic,
  formatDiagnosticForHuman,
  inspectRenderedDiagnostic,
  isDebugEnabled,
} from '../src/format-error.js';

// ─── Fixture management ────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '../../..');
const CLI_BIN = path.join(REPO_ROOT, 'packages/cli/dist/bin.js');
const SAMPLE_FIXTURE = path.join(REPO_ROOT, 'examples/sample-monorepo');
const DEMO_DRIFT = path.join(REPO_ROOT, 'examples/demo-drift');

beforeAll(() => {
  if (!fs.existsSync(CLI_BIN)) {
    throw new Error(
      `CLI bin missing: ${CLI_BIN}. Run \`npm run build\` before running these tests.`,
    );
  }
});

afterAll(() => {
  // Clean up artifact directories that may leak when fixtures are run
  // in-place (the withFixtureCopy helper below is what tests use, but
  // belt-and-braces).
  for (const dir of [SAMPLE_FIXTURE, DEMO_DRIFT]) {
    const archDir = path.join(dir, '.arch-engine');
    if (fs.existsSync(archDir)) {
      fs.rmSync(archDir, { recursive: true, force: true });
    }
  }
});

function copyDirSync(src: string, dst: string): void {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else if (entry.isFile()) fs.copyFileSync(s, d);
  }
}

interface RunResult {
  stdout: string;
  stderr: string;
  status: number | null;
}

function runCli(args: string[], cwd: string, extraEnv: Record<string, string> = {}): RunResult {
  const result = spawnSync('node', [CLI_BIN, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', ...extraEnv },
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
}

function withFixtureCopy<T>(src: string, fn: (cwd: string) => T): T {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-cli-phaseE-'));
  try {
    copyDirSync(src, tmp);
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ═══════════════════════════════════════════════════════════
//  §15.1 — Unit tests: error-codes.ts vocabulary
// ═══════════════════════════════════════════════════════════

describe('Phase E — error-codes.ts', () => {
  test('includes the 11 v1.0.3 ARCH_ENGINE_* codes per spec §6.2 (additive in later versions)', () => {
    // v1.0.3 locked these 11 codes as the floor. Later versions may
    // grow the vocabulary additively (v1.2.0 added 5 BASELINE/DRIFT
    // codes; future versions may add more). Phase E asserts that the
    // v1.0.3 floor is preserved in order; downstream tests for newer
    // versions assert their own additions.
    const v1_0_3_FLOOR = [
      'ARCH_ENGINE_POLICY_NOT_FOUND',
      'ARCH_ENGINE_INVALID_POLICY',
      'ARCH_ENGINE_INVALID_CONFIG',
      'ARCH_ENGINE_ADAPTER_NOT_FOUND',
      'ARCH_ENGINE_UNSUPPORTED_WORKSPACE',
      'ARCH_ENGINE_TOPOLOGY_LOW_SIGNAL',
      'ARCH_ENGINE_GRAPH_SHAPE_INVALID',
      'ARCH_ENGINE_TARGET_NOT_FOUND',
      'ARCH_ENGINE_BLOCKING_VIOLATION',
      'ARCH_ENGINE_INTERNAL_INVARIANT_FAILED',
      'ARCH_ENGINE_NO_BASELINE',
    ];
    // The locked v1.0.3 prefix must come first, in this exact order.
    expect(ARCH_ENGINE_ERROR_CODES.slice(0, v1_0_3_FLOOR.length)).toEqual(v1_0_3_FLOOR);
    // Any additional codes are allowed (introduced by later versions).
    expect(ARCH_ENGINE_ERROR_CODES.length).toBeGreaterThanOrEqual(v1_0_3_FLOOR.length);
  });

  test('every code maps to a metadata record with severity/exit/title/fix', () => {
    for (const code of ARCH_ENGINE_ERROR_CODES) {
      const meta = getArchEngineErrorMetadata(code);
      expect(meta.code).toBe(code);
      expect(meta.severity).toMatch(/^(INFO|WARNING|BLOCKING|ERROR|INTERNAL)$/);
      expect([0, 1, 2, 3, 5]).toContain(meta.exitCode);
      expect(meta.title.length).toBeGreaterThan(0);
      expect(meta.defaultFix.length).toBeGreaterThan(0);
      expect(typeof meta.ciBlocking).toBe('boolean');
    }
  });

  test('listArchEngineErrorCodes returns all metadata in declared order', () => {
    const list = listArchEngineErrorCodes();
    expect(list.length).toBe(ARCH_ENGINE_ERROR_CODES.length);
    expect(list.map((m) => m.code)).toEqual([...ARCH_ENGINE_ERROR_CODES]);
  });

  test('exit-code semantics match spec §5', () => {
    // Sample the 11 codes against the locked exit-code table.
    expect(getArchEngineErrorMetadata('ARCH_ENGINE_POLICY_NOT_FOUND').exitCode).toBe(0);
    expect(getArchEngineErrorMetadata('ARCH_ENGINE_TOPOLOGY_LOW_SIGNAL').exitCode).toBe(0);
    expect(getArchEngineErrorMetadata('ARCH_ENGINE_TARGET_NOT_FOUND').exitCode).toBe(0);
    expect(getArchEngineErrorMetadata('ARCH_ENGINE_NO_BASELINE').exitCode).toBe(0);
    expect(getArchEngineErrorMetadata('ARCH_ENGINE_BLOCKING_VIOLATION').exitCode).toBe(1);
    expect(getArchEngineErrorMetadata('ARCH_ENGINE_INVALID_POLICY').exitCode).toBe(2);
    expect(getArchEngineErrorMetadata('ARCH_ENGINE_INVALID_CONFIG').exitCode).toBe(2);
    expect(getArchEngineErrorMetadata('ARCH_ENGINE_ADAPTER_NOT_FOUND').exitCode).toBe(3);
    expect(getArchEngineErrorMetadata('ARCH_ENGINE_UNSUPPORTED_WORKSPACE').exitCode).toBe(3);
    expect(getArchEngineErrorMetadata('ARCH_ENGINE_GRAPH_SHAPE_INVALID').exitCode).toBe(5);
    expect(getArchEngineErrorMetadata('ARCH_ENGINE_INTERNAL_INVARIANT_FAILED').exitCode).toBe(5);
  });

  test('ciBlocking flag matches severity (INFO/WARNING never block CI)', () => {
    for (const code of ARCH_ENGINE_ERROR_CODES) {
      const meta = getArchEngineErrorMetadata(code);
      if (meta.severity === 'INFO' || meta.severity === 'WARNING') {
        expect(meta.ciBlocking).toBe(false);
      }
      if (meta.severity === 'BLOCKING' || meta.severity === 'ERROR' || meta.severity === 'INTERNAL') {
        expect(meta.ciBlocking).toBe(true);
      }
    }
  });

  // v1.3.1 P3-2: the LOW_CONFIDENCE fix text must mention the
  // pnpm-workspace.yaml edge case so users with a pnpm-lock.yaml-only
  // single-package repo don't conclude "Arch-Engine doesn't support
  // pnpm." The wording is also a soft pointer for npm/yarn workspace
  // users on a single-package repo.
  test('ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE.defaultFix mentions pnpm-workspace.yaml edge case', () => {
    const meta = getArchEngineErrorMetadata('ARCH_ENGINE_ADAPTER_LOW_CONFIDENCE');
    expect(meta.severity).toBe('WARNING');
    expect(meta.exitCode).toBe(0);
    expect(meta.ciBlocking).toBe(false);
    expect(meta.defaultFix).toMatch(/pnpm-workspace\.yaml/);
    expect(meta.defaultFix).toMatch(/pnpm-lock\.yaml/);
    // Calls out single-package repos as informational.
    expect(meta.defaultFix.toLowerCase()).toMatch(/single[- ]package|informational/);
    // Calls out npm/yarn workspaces field too.
    expect(meta.defaultFix.toLowerCase()).toMatch(/workspaces.*field|workspaces field/);
  });
});

// ═══════════════════════════════════════════════════════════
//  §15.1 — Unit tests: format-error.ts rendering
// ═══════════════════════════════════════════════════════════

describe('Phase E — format-error.ts rendering', () => {
  test('formatDiagnosticForHuman produces Title/Problem/Fix/Exit/Docs shape (ERROR)', () => {
    const d = buildDiagnostic({
      code: 'ARCH_ENGINE_ADAPTER_NOT_FOUND',
      message: 'Adapter @arch-engine/adapter-monorepo is not installed.',
    });
    const text = formatDiagnosticForHuman(d);
    const shape = inspectRenderedDiagnostic(text);
    expect(shape.title.length).toBeGreaterThan(0);
    expect(shape.hasProblem).toBe(true);
    expect(shape.hasFix).toBe(true);
    expect(shape.hasExit).toBe(true);
    expect(shape.hasDocs).toBe(true);
    expect(shape.hasStack).toBe(false);
    // Exit line text must reflect the spec semantic.
    expect(text).toMatch(/^Exit 3: adapter or workspace failure\.$/m);
  });

  test('formatDiagnosticForHuman uses Next: instead of Fix: for INFO severity', () => {
    const d = buildDiagnostic({
      code: 'ARCH_ENGINE_POLICY_NOT_FOUND',
      message: 'No policy file is configured yet.',
    });
    const text = formatDiagnosticForHuman(d);
    expect(text).toMatch(/^Next:/m);
    expect(text).not.toMatch(/^Fix:/m);
    // INFO severity does NOT print an Exit line.
    expect(text).not.toMatch(/^Exit \d+:/m);
  });

  test('formatDiagnosticForHuman omits Exit line for WARNING severity', () => {
    const d = buildDiagnostic({
      code: 'ARCH_ENGINE_TOPOLOGY_LOW_SIGNAL',
      message: 'Coverage is below the quality floor.',
    });
    const text = formatDiagnosticForHuman(d);
    expect(text).toMatch(/^Fix:/m);
    expect(text).not.toMatch(/^Exit \d+:/m);
  });

  test('formatDiagnosticForHuman emits Exit line for BLOCKING severity', () => {
    const d = buildDiagnostic({
      code: 'ARCH_ENGINE_BLOCKING_VIOLATION',
      message: 'Detected 1 blocking architecture violation.',
    });
    const text = formatDiagnosticForHuman(d);
    expect(text).toMatch(/^Exit 1: blocking architecture violations\.$/m);
  });

  test('formatDiagnosticForHuman emits Exit line for INTERNAL severity', () => {
    const d = buildDiagnostic({
      code: 'ARCH_ENGINE_INTERNAL_INVARIANT_FAILED',
      message: 'Boom.',
    });
    const text = formatDiagnosticForHuman(d);
    expect(text).toMatch(/^Exit 5: internal invariant failure\.$/m);
  });

  test('formatDiagnosticForHuman never includes stack frames', () => {
    // Even if we sneak a stack-looking string into the message, the
    // renderer must not produce a "    at " frame line of its own.
    const d = buildDiagnostic({
      code: 'ARCH_ENGINE_INTERNAL_INVARIANT_FAILED',
      message: 'fake error message without frames',
    });
    const text = formatDiagnosticForHuman(d);
    expect(/\n\s+at\s+/.test(text)).toBe(false);
  });

  test('diagnosticToJson omits undefined optional fields per spec §12.4', () => {
    const d = buildDiagnostic({
      code: 'ARCH_ENGINE_POLICY_NOT_FOUND',
      message: 'No policy.',
    });
    const json = diagnosticToJson(d);
    // Required fields present.
    expect(json.code).toBe('ARCH_ENGINE_POLICY_NOT_FOUND');
    expect(json.severity).toBe('INFO');
    expect(typeof json.title).toBe('string');
    expect(typeof json.message).toBe('string');
    expect(typeof json.ciBlocking).toBe('boolean');
    // Optional fields omitted (not undefined keys).
    expect('path' in json).toBe(false);
    expect('details' in json).toBe(false);
  });

  test('diagnosticToJson preserves details when supplied', () => {
    const d = buildDiagnostic({
      code: 'ARCH_ENGINE_TARGET_NOT_FOUND',
      message: 'Target not found',
      details: { target: 'foo' },
    });
    const json = diagnosticToJson(d);
    expect(json.details).toEqual({ target: 'foo' });
  });

  test('diagnosticFromUnknownError maps any unknown throw to INTERNAL', () => {
    const d = diagnosticFromUnknownError(new Error('something broke'));
    expect(d.code).toBe('ARCH_ENGINE_INTERNAL_INVARIANT_FAILED');
    expect(d.severity).toBe('INTERNAL');
    expect(d.message).toContain('something broke');
    expect(d.message).toMatch(/bug/i);
  });

  test('exitCodeForDiagnostic returns the spec exit code', () => {
    const d = buildDiagnostic({
      code: 'ARCH_ENGINE_BLOCKING_VIOLATION',
      message: 'X',
    });
    expect(exitCodeForDiagnostic(d)).toBe(1);
  });

  test('every locked code renders a non-empty Title and a non-empty Fix/Next', () => {
    for (const code of ARCH_ENGINE_ERROR_CODES) {
      const d = buildDiagnostic({ code: code as ArchEngineErrorCode, message: 'msg' });
      const text = formatDiagnosticForHuman(d);
      const shape = inspectRenderedDiagnostic(text);
      expect(shape.title.length).toBeGreaterThan(0);
      expect(shape.hasFix).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════
//  §15.4 — isDebugEnabled gating
// ═══════════════════════════════════════════════════════════

describe('Phase E — isDebugEnabled() debug gate', () => {
  const original = process.env.DEBUG;

  afterAll(() => {
    if (original === undefined) delete process.env.DEBUG;
    else process.env.DEBUG = original;
  });

  test('false when DEBUG is unset', () => {
    delete process.env.DEBUG;
    expect(isDebugEnabled()).toBe(false);
  });

  test('false when DEBUG is empty string', () => {
    process.env.DEBUG = '';
    expect(isDebugEnabled()).toBe(false);
  });

  test('true when DEBUG=arch-engine', () => {
    process.env.DEBUG = 'arch-engine';
    expect(isDebugEnabled()).toBe(true);
  });

  test('true when DEBUG=arch-engine:*', () => {
    process.env.DEBUG = 'arch-engine:*';
    expect(isDebugEnabled()).toBe(true);
  });

  test('true when DEBUG=arch-engine:foo', () => {
    process.env.DEBUG = 'arch-engine:foo';
    expect(isDebugEnabled()).toBe(true);
  });

  test('true when DEBUG=*', () => {
    process.env.DEBUG = '*';
    expect(isDebugEnabled()).toBe(true);
  });

  test('false when DEBUG matches an unrelated namespace', () => {
    process.env.DEBUG = 'express:*';
    expect(isDebugEnabled()).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════
//  §15.2 / §15.3 — Process-level: diagnostics on each command
// ═══════════════════════════════════════════════════════════

describe('Phase E — process-level: diagnostics[] on every --json', () => {
  test('doctor --json on no-policy fixture: diagnostics[] includes POLICY_NOT_FOUND', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['doctor', '--json'], cwd);
      expect(status).toBe(0);
      const obj = JSON.parse(stdout);
      // Additive field is present.
      expect(Array.isArray(obj.diagnostics)).toBe(true);
      const codes: string[] = obj.diagnostics.map((d: { code: string }) => d.code);
      expect(codes).toContain('ARCH_ENGINE_POLICY_NOT_FOUND');
      // Existing keys preserved (sample of pre-1.0.3 fields).
      expect(obj).toHaveProperty('environment');
      expect(obj).toHaveProperty('hasPolicyFile', false);
    });
  });

  test('inspect --json: diagnostics[] always present (even when empty)', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['inspect', '--json'], cwd);
      expect(status).toBe(0);
      const obj = JSON.parse(stdout);
      expect(Array.isArray(obj.diagnostics)).toBe(true);
      // Existing keys preserved.
      expect(obj).toHaveProperty('nodes');
      expect(obj).toHaveProperty('edges');
      expect(obj).toHaveProperty('coverage');
    });
  });

  test('analyze --json on no-policy fixture: diagnostics[] includes POLICY_NOT_FOUND', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['analyze', '--json'], cwd);
      expect(status).toBe(0);
      const obj = JSON.parse(stdout);
      expect(Array.isArray(obj.diagnostics)).toBe(true);
      const codes: string[] = obj.diagnostics.map((d: { code: string }) => d.code);
      expect(codes).toContain('ARCH_ENGINE_POLICY_NOT_FOUND');
      // Phase A fields preserved.
      expect(obj).toHaveProperty('policyConfigured', false);
      expect(obj).toHaveProperty('headlineKind');
    });
  });

  test('check --json on no-policy fixture: diagnostics[] has POLICY_NOT_FOUND, violations: []', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['check', '--json'], cwd);
      expect(status).toBe(0);
      const obj = JSON.parse(stdout);
      // §15.3 backward-compat: existing keys preserved.
      expect(obj).toHaveProperty('score');
      expect(obj).toHaveProperty('stabilityTier');
      expect(obj).toHaveProperty('artifactPath');
      expect(obj).toHaveProperty('policyConfigured', false);
      // §15.3 additive: diagnostics[], violations[], artifactRelativePath.
      expect(Array.isArray(obj.diagnostics)).toBe(true);
      const codes: string[] = obj.diagnostics.map((d: { code: string }) => d.code);
      expect(codes).toContain('ARCH_ENGINE_POLICY_NOT_FOUND');
      expect(Array.isArray(obj.violations)).toBe(true);
      expect(obj.violations.length).toBe(0);
      expect(typeof obj.artifactRelativePath).toBe('string');
    });
  });

  test('check --json on demo-drift: violations[] populated, BLOCKING_VIOLATION diagnostic, exit 1', () => {
    withFixtureCopy(DEMO_DRIFT, (cwd) => {
      const { stdout, status } = runCli(['check', '--json'], cwd);
      expect(status).toBe(1);
      const obj = JSON.parse(stdout);
      // violations[] populated.
      expect(Array.isArray(obj.violations)).toBe(true);
      expect(obj.violations.length).toBeGreaterThan(0);
      const v = obj.violations[0];
      // Each violation has spec §10.4 fields.
      expect(typeof v.id).toBe('string');
      expect(v.id).toMatch(/^v_[a-f0-9]{8}$/);
      expect(typeof v.edge.from).toBe('string');
      expect(typeof v.edge.to).toBe('string');
      expect(typeof v.severity).toBe('string');
      expect(typeof v.ciBlocking).toBe('boolean');
      expect(typeof v.category).toBe('string');
      expect(v.code).toBe('ARCH_ENGINE_BLOCKING_VIOLATION');
      // diagnostics[] includes the BLOCKING_VIOLATION diagnostic.
      const codes: string[] = obj.diagnostics.map((d: { code: string }) => d.code);
      expect(codes).toContain('ARCH_ENGINE_BLOCKING_VIOLATION');
    });
  });

  test('explain unknown-target --json: diagnostics[] includes TARGET_NOT_FOUND, exit 0', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['explain', 'definitely-not-a-real-target', '--json'], cwd);
      expect(status).toBe(0);
      const obj = JSON.parse(stdout);
      expect(Array.isArray(obj.diagnostics)).toBe(true);
      const codes: string[] = obj.diagnostics.map((d: { code: string }) => d.code);
      expect(codes).toContain('ARCH_ENGINE_TARGET_NOT_FOUND');
      // Existing key preserved.
      expect(Array.isArray(obj.supportedSpecialTargets)).toBe(true);
    });
  });

  test('explain regression --json without baseline: diagnostics[] includes NO_BASELINE, exit 0', () => {
    // Use sample-monorepo *without* running check first, so no
    // .arch-engine/stability-score.json exists.
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, status } = runCli(['explain', 'regression', '--json'], cwd);
      expect(status).toBe(0);
      const obj = JSON.parse(stdout);
      expect(Array.isArray(obj.diagnostics)).toBe(true);
      const codes: string[] = obj.diagnostics.map((d: { code: string }) => d.code);
      expect(codes).toContain('ARCH_ENGINE_NO_BASELINE');
    });
  });
});

// ═══════════════════════════════════════════════════════════
//  §15.4 — Stack-trace tests (subprocess level)
// ═══════════════════════════════════════════════════════════

describe('Phase E — stack-trace policy', () => {
  test('default invocation: no stack frames in human output', () => {
    // Force a fatal by running an invalid command (cli.on('command:*')
    // exits 1 with helpful text — never with a stack).
    const { stdout, stderr } = runCli(['definitely-not-a-real-command'], REPO_ROOT);
    expect(stdout + stderr).not.toMatch(/\n\s+at\s+/);
  });

  test('default invocation on success: no stack frames', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout, stderr } = runCli(['doctor'], cwd);
      expect(stdout + stderr).not.toMatch(/\n\s+at\s+/);
    });
  });

  test('default invocation on blocking violation: no stack frames in human output', () => {
    withFixtureCopy(DEMO_DRIFT, (cwd) => {
      const { stdout, stderr } = runCli(['check'], cwd);
      expect(stdout + stderr).not.toMatch(/\n\s+at\s+/);
    });
  });
});

// ═══════════════════════════════════════════════════════════
//  §15.5 — Path-normalisation tests
// ═══════════════════════════════════════════════════════════

describe('Phase E — path normalisation', () => {
  test('check --json artifactRelativePath uses POSIX separators', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['check', '--json'], cwd);
      const obj = JSON.parse(stdout);
      expect(typeof obj.artifactRelativePath).toBe('string');
      expect(obj.artifactRelativePath).not.toMatch(/\\/);
    });
  });

  test('check --json artifactRelativePath does not start with /', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const { stdout } = runCli(['check', '--json'], cwd);
      const obj = JSON.parse(stdout);
      expect(obj.artifactRelativePath.startsWith('/')).toBe(false);
    });
  });

  test('check --json on demo-drift: artifactRelativePath starts with .arch-engine/', () => {
    withFixtureCopy(DEMO_DRIFT, (cwd) => {
      const { stdout } = runCli(['check', '--json'], cwd);
      const obj = JSON.parse(stdout);
      expect(obj.artifactRelativePath).toMatch(/^\.arch-engine\//);
      expect(obj.artifactRelativePath).toMatch(/stability-score\.json$/);
    });
  });

  test('no diagnostic.path field starts with / in any command', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      for (const cmd of [['doctor'], ['inspect'], ['analyze'], ['check']]) {
        const { stdout } = runCli([...cmd, '--json'], cwd);
        const obj = JSON.parse(stdout);
        for (const d of obj.diagnostics ?? []) {
          if (typeof d.path === 'string') {
            expect(d.path.startsWith('/')).toBe(false);
          }
        }
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════
//  §15.6 — Determinism tests
// ═══════════════════════════════════════════════════════════

describe('Phase E — determinism', () => {
  test('doctor --json is byte-identical across runs (no timestamp leakage)', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      // First run performs auto-init (`autoInitialized: true`), which is a
      // legitimate one-time side effect of doctor on a virgin fixture. The
      // determinism contract pins the steady-state shape: once the workspace
      // is initialised, two subsequent runs MUST produce byte-identical JSON.
      runCli(['doctor', '--json'], cwd);
      const a = runCli(['doctor', '--json'], cwd).stdout;
      const b = runCli(['doctor', '--json'], cwd).stdout;
      expect(a).toBe(b);
    });
  });

  test('inspect --json is byte-identical across runs', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const a = runCli(['inspect', '--json'], cwd).stdout;
      const b = runCli(['inspect', '--json'], cwd).stdout;
      expect(a).toBe(b);
    });
  });

  test('check --json: violation.id is stable across runs', () => {
    withFixtureCopy(DEMO_DRIFT, (cwd) => {
      const a = JSON.parse(runCli(['check', '--json'], cwd).stdout);
      const b = JSON.parse(runCli(['check', '--json'], cwd).stdout);
      const idsA = (a.violations as Array<{ id: string }>).map((v) => v.id).sort();
      const idsB = (b.violations as Array<{ id: string }>).map((v) => v.id).sort();
      expect(idsA).toEqual(idsB);
      // Each id is the documented sha256-truncated 8-char shape.
      for (const id of idsA) {
        expect(id).toMatch(/^v_[a-f0-9]{8}$/);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════
//  §15.3 — Backward-compatibility: no v1.0.2 keys removed
// ═══════════════════════════════════════════════════════════

describe('Phase E — JSON backward-compat: no removed/renamed v1.0.2 keys', () => {
  test('doctor --json preserves the v1.0.2 key set', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const obj = JSON.parse(runCli(['doctor', '--json'], cwd).stdout);
      // Sample of v1.0.2 keys that MUST still exist with the same value type.
      const requiredKeys = [
        'environment',
        'extractionMode',
        'topologyConfidence',
        'detectedNodes',
        'expectedNodes',
        'connectedNodes',
        'coverage',
        'connectivity',
        'crossings',
        'domainDistribution',
        'warnings',
        'hasPolicyFile',
      ];
      for (const k of requiredKeys) {
        expect(obj).toHaveProperty(k);
      }
    });
  });

  test('inspect --json preserves the v1.0.2 key set', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const obj = JSON.parse(runCli(['inspect', '--json'], cwd).stdout);
      for (const k of [
        'nodes',
        'edges',
        'crossings',
        'confidence',
        'coverage',
        'connectivity',
        'extractionMode',
        'workspaceType',
        'domainDistribution',
        'warnings',
        'adaptersActive',
      ]) {
        expect(obj).toHaveProperty(k);
      }
    });
  });

  test('analyze --json preserves v1.0.2 + Phase A keys', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const obj = JSON.parse(runCli(['analyze', '--json'], cwd).stdout);
      for (const k of [
        'score',
        'classification',
        'stabilityTier',
        'topologyConfidenceLabel',
        'coverage',
        'connectivity',
        'topologyConfidence',
        'extractionMode',
        'workspaceType',
        'authorityCrossings',
        'domainDistribution',
        'blast_radius',
        'components',
        'warnings',
        'executionMetrics',
        'policyConfigured',
        'headlineKind',
      ]) {
        expect(obj).toHaveProperty(k);
      }
    });
  });

  test('check --json preserves v1.0.2 + Phase A keys', () => {
    withFixtureCopy(SAMPLE_FIXTURE, (cwd) => {
      const obj = JSON.parse(runCli(['check', '--json'], cwd).stdout);
      for (const k of [
        'score',
        'classification',
        'stabilityTier',
        'topologyConfidenceLabel',
        'coverage',
        'connectivity',
        'extractionMode',
        'topologyConfidence',
        'authorityCrossings',
        'blockerCrossings',
        'warnings',
        'executionMetrics',
        'artifactPath',
        'policyConfigured',
        'headlineKind',
      ]) {
        expect(obj).toHaveProperty(k);
      }
    });
  });
});
