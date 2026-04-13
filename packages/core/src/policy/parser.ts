import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import yaml from 'yaml';
import type { PolicyConfig } from './types.js';

export interface ParsedPolicy {
  config: PolicyConfig;
  hash: string;
  sourcePath: string;
}

export function loadPolicyConfig(cwd: string): ParsedPolicy | null {
  const policyPath = path.join(cwd, '.archengine', 'policy.yml');
  
  if (!fs.existsSync(policyPath)) {
    return null;
  }

  const fileContent = fs.readFileSync(policyPath, 'utf-8');
  let raw: any;
  try {
    raw = yaml.parse(fileContent) || {};
  } catch (e: any) {
    throw new Error(`Failed to parse policy.yml: ${e.message}`);
  }

  const config = validateRawConfig(raw);
  const hash = canonicalPolicyHash(config);

  return {
    config,
    hash,
    sourcePath: policyPath,
  };
}

function canonicalPolicyHash(config: PolicyConfig): string {
  // Strip undefined
  const stripped = JSON.parse(JSON.stringify(config));
  
  function sortObj(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sortObj); // assuming arrays preserve execution order (e.g. forbid precedence)
    return Object.keys(obj).sort().reduce((acc, key) => {
      acc[key] = sortObj(obj[key]);
      return acc;
    }, {} as any);
  }
  
  const stableJSON = JSON.stringify(sortObj(stripped));
  return crypto.createHash('sha256').update(stableJSON).digest('hex');
}

function validateRawConfig(raw: any): PolicyConfig {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Policy must be an object');
  }
  
  if (raw.version !== 1) {
    throw new Error(`Unsupported policy version: ${raw.version}`);
  }

  const mode = raw.mode === 'enforce' ? 'enforce' : 'advisory';

  // Phase 2: Schema extensions (no semantics implementation here)
  let extendsVal: string | string[] | undefined = undefined;
  if (typeof raw.extends === 'string') extendsVal = raw.extends;
  else if (Array.isArray(raw.extends)) extendsVal = raw.extends.filter((e: any) => typeof e === 'string');

  const extendsResolution = ['lazy', 'eager'].includes(raw.extendsResolution) ? raw.extendsResolution : undefined;
  const severityLock = typeof raw.severityLock === 'boolean' ? raw.severityLock : undefined;
  const severityPolicy = ['strict', 'loose'].includes(raw.severityPolicy) ? raw.severityPolicy : undefined;
  const deleted = typeof raw.deleted === 'boolean' ? raw.deleted : undefined;

  const domains: Record<string, import('./types.js').PolicyDomainDef> = {};
  if (raw.domains && typeof raw.domains === 'object') {
    for (const [k, v] of Object.entries(raw.domains)) {
      if (typeof v === 'object' && v !== null) {
        const anyV = v as any;
        domains[k] = {
          tier: ['high', 'medium', 'low'].includes(anyV.tier) ? anyV.tier : undefined,
          enforceTier: typeof anyV.enforceTier === 'boolean' ? anyV.enforceTier : true, // default implicitly global
        };
      }
    }
  }

  const rules: import('./types.js').PolicyRules = { allow: [], forbid: [] };
  if (raw.rules && typeof raw.rules === 'object') {
    if (Array.isArray(raw.rules.allow)) {
      rules.allow = raw.rules.allow.map(mapRule);
    }
    if (Array.isArray(raw.rules.forbid)) {
      rules.forbid = raw.rules.forbid.map(mapRule);
    }
  }

  return {
    version: 1,
    mode,
    extends: extendsVal,
    extendsResolution,
    severityLock,
    severityPolicy,
    deleted,
    domains,
    rules,
  };
}

function mapRule(rawRule: any): import('./types.js').PolicyRuleDef {
  let sev: import('./types.js').PolicySeverity = 'error';
  if (rawRule.severity === 'warning') sev = 'warning';
  else if (rawRule.severity === 'notice') sev = 'notice';

  return {
    id: typeof rawRule.id === 'string' ? rawRule.id : undefined,
    from: String(rawRule.from || ''),
    to: String(rawRule.to || ''),
    severity: sev,
    deleted: typeof rawRule.deleted === 'boolean' ? rawRule.deleted : undefined,
    deletedReason: ['authoritative', 'inherited', 'overridden'].includes(rawRule.deletedReason) ? rawRule.deletedReason : undefined,
  };
}
