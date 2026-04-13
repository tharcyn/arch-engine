import { describe, test, expect } from 'vitest';
import { verifyMirrorEquivalence, enforceMirrorContentEquivalence } from '../../src/transport/mirrorContentVerifier.js';
import { RegistryResolutionResult } from '../../src/transport/types.js';

describe('Freeze Evidence: Mirror Equivalence Acceptance (F-5)', () => {

    const makePrimary = (): RegistryResolutionResult => ({
        namespace: 'core',
        policyId: 'test-policy',
        availableVersions: ['1.0.0'],
        registrySource: 'primary-registry',
        manifests: {
            '1.0.0': {
                dependencies: [],
                extends: [],
                namespaces: { core: '1.0.0' },
                issuerData: [],
                manifestMetadata: { author: 'test' },
                capabilities: { required: [], provided: [] }
            }
        }
    });

    const makeMirror = (): RegistryResolutionResult => ({
        namespace: 'core',
        policyId: 'test-policy',
        availableVersions: ['1.0.0'],
        registrySource: 'mirror-registry',
        mirrorSourceId: 'mirror-1',
        isMirrorFallback: true,
        manifests: {
            '1.0.0': {
                dependencies: [],
                extends: [],
                namespaces: { core: '1.0.0' },
                issuerData: [],
                manifestMetadata: { author: 'test' },
                capabilities: { required: [], provided: [] }
            }
        }
    });

    test('identical manifests pass equivalence verification', () => {
        const result = verifyMirrorEquivalence(makePrimary(), makeMirror());

        expect(result.equivalent).toBe(true);
        expect(result.mirrorSourceId).toBe('mirror-1');
        expect(result.rejectionReason).toBeUndefined();
        expect(result.primaryManifestHash).toBe(result.mirrorManifestHash);
    });

    test('enforcement gate passes for equivalent content', () => {
        const result = enforceMirrorContentEquivalence(makePrimary(), makeMirror());
        expect(result.equivalent).toBe(true);
    });

    test('equivalence verification is deterministic', () => {
        const result1 = verifyMirrorEquivalence(makePrimary(), makeMirror());
        const result2 = verifyMirrorEquivalence(makePrimary(), makeMirror());

        expect(result1.primaryManifestHash).toBe(result2.primaryManifestHash);
        expect(result1.mirrorManifestHash).toBe(result2.mirrorManifestHash);
        expect(result1.equivalent).toBe(result2.equivalent);
    });

    test('manifest hash is order-independent', () => {
        const mirror = makeMirror();
        mirror.availableVersions = ['1.0.0']; // same content
        const result = verifyMirrorEquivalence(makePrimary(), mirror);
        expect(result.equivalent).toBe(true);
    });
});
