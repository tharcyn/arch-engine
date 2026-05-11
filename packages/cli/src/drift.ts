/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Drift engine (v1.2.0)
 * ═══════════════════════════════════════════════════════════
 *
 *  Pure function: (baseline, current) → DriftResult.
 *  Contract locked by docs/cli/baseline-comparison-spec.md §9.
 *
 *  Three orthogonal axes:
 *
 *    - Topology: addedNodes, removedNodes, changedNodes,
 *                addedEdges, removedEdges, changedEdges
 *    - Policy:   new, resolved, persisted, severityChanged
 *                (keyed by stable violation id)
 *    - Signal:   scoreDelta, coverageDelta, connectivityDelta,
 *                confidenceDelta, violationsDelta,
 *                graphSurfaceHashChanged
 *
 *  Determinism (binding):
 *
 *    - All arrays sorted by id ascending.
 *    - No wall-clock, no random, no filesystem, no env access.
 *    - Pure input → output: same inputs produce byte-identical
 *      outputs across runs.
 *    - Missing baseline-side scalars surface as `null`, not
 *      omitted.
 *
 *  This module is the heart of v1.2.0 baseline comparison and
 *  is unit-tested without spawning the CLI process.
 */

import type { CanonicalTopology, CanonicalEdge, CanonicalNode } from './canonical-topology.js';

// ─── Public types ───────────────────────────────────────────

export interface DriftViolationEntry {
  readonly id: string;
  readonly ruleId?: string;
  readonly edge?: { from: string; to: string; type: string };
  readonly severity?: string;
  readonly ciBlocking?: boolean;
  readonly category?: string;
  readonly code?: string;
  readonly [k: string]: unknown;
}

export interface DriftSeverityChange {
  readonly id: string;
  readonly ruleId?: string;
  readonly from: string;
  readonly to: string;
}

export interface DriftTopologyBlock {
  readonly addedNodes: ReadonlyArray<CanonicalNode>;
  readonly removedNodes: ReadonlyArray<CanonicalNode>;
  readonly changedNodes: ReadonlyArray<CanonicalNode>;
  readonly addedEdges: ReadonlyArray<CanonicalEdge>;
  readonly removedEdges: ReadonlyArray<CanonicalEdge>;
  readonly changedEdges: ReadonlyArray<CanonicalEdge>;
}

export interface DriftViolationsBlock {
  readonly new: ReadonlyArray<DriftViolationEntry>;
  readonly resolved: ReadonlyArray<DriftViolationEntry>;
  readonly persisted: ReadonlyArray<DriftViolationEntry>;
  readonly severityChanged: ReadonlyArray<DriftSeverityChange>;
}

export interface DriftSignalBlock {
  readonly scoreDelta: number | null;
  readonly coverageDelta: number | null;
  readonly connectivityDelta: number | null;
  readonly confidenceDelta: number | null;
  readonly violationsDelta: number | null;
  readonly graphSurfaceHashChanged: boolean;
}

export interface DriftSummaryCounters {
  readonly graphSurfaceHashChanged: boolean;
  readonly addedNodes: number;
  readonly removedNodes: number;
  readonly changedNodes: number;
  readonly addedEdges: number;
  readonly removedEdges: number;
  readonly changedEdges: number;
  readonly newViolations: number;
  readonly resolvedViolations: number;
  readonly persistedViolations: number;
  readonly violationSeverityChanged: number;
  readonly scoreDelta: number | null;
  readonly coverageDelta: number | null;
  readonly connectivityDelta: number | null;
  readonly confidenceDelta: number | null;
  readonly violationsDelta: number | null;
}

export interface DriftResult {
  readonly summary: DriftSummaryCounters;
  readonly topology: DriftTopologyBlock;
  readonly violations: DriftViolationsBlock;
  readonly signal: DriftSignalBlock;
  /** True when any topology, violation, or signal field is non-trivial. */
  readonly hasDrift: boolean;
}

export interface DriftSignals {
  readonly score: number | null;
  readonly coverage: number | null;
  readonly connectivity: number | null;
  readonly confidence: number | null;
  readonly violationsCount: number | null;
}

export interface DriftInput {
  readonly canonical: CanonicalTopology;
  readonly violations: ReadonlyArray<DriftViolationEntry>;
  readonly signals: DriftSignals;
}

// ─── Public API ────────────────────────────────────────────

/**
 * Compute drift between baseline and current.
 *
 * Both inputs share the same shape so the function is symmetric:
 * an `addedEdge` from baseline's perspective is the same edge a
 * `removedEdge` would be if you swapped the arguments.
 */
export function computeArchitectureDrift(
  baseline: DriftInput,
  current: DriftInput,
): DriftResult {
  const topology = diffTopology(baseline.canonical, current.canonical);
  const violations = diffViolations(baseline.violations, current.violations);
  const signal = diffSignal(baseline, current);

  const summary: DriftSummaryCounters = {
    graphSurfaceHashChanged: signal.graphSurfaceHashChanged,
    addedNodes: topology.addedNodes.length,
    removedNodes: topology.removedNodes.length,
    changedNodes: topology.changedNodes.length,
    addedEdges: topology.addedEdges.length,
    removedEdges: topology.removedEdges.length,
    changedEdges: topology.changedEdges.length,
    newViolations: violations.new.length,
    resolvedViolations: violations.resolved.length,
    persistedViolations: violations.persisted.length,
    violationSeverityChanged: violations.severityChanged.length,
    scoreDelta: signal.scoreDelta,
    coverageDelta: signal.coverageDelta,
    connectivityDelta: signal.connectivityDelta,
    confidenceDelta: signal.confidenceDelta,
    violationsDelta: signal.violationsDelta,
  };

  const hasDrift =
    summary.addedNodes +
      summary.removedNodes +
      summary.changedNodes +
      summary.addedEdges +
      summary.removedEdges +
      summary.changedEdges +
      summary.newViolations +
      summary.resolvedViolations +
      summary.violationSeverityChanged >
      0 ||
    summary.graphSurfaceHashChanged;

  return { summary, topology, violations, signal, hasDrift };
}

// ─── Topology diff ─────────────────────────────────────────

function diffTopology(
  baseline: CanonicalTopology,
  current: CanonicalTopology,
): DriftTopologyBlock {
  // Build id → entry maps for O(n) intersection / difference.
  const baseNodes = new Map(baseline.nodes.map((n) => [n.id, n]));
  const currNodes = new Map(current.nodes.map((n) => [n.id, n]));
  const baseEdges = new Map(baseline.edges.map((e) => [e.id, e]));
  const currEdges = new Map(current.edges.map((e) => [e.id, e]));

  const addedNodes: CanonicalNode[] = [];
  const removedNodes: CanonicalNode[] = [];
  // changedNodes intentionally always empty in v1.2; node id IS the
  // identity, so a "changed" node would have a different id. The
  // field is reserved for v1.3+ when node metadata becomes part of
  // the canonical surface.
  const changedNodes: CanonicalNode[] = [];

  for (const [id, n] of currNodes) {
    if (!baseNodes.has(id)) addedNodes.push(n);
  }
  for (const [id, n] of baseNodes) {
    if (!currNodes.has(id)) removedNodes.push(n);
  }

  const addedEdges: CanonicalEdge[] = [];
  const removedEdges: CanonicalEdge[] = [];
  // Same reasoning as changedNodes — reserved for forward compat.
  const changedEdges: CanonicalEdge[] = [];

  for (const [id, e] of currEdges) {
    if (!baseEdges.has(id)) addedEdges.push(e);
  }
  for (const [id, e] of baseEdges) {
    if (!currEdges.has(id)) removedEdges.push(e);
  }

  // Stable sort by id.
  addedNodes.sort(byId);
  removedNodes.sort(byId);
  changedNodes.sort(byId);
  addedEdges.sort(byId);
  removedEdges.sort(byId);
  changedEdges.sort(byId);

  return { addedNodes, removedNodes, changedNodes, addedEdges, removedEdges, changedEdges };
}

// ─── Policy (violations) diff ──────────────────────────────

function diffViolations(
  baseline: ReadonlyArray<DriftViolationEntry>,
  current: ReadonlyArray<DriftViolationEntry>,
): DriftViolationsBlock {
  const baseById = new Map<string, DriftViolationEntry>();
  for (const v of baseline) {
    const id = violationKey(v);
    if (id) baseById.set(id, v);
  }
  const currById = new Map<string, DriftViolationEntry>();
  for (const v of current) {
    const id = violationKey(v);
    if (id) currById.set(id, v);
  }

  const newArr: DriftViolationEntry[] = [];
  const resolvedArr: DriftViolationEntry[] = [];
  const persistedArr: DriftViolationEntry[] = [];
  const severityChangedArr: DriftSeverityChange[] = [];

  for (const [id, v] of currById) {
    if (!baseById.has(id)) {
      newArr.push(v);
    } else {
      persistedArr.push(v);
      const baseSev = String(baseById.get(id)?.severity ?? '');
      const currSev = String(v.severity ?? '');
      if (baseSev !== '' && currSev !== '' && baseSev !== currSev) {
        severityChangedArr.push({
          id,
          ruleId: typeof v.ruleId === 'string' ? v.ruleId : undefined,
          from: baseSev,
          to: currSev,
        });
      }
    }
  }
  for (const [id, v] of baseById) {
    if (!currById.has(id)) resolvedArr.push(v);
  }

  // Stable sort by id.
  newArr.sort(byId);
  resolvedArr.sort(byId);
  persistedArr.sort(byId);
  severityChangedArr.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  return {
    new: newArr,
    resolved: resolvedArr,
    persisted: persistedArr,
    severityChanged: severityChangedArr,
  };
}

/**
 * Canonical violation key. Prefers the stable v1.0.3 `id` field
 * (`v_<hex8>`); falls back to a content-derived hash when absent
 * so legacy/forward shapes still compare deterministically.
 *
 * The fallback mirrors the canonical edge hashing (sha256 of
 * `rule|from|to|severity`); we keep it inline here to avoid a
 * core-package dependency. Callers should always pass v1.0.3+
 * violation entries (they include `id`) in practice.
 */
function violationKey(v: DriftViolationEntry): string | null {
  if (typeof v?.id === 'string' && v.id.length > 0) return v.id;
  const rule = typeof v.ruleId === 'string' ? v.ruleId : '';
  const from = v.edge?.from ?? '';
  const to = v.edge?.to ?? '';
  const sev = typeof v.severity === 'string' ? v.severity : '';
  if (rule === '' && from === '' && to === '') return null;
  // Deterministic fallback id. We use a non-crypto hash here so
  // the fallback path is dependency-free; the crypto-grade ids
  // are emitted by v1.0.3+ check, which we read directly.
  return `fallback:${rule}|${from}|${to}|${sev}`;
}

// ─── Signal diff ───────────────────────────────────────────

function diffSignal(baseline: DriftInput, current: DriftInput): DriftSignalBlock {
  return {
    scoreDelta: numericDelta(baseline.signals.score, current.signals.score),
    coverageDelta: numericDelta(baseline.signals.coverage, current.signals.coverage),
    connectivityDelta: numericDelta(baseline.signals.connectivity, current.signals.connectivity),
    confidenceDelta: numericDelta(baseline.signals.confidence, current.signals.confidence),
    violationsDelta: numericDelta(baseline.signals.violationsCount, current.signals.violationsCount),
    graphSurfaceHashChanged:
      baseline.canonical.graphSurfaceHash !== current.canonical.graphSurfaceHash,
  };
}

function numericDelta(baseline: number | null, current: number | null): number | null {
  if (baseline === null || current === null) return null;
  return current - baseline;
}

// ─── Sort helper ──────────────────────────────────────────

function byId(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

// ─── JSON serialisation helpers ────────────────────────────

/**
 * Convert a `DriftResult` into the v2 `data.drift` JSON shape per
 * spec §11.3. Keys are emitted in the order they appear here;
 * `renderCliJsonV2` re-alphabetises before emit anyway.
 */
export function buildDriftJsonBlock(
  drift: DriftResult,
  baselineMeta: {
    path: string;
    schemaVersion: string;
    command: string;
    archEngineVersion: string;
    emittedAt?: string;
    graphSurfaceHash: string;
  },
): Record<string, unknown> {
  return {
    baseline: {
      path: baselineMeta.path,
      schemaVersion: baselineMeta.schemaVersion,
      command: baselineMeta.command,
      archEngineVersion: baselineMeta.archEngineVersion,
      ...(baselineMeta.emittedAt !== undefined ? { emittedAt: baselineMeta.emittedAt } : {}),
      graphSurfaceHash: baselineMeta.graphSurfaceHash,
    },
    summary: drift.summary,
    topology: {
      addedNodes: drift.topology.addedNodes,
      removedNodes: drift.topology.removedNodes,
      changedNodes: drift.topology.changedNodes,
      addedEdges: drift.topology.addedEdges,
      removedEdges: drift.topology.removedEdges,
      changedEdges: drift.topology.changedEdges,
    },
    violations: {
      new: drift.violations.new,
      resolved: drift.violations.resolved,
      persisted: drift.violations.persisted,
      severityChanged: drift.violations.severityChanged,
    },
    signal: drift.signal,
  };
}

/**
 * Build the `summary.drift` mirror per spec §11.5. The top-level
 * envelope summary gains these four headline counters when
 * `--baseline` is set.
 */
export function buildDriftSummaryMirror(drift: DriftResult): Record<string, number> {
  return {
    newViolations: drift.summary.newViolations,
    resolvedViolations: drift.summary.resolvedViolations,
    addedEdges: drift.summary.addedEdges,
    removedEdges: drift.summary.removedEdges,
  };
}

/**
 * Build the optional headline parenthetical when drift is non-zero,
 * per spec §11.5: `"(drift: +1 violation, +1 edge)"`.
 *
 * Returns the empty string when there's nothing to surface.
 */
export function buildDriftHeadlineSuffix(drift: DriftResult): string {
  if (!drift.hasDrift) return '';
  const parts: string[] = [];
  if (drift.summary.newViolations > 0) {
    parts.push(`+${drift.summary.newViolations} violation${drift.summary.newViolations === 1 ? '' : 's'}`);
  }
  if (drift.summary.resolvedViolations > 0) {
    parts.push(`-${drift.summary.resolvedViolations} resolved`);
  }
  if (drift.summary.addedEdges > 0) {
    parts.push(`+${drift.summary.addedEdges} edge${drift.summary.addedEdges === 1 ? '' : 's'}`);
  }
  if (drift.summary.removedEdges > 0) {
    parts.push(`-${drift.summary.removedEdges} edge${drift.summary.removedEdges === 1 ? '' : 's'}`);
  }
  if (parts.length === 0) return '';
  return ` (drift: ${parts.join(', ')})`;
}
