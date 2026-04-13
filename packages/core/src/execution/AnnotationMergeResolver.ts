import { PolicyStackEntry } from '../policy/types.js';
import { ShortCircuitExecutionPlan } from './EvaluationShortCircuitResolver.js';

export const ANNOTATION_MERGE_RESOLVER_VERSION = 'v1';

export type AnnotationAggregationSurface = Record<string, any>;

/**
 * Phase 7 Objective 5: Annotation Merge Resolver
 *
 * Merges annotation sets linearly according to their precise execution tier precedence 
 * order, enforcing deeply immutable behavior out of sealed execution sequence inputs.
 */
export class AnnotationMergeResolver {
  constructor(
    private entries: PolicyStackEntry[],
    private executableSequence: string[] // From ShortCircuitPlan
  ) {}

  public resolve(): AnnotationAggregationSurface {
    const surface: AnnotationAggregationSurface = {};

    // Sort entries according to execution sequence. 
    // executableSequence naturally represents the ordered resolution array produced downstream
    const executionOrderMapping = new Map<string, PolicyStackEntry>();
    for (const entry of this.entries) {
      const key = `${entry.policyNamespace || ''}/${entry.policyId}`;
      executionOrderMapping.set(key, entry);
    }

    for (const key of this.executableSequence) {
      const entry = executionOrderMapping.get(key);
      if (!entry) continue;

      // Extract isolated execution surfaces mapping precedence explicitly (stable insertion)
      const policyAnnotations = entry.config.annotations || {};
      const moduleAnnotations = entry.executionMetadata?.arbitraryAnnotations || {};

      // Merge sequentially. Upstream node defines defaults, downstream nodes override (stackIndex order reversed natively above)
      for (const [k, v] of Object.entries(moduleAnnotations)) {
        surface[k] = v;
      }
      for (const [k, v] of Object.entries(policyAnnotations)) {
        surface[k] = v; // Overrides Module definitions safely.
      }
    }

    const sortedSurface: AnnotationAggregationSurface = {};
    const sortedKeys = Object.keys(surface).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    for (const key of sortedKeys) {
      sortedSurface[key] = surface[key];
    }

    return sortedSurface;
  }
}
