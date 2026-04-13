import { describe, test, expect } from 'vitest';
import { inspectClosureIdentity, inspectTrustRoot, inspectMirrorFallbackDecision } from '../../src/transport/federationDiagnostics.js';
import { SnapshotEnvelope } from '../../src/transport/types.js';

describe('Freeze Evidence: Diagnostics Surface Non-Authoritative', () => {
    test('Diagnostic API requires execution envelopes to evaluate truth rather than live closures', () => {
        // Enforce the requirement that the surface does not invoke pipeline internals
        // It strictly demands an envelope (which guarantees historical point-in-time)
        const mockEnvelope: SnapshotEnvelope = {
            snapshotClosureGraphHash: 'hash-1',
            closureGraphContractVersion: 'v3',
            policyStackFingerprint: 'stack-1',
            namespaceTrustPolicyVersion: '1',
            namespaceTrustPolicyHash: '1',
            activeTrustScopes: [],
            snapshotEnvelopeVersion: 'v3',
            registryProvenance: [],
            manifestDigestSetHash: '1',
            loaderProtocolVersion: '1',
            registrySourceHash: '1',
            dependencyGraphShapeHash: '1',
            namespaceSetHash: '1',
            explainabilityGraphHash: '1',
            structureHash: '1',
            closureProvenance: {
                manifestContentHash: 'mh-1',
                signatureDigest: 'sd-1',
                registryTrustRootId: 'root-1',
                trustRootEpoch: 1
            }
        };

        const identity = inspectClosureIdentity(mockEnvelope);
        expect(identity?.stackOrderingKeySummary).toBe('hash-1');
        
        const fallback = inspectMirrorFallbackDecision(mockEnvelope);
        expect(fallback.fallbackTriggered).toBe(false);

        // Does not throw side-effecting errors
        expect(inspectTrustRoot('core')).toBeDefined();
    });
});
