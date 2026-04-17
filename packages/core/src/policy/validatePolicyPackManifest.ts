import type { LocalPolicyRule } from './LocalPolicyRule';

// Validates structure of policy-pack.json manifests
// ensuring registry stability and deterministic pack loading
// across workspace and node_modules policy-pack surfaces
export function validatePolicyPackManifest(input: unknown): boolean {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return false;
  }

  const obj = input as Record<string, unknown>;

  if (typeof obj.policyPackId !== 'string') return false;
  if (typeof obj.description !== 'string') return false;
  if (typeof obj.category !== 'string') return false;

  if ('rules' in obj && obj.rules !== undefined) {
    if (!Array.isArray(obj.rules)) return false;
    for (const rule of obj.rules) {
      if (!rule || typeof rule !== 'object' || Array.isArray(rule)) return false;
      const r = rule as Record<string, unknown>;
      if (r.type !== 'forbid-edge') return false;
      if (typeof r.from !== 'string') return false;
      if (typeof r.to !== 'string') return false;
    }
  }

  if ('engineCompatibility' in obj && obj.engineCompatibility !== undefined) {
    if (typeof obj.engineCompatibility !== 'string') return false;
  }

  if ('dependencies' in obj && obj.dependencies !== undefined) {
    if (!Array.isArray(obj.dependencies)) return false;
    for (const dep of obj.dependencies) {
      if (typeof dep !== 'string') return false;
    }
  }

  if ('packageName' in obj && obj.packageName !== undefined) {
    if (typeof obj.packageName !== 'string') return false;
    if (!obj.packageName.startsWith('@arch-engine/policy-pack-')) return false;
  }

  if ('signature' in obj && obj.signature !== undefined) {
    if (typeof obj.signature !== 'string') return false;
    if (!obj.signature.startsWith('sha256:')) return false;
    const hexPart = obj.signature.slice(7);
    if (!/^[0-9a-fA-F]+$/.test(hexPart)) return false;
  }

  const stringArrayKeys = [
    'requiredDatasetCapabilities',
    'optionalDatasetCapabilities',
    'requiredMutationClasses',
    'requiredAuthorityScopes',
    'requiredSurfaceConfidenceKeys',
    'requiredTrustBoundaryRules'
  ];

  for (const key of stringArrayKeys) {
    if (key in obj && obj[key] !== undefined) {
      if (!Array.isArray(obj[key])) return false;
      for (const item of (obj[key] as any)) {
        if (typeof item !== 'string') return false;
      }
    }
  }

  return true;
}
