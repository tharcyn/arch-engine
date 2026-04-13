import { describe, test, expect } from 'vitest';
import { resolveCapabilityNegotiation } from '../../src/capability/capabilityNegotiationEngine.js';

describe('Freeze Evidence: Capability Negotiation Determinism', () => {
    test('negotiation naturally binds providers exclusively by static priority sorting overriding iteration order', () => {
        const createProviders = () => [
            { providerId: 'p-b', registrySource: 'core', registryOrigin: 'core', signatureRoot: 'k1', providerIdentityHash: 'hB', authorityTier: 1, capabilityNamespace: 'cap', capabilityVersion: '1', versionRangeCompat: '*', seamScopedGrants: [], supportedAdapters: [], declaredDependencies: [], declaredIncompatibilities: [], executionPriority: 10, mirrorPortable: true },
            { providerId: 'p-a', registrySource: 'core', registryOrigin: 'core', signatureRoot: 'k1', providerIdentityHash: 'hA', authorityTier: 1, capabilityNamespace: 'cap', capabilityVersion: '1', versionRangeCompat: '*', seamScopedGrants: [], supportedAdapters: [], declaredDependencies: [], declaredIncompatibilities: [], executionPriority: 10, mirrorPortable: true },
            { providerId: 'p-c', registrySource: 'core', registryOrigin: 'core', signatureRoot: 'k1', providerIdentityHash: 'hC', authorityTier: 2, capabilityNamespace: 'cap', capabilityVersion: '1', versionRangeCompat: '*', seamScopedGrants: [], supportedAdapters: [], declaredDependencies: [], declaredIncompatibilities: [], executionPriority: 1, mirrorPortable: true }
        ];

        const reqs = [{ requiredNamespace: 'cap', requiredVersionRange: '*', requiredFeatures: [], optionalFeatures: [], incompatibleProviders: [], authorityFloor: 1 }];

        const res1 = resolveCapabilityNegotiation({
            resolvedOverlaySet: [], capabilityProviders: createProviders(), requestedCapabilities: reqs, authorityContext: { registryTrustRoots: { 'r': [{ registryUrl: 'test' }] }, signatureTrustRoots: { 'r': [{ keyId: 'k1', publicKeyHash: 'hash', algorithm: 'test' }] } }, registryTrustDomain: 1, executionStrategy: '', mirrorEquivalenceMode: true
        });

        const res2 = resolveCapabilityNegotiation({
            resolvedOverlaySet: [], capabilityProviders: createProviders().reverse(), requestedCapabilities: reqs, authorityContext: { registryTrustRoots: { 'r': [{ registryUrl: 'test' }] }, signatureTrustRoots: { 'r': [{ keyId: 'k1', publicKeyHash: 'hash', algorithm: 'test' }] } }, registryTrustDomain: 1, executionStrategy: '', mirrorEquivalenceMode: true
        });

        // 1. Authority Tier 2 ('p-c')
        // 2. Lexical ID tiebreak on ['p-a', 'p-b'] because priority and tier are tied
        const expected = ['p-c', 'p-a', 'p-b'];
        console.log("TRACE:", JSON.stringify(res1.negotiationTrace, null, 2));
        console.log("REJECTED:", JSON.stringify(res1.rejected, null, 2));
        expect(res1.selected.map(p => p.providerId)).toEqual(expected);
        expect(res2.selected.map(p => p.providerId)).toEqual(expected);
    });
});
