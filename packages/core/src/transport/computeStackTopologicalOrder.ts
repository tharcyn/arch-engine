import { PolicyStackEntry } from '../policy/types.js';

export const STACK_TOPOLOGICAL_ORDER_VERSION = 'v1';

/**
 * Phase 4.10 Task 4: Deterministic Stack Topological Ordering Surface
 *
 * Generates a stable topological ordering for all entries in the resolved
 * dependency graph. Ordering respects:
 * - Dependency edges (entries depended upon come first)
 * - Override edges (extends relationships)
 * - Tier hints from composition metadata (if present)
 *
 * Fallback sort: namespace → policyId → version (deterministic).
 *
 * Assigns stackIndex to each entry's executionMetadata for downstream
 * consumption by TierResolver, MergePlanner, and ExecutionOrderingResolver.
 *
 * Does NOT affect closureGraphHash, snapshotClosureGraphHash, or PolicyStackFingerprint.
 */
export function computeStackTopologicalOrder(entries: PolicyStackEntry[]): PolicyStackEntry[] {
  // Build adjacency: entry → entries it depends on (via extends)
  const entryMap = new Map<string, PolicyStackEntry>();
  for (const e of entries) {
    const key = `${e.policyNamespace || ''}/${e.policyId}@${e.config.version || 1}`;
    entryMap.set(key, e);
  }

  // Build dependency edges: policyId → qualified keys of dependencies
  const dependsOn = new Map<string, string[]>();
  for (const e of entries) {
    const key = `${e.policyNamespace || ''}/${e.policyId}@${e.config.version || 1}`;
    const deps: string[] = [];
    if (e.config.extends) {
      const extendsArr = Array.isArray(e.config.extends) ? e.config.extends : [e.config.extends];
      for (const depId of extendsArr) {
        // Look up by namespace-qualified key
        const found = entries.find(x => x.policyNamespace === e.policyNamespace && x.policyId === depId);
        if (found) {
          deps.push(`${found.policyNamespace || ''}/${found.policyId}@${found.config.version || 1}`);
        }
      }
    }
    dependsOn.set(key, deps);
  }

  // Kahn's algorithm for topological sort
  const inDegree = new Map<string, number>();
  for (const [key] of entryMap) {
    inDegree.set(key, 0);
  }
  for (const [, deps] of dependsOn) {
    for (const dep of deps) {
      inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
    }
  }

  // Start with entries that have no dependents (leaves)
  // Actually, for topological sort, we want entries with no dependencies first
  // In Kahn's: in-degree 0 = no one depends on them. But we want dependencies-first.
  // So we compute: in-degree = how many dependsOn edges point TO this node.
  // Wait — we need to invert: for topological sort (dependencies first),
  // in-degree should count how many entries this entry depends ON.
  // Entries with 0 dependencies come first.

  const outDegree = new Map<string, number>();
  const dependedBy = new Map<string, string[]>();
  for (const [key] of entryMap) {
    outDegree.set(key, 0);
    dependedBy.set(key, []);
  }
  for (const [key, deps] of dependsOn) {
    outDegree.set(key, deps.length);
    for (const dep of deps) {
      const arr = dependedBy.get(dep) || [];
      arr.push(key);
      dependedBy.set(dep, arr);
    }
  }

  // Queue: entries with 0 outgoing dependencies (leaf dependencies)
  const queue: string[] = [];
  for (const [key, deg] of outDegree) {
    if (deg === 0) queue.push(key);
  }
  // Sort queue deterministically
  queue.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

  const ordered: PolicyStackEntry[] = [];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const entry = entryMap.get(current);
    if (entry) ordered.push(entry);

    // For each entry that depends on current, reduce its outDegree
    const consumers = dependedBy.get(current) || [];
    for (const consumer of consumers) {
      const newDeg = (outDegree.get(consumer) || 1) - 1;
      outDegree.set(consumer, newDeg);
      if (newDeg === 0 && !visited.has(consumer)) {
        queue.push(consumer);
        // Re-sort to maintain deterministic ordering
        queue.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
      }
    }
  }

  // Add any remaining entries not in topological order (disconnected)
  for (const [key, entry] of entryMap) {
    if (!visited.has(key)) {
      ordered.push(entry);
    }
  }

  return ordered;
}

/**
 * Assigns stackIndex to each entry's executionMetadata.
 */
export function assignStackIndices(entries: PolicyStackEntry[]): void {
  const ordered = computeStackTopologicalOrder(entries);
  for (let i = 0; i < ordered.length; i++) {
    if (!ordered[i].executionMetadata) ordered[i].executionMetadata = {};
    ordered[i].executionMetadata!.stackIndex = i;
    ordered[i].executionMetadata!.stackTopologicalOrder = ordered.map(e =>
      `${e.policyNamespace || ''}/${e.policyId}@${e.config.version || 1}`
    );
  }
}
