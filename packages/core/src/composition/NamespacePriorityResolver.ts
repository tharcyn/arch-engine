import { PolicyStackEntry } from '../policy/types.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';

export const NAMESPACE_PRIORITY_RESOLVER_VERSION = 'v1';

export interface NamespacePriorityDecisionSurface {
  globalPriorities: string[]; // Order of namespaces from highest to lowest priority
  shadowingResolutionMap: Record<string, string>; // policyId -> winning namespace
}

/**
 * Phase 6 Objective 3: Namespace Priority Resolver
 *
 * Resolves same policy ID across namespaces, multi-tenant override surfaces,
 * cross-registry shadowing, and mirror namespace equivalence.
 */
export class NamespacePriorityResolver {
  constructor(
    private entries: PolicyStackEntry[],
    private namespaceSetHash: string,
    private registrySourceHash: string
  ) {}

  public resolve(): NamespacePriorityDecisionSurface {
    const globalPriorities: string[] = [];
    const shadowingResolutionMap: Record<string, string> = {};

    // For deterministic priority without complex traversal, we use topological depth/stack ordering
    // Root namespace generally > transitive sibling > registry defaults
    const namespaceDepths = new Map<string, number>();

    for (const entry of this.entries) {
      const ns = entry.policyNamespace || '';
      const depth = entry.executionMetadata?.dependencyDepth ?? 999;
      
      const existing = namespaceDepths.get(ns);
      if (existing === undefined || depth < existing) {
        namespaceDepths.set(ns, depth);
      }
    }

    // Sort namespaces: lower depth implies closer to root (stronger override intent)
    globalPriorities.push(...Array.from(namespaceDepths.keys()).sort((a, b) => {
      const diff = namespaceDepths.get(a)! - namespaceDepths.get(b)!;
      if (diff !== 0) return diff;
      return a < b ? -1 : a > b ? 1 : 0; // Lexicographic tie breaker ensures determinism
    }));

    // Resolve shadowings deterministically
    const idMap = new Map<string, string[]>();
    for (const entry of this.entries) {
      const id = entry.policyId;
      const ns = entry.policyNamespace || '';
      if (!idMap.has(id)) {
        idMap.set(id, []);
      }
      if (!idMap.get(id)!.includes(ns)) {
        idMap.get(id)!.push(ns);
      }
    }

    for (const [id, namespaces] of idMap.entries()) {
      if (namespaces.length > 1) {
        // Shadow conflict -> resolve using global Priorities
        let winner: string | null = null;
        for (const priorityNs of globalPriorities) {
          if (namespaces.includes(priorityNs)) {
            winner = priorityNs;
            break;
          }
        }
        
        if (!winner) {
          throw new PolicyRuntimeError({
            code: PolicyRuntimeErrorCode.NAMESPACE_PRIORITY_AMBIGUOUS,
            message: `Namespace priority ambiguous for policy "${id}". ` +
              `Could not determine priority among namespaces: [${namespaces.join(', ')}].`,
            stage: 'namespacePriorityResolver'
          });
        }
        shadowingResolutionMap[id] = winner;
      } else {
        shadowingResolutionMap[id] = namespaces[0];
      }
    }

    return {
      globalPriorities,
      shadowingResolutionMap
    };
  }
}
