import { CompositionExecutionGraph } from './CompositionGraphConstructor.js';

import { PolicyStackEntry } from '../policy/types.js';

export const EXECUTION_ORDERING_RESOLVER_VERSION = 'v1';

export interface OrderedExecutionSequence {
  sequence: string[];
  resolvedTiers: string[];
}

/**
 * Phase 5 Objective 6: Execution Ordering Resolver
 */
export class ExecutionOrderingResolver {
  constructor(
    private graph: CompositionExecutionGraph,
    private entries: PolicyStackEntry[]
  ) {}

  public resolve(): OrderedExecutionSequence {
    const sequence = [...this.graph.executionOrderingGraph].sort((a, b) => {
      const entryA = this.entries.find(e => `${e.policyNamespace || ''}/${e.policyId}` === a);
      const entryB = this.entries.find(e => `${e.policyNamespace || ''}/${e.policyId}` === b);
      
      const stackIndexA = entryA?.executionMetadata?.stackIndex ?? 999;
      const stackIndexB = entryB?.executionMetadata?.stackIndex ?? 999;
      if (stackIndexA !== stackIndexB) return stackIndexA < stackIndexB ? -1 : 1;

      const depthA = entryA?.executionMetadata?.dependencyDepth ?? 999;
      const depthB = entryB?.executionMetadata?.dependencyDepth ?? 999;
      if (depthA !== depthB) return depthA < depthB ? -1 : 1;

      return a < b ? -1 : a > b ? 1 : 0;
    }).reverse();

    const resolvedTiers = Object.keys(this.graph.policyLayeringGraph)
      .sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

    return {
      sequence,
      resolvedTiers
    };
  }
}
