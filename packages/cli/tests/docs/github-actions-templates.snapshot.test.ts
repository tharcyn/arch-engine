/**
 * ═══════════════════════════════════════════════════════════
 *  CLI docs — GitHub Actions templates
 * ═══════════════════════════════════════════════════════════
 *
 *  Pins the safety and behavioural contract of the two workflow
 *  templates we ship under `examples/github-actions/`:
 *
 *    - `arch-engine-pr-report.yml`   (artifact-only)
 *    - `arch-engine-pr-comment.yml`  (sticky PR comment)
 *
 *  These templates are CTRL-V into the consumer's repository. A
 *  silent regression here ships unsafe-by-default permissions or a
 *  missing required step to every downstream user. The tests below
 *  validate:
 *
 *    - Both files parse as YAML.
 *    - Neither uses `pull_request_target` (would expose secrets to
 *      fork PRs).
 *    - Permissions are least-privilege.
 *    - The canonical v1.1.0 command shape appears verbatim.
 *    - The artifact upload runs on every outcome.
 *    - The PR-comment workflow guards against fork PRs.
 *    - The README cross-references both templates.
 */

import { describe, expect, test } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import YAML from 'yaml';

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const TEMPLATES_DIR = path.join(REPO_ROOT, 'examples/github-actions');

const REPORT_PATH = path.join(TEMPLATES_DIR, 'arch-engine-pr-report.yml');
const COMMENT_PATH = path.join(TEMPLATES_DIR, 'arch-engine-pr-comment.yml');
const TEMPLATES_README = path.join(TEMPLATES_DIR, 'README.md');
const ROOT_README = path.join(REPO_ROOT, 'README.md');

const CANONICAL_INVOCATION =
  'npx arch-engine check --ci --format markdown --output arch-engine-report.md';

interface WorkflowYaml {
  name?: string;
  // YAML `on:` is a YAML 1.2 boolean keyword in some parsers; we
  // accept either string or object shapes.
  on?: unknown;
  permissions?: Record<string, string>;
  jobs?: Record<string, {
    'runs-on'?: string;
    permissions?: Record<string, string>;
    steps?: Array<Record<string, unknown>>;
  }>;
}

function loadWorkflow(p: string): { raw: string; parsed: WorkflowYaml } {
  const raw = fs.readFileSync(p, 'utf8');
  // YAML library parses `on:` as `true` because `on` is a YAML 1.2
  // boolean keyword. We instead parse with `mapAsMap: false` and
  // accept either key. The raw text is the authoritative content
  // for trigger checks.
  const parsed = YAML.parse(raw) as WorkflowYaml;
  return { raw, parsed };
}

// ═══════════════════════════════════════════════════════════
//  Both templates exist and parse
// ═══════════════════════════════════════════════════════════

describe('GitHub Actions templates — files exist and parse', () => {
  test('arch-engine-pr-report.yml exists and parses as YAML', () => {
    expect(fs.existsSync(REPORT_PATH)).toBe(true);
    const { parsed } = loadWorkflow(REPORT_PATH);
    expect(typeof parsed).toBe('object');
    expect(parsed.name).toMatch(/Arch-Engine/i);
  });

  test('arch-engine-pr-comment.yml exists and parses as YAML', () => {
    expect(fs.existsSync(COMMENT_PATH)).toBe(true);
    const { parsed } = loadWorkflow(COMMENT_PATH);
    expect(typeof parsed).toBe('object');
    expect(parsed.name).toMatch(/Arch-Engine/i);
  });

  test('templates README exists', () => {
    expect(fs.existsSync(TEMPLATES_README)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════
//  Safety: no pull_request_target
// ═══════════════════════════════════════════════════════════

describe('GitHub Actions templates — safety guards', () => {
  test('arch-engine-pr-report.yml does NOT use pull_request_target', () => {
    const { raw } = loadWorkflow(REPORT_PATH);
    // Ignore matches inside YAML comments (`# … pull_request_target …`)
    const nonCommentLines = raw
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('#'));
    expect(nonCommentLines.join('\n')).not.toMatch(/pull_request_target/);
  });

  test('arch-engine-pr-comment.yml does NOT use pull_request_target', () => {
    const { raw } = loadWorkflow(COMMENT_PATH);
    const nonCommentLines = raw
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('#'));
    expect(nonCommentLines.join('\n')).not.toMatch(/pull_request_target/);
  });

  test('templates README explains the pull_request_target risk', () => {
    const md = fs.readFileSync(TEMPLATES_README, 'utf8');
    expect(md).toMatch(/pull_request_target/);
    // Risk wording: any one of "never", "attack surface", "untrusted",
    // "documented attack surface" suffices — these are the canonical
    // ways the spec describes the surface.
    expect(md).toMatch(/never|attack surface|untrusted/i);
  });
});

// ═══════════════════════════════════════════════════════════
//  Safety: least-privilege permissions
// ═══════════════════════════════════════════════════════════

describe('GitHub Actions templates — permissions are least-privilege', () => {
  test('artifact workflow declares only `contents: read`', () => {
    const { parsed } = loadWorkflow(REPORT_PATH);
    expect(parsed.permissions).toBeDefined();
    expect(parsed.permissions!.contents).toBe('read');
    // No write permissions anywhere.
    for (const v of Object.values(parsed.permissions!)) {
      expect(v).not.toBe('write');
    }
  });

  test('comment workflow declares contents: read + pull-requests: write only', () => {
    const { parsed } = loadWorkflow(COMMENT_PATH);
    expect(parsed.permissions).toBeDefined();
    expect(parsed.permissions!.contents).toBe('read');
    expect(parsed.permissions!['pull-requests']).toBe('write');
    // No other write permissions.
    const writeScopes = Object.entries(parsed.permissions!)
      .filter(([, v]) => v === 'write')
      .map(([k]) => k);
    expect(writeScopes).toEqual(['pull-requests']);
  });
});

// ═══════════════════════════════════════════════════════════
//  Behaviour: canonical command + artifact upload + exit code
// ═══════════════════════════════════════════════════════════

describe('GitHub Actions templates — behaviour invariants', () => {
  test('artifact workflow runs the canonical v1.1.0 command', () => {
    const { raw } = loadWorkflow(REPORT_PATH);
    expect(raw).toMatch(/--ci/);
    expect(raw).toMatch(/--format markdown/);
    expect(raw).toMatch(/--output arch-engine-report\.md/);
  });

  test('comment workflow runs the canonical v1.1.0 command', () => {
    const { raw } = loadWorkflow(COMMENT_PATH);
    expect(raw).toMatch(/--ci/);
    expect(raw).toMatch(/--format markdown/);
    expect(raw).toMatch(/--output arch-engine-report\.md/);
  });

  test('artifact workflow always uploads the report', () => {
    const { raw } = loadWorkflow(REPORT_PATH);
    expect(raw).toMatch(/actions\/upload-artifact/);
    expect(raw).toMatch(/if: always\(\)/);
    // The artifact name must match what the comment workflow expects
    // for the artifact step to be interchangeable.
    expect(raw).toMatch(/name: arch-engine-report/);
  });

  test('comment workflow always uploads the report', () => {
    const { raw } = loadWorkflow(COMMENT_PATH);
    expect(raw).toMatch(/actions\/upload-artifact/);
    expect(raw).toMatch(/if: always\(\)/);
    expect(raw).toMatch(/name: arch-engine-report/);
  });

  test('both workflows re-surface the check exit code as job failure', () => {
    const { raw: report } = loadWorkflow(REPORT_PATH);
    const { raw: comment } = loadWorkflow(COMMENT_PATH);
    for (const raw of [report, comment]) {
      expect(raw).toMatch(/steps\.arch_engine\.outcome == 'failure'/);
      expect(raw).toMatch(/exit 1/);
    }
  });

  test('comment workflow guards comment-posting on fork PRs', () => {
    const { raw } = loadWorkflow(COMMENT_PATH);
    // Posting only when head repo matches base repo (i.e., NOT a fork).
    expect(raw).toMatch(
      /head\.repo\.full_name == github\.repository/,
    );
    // And there is an explicit fork-notice step the other direction.
    expect(raw).toMatch(
      /head\.repo\.full_name != github\.repository/,
    );
  });

  test('comment workflow uses the sticky-comment HTML marker', () => {
    const { raw } = loadWorkflow(COMMENT_PATH);
    expect(raw).toMatch(/<!-- arch-engine-report -->/);
    // Update path must be used, not just create.
    expect(raw).toMatch(/updateComment/);
    expect(raw).toMatch(/createComment/);
  });

  test('comment workflow uses actions/github-script (no extra repo deps)', () => {
    const { raw } = loadWorkflow(COMMENT_PATH);
    expect(raw).toMatch(/actions\/github-script@v\d+/);
  });
});

// ═══════════════════════════════════════════════════════════
//  Behaviour: triggers
// ═══════════════════════════════════════════════════════════

describe('GitHub Actions templates — triggers', () => {
  test('artifact workflow triggers on pull_request (safe)', () => {
    const { raw } = loadWorkflow(REPORT_PATH);
    // First non-comment `on:` line.
    expect(raw).toMatch(/^on:\s*$/m);
    expect(raw).toMatch(/pull_request:/);
  });

  test('comment workflow triggers on pull_request (safe)', () => {
    const { raw } = loadWorkflow(COMMENT_PATH);
    expect(raw).toMatch(/^on:\s*$/m);
    expect(raw).toMatch(/pull_request:/);
  });
});

// ═══════════════════════════════════════════════════════════
//  README cross-references
// ═══════════════════════════════════════════════════════════

describe('GitHub Actions templates — README references', () => {
  test('root README links to examples/github-actions/', () => {
    const md = fs.readFileSync(ROOT_README, 'utf8');
    expect(md).toMatch(/examples\/github-actions\//);
  });

  test('root README documents the canonical invocation', () => {
    const md = fs.readFileSync(ROOT_README, 'utf8');
    expect(md).toContain(CANONICAL_INVOCATION);
  });

  test('templates README references both workflow filenames', () => {
    const md = fs.readFileSync(TEMPLATES_README, 'utf8');
    expect(md).toMatch(/arch-engine-pr-report\.yml/);
    expect(md).toMatch(/arch-engine-pr-comment\.yml/);
  });

  test('templates README documents the canonical invocation', () => {
    const md = fs.readFileSync(TEMPLATES_README, 'utf8');
    expect(md).toContain(CANONICAL_INVOCATION);
  });

  test('templates README has a troubleshooting block', () => {
    const md = fs.readFileSync(TEMPLATES_README, 'utf8');
    expect(md).toMatch(/## Troubleshooting/);
    expect(md).toMatch(/Fork limitations/);
  });
});

// ═══════════════════════════════════════════════════════════
//  v1.2.0 — Baseline / drift workflow templates
// ═══════════════════════════════════════════════════════════
//
//  Pins the safety and behavioural contract of the two new
//  baseline-aware templates added in the v1.2.0 GitHub Actions
//  Baseline Workflow Demo pass:
//
//    - `arch-engine-pr-baseline-report.yml`  (artifact-only)
//    - `arch-engine-pr-baseline-comment.yml` (sticky PR comment)
//
//  Same safety invariants as the v1.1.0 templates — they ship
//  alongside, not as replacements.

const BASELINE_REPORT_PATH = path.join(TEMPLATES_DIR, 'arch-engine-pr-baseline-report.yml');
const BASELINE_COMMENT_PATH = path.join(TEMPLATES_DIR, 'arch-engine-pr-baseline-comment.yml');

const CANONICAL_BASELINE_INVOCATION =
  'npx arch-engine check --ci --baseline arch-engine-baseline.json';

describe('Baseline workflow templates — files exist and parse', () => {
  test('arch-engine-pr-baseline-report.yml exists and parses as YAML', () => {
    expect(fs.existsSync(BASELINE_REPORT_PATH)).toBe(true);
    const { parsed } = loadWorkflow(BASELINE_REPORT_PATH);
    expect(typeof parsed).toBe('object');
    expect(parsed.name).toMatch(/Arch-Engine.*Baseline/i);
  });

  test('arch-engine-pr-baseline-comment.yml exists and parses as YAML', () => {
    expect(fs.existsSync(BASELINE_COMMENT_PATH)).toBe(true);
    const { parsed } = loadWorkflow(BASELINE_COMMENT_PATH);
    expect(typeof parsed).toBe('object');
    expect(parsed.name).toMatch(/Arch-Engine.*Baseline/i);
  });
});

describe('Baseline workflow templates — safety guards', () => {
  test('baseline-report workflow does NOT use pull_request_target', () => {
    const { raw } = loadWorkflow(BASELINE_REPORT_PATH);
    const nonCommentLines = raw
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('#'));
    expect(nonCommentLines.join('\n')).not.toMatch(/pull_request_target/);
  });

  test('baseline-comment workflow does NOT use pull_request_target', () => {
    const { raw } = loadWorkflow(BASELINE_COMMENT_PATH);
    const nonCommentLines = raw
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('#'));
    expect(nonCommentLines.join('\n')).not.toMatch(/pull_request_target/);
  });
});

describe('Baseline workflow templates — least-privilege permissions', () => {
  test('baseline-report workflow declares only `contents: read`', () => {
    const { parsed } = loadWorkflow(BASELINE_REPORT_PATH);
    expect(parsed.permissions).toBeDefined();
    expect(parsed.permissions!.contents).toBe('read');
    for (const v of Object.values(parsed.permissions!)) {
      expect(v).not.toBe('write');
    }
  });

  test('baseline-comment workflow declares contents: read + pull-requests: write only', () => {
    const { parsed } = loadWorkflow(BASELINE_COMMENT_PATH);
    expect(parsed.permissions).toBeDefined();
    expect(parsed.permissions!.contents).toBe('read');
    expect(parsed.permissions!['pull-requests']).toBe('write');
    const writeScopes = Object.entries(parsed.permissions!)
      .filter(([, v]) => v === 'write')
      .map(([k]) => k);
    expect(writeScopes).toEqual(['pull-requests']);
  });
});

describe('Baseline workflow templates — behaviour invariants', () => {
  test('both baseline workflows install @arch-engine/cli @^1.2.0', () => {
    for (const p of [BASELINE_REPORT_PATH, BASELINE_COMMENT_PATH]) {
      const { raw } = loadWorkflow(p);
      expect(raw).toMatch(/@arch-engine\/cli@\^1\.2\.0/);
      expect(raw).toMatch(/@arch-engine\/adapter-monorepo@\^1\.2\.0/);
    }
  });

  test('both baseline workflows run the canonical v1.2.0 baseline command', () => {
    for (const p of [BASELINE_REPORT_PATH, BASELINE_COMMENT_PATH]) {
      const { raw } = loadWorkflow(p);
      expect(raw).toContain('--baseline arch-engine-baseline.json');
      expect(raw).toMatch(/--ci/);
      expect(raw).toMatch(/--format markdown/);
      expect(raw).toMatch(/--output arch-engine-report\.md/);
    }
  });

  test('both baseline workflows restore from actions/cache + git-worktree fallback', () => {
    for (const p of [BASELINE_REPORT_PATH, BASELINE_COMMENT_PATH]) {
      const { raw } = loadWorkflow(p);
      expect(raw).toMatch(/actions\/cache@v\d+/);
      // Cache key keyed by PR base SHA so each `main` advance invalidates.
      expect(raw).toMatch(/github\.event\.pull_request\.base\.sha/);
      // git worktree fallback when the cache misses.
      expect(raw).toMatch(/git worktree add/);
    }
  });

  test('both baseline workflows always upload baseline + report artifacts', () => {
    for (const p of [BASELINE_REPORT_PATH, BASELINE_COMMENT_PATH]) {
      const { raw } = loadWorkflow(p);
      expect(raw).toMatch(/actions\/upload-artifact/);
      expect(raw).toMatch(/if: always\(\)/);
      expect(raw).toMatch(/name: arch-engine-baseline-report/);
      // Both report.md and baseline.json paths in the artifact upload.
      expect(raw).toContain('arch-engine-report.md');
      expect(raw).toContain('arch-engine-baseline.json');
    }
  });

  test('both baseline workflows preserve Arch-Engine exit code via captured shell exit', () => {
    for (const p of [BASELINE_REPORT_PATH, BASELINE_COMMENT_PATH]) {
      const { raw } = loadWorkflow(p);
      // `set +e` pattern to capture the exit code without aborting.
      expect(raw).toMatch(/set \+e/);
      // The captured exit code is re-surfaced as a job failure.
      expect(raw).toMatch(/steps\.arch_engine\.outputs\.exit_code/);
      expect(raw).toMatch(/exit \$\{\{ steps\.arch_engine\.outputs\.exit_code \}\}/);
    }
  });

  test('baseline-comment workflow guards comment-posting on fork PRs', () => {
    const { raw } = loadWorkflow(BASELINE_COMMENT_PATH);
    expect(raw).toMatch(/head\.repo\.full_name == github\.repository/);
    expect(raw).toMatch(/head\.repo\.full_name != github\.repository/);
  });

  test('baseline-comment workflow uses a distinct sticky marker', () => {
    const { raw } = loadWorkflow(BASELINE_COMMENT_PATH);
    expect(raw).toMatch(/<!-- arch-engine-baseline-report -->/);
    // Must use both update and create paths.
    expect(raw).toMatch(/updateComment/);
    expect(raw).toMatch(/createComment/);
  });

  test('baseline-comment workflow uses actions/github-script (no extra repo deps)', () => {
    const { raw } = loadWorkflow(BASELINE_COMMENT_PATH);
    expect(raw).toMatch(/actions\/github-script@v\d+/);
  });

  test('baseline workflows trigger on pull_request (safe)', () => {
    for (const p of [BASELINE_REPORT_PATH, BASELINE_COMMENT_PATH]) {
      const { raw } = loadWorkflow(p);
      expect(raw).toMatch(/^on:\s*$/m);
      expect(raw).toMatch(/pull_request:/);
    }
  });

  test('baseline workflows do NOT require any secrets', () => {
    for (const p of [BASELINE_REPORT_PATH, BASELINE_COMMENT_PATH]) {
      const { raw } = loadWorkflow(p);
      // Filter out any commented-out references.
      const nonCommentLines = raw
        .split('\n')
        .filter((l) => !l.trimStart().startsWith('#'))
        .join('\n');
      // Only matches like `${{ secrets.GITHUB_TOKEN }}` would indicate a
      // hard secret dependency; the default GITHUB_TOKEN doesn't need to
      // be referenced explicitly.
      expect(nonCommentLines).not.toMatch(/secrets\.[A-Z_]+/);
    }
  });
});

describe('Baseline workflow templates — README cross-references', () => {
  test('templates README references both baseline workflow filenames', () => {
    const md = fs.readFileSync(TEMPLATES_README, 'utf8');
    expect(md).toMatch(/arch-engine-pr-baseline-report\.yml/);
    expect(md).toMatch(/arch-engine-pr-baseline-comment\.yml/);
  });

  test('templates README documents the canonical baseline invocation', () => {
    const md = fs.readFileSync(TEMPLATES_README, 'utf8');
    expect(md).toContain(CANONICAL_BASELINE_INVOCATION);
  });

  test('templates README has a Baseline comparison workflows section', () => {
    const md = fs.readFileSync(TEMPLATES_README, 'utf8');
    expect(md).toMatch(/## Baseline comparison workflows/);
    expect(md).toMatch(/v1\.2\.0/);
  });

  test('templates README explains that drift alone does NOT fail CI', () => {
    const md = fs.readFileSync(TEMPLATES_README, 'utf8');
    // The README soft-wraps inside markdown bold; collapse whitespace
    // before matching.
    const flat = md.replace(/\s+/g, ' ');
    expect(flat).toMatch(/drift alone never fails CI/i);
  });

  test('templates README documents the v1.2.0 exit-code table', () => {
    const md = fs.readFileSync(TEMPLATES_README, 'utf8');
    expect(md).toMatch(/ARCH_ENGINE_DRIFT_DETECTED/);
    expect(md).toMatch(/ARCH_ENGINE_BASELINE_/);
  });

  test('root README references the v1.2.0 baseline workflows', () => {
    const md = fs.readFileSync(ROOT_README, 'utf8');
    expect(md).toMatch(/arch-engine-pr-baseline-report\.yml/);
    expect(md).toMatch(/arch-engine-pr-baseline-comment\.yml/);
  });

  test('root README documents the canonical baseline invocation', () => {
    const md = fs.readFileSync(ROOT_README, 'utf8');
    expect(md).toContain(CANONICAL_BASELINE_INVOCATION);
  });
});
