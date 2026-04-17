import type { TopologyPolicyPack } from './TopologyPolicyPack';
import type { PolicyEvaluationResult } from './PolicyEvaluationResult';
import type { PolicyExecutionContext } from '../policy/PolicyExecutionContext';
import { executeLocalPolicyPack } from '../policy/executeLocalPolicyPack';
import { normalizePolicyPackFinding } from '../policy/normalizePolicyPackFinding';

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
        // Capability Guard: explicitly check if pack requires capabilities and registry is absent or lacking
        if (pack.metadata?.requiredDatasetCapabilities && pack.metadata.requiredDatasetCapabilities.length > 0) {
            if (!context.capabilityManifest) {
                results.push({
                    policyPackId: pack.policyPackId,
                    success: false,
                    diagnostics: [{ severity: 'error', message: 'Execution context lacks capability registry to satisfy pack requirements.', code: 'MISSING_CAPABILITY_REGISTRATION' }]
                });
                continue;
            }
            const missing = pack.metadata.requiredDatasetCapabilities.filter(c => !context.capabilityManifest![c]);
            if (missing.length > 0) {
                results.push({
                    policyPackId: pack.policyPackId,
                    success: false,
                    diagnostics: [{ severity: 'error', message: `Pack requires unsupported capabilities: ${missing.join(', ')}`, code: 'UNSUPPORTED_CAPABILITY' }]
                });
                continue;
            }
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
            diagnostics = (rawResult as any).findings.map(f => {
              const nf = normalizePolicyPackFinding(f || {});
              return { severity: nf.severity, message: nf.message, code: nf.code || 'UNKNOWN' };
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
