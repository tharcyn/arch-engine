import * as crypto from 'node:crypto';
import { PolicyStackEntry } from './types.js';
import { ResolutionGraph } from './resolutionGraph.js';

import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';
import { DIAMOND_TRAVERSAL_CONTRACT_VERSION } from './contracts/diamondTraversalContract.js';

export interface LocalPolicyRegistry {
  resolve(policyNamespace: string, policyName: string): PolicyStackEntry | undefined;
}

export function expandLocalStack(
  entryPolicy: PolicyStackEntry,
  registry?: LocalPolicyRegistry
): PolicyStackEntry[] {
  const stack: PolicyStackEntry[] = [];
  const graph = new ResolutionGraph();
  const visited = new Set<string>();

  const dfs = (currentEntry: PolicyStackEntry, currentPath: string[]) => {
    const policyId = currentEntry.policyId;

    if (graph.detectPathCycle(currentPath, policyId)) {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.PATH_CYCLE_DETECTED,
        message: 'Policy extends cycle detected — traversal aborted',
        policyId: policyId,
        contractVersion: 'v1'
      });
    }

    if (visited.has(policyId)) {
      return; // standard topological dependency resolution (diamond reuse)
    }

    const nextPath = [...currentPath, policyId];
    
    // Parent first
    const ext = currentEntry.config?.extends;
    if (ext) {
      const extList = Array.isArray(ext) ? ext : [ext];
      
      for (const parentRef of extList) {
        // We only support in-memory local workspace registry resolution for Phase 3A.
        // It resolves strings directly against the registry.
        if (registry) {
          // Assume the parentRef is just the policy name or includes the namespace. 
          // For deterministic local workspace expansion, we'll try to find it.
          const parentEntry = registry.resolve(currentEntry.policyNamespace || 'local', parentRef);
          if (parentEntry) {
            graph.addEdge(policyId, parentEntry.policyId);
            dfs(parentEntry, nextPath);
          }
        }
      }
    }

    // Before insertion check
    if (stack.some(e => e.policyId === policyId)) {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.DUPLICATE_STACK_ENTRY,
        message: 'Duplicate policyStackIds detected — traversal determinism violation',
        policyId: policyId,
        contractVersion: 'v1'
      });
    }

    // Child appended
    stack.push(currentEntry);
    visited.add(policyId);
    graph.markVisited(policyId);
  };

  dfs(entryPolicy, []);

  // Post-expansion topology closure validation
  const ids = stack.map(e => e.policyId);
  const hashes = stack.map(e => e.hash);
  const namespace = entryPolicy.policyNamespace || 'local';
  
  const checksum = crypto.createHash('sha256').update(namespace + ':' + ids.join('|')).digest('hex');
  const seedHash = entryPolicy.hash || '';
  const seed = crypto.createHash('sha256').update(namespace + ':' + seedHash).digest('hex');
  const topologyVersion = 'v1';

  if (
    ids.length === 0 ||
    ids.length !== hashes.length ||
    new Set(ids).size !== ids.length ||
    !checksum ||
    !seed ||
    !topologyVersion
  ) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.STACK_TOPOLOGY_VIOLATION,
      message: 'Traversal expansion closure violation detected',
      contractVersion: DIAMOND_TRAVERSAL_CONTRACT_VERSION
    });
  }

  return stack;
}
