/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/agp-emitter — JSON v2 → AGP record mappers
 * ═══════════════════════════════════════════════════════════
 *
 *  One mapper per record family. Each mapper produces fully-formed
 *  record objects via `buildRecord()` (which derives `payloadHash`
 *  and `id`).
 *
 *  Mapping table (verbatim from spec §12.1):
 *
 *    data.topology.canonical.nodes[]    → node:package
 *    data.topology.canonical.edges[]    → edge:depends_on
 *    data.adapter                       → adapter_evidence:selected
 *    diagnostics[]                      → diagnostic:<lowercased-code-suffix>
 *    data.drift.topology.addedNodes[]   → drift:node_added (1 per delta)
 *    data.drift.topology.removedNodes[] → drift:node_removed
 *    data.drift.topology.changedNodes[] → drift:node_changed
 *    data.drift.topology.addedEdges[]   → drift:edge_added
 *    data.drift.topology.removedEdges[] → drift:edge_removed
 *    data.drift.topology.changedEdges[] → drift:edge_changed
 *    data.drift.violations.new[]        → drift:violation_new
 *    data.drift.violations.resolved[]   → drift:violation_resolved
 *    data.drift.violations.persisted[]  → drift:violation_persisted
 *    data.drift.violations.severityChanged[] → drift:severity_changed
 *    data.drift.signal                  → drift:signal_delta (one)
 *    data.violations[]                  → policy_finding:<kind-from-severity>
 *    archEngineVersion / command / git/ci → provenance:extraction
 */

import { buildRecord } from '../hash.js';
import type {
  AgpRecord,
  ArchEngineAdapter,
  ArchEngineCanonicalEdge,
  ArchEngineCanonicalNode,
  ArchEngineDiagnosticInput,
  ArchEngineDriftBlock,
  ArchEngineDriftSeverityChange,
  ArchEngineDriftSignal,
  ArchEngineDriftViolation,
  ArchEnginePolicyViolation,
  SupportedArchEngineCommand,
} from '../types.js';

// ─── Node family ──────────────────────────────────────────────

export function mapNodeRecords(
  nodes: ReadonlyArray<ArchEngineCanonicalNode>,
  adapterEdgeMeta: ReadonlyMap<string, { workspacePath?: string; packageName?: string }>,
): AgpRecord[] {
  const out: AgpRecord[] = [];
  for (const n of nodes) {
    const attrs: Record<string, unknown> = {};
    // The current canonical-topology node shape is {id, type}. Some
    // adapters surface workspacePath via metadata.edges; the MVP
    // does not require it here. Future adapters may attach
    // workspacePath directly to the node — pass it through when
    // present.
    if (typeof n.workspacePath === 'string') attrs.workspacePath = n.workspacePath;
    if (typeof n.packageName === 'string') attrs.packageName = n.packageName;
    const fromAdapter = adapterEdgeMeta.get(n.id);
    if (fromAdapter?.workspacePath && attrs.workspacePath === undefined) {
      attrs.workspacePath = fromAdapter.workspacePath;
    }
    if (fromAdapter?.packageName && attrs.packageName === undefined) {
      attrs.packageName = fromAdapter.packageName;
    }
    const payload: Record<string, unknown> = {
      nodeId: n.id,
      type: 'package',
    };
    if (Object.keys(attrs).length > 0) {
      payload.attributes = attrs;
    }
    out.push(buildRecord({ family: 'node', kind: 'package', plane: 'factual', payload }));
  }
  return out;
}

// ─── Edge family ──────────────────────────────────────────────

export function mapEdgeRecords(
  edges: ReadonlyArray<ArchEngineCanonicalEdge>,
  adapterEdgeMeta: ReadonlyMap<string, { kind?: string; protocol?: string }>,
): AgpRecord[] {
  const out: AgpRecord[] = [];
  for (const e of edges) {
    const payload: Record<string, unknown> = {
      from: e.from,
      to: e.to,
      type: e.type,
    };
    if (typeof e.id === 'string' && /^e_[0-9a-f]{8}$/.test(e.id)) {
      payload.edgeIdLegacy = e.id;
    }
    const meta = adapterEdgeMeta.get(e.id);
    if (meta && (meta.kind || meta.protocol)) {
      const attributes: Record<string, unknown> = {};
      if (meta.kind) attributes.dependencyKind = meta.kind;
      if (meta.protocol) attributes.protocol = meta.protocol;
      payload.attributes = attributes;
    }
    out.push(
      buildRecord({ family: 'edge', kind: 'depends_on', plane: 'factual', payload }),
    );
  }
  return out;
}

// ─── Adapter evidence ────────────────────────────────────────

export function mapAdapterEvidenceRecord(
  adapter: ArchEngineAdapter,
): AgpRecord {
  // Filter the adapter's metadata to only the sub-blocks the schema
  // declares for v1 (`pnpm`, `yarnPnp`). Other metadata sub-keys
  // (e.g. `edges`, `graphSurfaceHash`, `sourceFiles`) are
  // adapter-internal plumbing and not part of the public
  // adapter_evidence shape; we drop them here. The schema enforces
  // `additionalProperties: false` so we MUST drop, not pass through.
  const metadata: Record<string, unknown> = {};
  if (adapter.metadata?.pnpm) metadata.pnpm = adapter.metadata.pnpm;
  if (adapter.metadata?.yarnPnp) metadata.yarnPnp = adapter.metadata.yarnPnp;

  const payload: Record<string, unknown> = {
    name: adapter.name,
    version: adapter.version,
    packageManager: adapter.packageManager,
    workspaceKind: adapter.workspaceKind,
    confidence: adapter.confidence,
    reasons: [...(adapter.reasons ?? [])],
    warnings: [...(adapter.warnings ?? [])],
    alsoDetected: (adapter.alsoDetected ?? []).map((d) => ({
      name: d.name,
      version: d.version,
      confidence: d.confidence,
      reasons: [...d.reasons],
    })),
    metadata,
  };
  return buildRecord({
    family: 'adapter_evidence',
    kind: 'selected',
    plane: 'factual',
    payload,
  });
}

// ─── Diagnostic family ───────────────────────────────────────

export function mapDiagnosticRecords(
  diagnostics: ReadonlyArray<ArchEngineDiagnosticInput>,
  sourceCommand: SupportedArchEngineCommand,
): AgpRecord[] {
  const out: AgpRecord[] = [];
  for (const d of diagnostics) {
    const kind = kindFromCode(d.code);
    const payload: Record<string, unknown> = {
      code: d.code,
      severity: d.severity,
      ciBlocking: d.ciBlocking ?? false,
      message: d.message,
      sourceCommand,
    };
    if (d.title) payload.title = d.title;
    if (d.fix) payload.fix = d.fix;
    if (d.details) payload.details = d.details;
    if (d.docsHint) payload.docsHint = d.docsHint;
    out.push(buildRecord({ family: 'diagnostic', kind, plane: 'factual', payload }));
  }
  return out;
}

function kindFromCode(code: string): string {
  // ARCH_ENGINE_PNP_RESOLUTION_DEFERRED -> pnp_resolution_deferred
  const idx = code.indexOf('_');
  if (idx < 0) return code.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const tail = code.slice(idx + 1);
  // strip leading namespace token (ENGINE / EMITTER)
  const stripped = tail.replace(/^(ENGINE|EMITTER)_/, '');
  return stripped.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

// ─── Drift family ────────────────────────────────────────────

export function mapDriftRecords(drift: ArchEngineDriftBlock, currentSnapshotDigest: string): AgpRecord[] {
  const out: AgpRecord[] = [];
  const baselineDigest =
    typeof drift.baseline?.graphSurfaceHash === 'string' && drift.baseline.graphSurfaceHash.startsWith('sha256:')
      ? drift.baseline.graphSurfaceHash
      : drift.baseline?.graphSurfaceHash
        ? `sha256:${drift.baseline.graphSurfaceHash}`
        : 'sha256:0000000000000000000000000000000000000000000000000000000000000000';
  const anchors = {
    baseline: {
      snapshotDigest: baselineDigest,
      ...(drift.baseline?.graphSurfaceHash
        ? { graphSurfaceHash: ensureSha256Prefix(drift.baseline.graphSurfaceHash) }
        : {}),
    },
    current: {
      snapshotDigest: currentSnapshotDigest,
    } as Record<string, unknown>,
  };

  const topo = drift.topology;
  for (const n of topo.addedNodes) {
    out.push(driftNode('node_added', anchors, n));
  }
  for (const n of topo.removedNodes) {
    out.push(driftNode('node_removed', anchors, n));
  }
  for (const n of topo.changedNodes) {
    out.push(driftNode('node_changed', anchors, n));
  }
  for (const e of topo.addedEdges) {
    out.push(driftEdge('edge_added', anchors, e));
  }
  for (const e of topo.removedEdges) {
    out.push(driftEdge('edge_removed', anchors, e));
  }
  for (const e of topo.changedEdges) {
    out.push(driftEdge('edge_changed', anchors, e));
  }
  const vio = drift.violations;
  for (const v of vio.new) out.push(driftViolation('violation_new', anchors, v));
  for (const v of vio.resolved) out.push(driftViolation('violation_resolved', anchors, v));
  for (const v of vio.persisted) out.push(driftViolation('violation_persisted', anchors, v));
  for (const sc of vio.severityChanged) out.push(driftSeverityChange(anchors, sc));

  // One signal_delta record.
  out.push(driftSignal(anchors, drift.signal));

  return out;
}

function ensureSha256Prefix(h: string): string {
  return h.startsWith('sha256:') ? h : `sha256:${h}`;
}

function driftNode(
  kind: 'node_added' | 'node_removed' | 'node_changed',
  anchors: Record<string, unknown>,
  node: ArchEngineCanonicalNode,
): AgpRecord {
  return buildRecord({
    family: 'drift',
    kind,
    plane: 'factual',
    payload: {
      ...anchors,
      node: { id: node.id },
    },
  });
}

function driftEdge(
  kind: 'edge_added' | 'edge_removed' | 'edge_changed',
  anchors: Record<string, unknown>,
  edge: ArchEngineCanonicalEdge,
): AgpRecord {
  return buildRecord({
    family: 'drift',
    kind,
    plane: 'factual',
    payload: {
      ...anchors,
      edge: { from: edge.from, to: edge.to, type: edge.type },
    },
  });
}

function driftViolation(
  kind: 'violation_new' | 'violation_resolved' | 'violation_persisted',
  anchors: Record<string, unknown>,
  violation: ArchEngineDriftViolation,
): AgpRecord {
  const v: Record<string, unknown> = { id: violation.id };
  if (violation.ruleId) v.ruleId = violation.ruleId;
  if (violation.severity) v.severity = violation.severity;
  if (violation.code) v.code = violation.code;
  return buildRecord({
    family: 'drift',
    kind,
    plane: 'factual',
    payload: { ...anchors, violation: v },
  });
}

function driftSeverityChange(
  anchors: Record<string, unknown>,
  change: ArchEngineDriftSeverityChange,
): AgpRecord {
  const sc: Record<string, unknown> = {
    id: change.id,
    from: change.from,
    to: change.to,
  };
  if (change.ruleId) sc.ruleId = change.ruleId;
  return buildRecord({
    family: 'drift',
    kind: 'severity_changed',
    plane: 'factual',
    payload: { ...anchors, severityChange: sc },
  });
}

function driftSignal(
  anchors: Record<string, unknown>,
  signal: ArchEngineDriftSignal,
): AgpRecord {
  return buildRecord({
    family: 'drift',
    kind: 'signal_delta',
    plane: 'factual',
    payload: {
      ...anchors,
      deltas: {
        scoreDelta: signal.scoreDelta,
        coverageDelta: signal.coverageDelta,
        connectivityDelta: signal.connectivityDelta,
        confidenceDelta: signal.confidenceDelta,
        violationsDelta: signal.violationsDelta,
        graphSurfaceHashChanged: signal.graphSurfaceHashChanged,
      },
    },
  });
}

// ─── Policy finding family ───────────────────────────────────

export function mapPolicyFindingRecords(
  violations: ReadonlyArray<ArchEnginePolicyViolation>,
  sourceCommand: SupportedArchEngineCommand,
): AgpRecord[] {
  const out: AgpRecord[] = [];
  for (const v of violations) {
    const kind = findingKindFromSeverity(v.severity);
    const findingId =
      typeof v.id === 'string' && v.id.startsWith('v_') && /^v_[0-9a-f]+$/.test(v.id)
        ? v.id
        : deriveFindingId(v);
    const payload: Record<string, unknown> = {
      findingId,
      severity: v.severity ?? 'BLOCKING',
      ciBlocking: v.ciBlocking ?? (v.severity === 'BLOCKING' || v.severity === 'ERROR'),
      code: v.code ?? 'ARCH_ENGINE_BLOCKING_VIOLATION',
      message: typeof v.message === 'string' ? v.message : `Policy violation ${v.id}`,
      derivedFromObservation: false,
      sourceCommand,
    };
    if (v.ruleId) payload.ruleId = v.ruleId;
    if (v.category) payload.category = v.category;
    if (v.edge) payload.edgeRef = { from: v.edge.from, to: v.edge.to, type: v.edge.type };
    out.push(buildRecord({ family: 'policy_finding', kind, plane: 'factual', payload }));
  }
  return out;
}

function findingKindFromSeverity(
  severity: string | undefined,
): 'blocking_violation' | 'advisory' | 'waived' {
  if (severity === 'BLOCKING' || severity === 'ERROR') return 'blocking_violation';
  return 'advisory';
}

function deriveFindingId(v: ArchEnginePolicyViolation): string {
  // Deterministic: combine rule id + edge ref + code + severity into
  // a short blake3-like digest token. We don't have BLAKE3 here
  // without import cycle; use a stable concatenation hashed by the
  // record's payloadHash later — but the findingId itself must be
  // stable BEFORE we hash. Compromise: build a 12-char hex from a
  // simple FNV-1a over the canonical material. This is identity
  // only, not security; the schema accepts the pattern.
  const material = `${v.ruleId ?? ''}|${v.code ?? ''}|${v.severity ?? ''}|${v.edge ? `${v.edge.from}->${v.edge.to}|${v.edge.type}` : ''}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < material.length; i++) {
    h ^= material.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // 8-char hex; pad to even.
  return `agp-finding:${h.toString(16).padStart(8, '0')}`;
}

// ─── Provenance ──────────────────────────────────────────────

export function mapProvenanceRecord(args: {
  command: SupportedArchEngineCommand;
  archEngineVersion: string;
  inputDigest: string;
  inputCommand: SupportedArchEngineCommand;
}): AgpRecord {
  const payload: Record<string, unknown> = {
    command: args.command,
    archEngineVersion: args.archEngineVersion,
    inputDigest: args.inputDigest,
    inputCommand: args.inputCommand,
    redaction: {
      repoRoot: 'redacted',
      homeDir: 'redacted',
      absolutePaths: 'rejected',
    },
  };
  return buildRecord({
    family: 'provenance',
    kind: 'extraction',
    plane: 'trust',
    payload,
  });
}
