import { PolicyStackEntry } from '../policy/types.js';
import { PrecedenceDecisionSurface } from './PrecedenceResolver.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';

export const FALLBACK_RESOLVER_VERSION = 'v1';

export interface FallbackResolutionDecision {
  policyId: string;
  hasFallback: boolean;
  shadowedBy?: string;     // Which policy out-ranks it (if fallback was suppressed logically)
  fallbackAvailable: boolean; // Was a fallback evaluated successfully
}

export type FallbackResolutionSurface = Record<string, FallbackResolutionDecision>;

/**
 * Phase 6 Objective 6: Fallback Resolver
 *
 * Scans the precedence maps and configuration attributes of the sealed evaluation graph
 * to ensure determinism properties remain true if fallbacks are activated explicitly.
 */
export class FallbackResolver {
  constructor(
    private entries: PolicyStackEntry[],
    private precedenceDecisionSurface: PrecedenceDecisionSurface
  ) {}

  public resolve(): FallbackResolutionSurface {
    const surface: FallbackResolutionSurface = {};
    const fallbackInsufficientKeys: string[] = [];

    // Fallback exhaustivity must be logically provable
    for (const entry of this.entries) {
      const key = `${entry.policyNamespace || ''}/${entry.policyId}`;
      const precedence = this.precedenceDecisionSurface[key];
      const hasFallbackCfg = !!entry.config.fallback;

      let fallbackAvailable = false;
      let shadowedBy: string | undefined = undefined;

      if (hasFallbackCfg) {
        if (precedence.tierScore < 500) { // arbitrary threshold based on depth scoring
          // Very deep transitive fallbacks might break context
          fallbackAvailable = false;
          fallbackInsufficientKeys.push(key);
        } else {
          fallbackAvailable = true;
        }
      }

      surface[key] = {
        policyId: entry.policyId,
        hasFallback: hasFallbackCfg,
        fallbackAvailable,
        shadowedBy
      };
    }

    if (fallbackInsufficientKeys.length > 0) {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.FALLBACK_RESOLUTION_INSUFFICIENT,
        message: `Fallback resolution insufficient. Coverage exhaustion failed for keys: [${fallbackInsufficientKeys.join(', ')}].`,
        stage: 'fallbackResolver'
      });
    }

    return surface;
  }
}
