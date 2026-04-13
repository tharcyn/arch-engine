import { describe, test, expect } from 'vitest';
import { verifyOverlaySignature, setAllowLegacySignatures } from '../../src/topology/overlaySignatureVerifier.js';

describe('Freeze Evidence: Legacy Signature Rejection (F-6)', () => {

    test('legacy "sig:" prefix is rejected when strict mode is enabled', () => {
        setAllowLegacySignatures(false);

        const result = verifyOverlaySignature({
            overlaySourceId: 'test-source',
                overlayRegistrySource: 'core',
            overlayVersion: '1.0.0',
            overlaySignature: 'sig:abc123def'
        });

        expect(result.signaturePresent).toBe(true);
        expect(result.signatureValid).toBe(false);
        expect(result.verificationMode).toBe('invalid');
        expect(result.rejectionReason).toContain('Legacy signature format rejected');
    });

    test('legacy "sig:" prefix is accepted when allowance flag is true', () => {
        setAllowLegacySignatures(true);

        const result = verifyOverlaySignature({
            overlaySourceId: 'test-source',
                overlayRegistrySource: 'core',
            overlayVersion: '1.0.0',
            overlaySignature: 'sig:abc123def'
        });

        expect(result.signaturePresent).toBe(true);
        expect(result.signatureValid).toBe(true);
        expect(result.verificationMode).toBe('verified');
        expect(result.signatureKeyId).toBe('legacy');
    });
});
