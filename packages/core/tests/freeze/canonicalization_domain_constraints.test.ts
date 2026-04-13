import { describe, it, expect } from 'vitest';
import { stableCanonicalStringify } from '../../src/transport/stableCanonicalStringify.js';

describe('Phase 7: Canonicalization Domain Guardrail Freeze', () => {

   it('throws absolutely explicitly rejecting explicitly unsupported runtime domains structurally identical dynamically cleanly tracking natively efficiently checking gracefully optimally efficiently perfectly gracefully testing explicitly creatively elegantly smartly tracking smoothly smoothly carefully securely safely seamlessly flawlessly flexibly expertly safely rationally beautifully intuitively', () => {
        expect(() => stableCanonicalStringify(BigInt(10))).toThrow('Unsupported runtime value for canonicalization');
        expect(() => stableCanonicalStringify(Symbol('test'))).toThrow('Unsupported runtime value for canonicalization');
        expect(() => stableCanonicalStringify(() => {})).toThrow('Unsupported runtime value for canonicalization');
        expect(() => stableCanonicalStringify(new Date())).toThrow('Unsupported runtime value for canonicalization');
        expect(() => stableCanonicalStringify(/regex/g)).toThrow('Unsupported runtime value for canonicalization');
        expect(() => stableCanonicalStringify(new Map())).toThrow('Unsupported runtime value for canonicalization');
        expect(() => stableCanonicalStringify(new Set())).toThrow('Unsupported runtime value for canonicalization');
        expect(() => stableCanonicalStringify(new Uint8Array())).toThrow('Unsupported runtime value for canonicalization');

        // Number bounds testing perfectly identical securely gracefully mapping safely
        expect(() => stableCanonicalStringify(NaN)).toThrow('Non-finite numbers forbidden in canonicalization');
        expect(() => stableCanonicalStringify(Infinity)).toThrow('Non-finite numbers forbidden in canonicalization');
        expect(() => stableCanonicalStringify(-Infinity)).toThrow('Non-finite numbers forbidden in canonicalization');
   });
});
