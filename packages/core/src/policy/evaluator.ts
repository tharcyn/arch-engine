import type { 
  PolicyConfig, 
  PolicyViolation, 
  ViolationCategory, 
  PolicyDomainDef, 
  PolicyEvaluationResult,
  ComposedPolicy,
  ComposedRuleDef,
  AllowMatch
} from './types.js';

export interface EvaluatorEdge {
  source: string;
  target: string;
}

export function evaluatePolicy(
  edges: EvaluatorEdge[],
  config: ComposedPolicy,
  confidenceContext: string,
  policyHash: string
): PolicyEvaluationResult {
  const policyRuleHits: Record<string, number> = {};
  const edgeClassificationMap = new Map<string, ViolationCategory>();
  
  // 1. nodeDomainMap caching
  const nodeDomainMap = new Map<string, string | null>();
  const domainNames = Object.keys(config.domains || {});

  // path-segment-safe prefix matcher
  function normalizeGraphPath(p: string): string {
    return p.replace(/\\/g, '/').replace(/\/+$/, '');
  }

  function resolveDomain(entity: string): string | null {
    if (nodeDomainMap.has(entity)) return nodeDomainMap.get(entity)!;
    
    let matchedDomain: string | null = null;
    let longestMatchLen = -1;

    for (const d of domainNames) {
       // entity override via direct match or prefix match
       const cleanEntity = normalizeGraphPath(entity);
       const cleanPrefix = normalizeGraphPath(d);

       if (cleanEntity === cleanPrefix || cleanEntity.startsWith(cleanPrefix + '/')) {
         if (cleanPrefix.length > longestMatchLen) {
           longestMatchLen = cleanPrefix.length;
           matchedDomain = d;
         }
       }
    }
    
    nodeDomainMap.set(entity, matchedDomain);
    return matchedDomain;
  }

  // 2. Rule evaluation
  const violations: PolicyViolation[] = [];
  const allowMatches: AllowMatch[] = [];

  const tierRanks: Record<string, number> = { high: 3, medium: 2, low: 1 };

  const allows = config.rules?.allow || [];
  const forbids = config.rules?.forbid || [];

  function matchRule(entitySource: string, entityTarget: string, ruleData: { from: string, to: string }) {
    const sC = normalizeGraphPath(entitySource);
    const rFrom = normalizeGraphPath(ruleData.from);
    const matchS = sC === rFrom || sC.startsWith(rFrom + '/');

    const tC = normalizeGraphPath(entityTarget);
    const rTo = normalizeGraphPath(ruleData.to);
    const matchT = tC === rTo || tC.startsWith(rTo + '/');

    return matchS && matchT;
  }

  for (const edge of edges) {
     const src = edge.source;
     const tgt = edge.target;

     // Rule precedence: Allow -> Forbid -> Tier

     // 1. Allowlist override
     const allowMatch = allows.find(r => matchRule(src, tgt, r)) as ComposedRuleDef | undefined;
     if (allowMatch) {
       // ─── GOVERNANCE BYPASS AUDIT ───
       allowMatches.push({
         matchedAllowRuleId: allowMatch.originRuleId || allowMatch.id || 'anonymous',
         matchedAllowPolicyId: allowMatch.originPolicyId || 'local',
         allowCompositionDepth: allowMatch.compositionDepth ?? 0,
         from: src,
         to: tgt
       });
       continue;
     }

     // 2. Forbid list
     const forbidMatch = forbids.find(r => matchRule(src, tgt, r)) as ComposedRuleDef | undefined;
     if (forbidMatch) {
       const ruleId = forbidMatch.id || '';
       if (ruleId) {
         policyRuleHits[ruleId] = (policyRuleHits[ruleId] || 0) + 1;
       }
       
       const srcDomain = resolveDomain(src);
       const tgtDomain = resolveDomain(tgt);
       
       let tierSource: string | undefined;
       let tierTarget: string | undefined;
       let tierDelta: number | undefined;

       if (srcDomain && tgtDomain && config.domains) {
         const sDef = config.domains[srcDomain];
         const tDef = config.domains[tgtDomain];
         if (sDef && tDef && sDef.tier && tDef.tier) {
           tierSource = sDef.tier;
           tierTarget = tDef.tier;
           tierDelta = (tierRanks[sDef.tier] ?? 0) - (tierRanks[tDef.tier] ?? 0);
         }
       }

       const pViol: PolicyViolation = {
         violationCategory: 'explicit_forbid',
         from: src,
         to: tgt,
         severity: forbidMatch.severity || 'error',
         ruleId: ruleId || undefined,
         ruleSource: 'forbid_rule',
         confidenceContext,
         matchedDomainSource: srcDomain || undefined,
         matchedDomainTarget: tgtDomain || undefined,
         tierSource,
         tierTarget,
         tierDelta,
         suppressionEligible: true,
         
         // ─── PROVENANCE SEEDING ───
         originPolicyId: forbidMatch.originPolicyId || 'local',
         originRuleId: forbidMatch.originRuleId || ruleId || undefined,
         compositionDepth: forbidMatch.compositionDepth ?? 0,
         inheritedFromPolicyId: forbidMatch.inheritedFromPolicyId,
         originPolicyChain: forbidMatch.originPolicyChain || ['local'],
         mergeAuthority: forbidMatch.mergeAuthority || 'local',
         
         // ─── GOVERNANCE TOMBSTONE TELEMETRY ───
         suppressedByDeletion: forbidMatch.deleted,
         deletedReason: forbidMatch.deletedReason
       };
       
       if (!pViol.originPolicyId) throw new Error("Violation emitted without provenance");
       violations.push(pViol);
       edgeClassificationMap.set(`${src}::${tgt}`, 'explicit_forbid');
       continue;
     }

     // 3. Tier Rules
     const srcDomain = resolveDomain(src);
     const tgtDomain = resolveDomain(tgt);

     if (srcDomain && tgtDomain && config.domains) {
       const sDef = config.domains[srcDomain];
       const tDef = config.domains[tgtDomain];

       if (sDef.tier && tDef.tier && sDef.enforceTier !== false && tDef.enforceTier !== false) {
         const sRank = tierRanks[sDef.tier] ?? 0;
         const tRank = tierRanks[tDef.tier] ?? 0;
         const delta = sRank - tRank;

         // Higher tier cannot depend on lower tier (e.g. apps (3) -> infra (1) is forbidden)
         if (delta > 0) {
           const pViol: PolicyViolation = {
             violationCategory: 'tier_violation',
             from: src,
             to: tgt,
             severity: 'error',
             ruleSource: `tier_rule`,
             confidenceContext,
             matchedDomainSource: srcDomain,
             matchedDomainTarget: tgtDomain,
             tierSource: sDef.tier,
             tierTarget: tDef.tier,
             tierDelta: delta,
             suppressionEligible: true,
             
             // ─── PROVENANCE SEEDING ───
             originPolicyId: 'local',
             originRuleId: 'tier_rule',
             compositionDepth: 0,
             inheritedFromPolicyId: undefined,
             originPolicyChain: ['local'],
             mergeAuthority: 'local'
           };
           
           if (!pViol.originPolicyId) throw new Error("Violation emitted without provenance");
           violations.push(pViol);
           edgeClassificationMap.set(`${src}::${tgt}`, 'tier_violation');
           continue;
         }
       }
     }
  }

  return {
    violations,
    matchedEdges: edges.length,
    policyMode: config.mode || 'advisory',
    policyVersion: config.version,
    policyHash,
    evaluationStrategyVersion: 1,
    policyDetected: true, // evaluated successfully
    policyRuleHits,
    allowMatches
  };
}
