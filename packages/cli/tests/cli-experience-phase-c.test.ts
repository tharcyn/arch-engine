/**
 * ═══════════════════════════════════════════════════════════
 *  CLI Experience MVP — Phase C-Lite: Demo Output Calibration
 * ═══════════════════════════════════════════════════════════
 *
 *  Stacks on Phase A + Phase B. Pins the v1.0.2 demo-drift
 *  fixture's *real* blocked-output behaviour and the
 *  associated check-rendering polish (single Stability line,
 *  Blocked: headline, per-violation Rule + Severity rows,
 *  (blocks CI) annotation).
 *
 *  Coverage:
 *
 *  - examples/demo-drift now ships an enforcement policy.
 *  - `arch-engine check` exits 5 (existing v1.0.1 enforce-mode
 *    exit code) on the fixture and prints the canonical
 *    "Blocked: 1 architecture violation." headline.
 *  - The frontend → payments offending edge appears in the
 *    output with rule id and severity.
 *  - The "Stability:" metrics line is no longer duplicated
 *    in `analyze` and `check`.
 *  - Phase A no-policy / no-CRITICAL invariant still holds on
 *    the policy-less sample-monorepo fixture.
 */

import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const CLI_BIN = path.join(REPO_ROOT, 'packages/cli/dist/bin.js');
const DEMO_DRIFT = path.join(REPO_ROOT, 'examples/demo-drift');
const SAMPLE_FIXTURE = path.join(REPO_ROOT, 'examples/sample-monorepo');

beforeAll(() => {
  if (!fs.existsSync(CLI_BIN)) {
    throw new Error(`CLI bin missing: ${CLI_BIN}. Run \`npm run build\` first.`);
  }
});

afterAll(() => {
  // Clean any auto-init artifacts the CLI may have dropped into repo
  // fixtures during this test run. The CLI auto-creates
  // `.arch-engine/` (note the hyphen) inside any cwd it runs in.
  for (const dir of [DEMO_DRIFT, SAMPLE_FIXTURE]) {
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

function runCli(args: string[], cwd: string): {
  stdout: string;
  stderr: string;
  status: number | null;
} {
  const result = spawnSync('node', [CLI_BIN, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
}

function withDemoDriftCopy<T>(fn: (cwd: string) => T): T {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-cli-phaseC-'));
  try {
    copyDirSync(DEMO_DRIFT, tmp);
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ─── Demo-drift policy file ────────────────────────────

describe('Phase C — examples/demo-drift policy file', () => {
  test('ships .archengine/policy.yml with the frontend → payments forbid rule', () => {
    const policyPath = path.join(DEMO_DRIFT, '.archengine', 'policy.yml');
    expect(fs.existsSync(policyPath)).toBe(true);
    const yaml = fs.readFileSync(policyPath, 'utf8');
    expect(yaml).toMatch(/version:\s*1/);
    expect(yaml).toMatch(/mode:\s*enforce/);
    expect(yaml).toContain("'@demo-drift/frontend'");
    expect(yaml).toContain("'@demo-drift/payments'");
    expect(yaml).toContain('frontend-must-not-touch-payment-gateway');
  });
});

// ─── Demo-drift blocked check output ───────────────────

describe('Phase C — arch-engine check on examples/demo-drift', () => {
  test('exits with code 1 on blocking architecture violations (Phase D-Lite)', () => {
    withDemoDriftCopy((cwd) => {
      const { status } = runCli(['check'], cwd);
      // Phase D-Lite migrated the blocking-violation exit code from
      // 5 → 1 to align with the CLI Experience Specification §9.1
      // semantic (1 = "Blocking architecture violations found"). Code
      // 5 is now reserved for internal invariant failure. See
      // ARCH_ENGINE_CLI_EXPERIENCE_EXIT_CODE_REPAIR_AUDIT.md for the
      // root cause and migration rationale.
      expect(status).toBe(1);
    });
  });

  test('prints the "Blocked: 1 architecture violation." headline', () => {
    withDemoDriftCopy((cwd) => {
      const { stdout } = runCli(['check'], cwd);
      expect(stdout).toMatch(/Blocked:\s+1\s+architecture violation\./);
    });
  });

  test('surfaces the offending @demo-drift/frontend → @demo-drift/payments edge', () => {
    withDemoDriftCopy((cwd) => {
      const { stdout } = runCli(['check'], cwd);
      expect(stdout).toContain('@demo-drift/frontend → @demo-drift/payments');
      // The (blocks CI) annotation must accompany blocking violations
      // so a screenshot reader knows the verdict at a glance.
      expect(stdout).toMatch(/\(blocks CI\)/);
    });
  });

  test('shows the rule id and severity for the violation', () => {
    withDemoDriftCopy((cwd) => {
      const { stdout } = runCli(['check'], cwd);
      expect(stdout).toMatch(/Rule:\s+frontend-must-not-touch-payment-gateway/);
      expect(stdout).toMatch(/Severity:\s+error/);
    });
  });

  test('ends with the canonical Fix: + Exit 1: pair (Phase A invariant + Phase D-Lite migration)', () => {
    withDemoDriftCopy((cwd) => {
      const { stdout } = runCli(['check'], cwd);
      expect(stdout).toMatch(/^Fix:\s/m);
      // Phase D-Lite: blocking architecture violations exit 1, never 5.
      expect(stdout).toMatch(/^Exit 1:/m);
      expect(stdout).not.toMatch(/^Exit 5:/m);
      expect(stdout).not.toMatch(/blocking policy violations\./);
      expect(stdout).toMatch(/blocking architecture violations\./);
    });
  });

  test('JSON mode is backward-compatible (existing keys preserved)', () => {
    withDemoDriftCopy((cwd) => {
      const { stdout, status } = runCli(['check', '--json'], cwd);
      // Phase D-Lite: JSON mode also exits 1 on blocking violations.
      // The JSON shape itself is unchanged from v1.0.1 + Phase A
      // additive fields; only the process exit code changed.
      expect(status).toBe(1);
      const obj = JSON.parse(stdout);
      // Phase A additive fields still present.
      expect(typeof obj.policyConfigured).toBe('boolean');
      expect(obj.policyConfigured).toBe(true);
      expect(typeof obj.headlineKind).toBe('string');
      // v1.0.1 baseline keys still present.
      expect(obj).toHaveProperty('score');
      expect(obj).toHaveProperty('stabilityTier');
      expect(obj).toHaveProperty('artifactPath');
    });
  });
});

// ─── Demo-drift surrounding commands ──────────────────

describe('Phase C — surrounding commands on examples/demo-drift', () => {
  test('doctor exits 0 and detects the policy file', () => {
    withDemoDriftCopy((cwd) => {
      const { stdout, status } = runCli(['doctor'], cwd);
      expect(status).toBe(0);
      expect(stdout).toMatch(/Policy file detected: \.archengine\/policy\.yml/);
    });
  });

  test('inspect exits 0 and reports 4 nodes / 3 edges', () => {
    withDemoDriftCopy((cwd) => {
      const { stdout, status } = runCli(['inspect'], cwd);
      expect(status).toBe(0);
      expect(stdout).toMatch(/Nodes detected:\s+4/);
      expect(stdout).toMatch(/Edges:\s+3/);
    });
  });

  test('analyze exits 0; headline carries the calibrated score, no duplicate Stability Score line', () => {
    withDemoDriftCopy((cwd) => {
      const { stdout, status } = runCli(['analyze'], cwd);
      expect(status).toBe(0);
      // The calibrated headline appears.
      expect(stdout).toMatch(/Stability:\s+(STABLE|HEALTHY|WARNING|CRITICAL)/);
      // The Phase C polish removed the duplicated `Stability Score:` line —
      // the headline is the one source of truth in human mode now.
      expect(stdout).not.toMatch(/Stability Score:/);
    });
  });
});

// ─── Phase A no-policy invariant still holds ──────────

describe('Phase C — Phase A no-policy invariant on sample-monorepo', () => {
  test('check on policy-less fixture still exits 0 and never says CRITICAL in the headline', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-cli-phaseC-noPol-'));
    try {
      copyDirSync(SAMPLE_FIXTURE, tmp);
      const { stdout, status } = runCli(['check'], tmp);
      expect(status).toBe(0);
      // No-policy footer present.
      expect(stdout).toMatch(/No policy file is configured yet/);
      // No CRITICAL on a healthy no-policy fixture.
      expect(stdout).not.toMatch(/Stability:\s+CRITICAL/);
      expect(stdout).not.toMatch(/Stability Score:\s+CRITICAL/);
      // Final Next: line per Phase A.
      expect(stdout).toMatch(/^Next:/m);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('analyze on policy-less fixture still uses the no-policy headline', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-cli-phaseC-noPol-'));
    try {
      copyDirSync(SAMPLE_FIXTURE, tmp);
      const { stdout, status } = runCli(['analyze'], tmp);
      expect(status).toBe(0);
      expect(stdout).toMatch(/No policy configured/);
      expect(stdout).not.toMatch(/Stability:\s+CRITICAL/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

// ─── Demo README pins the canonical commands ───────────

describe('Phase C — demo-drift README', () => {
  test('README documents the actual blocked output (Phase D-Lite: Exit 1)', () => {
    const readme = fs.readFileSync(path.join(DEMO_DRIFT, 'README.md'), 'utf8');
    expect(readme).toContain('Blocked: 1 architecture violation.');
    expect(readme).toContain('@demo-drift/frontend → @demo-drift/payments');
    expect(readme).toContain('frontend-must-not-touch-payment-gateway');
    // Phase D-Lite: README must say Exit 1, never Exit 5.
    expect(readme).toMatch(/Exit 1/);
    expect(readme).not.toMatch(/Exit 5/);
  });

  test('README does NOT claim AGP integration is shipped', () => {
    const readme = fs.readFileSync(path.join(DEMO_DRIFT, 'README.md'), 'utf8');
    // We DO mention AGP in a "what this fixture does NOT do" section.
    // We MUST NOT claim AGP is shipped for v1.0.x.
    expect(readme).not.toMatch(/@arch-governance\/runtime/);
    expect(readme).not.toMatch(/@arch-governance\/architecture-profile/);
  });
});
