import { describe, test, expect } from 'vitest';
import { verifyOverlaySignature, setAllowLegacySignatures } from '../../src/topology/overlaySignatureVerifier.js';
import { createTestSignatureEnvelope } from './utils/wrapHandler.js';

describe('Freeze Evidence: Cross-Registry Signature Replay Rejection (F-6)', () => {

    test('signature replayed for a different overlay source ID is rejected', () => {
        setAllowLegacySignatures(false);

        // Attacker observes a signature for 'vendor-a'
        const stolenSignature = createTestSignatureEnvelope('vendor-a', '1.0.0', 'external');

        // Attacker replays it for 'malicious-vendor'
        const result = verifyOverlaySignature({
            overlaySourceId: 'malicious-vendor', // DIFFERENT
            overlayVersion: '1.0.0',
            overlaySignature: stolenSignature,
            overlayRegistrySource: 'external'
        });

        expect(result.signatureValid).toBe(false);
        expect(result.verificationMode).toBe('invalid');
        expect(result.rejectionReason).toContain('Payload digest mismatch');
    });

    test('signature replayed for a different version is rejected', () => {
        setAllowLegacySignatures(false);

        // Attacker steals signature from v1
        const stolenSignature = createTestSignatureEnvelope('vendor-x', '1.0.0', 'external');

        // Attacker replays it for vulnerable v2 upgrade
        const result = verifyOverlaySignature({
            overlaySourceId: 'vendor-x',
            overlayVersion: '2.0.0', // DIFFERENT
            overlaySignature: stolenSignature,
            overlayRegistrySource: 'external'
        });

        expect(result.signatureValid).toBe(false);
        expect(result.verificationMode).toBe('invalid');
        expect(result.rejectionReason).toContain('Payload digest mismatch');
    });

    test('signature replayed in a different registry without trust root matching is rejected', () => {
        setAllowLegacySignatures(false);

        // Partner signature generated using partner key
        const partnerSignature = createTestSignatureEnvelope('vendor-y', '1.0.0', 'partner');

        // Attacker attempts to replay it in core registry to escalate privilege
        const result = verifyOverlaySignature({
            overlaySourceId: 'vendor-y',
            overlayVersion: '1.0.0',
            overlaySignature: partnerSignature,
            overlayRegistrySource: 'core' // DIFFERENT REGISTRY
        });

        expect(result.signatureValid).toBe(false);
        expect(result.verificationMode).toBe('untrusted-root'); // Key not trusted by core registry
        expect(result.rejectionReason).toContain('not found in trust root');
    });
});
