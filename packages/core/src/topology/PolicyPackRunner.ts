import type { TopologyPolicyPack } from './TopologyPolicyPack';
import type { PolicyEvaluationResult } from './PolicyEvaluationResult';
import type { PolicyExecutionContext } from '../policy/PolicyExecutionContext';
import { executeLocalPolicyPack } from '../policy/executeLocalPolicyPack';
import { normalizePolicyPackFinding } from '../policy/normalizePolicyPackFinding';
import { verifyEvaluationCompatibilityMatrix } from '../policy/verifyEvaluationCompatibilityMatrix';

export class PolicyPackRunner {
  private readonly packs: readonly TopologyPolicyPack[];

  constructor(packs: readonly TopologyPolicyPack[]) {
    const ids = new Set<string>();
    for (const pack of packs) {
      if (ids.has(pack.policyPackId)) {
        throw new Error(`Duplicate policyPackId detected: ${pack.policyPackId}`);
      }
      ids.add(pack.policyPackId);
    }
    this.packs = Object.freeze([...packs]);
  }

  run(context: PolicyExecutionContext): readonly PolicyEvaluationResult[] {
    const results: PolicyEvaluationResult[] = [];
    for (const pack of this.packs) {
      if (pack.evaluate) {
        // Capability Guard using Compatibility Matrix
        const compatibility = verifyEvaluationCompatibilityMatrix(pack, context);
        if (!compatibility.isCompatible) {
            results.push({
                policyPackId: pack.policyPackId,
                success: false,
                diagnostics: compatibility.violations.map(v => ({ severity: 'error', message: v, code: 'UNSUPPORTED_CAPABILITY' }))
            });
            continue;
        }

        const rawResult = pack.evaluate(context as any);
        
        let success = true;
        let diagnostics: any[] = [];
        
        if (rawResult && typeof rawResult === 'object') {
          // Normalize status
          if ('status' in rawResult) {
            success = (rawResult as any).status !== 'failure';
          } else if ('success' in rawResult) {
            success = Boolean((rawResult as any).success);
          }
          
          // Normalize diagnostics / findings
          if (Array.isArray((rawResult as any).findings)) {
            diagnostics = (rawResult as any).findings.map((f: any) => {
              const nf = normalizePolicyPackFinding(f || {});
              return nf;
            });
          } else if (Array.isArray((rawResult as any).diagnostics)) {
            diagnostics = [...(rawResult as any).diagnostics];
          }
        } else {
          // Normalization boundary: fail-closed if rawResult is completely invalid or undefined
          success = false;
        }

        results.push({
            policyPackId: pack.policyPackId,
            success,
            diagnostics
        });
      } else {
        results.push(executeLocalPolicyPack(pack.metadata?.rules, context));
      }
    }
    return Object.freeze(results);
  }
}
