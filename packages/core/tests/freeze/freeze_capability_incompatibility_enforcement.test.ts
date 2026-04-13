import { describe, test, expect } from 'vitest';
import { validateCapabilityProviderCompatibility } from '../../src/capability/capabilityNegotiationEngine.js';

describe('Freeze Evidence: Capability Incompatibility Enforcement', () => {
    test('categorical rejection cleanly enforces namespace mismatches correctly', () => {
        const provider = { providerId: 'P', registrySource: 'r', authorityTier: 1, capabilityNamespace: 'cap', capabilityVersion: '1', supportedAdapters: [], declaredDependencies: [], declaredIncompatibilities: [], executionPriority: 10, mirrorPortable: true };
        const req = { requiredNamespace: 'diff-cap', requiredVersionRange: '*', requiredFeatures: [], optionalFeatures: [], incompatibleProviders: [], authorityFloor: 1 };
        
        const result = validateCapabilityProviderCompatibility(provider, req);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Namespace mismatch');
    });

    test('authority floor limits correctly enforced identically natively', () => {
        const provider = { providerId: 'P', registrySource: 'r', authorityTier: 1, capabilityNamespace: 'cap', capabilityVersion: '1', supportedAdapters: [], declaredDependencies: [], declaredIncompatibilities: [], executionPriority: 10, mirrorPortable: true };
        const req = { requiredNamespace: 'cap', requiredVersionRange: '*', requiredFeatures: [], optionalFeatures: [], incompatibleProviders: [], authorityFloor: 5 };
        
        const result = validateCapabilityProviderCompatibility(provider, req);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Authority floor violation');
    });
});
