/**
 * F-6: Registry Trust Store.
 *
 * Provides in-memory trust-root resolution for overlay registries.
 * Each registry maps to a trust root containing public keys and a trust tier.
 *
 * Trust tiers control maximum authority escalation:
 *   CORE_INTERNAL       — may claim CORE_INTERNAL authority
 *   OFFICIAL_REGISTRY   — may claim up to TRUSTED_POLICY_PACK authority
 *   PARTNER_REGISTRY    — may claim up to SIGNED_EXTERNAL_PACK authority
 *   EXTERNAL_REGISTRY   — may claim UNTRUSTED_EXTERNAL or SIGNED_EXTERNAL_PACK (with signature)
 *
 * This implementation is in-memory only. Remote trust-root discovery is NOT implemented.
 */

export type RegistryTrustTier =
  | 'CORE_INTERNAL'
  | 'OFFICIAL_REGISTRY'
  | 'PARTNER_REGISTRY'
  | 'EXTERNAL_REGISTRY';

export interface RegistryTrustRoot {
  readonly registryId: string;
  readonly trustRootId: string;
  readonly trustRootEpoch: number;
  readonly activatedAt: string;
  readonly revokedAt?: string;
  readonly publicKeys: readonly string[];
  readonly trustTier: RegistryTrustTier;
}

// ─── Trust tier numeric weight for comparison ───────────────────────────────
const TRUST_TIER_WEIGHT: Record<RegistryTrustTier, number> = {
  'EXTERNAL_REGISTRY': 1,
  'PARTNER_REGISTRY': 2,
  'OFFICIAL_REGISTRY': 3,
  'CORE_INTERNAL': 4
};

/**
 * Compare trust tiers numerically.
 * Returns true if `actual` is at least as trusted as `required`.
 */
export function isTrustTierSufficient(
  actual: RegistryTrustTier,
  required: RegistryTrustTier
): boolean {
  return TRUST_TIER_WEIGHT[actual] >= TRUST_TIER_WEIGHT[required];
}

// ─── In-memory trust root registry ──────────────────────────────────────────
const trustRootRegistry = new Map<string, RegistryTrustRoot>();

/**
 * Register a trust root for a given registry ID.
 * If a trust root already exists for the registry, it is overwritten.
 */
export function registerTrustRoot(root: RegistryTrustRoot): void {
  trustRootRegistry.set(root.registryId, Object.freeze({
      ...root,
      publicKeys: Object.freeze([...root.publicKeys])
  }));
}

/**
 * Clear all registered trust roots. Used in tests only.
 */
export function clearTrustRoots(): void {
  trustRootRegistry.clear();
}

/**
 * Resolve the trust root for a given registry ID.
 * Returns undefined if no trust root is registered.
 */
export function resolveRegistryTrustRoot(registryId: string): RegistryTrustRoot | undefined {
  return trustRootRegistry.get(registryId);
}

// ─── Default trust roots ────────────────────────────────────────────────────
// Seed the default registry trust roots on module load.

registerTrustRoot({
  trustRootId: 'core.registry.root',
  registryId: 'core',
  trustRootEpoch: 1,
  activatedAt: new Date().toISOString(),
  publicKeys: ['core-ed25519-pubkey-001'],
  trustTier: 'CORE_INTERNAL'
});

registerTrustRoot({
  trustRootId: 'official.registry.root',
  registryId: 'official',
  trustRootEpoch: 1,
  activatedAt: new Date().toISOString(),
  publicKeys: ['official-ed25519-pubkey-001'],
  trustTier: 'OFFICIAL_REGISTRY'
});

registerTrustRoot({
  trustRootId: 'partner.registry.root',
  registryId: 'partner',
  trustRootEpoch: 1,
  activatedAt: new Date().toISOString(),
  publicKeys: ['partner-ed25519-pubkey-001'],
  trustTier: 'PARTNER_REGISTRY'
});

registerTrustRoot({
  trustRootId: 'external.registry.root',
  registryId: 'external',
  trustRootEpoch: 1,
  activatedAt: new Date().toISOString(),
  publicKeys: ['external-ed25519-pubkey-001'],
  trustTier: 'EXTERNAL_REGISTRY'
});
