import { describe, test, expect } from 'vitest';
import { resolveCapabilityNegotiation } from '../../src/capability/capabilityNegotiationEngine.js';
import { CapabilityProviderDescriptor, CapabilityNegotiationContext } from '../../src/capability/capabilityFederationTypes.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: Capability Mirror Equivalence', () => {
    test('negotiation order strictly securely properly identically overrides all input transport ordering arrays securely correctly explicitly fluently', () => {
        const createProviders = (): CapabilityProviderDescriptor[] => [
            {
                providerId: 'P1',
                registrySource: 'core',
                authorityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                capabilityNamespace: 'cap',
                capabilityVersion: '1.0.0',
                supportedAdapters: [],
                declaredDependencies: [],
                declaredIncompatibilities: [],
                executionPriority: 10,
                mirrorPortable: true,
                signatureRoot: 'core.registry.root',
                registryOrigin: 'core',
                providerIdentityHash: 'sha256:p1',
                versionRangeCompat: '^1.0.0',
                seamScopedGrants: [],
            },
            {
                providerId: 'P2',
                registrySource: 'core',
                authorityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                capabilityNamespace: 'cap',
                capabilityVersion: '1.0.0',
                supportedAdapters: [],
                declaredDependencies: [],
                declaredIncompatibilities: [],
                executionPriority: 10,
                mirrorPortable: true,
                signatureRoot: 'core.registry.root',
                registryOrigin: 'core',
                providerIdentityHash: 'sha256:p2',
                versionRangeCompat: '^1.0.0',
                seamScopedGrants: [],
            }
        ];

        const reqs = [{
            requiredNamespace: 'cap',
            requiredVersionRange: '*',
            requiredFeatures: [],
            optionalFeatures: [],
            incompatibleProviders: [],
            authorityFloor: OverlayAuthorityTier.UNTRUSTED_EXTERNAL,
        }];

        const ctx: CapabilityNegotiationContext = {
            resolvedOverlaySet: [],
            capabilityProviders: createProviders(),
            requestedCapabilities: reqs,
            authorityContext: { 'core': OverlayAuthorityTier.TRUSTED_POLICY_PACK },
            registryTrustDomain: 'CORE_INTERNAL',
            executionStrategy: 'AUTHORITY_FIRST',
            mirrorEquivalenceMode: true,
        };

        const res1 = resolveCapabilityNegotiation(ctx);

        const ctx2: CapabilityNegotiationContext = {
            ...ctx,
            capabilityProviders: createProviders().reverse(),
        };
        const res2 = resolveCapabilityNegotiation(ctx2);

        expect(res1.selected.map(p => p.providerId)).toEqual(res2.selected.map(p => p.providerId));
        // Expect P1, P2 because P1 < P2 natively lexicographically.
        expect(res1.selected.map(p => p.providerId)).toEqual(['P1', 'P2']);
    });
});
