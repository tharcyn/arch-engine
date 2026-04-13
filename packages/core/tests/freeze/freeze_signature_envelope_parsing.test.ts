import { describe, test, expect } from 'vitest';
import { parseOverlaySignatureEnvelope, computeSignedPayloadDigest, createSignatureEnvelopeString } from '../../src/topology/overlaySignatureEnvelope.js';

describe('Freeze Evidence: Signature Envelope Parsing (F-6)', () => {

    test('valid base64 JSON envelope parses successfully', () => {
        const envelope = {
            algorithm: 'ed25519' as const,
            keyId: 'key-123',
            signature: 'sig-data',
            signedPayloadDigest: 'digest-123'
        };
        const encoded = createSignatureEnvelopeString(envelope);

        const parsed = parseOverlaySignatureEnvelope(encoded);

        expect(parsed).toBeDefined();
        expect(parsed?.algorithm).toBe('ed25519');
        expect(parsed?.keyId).toBe('key-123');
        expect(parsed?.signature).toBe('sig-data');
        expect(parsed?.signedPayloadDigest).toBe('digest-123');
    });

    test('undefined or empty signature string returns undefined', () => {
        expect(parseOverlaySignatureEnvelope(undefined)).toBeUndefined();
        expect(parseOverlaySignatureEnvelope('')).toBeUndefined();
    });

    test('legacy "sig:" prefix returns undefined', () => {
        expect(parseOverlaySignatureEnvelope('sig:legacy-data')).toBeUndefined();
    });

    test('invalid base64 returns undefined', () => {
        expect(parseOverlaySignatureEnvelope('not-base64@#$')).toBeUndefined();
    });

    test('invalid JSON inside base64 returns undefined', () => {
        const badBase64 = Buffer.from('{"bad": json', 'utf-8').toString('base64');
        expect(parseOverlaySignatureEnvelope(badBase64)).toBeUndefined();
    });

    test('missing required fields returns undefined', () => {
        const missingKey = Buffer.from(JSON.stringify({
            algorithm: 'ed25519',
            signature: 'sig-data',
            signedPayloadDigest: 'digest'
        }), 'utf-8').toString('base64');

        expect(parseOverlaySignatureEnvelope(missingKey)).toBeUndefined();
    });

    test('unsupported algorithm returns undefined', () => {
        const badAlgo = Buffer.from(JSON.stringify({
            algorithm: 'hmac-sha256',
            keyId: 'k1',
            signature: 'sig-data',
            signedPayloadDigest: 'digest'
        }), 'utf-8').toString('base64');

        expect(parseOverlaySignatureEnvelope(badAlgo)).toBeUndefined();
    });

    test('payload digest computation is deterministic', () => {
        const digest1 = computeSignedPayloadDigest('source-a', '1.0.0', 'hash-x');
        const digest2 = computeSignedPayloadDigest('source-a', '1.0.0', 'hash-x');

        expect(digest1).toBe(digest2);
        expect(digest1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex
    });

    test('payload digest factors source id', () => {
        const digest1 = computeSignedPayloadDigest('source-a', '1.0.0', 'hash-x');
        const digest2 = computeSignedPayloadDigest('source-b', '1.0.0', 'hash-x');

        expect(digest1).not.toBe(digest2);
    });

    test('payload digest factors version', () => {
        const digest1 = computeSignedPayloadDigest('source-a', '1.0.0', 'hash-x');
        const digest2 = computeSignedPayloadDigest('source-a', '2.0.0', 'hash-x');

        expect(digest1).not.toBe(digest2);
    });
});
