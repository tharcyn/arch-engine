import * as crypto from 'node:crypto';
import { PolicyStackEntry } from '../policy/types.js';
import { stableCanonicalStringify } from './stableCanonicalStringify.js';

export const DEPENDENCY_GRAPH_SHAPE_HASH_VERSION = 'v1';

/**
 * Phase 4.11 Objective 2: Dependency Graph Shape Hash
 *
 * Computes a hash representing dependency topology only — the structural
 * shape of the graph without manifest, trust, capability, or registry data.
 *
 * Enables: planner graph reuse, structural equivalence detection,
 * simulation acceleration, topology drift diagnostics.
 */
export function buildDependencyAdjacency(
  entries: PolicyStackEntry[]
): Record<string, string[]> {
  const adjacency: Record<string, string[]> = {};

  for (const e of entries) {
    const key = `${e.policyNamespace || ''}/${e.policyId}@${e.config.version || 1}`;
    const deps: string[] = [];

    if (e.config.extends) {
      const extendsArr = Array.isArray(e.config.extends) ? e.config.extends : [e.config.extends];
      for (const depId of extendsArr) {
        const found = entries.find(x => x.policyNamespace === e.policyNamespace && x.policyId === depId);
        if (found) {
          deps.push(`${found.policyNamespace || ''}/${found.policyId}@${found.config.version || 1}`);
        } else {
          deps.push(`${e.policyNamespace || ''}/${depId}@?`);
        }
      }
    }

    adjacency[key] = deps.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  }

  return adjacency;
}

export function computeDependencyGraphShapeHash(entries: PolicyStackEntry[]): string {
  const adjacency = buildDependencyAdjacency(entries);
  // Sort keys deterministically before serialization
  const sortedKeys = Object.keys(adjacency).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  const sortedAdjacency: Record<string, string[]> = {};
  for (const k of sortedKeys) {
    sortedAdjacency[k] = adjacency[k];
  }
  const canonicalString = stableCanonicalStringify(sortedAdjacency);
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}
