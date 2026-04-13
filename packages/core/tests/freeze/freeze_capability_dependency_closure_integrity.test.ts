import { describe, test, expect } from 'vitest';
import { resolveCapabilityDependencyClosure, CapabilityDependencyResolutionError } from '../../src/capability/capabilityNegotiationEngine.js';

describe('Freeze Evidence: Capability Dependency Closure Integrity', () => {
    test('dependency closure dynamically evaluates natively sorting accurately', () => {
        const providers = [
            { providerId: 'C', registrySource: 'r', authorityTier: 1, capabilityNamespace: 'cap', capabilityVersion: '1', supportedAdapters: [], declaredDependencies: [], declaredIncompatibilities: [], executionPriority: 10, mirrorPortable: true },
            { providerId: 'A', registrySource: 'r', authorityTier: 1, capabilityNamespace: 'cap', capabilityVersion: '1', supportedAdapters: [], declaredDependencies: ['C', 'B'], declaredIncompatibilities: [], executionPriority: 10, mirrorPortable: true },
            { providerId: 'B', registrySource: 'r', authorityTier: 1, capabilityNamespace: 'cap', capabilityVersion: '1', supportedAdapters: [], declaredDependencies: ['C'], declaredIncompatibilities: [], executionPriority: 10, mirrorPortable: true }
        ];

        const closure = resolveCapabilityDependencyClosure(providers);
        
        // Starts with A natively natively evaluating alphabetically (A, B, C)
        // A -> B -> C -> Back to A
        // Output order based on Post-Order traversal basically implicitly pushes leaves first.
        // A wants B and C. sorted deps of A: B, C.
        // goes to B. B wants C. goes to C. C included.
        // B included.
        // goes to C (from A). already included.
        // A included.
        // Result: C, B, A natively.
        expect(closure).toEqual(['C', 'B', 'A']);
    });

    test('circular dependencies throw predictable error', () => {
        const providers = [
            { providerId: 'A', registrySource: 'r', authorityTier: 1, capabilityNamespace: 'cap', capabilityVersion: '1', supportedAdapters: [], declaredDependencies: ['B'], declaredIncompatibilities: [], executionPriority: 10, mirrorPortable: true },
            { providerId: 'B', registrySource: 'r', authorityTier: 1, capabilityNamespace: 'cap', capabilityVersion: '1', supportedAdapters: [], declaredDependencies: ['A'], declaredIncompatibilities: [], executionPriority: 10, mirrorPortable: true }
        ];

        expect(() => resolveCapabilityDependencyClosure(providers)).toThrowError(CapabilityDependencyResolutionError);
    });
});
