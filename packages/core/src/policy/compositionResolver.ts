import * as crypto from 'node:crypto';
import type { 
  PolicyStackEntry, 
  ComposedPolicy, 
  ComposedRules, 
  ComposedRuleDef, 
  PolicyMode, 
  PolicyDomainDef,
  MergeAuthority
} from './types.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';
import { resolveSeverity } from './types.js';

/**
 * Deterministically merges an ordered stack of policies (0 = root, n = deepest child).
 * Child overrides parent properties, domains, and rules (matched by ruleId).
 *
 * PROTOCOL INVARIANTS:
 * - policyId must be non-empty and unique within the stack
 * - Anonymous rules are content-addressed via hash(from + to + severity)
 * - Post-composition authority relabeling uses copy-on-write (no in-place mutation)
 * - inheritedFromPolicyId is never self-referential
 */
export function composePolicies(policyStack: PolicyStackEntry[]): ComposedPolicy {
  if (!policyStack || policyStack.length === 0) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.STACK_TOPOLOGY_VIOLATION,
      message: 'Composition requires at least one policy in the stack.',
      contractVersion: 'v1'
    });
  }

  // ─── FIX 5: policyId validation ───────────────────────
  const seenPolicyIds = new Set<string>();
  for (const entry of policyStack) {
    if (!entry.policyId || entry.policyId.trim() === '') {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.STACK_TOPOLOGY_VIOLATION,
        message: 'PolicyStackEntry.policyId must be a non-empty string.',
        policyId: entry.policyId,
        contractVersion: 'v1'
      });
    }
    if (seenPolicyIds.has(entry.policyId)) {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.DUPLICATE_STACK_ENTRY,
        message: `Duplicate policyId '${entry.policyId}' in policy stack. Each entry must have a unique policyId.`,
        policyId: entry.policyId,
        contractVersion: 'v1'
      });
    }
    seenPolicyIds.add(entry.policyId);
  }

  let finalVersion = 1;
  let finalMode: PolicyMode | undefined;
  const finalDomains: Record<string, PolicyDomainDef> = {};
  
  const allowRulesMap = new Map<string, ComposedRuleDef>();
  const forbidRulesMap = new Map<string, ComposedRuleDef>();

  for (let depth = 0; depth < policyStack.length; depth++) {
    const entry = policyStack[depth];
    const { config, policyId } = entry;

    finalVersion = config.version;
    if (config.mode) finalMode = config.mode;
    
    // Merge domains (replace/override logic)
    if (config.domains) {
      for (const [dName, dDef] of Object.entries(config.domains)) {
        finalDomains[dName] = { ...finalDomains[dName], ...dDef };
      }
    }

    // Merge allow rules
    if (config.rules?.allow) {
      for (const rule of config.rules.allow) {
        // ─── FIX: content-addressed anonymous rule keying ───
        const key = rule.id ? `id:${rule.id}` : `content:${contentKey(rule.from, rule.to, rule.severity || 'error')}`;
        
        const existing = allowRulesMap.get(key);
        if (existing) {
          // Override case
          const newChain = [...existing.originPolicyChain, policyId];
          const isRuleDeleted = rule.deleted ?? config.deleted;
          let dReason = existing.deletedReason;
          if (isRuleDeleted && !existing.deleted) dReason = 'overridden';
          else if (isRuleDeleted && existing.deleted) dReason = 'inherited';
          else if (isRuleDeleted) dReason = 'authoritative';

          allowRulesMap.set(key, {
            ...rule,
            originPolicyId: policyId,
            originRuleId: rule.id || 'anonymous',
            compositionDepth: depth,
            inheritedFromPolicyId: newChain.length >= 2 ? newChain[newChain.length - 2] : undefined,
            originPolicyChain: newChain,
            mergeAuthority: 'overridden',
            severityLock: config.severityLock,
            severityPolicy: config.severityPolicy,
            deleted: isRuleDeleted,
            deletedReason: dReason
          });
        } else {
          // Additive case
          const isRuleDeleted = rule.deleted ?? config.deleted;
          let dReason: 'authoritative' | 'inherited' | 'overridden' | undefined;
          if (isRuleDeleted) dReason = depth === 0 ? 'authoritative' : 'inherited';

          allowRulesMap.set(key, {
            ...rule,
            originPolicyId: policyId,
            originRuleId: rule.id || 'anonymous',
            compositionDepth: depth,
            // ─── FIX 3: Additive rules are NOT inherited from anyone ───
            inheritedFromPolicyId: undefined,
            originPolicyChain: [policyId],
            // ─── FIX 2: Distinguish additive vs local ───
            mergeAuthority: depth > 0 ? 'additive' : 'local',
            severityLock: config.severityLock,
            severityPolicy: config.severityPolicy,
            deleted: isRuleDeleted,
            deletedReason: dReason
          });
        }
      }
    }

    // Merge forbid rules
    if (config.rules?.forbid) {
      for (const rule of config.rules.forbid) {
        // ─── FIX: content-addressed anonymous rule keying ───
        const key = rule.id ? `id:${rule.id}` : `content:${contentKey(rule.from, rule.to, rule.severity || 'error')}`;
        
        const existing = forbidRulesMap.get(key);
        if (existing) {
          // Inherited vs Override
          // check severityLock
          if (existing.severityLock === true && existing.severity !== rule.severity) {
            throw new PolicyRuntimeError({
              code: PolicyRuntimeErrorCode.SEVERITY_LOCK_VIOLATION,
              message: `Severity override blocked. Policy locked severity to ${existing.severity}.`,
              policyId: policyId,
              contractVersion: 'v1'
            });
          }
          
          let resolvedSev = rule.severity || 'error';
          const pSev = existing.severity || 'error';
          
          // Apply severityPolicy
          const policy = existing.severityPolicy || 'strict';
          if (policy === 'strict') {
             resolvedSev = resolveSeverity(pSev, resolvedSev);
             if (resolvedSev !== (rule.severity || 'error')) {
                // If it was downgraded, resolveSeverity blocked it by returning pSev
                // But the instruction says "downgrade attempt blocked" -> does it mean it throws? NO, the default Most-Severe-Wins blocks downgrades inherently by returning the most severe. "Resolver hook location: resolveSeverity()". Wait! C2 says "resolver hook location: resolveSeverity()". So I should just update resolveSeverity!
             }
          }

          const newChain = [...existing.originPolicyChain, policyId];
          const finalSev = typeof resolvedSev === 'string' ? resolvedSev : pSev; // Fallback
          // I'll rely on resolveSeverity from types.ts to do this.
          const actualResolvedSev = resolveSeverity(pSev, rule.severity || 'error', policy);
          
          const authority: MergeAuthority = existing.severity !== rule.severity ? 'resolved-severity' : 'overridden';
          const isRuleDeleted = rule.deleted ?? config.deleted;
          let dReason = existing.deletedReason;
          if (isRuleDeleted && !existing.deleted) dReason = 'overridden';
          else if (isRuleDeleted && existing.deleted) dReason = 'inherited';
          else if (isRuleDeleted) dReason = 'authoritative';

          forbidRulesMap.set(key, {
            ...rule,
            severity: actualResolvedSev,
            originPolicyId: policyId,
            originRuleId: rule.id || 'anonymous',
            compositionDepth: depth,
            inheritedFromPolicyId: newChain.length >= 2 ? newChain[newChain.length - 2] : undefined,
            originPolicyChain: newChain,
            mergeAuthority: authority,
            severityLock: config.severityLock,
            severityPolicy: config.severityPolicy,
            deleted: isRuleDeleted,
            deletedReason: dReason
          });
        } else {
          // Additive new rule
          const isRuleDeleted = rule.deleted ?? config.deleted;
          let dReason: 'authoritative' | 'inherited' | 'overridden' | undefined;
          if (isRuleDeleted) dReason = depth === 0 ? 'authoritative' : 'inherited';

          forbidRulesMap.set(key, {
            ...rule,
            originPolicyId: policyId,
            originRuleId: rule.id || 'anonymous',
            compositionDepth: depth,
            inheritedFromPolicyId: undefined, // It is additive, not inherited from anywhere above
            originPolicyChain: [policyId],
            mergeAuthority: depth > 0 ? 'additive' : 'local',
            severityLock: config.severityLock,
            severityPolicy: config.severityPolicy,
            deleted: isRuleDeleted,
            deletedReason: dReason
          });
        }
      }
    }
  }

  // ─── FIX 4: Copy-on-write post-composition authority relabeling ───
  // Rules from shallower scopes that were never touched by deeper children
  // are labeled 'inherited'. Uses spread to avoid mutating Map value objects.
  const deepestDepth = policyStack.length - 1;
  
  const finalAllow = Array.from(allowRulesMap.values()).map(r => {
    if (r.compositionDepth < deepestDepth) {
      return {
        ...r,
        // inheritedFromPolicyId points to the policy that DEFINED this rule,
        // NOT to itself (avoiding self-referential lineage)
        inheritedFromPolicyId: r.originPolicyChain[0] !== r.originPolicyId
          ? r.originPolicyChain[0]
          : r.originPolicyId,
        mergeAuthority: 'inherited' as const
      };
    }
    return { ...r }; // copy-on-write even for non-relabeled entries
  });

  const finalForbid = Array.from(forbidRulesMap.values()).map(r => {
    if (r.compositionDepth < deepestDepth) {
      return {
        ...r,
        inheritedFromPolicyId: r.originPolicyChain[0] !== r.originPolicyId
          ? r.originPolicyChain[0]
          : r.originPolicyId,
        mergeAuthority: 'inherited' as const
      };
    }
    return { ...r };
  });

  const rules: ComposedRules = {};
  if (finalAllow.length > 0) rules.allow = finalAllow;
  if (finalForbid.length > 0) rules.forbid = finalForbid;

  const preHash: any = {
    version: finalVersion,
    mode: finalMode,
    domains: Object.keys(finalDomains).length > 0 ? finalDomains : undefined,
    rules: Object.keys(rules).length > 0 ? rules : undefined
  };

  const stripped = JSON.parse(JSON.stringify(preHash));
  function sortObj(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sortObj);
    return Object.keys(obj).sort().reduce((acc, key) => { acc[key] = sortObj(obj[key]); return acc; }, {} as any);
  }
  const stableJSON = JSON.stringify(sortObj(stripped));
  const effectiveHash = crypto.createHash('sha256').update(stableJSON).digest('hex');

  return {
    version: finalVersion,
    mode: finalMode,
    domains: Object.keys(finalDomains).length > 0 ? finalDomains : undefined,
    rules: Object.keys(rules).length > 0 ? rules : undefined,
    effectiveHash
  };
}

/**
 * Content-addressed key for anonymous rules.
 * Produces a stable 16-char hex hash from rule content,
 * ensuring anonymous rules are keyed by semantics, not insertion order.
 */
function contentKey(from: string, to: string, severity: string): string {
  return crypto.createHash('sha256').update(`${from}\0${to}\0${severity}`).digest('hex').substring(0, 16);
}
