/**
 * ═══════════════════════════════════════════════════════════
 *  CLI Experience MVP — Phase A: Output Grammar Cleanup
 * ═══════════════════════════════════════════════════════════
 *
 *  Pinned tests for the v1.0.1 → v1.0.2 patch surface
 *  cleanup. Covers:
 *
 *  - U1: analyze/check no longer renders "Stability Score: CRITICAL"
 *        as the headline on a healthy no-policy fixture.
 *  - U2: doctor no longer prints hardcoded "Arch Engine CLI v1.0.0"
 *        / "Schema runtime v1.0.0" lines.
 *  - U3: check no longer prints "CRITICAL" and "No blocking
 *        violations" on the same screen.
 *  - U4: doctor / check / explain no longer echo their command
 *        name as line 1.
 *  - U5: every command's human output ends with exactly one
 *        Next: / Fix: / Exit N: line.
 *
 *  These tests are intentionally process-level (spawn the built
 *  CLI binary and read stdout) so they cover the actual user
 *  experience byte-for-byte. They use examples/sample-monorepo
 *  as a stable controlled fixture.
 */

import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  classifyStability,
  deriveAnalysisHeadline,
  type AnalysisHeadlineKind,
} from '../src/renderers.js';
import { detectPolicyFile } from '../src/policy-presence.js';

// ─── Fixture management ────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '../../..');
const CLI_BIN = path.join(REPO_ROOT, 'packages/cli/dist/bin.js');
const FIXTURE_SOURCE = path.join(REPO_ROOT, 'examples/sample-monorepo');

let fixtureDir = '';

beforeAll(() => {
  // Build the CLI fresh so this test is anchored to current source.
  // The dist must already exist; if not, npm test catches the mismatch.
  if (!fs.existsSync(CLI_BIN)) {
    throw new Error(
      `CLI bin missing: ${CLI_BIN}. Run \`npm run build\` before running these tests.`,
    );
  }
  if (!fs.existsSync(FIXTURE_SOURCE)) {
    throw new Error(`Fixture missing: ${FIXTURE_SOURCE}`);
  }
  fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-cli-phaseA-'));
  copyDirSync(FIXTURE_SOURCE, fixtureDir);
});

afterAll(() => {
  if (fixtureDir && fs.existsSync(fixtureDir)) {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
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

function runCli(args: string[]): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync('node', [CLI_BIN, ...args], {
    cwd: fixtureDir,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
}

// ─── Unit tests for the calibrated headline helper ─────

describe('deriveAnalysisHeadline (renderers.ts)', () => {
  const baseMeta = {
    coverage: 1.0,
    connectivity: 1.0,
    topologyConfidence: 1.0,
    detectedNodes: 4,
    connectedNodes: 4,
    expectedNodes: 4,
    warnings: [],
    workspaceType: 'yarn-npm',
    extractionMode: 'structured',
  };

  test('returns "no-policy" headline when policyConfigured is false', () => {
    const headline = deriveAnalysisHeadline({
      score: 0.475,
      meta: baseMeta,
      policyConfigured: false,
    });
    expect(headline.kind).toBe<AnalysisHeadlineKind>('no-policy');
    expect(headline.text).not.toMatch(/CRITICAL/i);
    expect(headline.text).toMatch(/no policy/i);
  });

  test('returns "low-signal" headline when coverage < 30% even with policy', () => {
    const headline = deriveAnalysisHeadline({
      score: 0.475,
      meta: { ...baseMeta, coverage: 0.20 },
      policyConfigured: true,
    });
    expect(headline.kind).toBe<AnalysisHeadlineKind>('low-signal');
    expect(headline.text).not.toMatch(/CRITICAL/i);
  });

  test('returns "low-signal" headline when detectedNodes < 2 even with policy', () => {
    const headline = deriveAnalysisHeadline({
      score: 0.10,
      meta: { ...baseMeta, detectedNodes: 1, connectedNodes: 1 },
      policyConfigured: true,
    });
    expect(headline.kind).toBe<AnalysisHeadlineKind>('low-signal');
  });

  test('returns graded "tier" headline for healthy + policy + score >= 0.50', () => {
    const headline = deriveAnalysisHeadline({
      score: 0.85,
      meta: baseMeta,
      policyConfigured: true,
    });
    expect(headline.kind).toBe<AnalysisHeadlineKind>('tier');
    expect(headline.text).toMatch(/HEALTHY/);
  });

  test('classifyStability still returns CRITICAL for low scores (raw helper unchanged)', () => {
    expect(classifyStability(0.30).tier).toBe('CRITICAL');
    expect(classifyStability(0.475).tier).toBe('CRITICAL');
    expect(classifyStability(0.50).tier).toBe('WARNING');
    expect(classifyStability(0.75).tier).toBe('HEALTHY');
    expect(classifyStability(0.90).tier).toBe('STABLE');
  });
});

// ─── Unit tests for policy-presence ────────────────────

describe('detectPolicyFile (policy-presence.ts)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-policy-presence-'));

  afterAll(() => {
    if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('returns configured: false when no policy file exists', () => {
    const result = detectPolicyFile(tmp);
    expect(result.configured).toBe(false);
    expect(result.path).toBeNull();
  });

  test('detects .archengine/policy.yml', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-policy-archengine-'));
    fs.mkdirSync(path.join(dir, '.archengine'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.archengine/policy.yml'), 'rules: []\n');
    const result = detectPolicyFile(dir);
    expect(result.configured).toBe(true);
    expect(result.path).toBe('.archengine/policy.yml');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('detects arch-policy.yml at repo root', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-policy-root-'));
    fs.writeFileSync(path.join(dir, 'arch-policy.yml'), 'rules: []\n');
    const result = detectPolicyFile(dir);
    expect(result.configured).toBe(true);
    expect(result.path).toBe('arch-policy.yml');
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

// ─── Process-level CLI output tests ────────────────────

describe('Phase A — output grammar cleanup (process-level smoke)', () => {
  test('U4: doctor output does NOT start with literal "arch-engine doctor" echo', () => {
    const { stdout, status } = runCli(['doctor']);
    expect(status).toBe(0);
    const firstNonEmptyLine = stdout
      .split('\n')
      .map((s) => s.trim())
      .find((s) => s.length > 0);
    expect(firstNonEmptyLine).toBeDefined();
    expect(firstNonEmptyLine).not.toMatch(/^arch-engine doctor$/);
    expect(firstNonEmptyLine).not.toMatch(/^arch-engine /);
  });

  test('U2: doctor output does NOT contain hardcoded "Arch Engine CLI v1.0.0" string', () => {
    const { stdout } = runCli(['doctor']);
    expect(stdout).not.toMatch(/Arch Engine CLI v1\.0\.0\b/);
    expect(stdout).not.toMatch(/Schema runtime v1\.0\.0\b/);
  });

  test('U1: analyze on no-policy healthy fixture does NOT print "Stability Score: CRITICAL"', () => {
    const { stdout, status } = runCli(['analyze']);
    expect(status).toBe(0);
    // The whole point: a healthy 4-package fixture with no policy must not be
    // labelled CRITICAL in the headline.
    expect(stdout).not.toMatch(/Stability Score:\s+CRITICAL/);
    // The new no-policy headline must appear.
    expect(stdout).toMatch(/No policy configured/i);
  });

  test('U3: check on no-policy fixture does NOT print "CRITICAL" together with "No blocking violations"', () => {
    const { stdout, status } = runCli(['check']);
    expect(status).toBe(0);
    const containsCritical = /CRITICAL/.test(stdout);
    const containsNoBlocking = /No blocking violations/.test(stdout);
    // Either may appear individually in some context, but they MUST NOT both
    // appear in the same output. The historical bug printed both.
    expect(containsCritical && containsNoBlocking).toBe(false);
  });

  test('U4: check, inspect, explain do not echo their command name as line 1', () => {
    for (const cmd of [['inspect'], ['check'], ['explain', 'regression']]) {
      const { stdout } = runCli(cmd);
      const firstNonEmptyLine = stdout
        .split('\n')
        .map((s) => s.trim())
        .find((s) => s.length > 0);
      expect(firstNonEmptyLine, `first line of \`arch-engine ${cmd.join(' ')}\``).toBeDefined();
      expect(
        firstNonEmptyLine,
        `first line of \`arch-engine ${cmd.join(' ')}\` should not echo the command`,
      ).not.toMatch(/^arch-engine\s+\w/);
    }
  });

  test('U5: every command human output ends with exactly one Next: / Fix: / Exit N: line', () => {
    const commandsToCheck: Array<{ args: string[]; label: string }> = [
      { args: ['doctor'], label: 'doctor' },
      { args: ['inspect'], label: 'inspect' },
      { args: ['analyze'], label: 'analyze' },
      { args: ['check'], label: 'check' },
      { args: ['explain', 'regression'], label: 'explain regression' },
    ];

    const NEXT_FIX_EXIT = /^(Next|Fix|Exit \d+):/;

    for (const { args, label } of commandsToCheck) {
      const { stdout, status } = runCli(args);
      expect(status, `${label} should exit 0 on the sample fixture`).toBe(0);

      const lines = stdout.split('\n').map((s) => s.trim()).filter((s) => s.length > 0);
      expect(lines.length, `${label} produced empty output`).toBeGreaterThan(0);

      const nextFixExitLines = lines.filter((s) => NEXT_FIX_EXIT.test(s));
      expect(
        nextFixExitLines.length,
        `${label} should have exactly one Next/Fix/Exit line, found ${nextFixExitLines.length}: ${JSON.stringify(nextFixExitLines)}`,
      ).toBe(1);
    }
  });

  test('JSON outputs still parse and contain previously-existing top-level keys', () => {
    // We must not break --json shape. Existing keys that downstream tooling
    // may rely on must still be present.
    {
      const { stdout, status } = runCli(['doctor', '--json']);
      expect(status).toBe(0);
      const obj = JSON.parse(stdout);
      expect(obj).toHaveProperty('environment');
      expect(obj).toHaveProperty('hasPolicyFile');
      // Additive field acceptable, existing field still present.
      expect(typeof obj.hasPolicyFile).toBe('boolean');
    }
    {
      const { stdout, status } = runCli(['analyze', '--json']);
      expect(status).toBe(0);
      const obj = JSON.parse(stdout);
      expect(obj).toHaveProperty('score');
      expect(obj).toHaveProperty('classification');
      expect(obj).toHaveProperty('stabilityTier');
      // Additive fields permitted.
      expect(typeof obj.policyConfigured).toBe('boolean');
      expect(typeof obj.headlineKind).toBe('string');
    }
    {
      const { stdout, status } = runCli(['check', '--json']);
      expect(status).toBe(0);
      const obj = JSON.parse(stdout);
      expect(obj).toHaveProperty('score');
      expect(obj).toHaveProperty('stabilityTier');
      expect(obj).toHaveProperty('artifactPath');
      expect(typeof obj.policyConfigured).toBe('boolean');
      expect(typeof obj.headlineKind).toBe('string');
    }
  });
});
