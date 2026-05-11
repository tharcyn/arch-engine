/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Markdown renderer
 * ═══════════════════════════════════════════════════════════
 *
 *  Implements `--format markdown` per docs/cli/json-v2-ci-flags-spec
 *  §10. Markdown is intended for PR-comment posting; the rendering
 *  is deterministic, free of timestamps and absolute paths, and
 *  capped to keep PR comments within reason.
 *
 *  Templates locked in spec:
 *
 *  - §10.2 — `check` blocked variant.
 *  - §10.3 — `check` passed variant.
 *  - §10.4 — `analyze` and `doctor`.
 *  - §10.5 — `inspect` / `explain` thin wrappers.
 *
 *  Rules:
 *
 *  - No `Generated at` lines, no timestamps.
 *  - No absolute paths.
 *  - Tables use `|`-pipe markdown.
 *  - Trailing newline at end of file.
 *  - LF line endings.
 *  - Length cap: 50 violations / 25 diagnostics / 250 KB total.
 */

import type { V2RenderInput, V2Status, V2Summary } from './render-v2.js';
import type { CliDiagnostic } from './format-error.js';
import { sortDiagnostics } from './render-v2.js';

const VIOLATIONS_CAP = 50;
const DIAGNOSTICS_CAP = 25;
const SIZE_CAP_BYTES = 250 * 1024;

/**
 * Top-level dispatch. Renders a markdown document for any command.
 */
export function renderCliMarkdown(input: V2RenderInput): string {
  let out: string;
  switch (input.command) {
    case 'check':
      out = renderCheckMarkdown(input);
      break;
    case 'analyze':
      out = renderAnalyzeMarkdown(input);
      break;
    case 'doctor':
      out = renderDoctorMarkdown(input);
      break;
    case 'inspect':
      out = renderInspectMarkdown(input);
      break;
    case 'explain':
      out = renderExplainMarkdown(input);
      break;
  }

  // Normalise to LF and ensure trailing newline.
  let normalized = out.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!normalized.endsWith('\n')) normalized += '\n';

  // Size cap. If the document blows past the cap, truncate the
  // violations table first; if still over, truncate diagnostics.
  if (Buffer.byteLength(normalized, 'utf8') > SIZE_CAP_BYTES) {
    normalized = normalized.slice(0, SIZE_CAP_BYTES - 64) +
      '\n\n_(truncated — over size cap; see JSON v2 for full data)_\n';
  }

  return normalized;
}

// ─── check ──────────────────────────────────────────────────────

function renderCheckMarkdown(input: V2RenderInput): string {
  const data = input.data as Record<string, unknown>;
  const lines: string[] = [];

  lines.push('# Arch-Engine `check`');
  lines.push('');
  lines.push(`**Verdict:** ${verdictPhrase(input.status)}${buildDriftVerdictSuffix(data)}`);
  lines.push('');

  // Metrics
  const stability = (data.stability ?? {}) as Record<string, unknown>;
  const topology = (data.topology ?? {}) as Record<string, unknown>;
  const policyConfigured = data.policyConfigured === true;
  const policyMode = (data.policyMode as string) ?? 'enforce';

  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  if (stability.score !== undefined && stability.tier !== undefined) {
    const score = (stability.score as number).toFixed(2);
    lines.push(`| Stability | ${stability.tier} (${score} / 1.00) |`);
  }
  if (topology.coverage !== undefined) {
    lines.push(`| Coverage | ${pct(topology.coverage as number)} |`);
  }
  if (topology.connectivity !== undefined) {
    lines.push(`| Connectivity | ${pct(topology.connectivity as number)} |`);
  }
  if (topology.topologyConfidenceLabel !== undefined) {
    lines.push(`| Confidence | ${topology.topologyConfidenceLabel as string} |`);
  }
  lines.push(
    `| Policy | ${policyConfigured ? `configured (${policyMode} mode)` : 'not configured'} |`,
  );
  lines.push('');

  // Violations
  const violations = (data.violations ?? []) as Array<Record<string, unknown>>;
  lines.push(`## Violations (${violations.length})`);
  lines.push('');
  if (violations.length === 0) {
    lines.push('_No blocking architecture violations._');
    lines.push('');
  } else {
    lines.push('| Rule | From | To | Severity | CI-blocking |');
    lines.push('| --- | --- | --- | --- | --- |');
    const shown = violations.slice(0, VIOLATIONS_CAP);
    for (const v of shown) {
      const edge = (v.edge as Record<string, string>) ?? { from: '?', to: '?', type: '' };
      const rule = (v.ruleId as string | undefined) ?? '_(unknown)_';
      const sev = (v.severity as string | undefined) ?? 'error';
      const ci = (v.ciBlocking as boolean | undefined) ? 'yes' : 'no';
      lines.push(
        `| \`${escapeMd(rule)}\` | \`${escapeMd(edge.from)}\` | \`${escapeMd(edge.to)}\` | ${sev} | ${ci} |`,
      );
    }
    if (violations.length > VIOLATIONS_CAP) {
      lines.push(
        `\n_…and ${violations.length - VIOLATIONS_CAP} more (see artifact)._`,
      );
    }
    lines.push('');
  }

  appendDriftBlock(lines, input.data as Record<string, unknown>);
  appendDiagnosticsBlock(lines, input.diagnostics);
  appendNextActionsBlock(lines, input.nextActions);
  appendExitFooter(lines, input.exitCode);

  return lines.join('\n');
}

// ─── analyze ────────────────────────────────────────────────────

function renderAnalyzeMarkdown(input: V2RenderInput): string {
  const data = input.data as Record<string, unknown>;
  const lines: string[] = [];

  lines.push('# Arch-Engine `analyze`');
  lines.push('');
  lines.push(`**Verdict:** ${analyzeVerdictPhrase(input.status, data)}`);
  lines.push('');

  const stability = (data.stability ?? {}) as Record<string, unknown>;
  const topology = (data.topology ?? {}) as Record<string, unknown>;

  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  if (stability.score !== undefined) {
    lines.push(`| Score | ${(stability.score as number).toFixed(2)} / 1.00 |`);
  }
  if (stability.tier !== undefined) {
    lines.push(`| Tier | ${stability.tier as string} |`);
  }
  if (topology.coverage !== undefined) {
    lines.push(`| Coverage | ${pct(topology.coverage as number)} |`);
  }
  if (topology.connectivity !== undefined) {
    lines.push(`| Connectivity | ${pct(topology.connectivity as number)} |`);
  }
  if (topology.topologyConfidenceLabel !== undefined) {
    lines.push(`| Confidence | ${topology.topologyConfidenceLabel as string} |`);
  }
  lines.push('');

  appendDriftBlock(lines, input.data as Record<string, unknown>);
  appendDiagnosticsBlock(lines, input.diagnostics);

  if (input.artifacts.length > 0) {
    lines.push('## Artifacts');
    lines.push('');
    for (const a of input.artifacts) {
      lines.push(`- \`${escapeMd(a.relativePath)}\` (${escapeMd(a.kind)})`);
    }
    lines.push('');
  }

  appendNextActionsBlock(lines, input.nextActions);
  appendExitFooter(lines, input.exitCode);

  return lines.join('\n');
}

// ─── doctor ─────────────────────────────────────────────────────

function renderDoctorMarkdown(input: V2RenderInput): string {
  const data = input.data as Record<string, unknown>;
  const lines: string[] = [];

  lines.push('# Arch-Engine `doctor`');
  lines.push('');
  lines.push(`**Verdict:** ${doctorVerdictPhrase(input.status, data)}`);
  lines.push('');

  const workspace = (data.workspace ?? {}) as Record<string, unknown>;
  const adapter = (data.adapter ?? {}) as Record<string, unknown>;
  const topology = (data.topology ?? {}) as Record<string, unknown>;

  lines.push('| Check | Value |');
  lines.push('| --- | --- |');
  if (data.ready !== undefined) {
    lines.push(`| Ready | ${data.ready ? 'yes' : 'no'} |`);
  }
  if (workspace.type !== undefined) {
    lines.push(`| Workspace | ${escapeMd(String(workspace.type))} |`);
  }
  if (workspace.extractionMode !== undefined) {
    lines.push(`| Extraction | ${escapeMd(String(workspace.extractionMode))} |`);
  }
  if (adapter.id !== undefined && adapter.resolved !== undefined) {
    lines.push(
      `| Adapter | \`${escapeMd(String(adapter.id))}\` ${adapter.resolved ? '(resolved)' : '(missing)'} |`,
    );
  }
  if (topology.nodes !== undefined) {
    lines.push(`| Nodes | ${topology.nodes as number} |`);
  }
  if (topology.coverage !== undefined) {
    lines.push(`| Coverage | ${pct(topology.coverage as number)} |`);
  }
  if (data.policyConfigured !== undefined) {
    lines.push(
      `| Policy | ${data.policyConfigured ? 'configured' : 'not configured'} |`,
    );
  }
  lines.push('');

  appendDiagnosticsBlock(lines, input.diagnostics);
  appendNextActionsBlock(lines, input.nextActions);
  appendExitFooter(lines, input.exitCode);

  return lines.join('\n');
}

// ─── inspect (thin) ─────────────────────────────────────────────

function renderInspectMarkdown(input: V2RenderInput): string {
  const data = input.data as Record<string, unknown>;
  const topology = (data.topology ?? {}) as Record<string, unknown>;
  const adaptersActive = (data.adaptersActive ?? []) as string[];
  const lines: string[] = [];

  lines.push('# Arch-Engine `inspect`');
  lines.push('');
  lines.push(`**Verdict:** ${verdictPhrase(input.status)}`);
  lines.push('');

  lines.push('| Metric | Value |');
  lines.push('| --- | --- |');
  if (topology.nodes !== undefined) lines.push(`| Nodes | ${topology.nodes as number} |`);
  if (topology.edges !== undefined) lines.push(`| Edges | ${topology.edges as number} |`);
  if (topology.crossings !== undefined) lines.push(`| Crossings | ${topology.crossings as number} |`);
  if (topology.coverage !== undefined) lines.push(`| Coverage | ${pct(topology.coverage as number)} |`);
  if (topology.connectivity !== undefined) lines.push(`| Connectivity | ${pct(topology.connectivity as number)} |`);
  if (topology.topologyConfidenceLabel !== undefined)
    lines.push(`| Confidence | ${topology.topologyConfidenceLabel as string} |`);
  if (topology.extractionMode !== undefined)
    lines.push(`| Extraction | ${escapeMd(String(topology.extractionMode))} |`);
  if (topology.workspaceType !== undefined)
    lines.push(`| Workspace | ${escapeMd(String(topology.workspaceType))} |`);
  lines.push('');

  if (adaptersActive.length > 0) {
    lines.push('## Adapters');
    lines.push('');
    for (const a of adaptersActive) lines.push(`- \`${escapeMd(a)}\``);
    lines.push('');
  }

  appendDiagnosticsBlock(lines, input.diagnostics);
  appendNextActionsBlock(lines, input.nextActions);
  appendExitFooter(lines, input.exitCode);

  return lines.join('\n');
}

// ─── explain (thin) ─────────────────────────────────────────────

function renderExplainMarkdown(input: V2RenderInput): string {
  const data = input.data as Record<string, unknown>;
  const lines: string[] = [];
  const target = (data.target as string | undefined) ?? '';
  const mode = (data.mode as string | undefined) ?? 'matched';

  lines.push('# Arch-Engine `explain`');
  lines.push('');
  if (target) lines.push(`**Target:** \`${escapeMd(target)}\``);
  lines.push(`**Mode:** ${mode}`);
  lines.push(`**Verdict:** ${verdictPhrase(input.status)}`);
  lines.push('');

  if (mode === 'unmatched') {
    const supportedSpecialTargets = (data.supportedSpecialTargets ?? []) as string[];
    const suggestions = (data.suggestions ?? []) as string[];
    if (supportedSpecialTargets.length > 0) {
      lines.push('## Supported special targets');
      lines.push('');
      for (const t of supportedSpecialTargets) lines.push(`- \`${escapeMd(t)}\``);
      lines.push('');
    }
    if (suggestions.length > 0) {
      lines.push('## Suggestions');
      lines.push('');
      for (const s of suggestions) lines.push(`- \`${escapeMd(s)}\``);
      lines.push('');
    }
  } else if (mode === 'matched') {
    const matches = (data.matches ?? []) as Array<Record<string, unknown>>;
    if (matches.length > 0) {
      lines.push(`## Matches (${matches.length})`);
      lines.push('');
      lines.push('| From | To | Type | Confidence |');
      lines.push('| --- | --- | --- | --- |');
      for (const m of matches.slice(0, VIOLATIONS_CAP)) {
        const conf =
          typeof m.confidence_score === 'number'
            ? (m.confidence_score as number).toFixed(2)
            : '?';
        lines.push(
          `| \`${escapeMd(String(m.source))}\` | \`${escapeMd(String(m.target))}\` | ${escapeMd(String(m.type ?? ''))} | ${conf} |`,
        );
      }
      if (matches.length > VIOLATIONS_CAP) {
        lines.push(`\n_…and ${matches.length - VIOLATIONS_CAP} more._`);
      }
      lines.push('');
    }
  }

  appendDiagnosticsBlock(lines, input.diagnostics);
  appendNextActionsBlock(lines, input.nextActions);
  appendExitFooter(lines, input.exitCode);

  return lines.join('\n');
}

// ─── shared blocks ──────────────────────────────────────────────

function appendDiagnosticsBlock(
  lines: string[],
  diagnostics: ReadonlyArray<CliDiagnostic>,
): void {
  const sorted = sortDiagnostics(diagnostics);
  lines.push(`## Diagnostics (${sorted.length})`);
  lines.push('');
  if (sorted.length === 0) {
    lines.push('_No diagnostics._');
    lines.push('');
    return;
  }
  const shown = sorted.slice(0, DIAGNOSTICS_CAP);
  for (const d of shown) {
    const code = d.code;
    const sev = d.severity;
    lines.push(`- **\`${code}\`** (${sev}): ${escapeMd(stripStackish(d.message))}`);
  }
  if (sorted.length > DIAGNOSTICS_CAP) {
    lines.push(`\n_…and ${sorted.length - DIAGNOSTICS_CAP} more._`);
  }
  lines.push('');
}

function appendNextActionsBlock(
  lines: string[],
  nextActions: ReadonlyArray<string>,
): void {
  if (nextActions.length === 0) return;
  lines.push('## Next');
  lines.push('');
  for (const a of nextActions) {
    lines.push(`- ${escapeMd(a)}`);
  }
  lines.push('');
}

function appendExitFooter(lines: string[], exitCode: number): void {
  lines.push('---');
  lines.push('');
  const phrase = exitSemantic(exitCode);
  lines.push(`_Exit ${exitCode} — ${phrase}._`);
}

// ─── helpers ────────────────────────────────────────────────────

function pct(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

function escapeMd(value: string): string {
  // Escape pipe in tables; backticks in inline code we leave to caller
  // wrapping. No HTML escape needed (markdown renderers handle it).
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/**
 * Strip lines that look like a stack frame from a diagnostic
 * message before embedding in markdown. Defence-in-depth: the
 * v1.0.3 diagnostic shape doesn't carry stack frames, but a future
 * caller might pass one through `details`.
 */
function stripStackish(value: string): string {
  return value
    .split('\n')
    .filter((l) => !/^\s+at\s+/.test(l))
    .join(' ');
}

function verdictPhrase(status: V2Status): string {
  switch (status) {
    case 'passed':
      return 'Passed';
    case 'blocked':
      return 'Blocked';
    case 'warning':
      return 'Warning';
    case 'error':
      return 'Error';
    case 'internal_error':
      return 'Internal error';
    case 'not_enforced':
      return 'Not enforced';
  }
}

function analyzeVerdictPhrase(
  status: V2Status,
  data: Record<string, unknown>,
): string {
  const stability = (data.stability ?? {}) as Record<string, unknown>;
  const headlineKind = stability.headlineKind as string | undefined;
  if (headlineKind === 'no-policy') return 'No policy configured';
  if (headlineKind === 'low-signal') return 'Low-signal topology';
  if (headlineKind === 'tier' && stability.tier !== undefined)
    return String(stability.tier);
  return verdictPhrase(status);
}

function doctorVerdictPhrase(
  status: V2Status,
  data: Record<string, unknown>,
): string {
  if (data.ready === true) {
    if (data.policyConfigured === false) return 'Ready (no policy configured)';
    return 'Ready';
  }
  if (status === 'error') return 'Error';
  if (status === 'not_enforced') return 'Not enforced';
  return verdictPhrase(status);
}

function exitSemantic(exitCode: number): string {
  switch (exitCode) {
    case 0:
      return 'no blocking architecture violations';
    case 1:
      return 'blocking architecture violations';
    case 2:
      return 'invalid input or configuration';
    case 3:
      return 'adapter or workspace failure';
    case 5:
      return 'internal invariant failure';
    default:
      return 'failure';
  }
}

// ─── v1.2.0 drift section ───────────────────────────────────────

const DRIFT_TABLE_CAP = 25;

/**
 * Build the parenthetical to append to the **Verdict:** line when
 * drift is non-zero. Returns the empty string when drift is absent
 * or zero. Mirrors the human-output behaviour in check.ts /
 * analyze.ts.
 */
function buildDriftVerdictSuffix(data: Record<string, unknown>): string {
  const drift = data.drift as Record<string, unknown> | undefined;
  if (!drift) return '';
  const summary = drift.summary as Record<string, number> | undefined;
  if (!summary) return '';
  const parts: string[] = [];
  if ((summary.newViolations ?? 0) > 0) parts.push(`+${summary.newViolations} violation${summary.newViolations === 1 ? '' : 's'}`);
  if ((summary.resolvedViolations ?? 0) > 0) parts.push(`-${summary.resolvedViolations} resolved`);
  if ((summary.addedEdges ?? 0) > 0) parts.push(`+${summary.addedEdges} edge${summary.addedEdges === 1 ? '' : 's'}`);
  if ((summary.removedEdges ?? 0) > 0) parts.push(`-${summary.removedEdges} edge${summary.removedEdges === 1 ? '' : 's'}`);
  if (parts.length === 0) return '';
  return ` _(drift: ${parts.join(', ')})_`;
}

/**
 * Append the `## Architecture Drift` section, between Violations
 * and Diagnostics, when `data.drift` is present.
 */
function appendDriftBlock(lines: string[], data: Record<string, unknown>): void {
  const drift = data.drift as Record<string, unknown> | undefined;
  if (!drift) return;
  const baseline = drift.baseline as Record<string, unknown> | undefined;
  const summary = drift.summary as Record<string, number | boolean> | undefined;
  const topology = drift.topology as Record<string, unknown> | undefined;
  const violations = drift.violations as Record<string, ReadonlyArray<Record<string, unknown>>> | undefined;
  if (!summary) return;

  lines.push('## Architecture Drift');
  lines.push('');

  const path = typeof baseline?.path === 'string' ? baseline.path : '(unknown baseline)';
  const ver = typeof baseline?.archEngineVersion === 'string' ? baseline.archEngineVersion : 'unknown';
  lines.push(`Compared against \`${escapeMd(path)}\` (arch-engine@${ver}).`);
  lines.push('');

  // Detect "no drift" by looking at the entire summary block.
  const hasAny =
    Number(summary.newViolations ?? 0) +
      Number(summary.resolvedViolations ?? 0) +
      Number(summary.persistedViolations ?? 0) +
      Number(summary.addedEdges ?? 0) +
      Number(summary.removedEdges ?? 0) +
      Number(summary.addedNodes ?? 0) +
      Number(summary.removedNodes ?? 0) >
      0 || summary.graphSurfaceHashChanged === true;

  if (!hasAny) {
    lines.push('_No architectural drift detected._');
    lines.push('');
    return;
  }

  lines.push('| Type | Count |');
  lines.push('| --- | ---: |');
  if ((summary.newViolations as number) > 0)
    lines.push(`| New blocking violations | ${summary.newViolations} |`);
  if ((summary.resolvedViolations as number) > 0)
    lines.push(`| Resolved violations | ${summary.resolvedViolations} |`);
  if ((summary.persistedViolations as number) > 0)
    lines.push(`| Persisted violations | ${summary.persistedViolations} |`);
  if ((summary.addedEdges as number) > 0) lines.push(`| Added edges | ${summary.addedEdges} |`);
  if ((summary.removedEdges as number) > 0) lines.push(`| Removed edges | ${summary.removedEdges} |`);
  if ((summary.addedNodes as number) > 0) lines.push(`| Added nodes | ${summary.addedNodes} |`);
  if ((summary.removedNodes as number) > 0) lines.push(`| Removed nodes | ${summary.removedNodes} |`);
  if (summary.scoreDelta !== null && summary.scoreDelta !== undefined && typeof summary.scoreDelta === 'number' && Math.abs(summary.scoreDelta) > 0.005) {
    lines.push(`| Score delta | ${(summary.scoreDelta as number).toFixed(3)} |`);
  }
  lines.push('');

  // New violating edges (only emit if non-empty).
  const newViolations = violations?.new ?? [];
  if (newViolations.length > 0) {
    lines.push('### New violating edges');
    lines.push('');
    lines.push('| Rule | From | To | Severity | CI-blocking |');
    lines.push('| --- | --- | --- | --- | --- |');
    const shown = newViolations.slice(0, DRIFT_TABLE_CAP);
    for (const v of shown) {
      const edge = (v.edge as Record<string, string>) ?? { from: '?', to: '?', type: '' };
      const rule = (v.ruleId as string | undefined) ?? '_(unknown)_';
      const sev = (v.severity as string | undefined) ?? 'error';
      const ci = (v.ciBlocking as boolean | undefined) ? 'yes' : 'no';
      lines.push(
        `| \`${escapeMd(rule)}\` | \`${escapeMd(edge.from)}\` | \`${escapeMd(edge.to)}\` | ${sev} | ${ci} |`,
      );
    }
    if (newViolations.length > DRIFT_TABLE_CAP) {
      lines.push(`\n_…and ${newViolations.length - DRIFT_TABLE_CAP} more (see JSON v2 for full data)._`);
    }
    lines.push('');
  }

  // Added edges.
  const addedEdges = (topology?.addedEdges as ReadonlyArray<Record<string, unknown>> | undefined) ?? [];
  if (addedEdges.length > 0) {
    lines.push('### Added edges');
    lines.push('');
    lines.push('| From | To | Type |');
    lines.push('| --- | --- | --- |');
    const shown = addedEdges.slice(0, DRIFT_TABLE_CAP);
    for (const e of shown) {
      lines.push(
        `| \`${escapeMd(String(e.from))}\` | \`${escapeMd(String(e.to))}\` | \`${escapeMd(String(e.type ?? ''))}\` |`,
      );
    }
    if (addedEdges.length > DRIFT_TABLE_CAP) {
      lines.push(`\n_…and ${addedEdges.length - DRIFT_TABLE_CAP} more (see JSON v2 for full data)._`);
    }
    lines.push('');
  }

  // Removed edges.
  const removedEdges = (topology?.removedEdges as ReadonlyArray<Record<string, unknown>> | undefined) ?? [];
  if (removedEdges.length > 0) {
    lines.push('### Removed edges');
    lines.push('');
    lines.push('| From | To | Type |');
    lines.push('| --- | --- | --- |');
    const shown = removedEdges.slice(0, DRIFT_TABLE_CAP);
    for (const e of shown) {
      lines.push(
        `| \`${escapeMd(String(e.from))}\` | \`${escapeMd(String(e.to))}\` | \`${escapeMd(String(e.type ?? ''))}\` |`,
      );
    }
    if (removedEdges.length > DRIFT_TABLE_CAP) {
      lines.push(`\n_…and ${removedEdges.length - DRIFT_TABLE_CAP} more (see JSON v2 for full data)._`);
    }
    lines.push('');
  }
}

// Re-export for tests/utilities that want the cap constants
export const MARKDOWN_VIOLATIONS_CAP = VIOLATIONS_CAP;
export const MARKDOWN_DIAGNOSTICS_CAP = DIAGNOSTICS_CAP;
export const MARKDOWN_SIZE_CAP_BYTES = SIZE_CAP_BYTES;

// Re-exports used by callers that import from one place.
export { type V2RenderInput, type V2Status, type V2Summary };
