import { describe, test, expect } from 'vitest';
import { SnapshotEnvelope } from '../../src/transport/types.js';
import { explainReplayMismatch } from '../../src/transport/snapshotClosureGraphHash.js';

describe('Freeze Evidence: Replay Explain Mode Accuracy', () => {
    test('explainReplayMismatch accurately reports divergences from envelopes without strict execution validation', () => {
        const snap: SnapshotEnvelope = {
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

        const runtime: SnapshotEnvelope = {
            ...snap,
            closureGraphContractVersion: 'v4', // Version mismatch
            policyStackFingerprint: 'stack-2', // Stack mismatch
            closureProvenance: {
                manifestContentHash: 'mh-1', // Match
                signatureDigest: 'sd-2',     // Mismatch
                registryTrustRootId: 'root-2', // Mismatch
                trustRootEpoch: 1            // Match
            }
        };

        const report = explainReplayMismatch(snap, runtime);
        
        expect(report.closureGraphVersionMismatch).toBe(true);
        expect(report.overlayStackMismatch).toBe(true);
        expect(report.manifestMismatch).toBeUndefined(); // It matches
        expect(report.signatureMismatch).toBe(true);
        expect(report.trustRootMismatch).toBe(true);
        expect(report.trustRootEpochMismatch).toBeUndefined();
    });
});
