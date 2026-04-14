/**
 * ═══════════════════════════════════════════════════════════
 *  @arch-engine/cli — Stability Artifact Writer
 * ═══════════════════════════════════════════════════════════
 *
 *  Writes deterministic stability-score.json artifacts for:
 *  - Local diffing
 *  - CI baseline comparison
 *  - SaaS synchronization
 *  - Badge generation
 *  - Multi-repo federation
 *
 *  INVARIANTS:
 *  - Stable key ordering (schema-defined order)
 *  - Stable numeric precision (4 decimal places)
 *  - Stable timestamp formatting (ISO 8601)
 *  - Sorted array elements
 */

import fs from 'node:fs';
import path from 'node:path';
import type { ExtractionMetadata } from '@arch-engine/adapter-monorepo';
import { classifyStability, classifyConfidence, type StabilityTier, type ConfidenceLabel } from './renderers.js';
import { computeRepoHash } from './auto-init.js';

// ─── Constants ──────────────────────────────────────────

export const SNAPSHOT_VERSION = '1.0';
export const SCHEMA_VERSION = '1.0.0';

// ─── Execution Metrics ──────────────────────────────────

export interface ExecutionMetrics {
  extractionMs: number;
  pipelineMs: number;
  totalMs: number;
}

// ─── Artifact Schema ────────────────────────────────────

export interface StabilityArtifact {
  // Schema identity
  snapshotVersion: string;
  schemaVersion: string;
  engineVersion: string;
  timestamp: string;
  repoHash: string;

  // Workspace context
  workspaceType: string;
  extractionMode: string;

  // Core metrics
  coverage: number;
  connectivity: number;
  topologyConfidence: number;
  stabilityScore: number;

  // Classification labels
  stabilityTier: StabilityTier;
  topologyConfidenceLabel: ConfidenceLabel;

  // Topology volume
  detectedNodes: number;
  connectedNodes: number;
  expectedNodes: number;

  // Governance signals
  authorityCrossings: number;

  // Trust signals
  warnings: string[];

  // Performance telemetry
  executionMetrics: ExecutionMetrics;
}

// ─── Artifact Construction ──────────────────────────────

/**
 * Create a deterministic stability artifact from extraction
 * metadata, engine results, and execution timing.
 */
export function createStabilityArtifact(
  rootDir: string,
  meta: ExtractionMetadata,
  score: number,
  crossingCount: number,
  metrics: ExecutionMetrics,
): StabilityArtifact {
  const stability = classifyStability(score);
  const confidenceLabel = classifyConfidence(meta.topologyConfidence);

  return {
    snapshotVersion: SNAPSHOT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    engineVersion: '1.0.0-rc.3',
    timestamp: new Date().toISOString(),
    repoHash: computeRepoHash(rootDir),

    workspaceType: meta.workspaceType,
    extractionMode: meta.extractionMode,

    coverage: Number(meta.coverage.toFixed(4)),
    connectivity: Number(meta.connectivity.toFixed(4)),
    topologyConfidence: Number(meta.topologyConfidence.toFixed(4)),
    stabilityScore: Number(score.toFixed(4)),

    stabilityTier: stability.tier,
    topologyConfidenceLabel: confidenceLabel,

    detectedNodes: meta.detectedNodes,
    connectedNodes: meta.connectedNodes,
    expectedNodes: meta.expectedNodes,

    authorityCrossings: crossingCount,

    warnings: [...meta.warnings].sort(),

    executionMetrics: {
      extractionMs: Math.round(metrics.extractionMs),
      pipelineMs: Math.round(metrics.pipelineMs),
      totalMs: Math.round(metrics.totalMs),
    },
  };
}

// ─── Artifact Writer ────────────────────────────────────

/**
 * Write stability-score.json to the .arch-engine directory.
 * Creates the directory if it doesn't exist.
 * Returns the absolute path to the written file.
 */
export function writeStabilityArtifact(
  rootDir: string,
  artifact: StabilityArtifact,
): string {
  const dotDir = path.join(rootDir, '.arch-engine');
  if (!fs.existsSync(dotDir)) {
    fs.mkdirSync(dotDir, { recursive: true });
  }

  const filePath = path.join(dotDir, 'stability-score.json');

  // Deterministic serialization: keys ordered by interface definition
  const ordered = JSON.stringify(artifact, null, 2);
  fs.writeFileSync(filePath, ordered, 'utf-8');

  return filePath;
}

// ─── Determinism Verifier ───────────────────────────────

/**
 * Verify that two artifact serializations are identical.
 * Used in tests to guarantee deterministic output across runs.
 */
export function verifyDeterministicSerialization(a: StabilityArtifact, b: StabilityArtifact): boolean {
  // Exclude timestamp for determinism comparison
  const normalize = (artifact: StabilityArtifact) => {
    const copy = { ...artifact, timestamp: '__NORMALIZED__' };
    return JSON.stringify(copy);
  };
  return normalize(a) === normalize(b);
}

// ─── Legacy Compat (topology.snapshot.json) ─────────────

export interface TopologySnapshot {
  snapshotVersion: string;
  engineVersion: string;
  generatedAt: string;
  coverage: number;
  stabilityIndex: number;
  nodes: number;
  edges: number;
}

export function createSnapshot(
  engineVersion: string,
  coverage: number,
  stabilityIndex: number,
  nodes: number,
  edges: number,
): TopologySnapshot {
  return {
    snapshotVersion: SNAPSHOT_VERSION,
    engineVersion,
    generatedAt: new Date().toISOString(),
    coverage,
    stabilityIndex,
    nodes,
    edges,
  };
}

export function writeSnapshot(dir: string, snapshot: TopologySnapshot): string {
  const dotDir = path.join(dir, '.arch-engine');
  if (!fs.existsSync(dotDir)) {
    fs.mkdirSync(dotDir, { recursive: true });
  }
  const file = path.join(dotDir, 'topology.snapshot.json');
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2), 'utf-8');
  return file;
}
