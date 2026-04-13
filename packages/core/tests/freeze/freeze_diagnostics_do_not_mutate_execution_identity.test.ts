import { describe, test, expect } from 'vitest';
import { inspectClosureIdentity } from '../../src/transport/federationDiagnostics.js';
import { SnapshotEnvelope } from '../../src/transport/types.js';

describe('Freeze Evidence: Diagnostics Do Not Mutate Execution Identity', () => {

    test('Diagnostic extraction creates new objects, preventing inadvertent mutation of the source envelope', () => {
        const mockEnvelope: SnapshotEnvelope = {
            snapshotClosureGraphHash: 'hash-original',
            closureGraphContractVersion: 'v3',
            policyStackFingerprint: 'stack-original',
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
                manifestContentHash: 'mh-original',
                signatureDigest: 'sd-original',
                registryTrustRootId: 'root-original',
                trustRootEpoch: 1
            }
        };

        const identity = inspectClosureIdentity(mockEnvelope);
        
        // Mutate the diagnostic return
        identity!.manifestContentHash = 'mh-mutated';
        identity!.stackOrderingKeySummary = 'hash-mutated';

        // Source envelope MUST remain unmutated 
        expect(mockEnvelope.closureProvenance!.manifestContentHash).toBe('mh-original');
        expect(mockEnvelope.snapshotClosureGraphHash).toBe('hash-original');
    });

});
