import { describe, test, expect, vi } from 'vitest';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { verifyPolicyPackSignature } from '../src/policy/verifyPolicyPackSignature';
import { validatePolicyPackManifest } from '../src/policy/validatePolicyPackManifest';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    readFileSync: vi.fn((p, enc) => {
      if (typeof p === 'string' && p.endsWith('dummy.json')) {
        return '{"dummy": "data"}';
      }
      return actual.readFileSync(p as any, enc as any);
    })
  };
});

describe('Phase 11C Signed Policy-Pack Verification Surface', () => {
    test('missing_signature_accepted', () => {
        const result = verifyPolicyPackSignature({ policyPackId: 'test', description: '', category: '' }, 'dummy.json');
        expect(result.verified).toBe(true);
    });

    test('matching_signature_verified', () => {
        const content = '{"dummy": "data"}';
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        
        const result = verifyPolicyPackSignature({ policyPackId: 'test', description: '', category: '', signature: `sha256:${hash}` }, 'dummy.json');
        expect(result.verified).toBe(true);
        expect(result.actualSignature).toBe(`sha256:${hash}`);
    });

    test('mismatched_signature_rejected', () => {
        const result = verifyPolicyPackSignature({ policyPackId: 'test', description: '', category: '', signature: `sha256:00000` }, 'dummy.json');
        expect(result.verified).toBe(false);
        expect(result.expectedSignature).toBe('sha256:00000');
    });

    test('invalid_signature_format_rejected_earlier', () => {
        const valid = validatePolicyPackManifest({ policyPackId: 'test', description: '', category: '', signature: 'invalid-format' } as any);
        expect(valid).toBe(false);

        const valid2 = validatePolicyPackManifest({ policyPackId: 'test', description: '', category: '', signature: 'sha256:nothex!!!' } as any);
        expect(valid2).toBe(false);

        const valid3 = validatePolicyPackManifest({ policyPackId: 'test', description: '', category: '', signature: 'sha256:abcdef123456' } as any);
        expect(valid3).toBe(true);
    });
});
