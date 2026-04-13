import { describe, test, expect } from 'vitest';
import { verifyOverlaySignature } from '../../src/topology/overlaySignatureVerifier.js';

describe('Freeze Evidence: Signature Verification Gate (F-3)', () => {

    test('missing signature returns mode=missing, valid=false', () => {
        const result = verifyOverlaySignature({
            overlaySourceId: 'test-source',
                overlayRegistrySource: 'core',
            overlayVersion: '1.0.0',
            overlaySignature: undefined
        });

        expect(result.signaturePresent).toBe(false);
        expect(result.signatureValid).toBe(false);
        expect(result.verificationMode).toBe('missing');
        expect(result.rejectionReason).toContain('Signature missing');
    });

    test('empty string signature returns mode=missing, valid=false', () => {
        const result = verifyOverlaySignature({
            overlaySourceId: 'test-source',
                overlayRegistrySource: 'core',
            overlayVersion: '1.0.0',
            overlaySignature: ''
        });

        expect(result.signaturePresent).toBe(false);
        expect(result.signatureValid).toBe(false);
        expect(result.verificationMode).toBe('missing');
    });

    test('valid "sig:" prefix returns mode=verified, valid=true', () => {
        const result = verifyOverlaySignature({
            overlaySourceId: 'test-source',
                overlayRegistrySource: 'core',
            overlayVersion: '1.0.0',
            overlaySignature: 'sig:sha256-abc123def456'
        });

        expect(result.signaturePresent).toBe(true);
        expect(result.signatureValid).toBe(true);
        expect(result.verificationMode).toBe('verified');
        expect(result.rejectionReason).toBeUndefined();
    });

    test('invalid signature (no "sig:" prefix) returns mode=invalid, valid=false', () => {
        const result = verifyOverlaySignature({
            overlaySourceId: 'test-source',
                overlayRegistrySource: 'core',
            overlayVersion: '1.0.0',
            overlaySignature: 'sha256:abc123'
        });

        expect(result.signaturePresent).toBe(true);
        expect(result.signatureValid).toBe(false);
        expect(result.verificationMode).toBe('invalid');
        expect(result.rejectionReason).toContain('Signature envelope parsing failed');
    });

    test('verifier is deterministic across identical inputs', () => {
        const input = {
            overlaySourceId: 'vendor-x',
                overlayRegistrySource: 'core',
            overlayVersion: '2.0.0',
            overlaySignature: 'sig:deterministic-test'
        };

        const result1 = verifyOverlaySignature(input);
        const result2 = verifyOverlaySignature(input);

        expect(result1).toEqual(result2);
    });
});
