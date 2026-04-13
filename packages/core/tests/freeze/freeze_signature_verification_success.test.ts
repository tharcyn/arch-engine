import { describe, test, expect } from 'vitest';
import { verifyOverlaySignature, setAllowLegacySignatures } from '../../src/topology/overlaySignatureVerifier.js';
import { createTestSignatureEnvelope } from './utils/wrapHandler.js';

describe('Freeze Evidence: Signature Verification Success (F-6)', () => {

    test('valid envelope passes cryptographic verification gate', () => {
        setAllowLegacySignatures(false); // F-6 strict mode

        const signature = createTestSignatureEnvelope('test-vendor', '1.2.3', 'partner');

        const result = verifyOverlaySignature({
            overlaySourceId: 'test-vendor',
            overlayVersion: '1.2.3',
            overlaySignature: signature,
            overlayRegistrySource: 'partner'
});

        expect(result.signaturePresent).toBe(true);
        expect(result.signatureValid).toBe(true);
        expect(result.verificationMode).toBe('verified');
        expect(result.signatureEnvelopeValid).toBe(true);

        // Prove telemetry extraction
        expect(result.signatureKeyId).toBe('partner-ed25519-pubkey-001');
        expect(result.signatureAlgorithm).toBe('ed25519');
        expect(result.signatureTrustRoot).toBe('partner'); // trust root for partner registry
    });

    test('core registry envelope passes verification', () => {
        setAllowLegacySignatures(false);

        const signature = createTestSignatureEnvelope('core-engine', '9.9.9', 'core');

        const result = verifyOverlaySignature({
            overlaySourceId: 'core-engine',
            overlayVersion: '9.9.9',
            overlaySignature: signature,
            overlayRegistrySource: 'core'
        });

        expect(result.signatureValid).toBe(true);
        expect(result.signatureTrustRoot).toBe('core');
    });

    test('missing registry returns untrusted-root rejection', () => {
        setAllowLegacySignatures(false);

        const signature = createTestSignatureEnvelope('test', '1.0', 'unknown');

        const result = verifyOverlaySignature({
            overlaySourceId: 'test',
            overlayVersion: '1.0',
            overlaySignature: signature,
            overlayRegistrySource: 'unknown-registry-x'
        });

        expect(result.signatureValid).toBe(false);
        expect(result.verificationMode).toBe('untrusted-root');
        expect(result.rejectionReason).toContain('No trust root found');
    });
});
