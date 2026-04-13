import { CompositionPlan } from './MergePlanner.js';
import { PolicyStackEntry } from '../policy/types.js';

export const COMPOSITION_GRAPH_CONSTRUCTOR_VERSION = 'v1';

export interface CompositionExecutionGraph {
  executionOrderingGraph: string[];
  policyLayeringGraph: Record<string, string[]>;
  tieredEvaluationTree: Record<string, string[]>; // Key: Parent, Value: Children
  contractVersion: string;
}

/**
 * Phase 5 Objective 5: Composition Graph Constructor
 *
 * Constructs the deterministic evaluation graph intended for runtime federation and parsing.
 * Preserves the topological ordering extracted from sealed execution payload.
 */
export class CompositionGraphConstructor {
  constructor(
    private compositionPlan: CompositionPlan,
    private rootEntry: PolicyStackEntry
  ) {}

  public construct(): CompositionExecutionGraph {
    const adjacency = this.rootEntry.executionMetadata?.dependencyAdjacencySurface || {};
    const evaluationTree: Record<string, string[]> = {};

    // Copy deterministically sorted evaluation map
    const keys = Object.keys(adjacency).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    for (const key of keys) {
      evaluationTree[key] = [...adjacency[key]].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    }

    // Pass deterministic outputs out ensuring stability and snapshot replay safety
    return {
      executionOrderingGraph: [...this.compositionPlan.mergePlanGraph],
      policyLayeringGraph: JSON.parse(JSON.stringify(this.compositionPlan.policyPrecedenceLayering)),
      tieredEvaluationTree: evaluationTree,
      contractVersion: COMPOSITION_GRAPH_CONSTRUCTOR_VERSION
    };
  }
}
