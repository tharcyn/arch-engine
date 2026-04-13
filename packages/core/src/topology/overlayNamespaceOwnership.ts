export type NamespaceConflictReason =
  | 'VALID'
  | 'MALFORMED_NAMESPACE'
  | 'UNOWNED_NAMESPACE'
  | 'OWNED_BY_DIFFERENT_REGISTRY'
  | 'MIRROR_OVERRIDE_FORBIDDEN';

export interface NamespaceOwnershipDecision {
  readonly valid: boolean;
  readonly reason: NamespaceConflictReason;
  readonly canonicalNamespace?: string;
  readonly details?: string;
}

/**
 * Ensures canonical namespace normalization before any validations.
 * Rejects empty segments, duplicate separators, leading/trailing boundaries, and invalid characters.
 */
export function normalizeOverlayNamespace(namespace: string): string {
  if (!namespace) {
    throw new Error('Namespace is required');
  }

  // Reject wildcards from the raw identity
  if (namespace.includes('*')) {
    throw new Error('Namespace cannot contain wildcard characters');
  }

  const normalized = namespace.trim().toLowerCase();

  if (normalized.startsWith('.') || normalized.endsWith('.')) {
    throw new Error('Namespace cannot have leading or trailing separators');
  }

  if (normalized.includes('..')) {
    throw new Error('Namespace cannot contain duplicate separators');
  }

  // Reject spaces or arbitrary special escape characters
  if (!/^[a-z0-9\-.]+$/.test(normalized)) {
    throw new Error('Namespace contains invalid characters (only alphanumeric, dashes, and dots allowed)');
  }

  return normalized;
}

export interface NamespaceOwnershipRule {
  readonly namespacePrefix: string;
  readonly owningRegistryId: string;
  readonly allowMirrorImport: boolean;
}

const OWNERSHIP_RULES: NamespaceOwnershipRule[] = [
  { namespacePrefix: 'core.', owningRegistryId: 'core', allowMirrorImport: true },
  { namespacePrefix: 'official.', owningRegistryId: 'official', allowMirrorImport: true },
  { namespacePrefix: 'partner.', owningRegistryId: 'partner', allowMirrorImport: true }
];

/**
 * Validates namespace ownership against the origin registry identity, not just raw strings
 * or mirror transport paths.
 */
export function validateNamespaceOwnership(
  namespace: string,
  originRegistryId: string,
  effectiveRegistryId: string
): NamespaceOwnershipDecision {
  let canonicalNamespace: string;

  try {
    canonicalNamespace = normalizeOverlayNamespace(namespace);
  } catch (e: any) {
    return { valid: false, reason: 'MALFORMED_NAMESPACE', details: e.message };
  }

  // Always use the originRegistryId for ownership assertions to prevent mirror impersonation
  for (const rule of OWNERSHIP_RULES) {
    if (canonicalNamespace === rule.namespacePrefix.slice(0, -1) || canonicalNamespace.startsWith(rule.namespacePrefix)) {
      if (originRegistryId !== rule.owningRegistryId) {
        return {
          valid: false,
          reason: 'OWNED_BY_DIFFERENT_REGISTRY',
          canonicalNamespace,
          details: `Namespace prefix '${rule.namespacePrefix}' is owned by registry '${rule.owningRegistryId}', but published by '${originRegistryId}'`
        };
      }
      
      // If we are served via a mirror, the mirror is the effective registry, and origin is the actual registry.
      // But the rule can define if mirror import is allowed
      if (originRegistryId !== effectiveRegistryId && !rule.allowMirrorImport) {
         return {
           valid: false,
           reason: 'MIRROR_OVERRIDE_FORBIDDEN',
           canonicalNamespace,
           details: `Namespace prefix '${rule.namespacePrefix}' is not permitted for mirror distribution.`
         };
      }

      // Explicit match success
      return { valid: true, reason: 'VALID', canonicalNamespace };
    }
  }

  // Implicit behavior: If it uses no protected prefix, and it isn't claimed, 
  // currently we allow standard registries to serve them if it doesn't violate a core ceiling,
  // but let's see. The user requirement says:
  // "external registries cannot publish: core.*, official.*, partner.*" (which the rules enforce)
  // "partner registries cannot publish: core.*" (enforced because it would match 'core.' rule and fail `originRegistryId !== 'core'`)
  
  return { valid: true, reason: 'VALID', canonicalNamespace };
}
