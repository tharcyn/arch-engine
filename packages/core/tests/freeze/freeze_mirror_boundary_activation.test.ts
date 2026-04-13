import { describe, test, expect } from 'vitest';
import { resolveWithMirrorFallback } from '../../src/transport/mirrorFallbackResolver.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';
import { RegistryResolutionResult } from '../../src/transport/types.js';

const MANIFEST = {
    dependencies: [], extends: [],
    namespaces: { core: '1.0.0' },
    issuerData: [], manifestMetadata: {},
    capabilities: { required: [], provided: [] }
};

class WorkingAdapter extends RegistryAdapter {
    constructor(private source: string) { super(); }
    lookup(namespace: string, policyId: string): RegistryResolutionResult {
        return {
            namespace, policyId,
            availableVersions: ['1.0.0'],
            registrySource: this.source,
            manifests: { '1.0.0': MANIFEST }
        };
    }
}

class FailingAdapter extends RegistryAdapter {
    lookup(): RegistryResolutionResult {
        throw new Error('primary registry unavailable');
    }
}

class MirrorAdapter extends RegistryAdapter {
    constructor(private mirrorId: string) { super(); }
    lookup(namespace: string, policyId: string): RegistryResolutionResult {
        return {
            namespace, policyId,
            availableVersions: ['1.0.0'],
            registrySource: 'mirror-registry',
            mirrorSourceId: this.mirrorId,
            isMirrorFallback: true,
            manifests: { '1.0.0': MANIFEST }
        };
    }
}

describe('Freeze Evidence: Mirror Boundary Activation (F-5)', () => {

    test('primary success does not activate mirror path', () => {
        const result = resolveWithMirrorFallback(
            'core', 'test-policy',
            new WorkingAdapter('primary'),
            new MirrorAdapter('mirror-1')
        );

        expect(result.mirrorUsed).toBe(false);
        expect(result.result.registrySource).toBe('primary');
        expect(result.mirrorSourceId).toBeUndefined();
    });

    test('primary failure activates mirror fallback', () => {
        const result = resolveWithMirrorFallback(
            'core', 'test-policy',
            new FailingAdapter(),
            new MirrorAdapter('mirror-1')
        );

        expect(result.mirrorUsed).toBe(true);
        expect(result.mirrorSourceId).toBe('mirror-1');
        expect(result.result.isMirrorFallback).toBe(true);
    });

    test('mirror fallback routes through overlay::transport::mirrorBoundary seam', () => {
        // With no overlay context, the seam is a no-op pass-through
        const result = resolveWithMirrorFallback(
            'core', 'test-policy',
            new FailingAdapter(),
            new MirrorAdapter('mirror-2')
        );

        expect(result.mirrorUsed).toBe(true);
        expect(result.result.mirrorSourceId).toBe('mirror-2');
    });

    test('mirror fallback with equivalence checking (pre-resolved primary)', () => {
        const primary: RegistryResolutionResult = {
            namespace: 'core', policyId: 'test-policy',
            availableVersions: ['1.0.0'],
            registrySource: 'primary',
            manifests: { '1.0.0': MANIFEST }
        };

        const result = resolveWithMirrorFallback(
            'core', 'test-policy',
            new FailingAdapter(),
            new MirrorAdapter('mirror-3'),
            primary
        );

        expect(result.mirrorUsed).toBe(true);
        expect(result.equivalenceResult).toBeDefined();
        expect(result.equivalenceResult!.equivalent).toBe(true);
    });

    test('no mirror adapter throws when primary fails', () => {
        expect(() => {
            resolveWithMirrorFallback(
                'core', 'test-policy',
                new FailingAdapter()
                // no mirror adapter
            );
        }).toThrowError(/no mirror adapter available/);
    });
});
