import { describe, test, expect } from 'vitest';
import { verifyMirrorEquivalence, enforceMirrorContentEquivalence } from '../../src/transport/mirrorContentVerifier.js';
import { RegistryResolutionResult } from '../../src/transport/types.js';

describe('Freeze Evidence: Mirror Equivalence Rejection (F-5)', () => {

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
                manifestMetadata: {},
                capabilities: { required: [], provided: [] }
            }
        }
    });

    test('modified manifest content is rejected', () => {
        const mirror: RegistryResolutionResult = {
            namespace: 'core',
            policyId: 'test-policy',
            availableVersions: ['1.0.0'],
            registrySource: 'evil-mirror',
            manifests: {
                '1.0.0': {
                    dependencies: ['injected-dep'], // MODIFIED
                    extends: [],
                    namespaces: { core: '1.0.0' },
                    issuerData: [],
                    manifestMetadata: {},
                    capabilities: { required: [], provided: [] }
                }
            }
        };

        const result = verifyMirrorEquivalence(makePrimary(), mirror);
        expect(result.equivalent).toBe(false);
        expect(result.rejectionReason).toContain('Manifest content divergence');
    });

    test('namespace mismatch is rejected', () => {
        const mirror: RegistryResolutionResult = {
            namespace: 'evil-namespace', // MODIFIED
            policyId: 'test-policy',
            availableVersions: ['1.0.0'],
            registrySource: 'mirror',
            manifests: { '1.0.0': makePrimary().manifests['1.0.0'] }
        };

        const result = verifyMirrorEquivalence(makePrimary(), mirror);
        expect(result.equivalent).toBe(false);
        expect(result.rejectionReason).toContain('Namespace mismatch');
    });

    test('policy ID mismatch is rejected', () => {
        const mirror: RegistryResolutionResult = {
            namespace: 'core',
            policyId: 'trojan-policy', // MODIFIED
            availableVersions: ['1.0.0'],
            registrySource: 'mirror',
            manifests: { '1.0.0': makePrimary().manifests['1.0.0'] }
        };

        const result = verifyMirrorEquivalence(makePrimary(), mirror);
        expect(result.equivalent).toBe(false);
        expect(result.rejectionReason).toContain('Policy ID mismatch');
    });

    test('version set mismatch is rejected', () => {
        const mirror: RegistryResolutionResult = {
            namespace: 'core',
            policyId: 'test-policy',
            availableVersions: ['1.0.0', '2.0.0'], // MODIFIED — extra version
            registrySource: 'mirror',
            manifests: { '1.0.0': makePrimary().manifests['1.0.0'], '2.0.0': {} }
        };

        const result = verifyMirrorEquivalence(makePrimary(), mirror);
        expect(result.equivalent).toBe(false);
        expect(result.rejectionReason).toContain('Version set mismatch');
    });

    test('enforcement gate throws for non-equivalent content', () => {
        const mirror: RegistryResolutionResult = {
            namespace: 'core',
            policyId: 'test-policy',
            availableVersions: ['1.0.0'],
            registrySource: 'evil-mirror',
            manifests: {
                '1.0.0': {
                    dependencies: ['injected'],
                    extends: [],
                    namespaces: { core: '1.0.0' },
                    issuerData: [],
                    manifestMetadata: {},
                    capabilities: { required: [], provided: [] }
                }
            }
        };

        expect(() => {
            enforceMirrorContentEquivalence(makePrimary(), mirror);
        }).toThrowError(/Mirror content verification failed/);
    });
});
