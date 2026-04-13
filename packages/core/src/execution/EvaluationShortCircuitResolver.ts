import { PolicyTypeResolutionSurface } from './PolicyTypeResolver.js';
import { TrustResolutionSurface } from '../composition/TrustOverrideResolver.js';
import { FallbackResolutionSurface } from '../composition/FallbackResolver.js';

export const SHORT_CIRCUIT_RESOLVER_VERSION = 'v1';

export interface ShortCircuitExecutionPlan {
  executableSequence: string[];
  terminatedBranches: Record<string, string>; // policyId -> terminationReason
}

/**
 * Phase 7 Objective 4: Evaluation Short Circuit Resolver
 *
 * Applies explicitly enforced termination rules (like branch stops on DENYs) deterministically
 * over the sealed sequence array, mapping logic purely on upstream outputs rather than graph recomputation.
 */
export class EvaluationShortCircuitResolver {
  constructor(
    private orderedExecutionSequence: string[],
    private typeResolutionSurface: PolicyTypeResolutionSurface,
    private trustResolutionSurface: TrustResolutionSurface,
    private fallbackResolutionSurface: FallbackResolutionSurface
  ) {}

  public resolve(): ShortCircuitExecutionPlan {
    const executableSequence: string[] = [];
    const terminatedBranches: Record<string, string> = {};

    let branchHalted = false;
    let haltReason = '';

    for (const key of this.orderedExecutionSequence) {
      if (branchHalted) {
        terminatedBranches[key] = `Branch halted recursively by upstream: ${haltReason}`;
        continue;
      }

      // 1. Explicit trust override rejection halts subtrees directly
      if (this.trustResolutionSurface[key]?.trustAccepted === false) {
        terminatedBranches[key] = 'Trust Scope Rejection';
        branchHalted = true;   // Simulated simple linear branch execution logic 
        haltReason = `Trust rejection at ${key}`;
        continue;
      }

      // 2. Structural DENY resolution
      if (this.typeResolutionSurface[key] === 'DENY') {
        terminatedBranches[key] = 'Policy Resolution Evaluated to DENY';
        branchHalted = true;
        haltReason = `DENY policy at ${key}`;
        continue;
      }

      // 3. Fallback exhaustion logic 
      if (this.fallbackResolutionSurface[key]?.hasFallback && 
          this.fallbackResolutionSurface[key]?.fallbackAvailable === false) {
        terminatedBranches[key] = 'Fallback Coverage Insufficiency Exhaustion';
        branchHalted = true;
        haltReason = `Fallback exhaustion at ${key}`;
        continue;
      }

      executableSequence.push(key);
    }

    return {
      executableSequence,
      terminatedBranches
    };
  }
}
