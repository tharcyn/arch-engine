import { describe, test, expect } from 'vitest';
import { verifyOverlaySignature, setAllowLegacySignatures } from '../../src/topology/overlaySignatureVerifier.js';
import { createSignatureEnvelopeString, computeSignedPayloadDigest } from '../../src/topology/overlaySignatureEnvelope.js';

describe('Freeze Evidence: Signature Verification Rejection (F-6)', () => {

    test('signature signed by key missing from trust root is rejected', () => {
        setAllowLegacySignatures(false);

        const digest = computeSignedPayloadDigest('vendor-x', '1.0.0');
        const signature = createSignatureEnvelopeString({
            algorithm: 'ed25519',
            keyId: 'unknown-hacker-key', // NOT in 'partner' trust root
            signature: 'fake-sig',
            signedPayloadDigest: digest
        });

        const result = verifyOverlaySignature({
            overlaySourceId: 'vendor-x',
            overlayVersion: '1.0.0',
            overlaySignature: signature,
            overlayRegistrySource: 'partner'
});

        expect(result.signatureValid).toBe(false);
        expect(result.verificationMode).toBe('untrusted-root');
        expect(result.rejectionReason).toContain('not found in trust root');
        expect(result.signatureKeyId).toBe('unknown-hacker-key');
    });

    test('signature with modified payload digest is rejected', () => {
        setAllowLegacySignatures(false);

        // We create an envelope signed with a valid key, but the digest is completely arbitrary
        const signature = createSignatureEnvelopeString({
            algorithm: 'ed25519',
            keyId: 'partner-ed25519-pubkey-001', // valid key
            signature: 'real-sig',
            signedPayloadDigest: 'hash-of-different-content'
        });

        const result = verifyOverlaySignature({
            overlaySourceId: 'vendor-x',
            overlayVersion: '1.0.0',
            overlaySignature: signature,
            overlayRegistrySource: 'partner'
});

        expect(result.signatureValid).toBe(false);
        expect(result.verificationMode).toBe('invalid'); // maps to digest-mismatch
        expect(result.rejectionReason).toContain('Payload digest mismatch');
    });

    test('envelope with missing signature data is rejected', () => {
        setAllowLegacySignatures(false);

        const digest = computeSignedPayloadDigest('vendor', '1');
        const signature = createSignatureEnvelopeString({
            algorithm: 'ed25519',
            keyId: 'partner-ed25519-pubkey-001',
            signature: '', // MISSING
            signedPayloadDigest: digest
        });

        const result = verifyOverlaySignature({
            overlaySourceId: 'vendor',
            overlayVersion: '1',
            overlaySignature: signature,
            overlayRegistrySource: 'partner'
});

        expect(result.signatureValid).toBe(false);
        expect(result.verificationMode).toBe('invalid');
        expect(result.rejectionReason).toContain('Signature data is empty');
    });

    test('unsupported algorithm is rejected', () => {
        setAllowLegacySignatures(false);

        const envelopeBase64 = Buffer.from(JSON.stringify({
            algorithm: 'md5', // INVALID
            keyId: 'partner-ed25519-pubkey-001',
            signature: 'sig',
            signedPayloadDigest: computeSignedPayloadDigest('v', '1')
        })).toString('base64');

        const result = verifyOverlaySignature({
            overlaySourceId: 'v',
            overlayVersion: '1',
            overlaySignature: envelopeBase64,
            overlayRegistrySource: 'partner'
});

        // Rejected at parse stage due to schema violation
        expect(result.signatureValid).toBe(false);
        expect(result.verificationMode).toBe('invalid');
        expect(result.rejectionReason).toContain('Signature envelope parsing failed');
    });
});
