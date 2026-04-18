import { describe, test, expect } from 'vitest';
import { verifyRegistryCatalogSignature } from '../../src/policy-registry/verifyRegistryCatalogSignature.js';

describe('Signature Verification Contract', () => {
    test('enforces signature boundary states deterministically', () => {
        expect(verifyRegistryCatalogSignature('hash1', null, 'required')).toMatchInlineSnapshot(`
          {
            "signatureAlgorithm": null,
            "signatureValid": false,
            "trustedSigner": null,
            "verificationDiagnostics": [
              "Required signature is missing from catalog.",
            ],
          }
        `);

        expect(verifyRegistryCatalogSignature('hash1', null, 'optional')).toMatchInlineSnapshot(`
          {
            "signatureAlgorithm": null,
            "signatureValid": true,
            "trustedSigner": null,
            "verificationDiagnostics": [
              "Optional signature missing. Proceeding unverified.",
            ],
          }
        `);

        expect(verifyRegistryCatalogSignature('hash1', 'valid-sig-ecosystem', 'required')).toMatchInlineSnapshot(`
          {
            "signatureAlgorithm": "placeholder-crypto-v1",
            "signatureValid": true,
            "trustedSigner": "ecosystem",
            "verificationDiagnostics": [
              "Signature mathematically verified.",
            ],
          }
        `);

        expect(verifyRegistryCatalogSignature('hash1', 'invalid-tampered-hash', 'required')).toMatchInlineSnapshot(`
          {
            "signatureAlgorithm": "placeholder-crypto-v1",
            "signatureValid": false,
            "trustedSigner": null,
            "verificationDiagnostics": [
              "Signature mathematical verification failed. Tampering detected.",
            ],
          }
        `);
    });
});
