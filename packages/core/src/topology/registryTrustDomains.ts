import { OverlayAuthorityTier } from './seamContracts.js';

export interface RegistryTrustDomain {
  readonly registryId: string;
  readonly trustDomainId: string;
  readonly namespacePrefixes: string[];
  readonly authorityCeiling: OverlayAuthorityTier;
}

const REGISTRY_TRUST_DOMAINS: Map<string, RegistryTrustDomain> = new Map([
  ['core', {
    registryId: 'core',
    trustDomainId: 'core-trust-domain',
    namespacePrefixes: ['core.*'],
    authorityCeiling: OverlayAuthorityTier.CORE_INTERNAL
  }],
  ['official', {
    registryId: 'official',
    trustDomainId: 'official-trust-domain',
    namespacePrefixes: ['official.*'],
    authorityCeiling: OverlayAuthorityTier.TRUSTED_POLICY_PACK
  }],
  ['partner', {
    registryId: 'partner',
    trustDomainId: 'partner-trust-domain',
    namespacePrefixes: ['partner.*'],
    authorityCeiling: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK
  }],
  ['external', {
    registryId: 'external',
    trustDomainId: 'external-trust-domain',
    namespacePrefixes: ['*'], // Catch-all wildcard
    authorityCeiling: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK
  }]
]);

export function getRegistryTrustDomain(registryId: string): RegistryTrustDomain | undefined {
  return REGISTRY_TRUST_DOMAINS.get(registryId);
}
