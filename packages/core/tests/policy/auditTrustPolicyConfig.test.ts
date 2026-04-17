import { describe, expect, test } from 'vitest';
import { auditTrustPolicyConfig } from '../../src/policy/auditTrustPolicyConfig';
import type { TrustPolicyConfig } from '../../src/trust/TrustPolicyConfig';

describe('auditTrustPolicyConfig', () => {
  test('healthy trust configuration', () => {
    const config: TrustPolicyConfig = {
      enforcementMode: 'require-signature',
      lockfileSigners: {
        'test-key': {
          key: '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIKxI3V17l/gA08jIItZlYgZ59B3jJz4gK6H/GkO8V2sY\n-----END PRIVATE KEY-----',
          enabled: true,
          allowedOperations: ['verify', 'sign']
        }
      }
    };
    
    const result = auditTrustPolicyConfig(config);
    expect(result.readiness).toBe('healthy');
    expect(result.findings).toHaveLength(0);
    expect(result.totalSigners).toBe(1);
    expect(result.enabledVerifiers).toBe(1);
    expect(result.enabledSigners).toBe(1);
    expect(result.strictEnforcement).toBe(true);
  });

  test('malformed signer key material', () => {
    const config: TrustPolicyConfig = {
      enforcementMode: 'permissive',
      lockfileSigners: {
        'test-key': {
          key: 'not-a-pem',
          enabled: true,
          allowedOperations: ['verify']
        }
      }
    };
    
    const result = auditTrustPolicyConfig(config);
    expect(result.readiness).toBe('invalid');
    expect(result.findings.some(f => f.code === 'UNREADABLE_KEY_MATERIAL' || f.code === 'MALFORMED_KEY_MATERIAL')).toBe(true);
  });

  test('strict enforcement with no verify-authorized identities', () => {
    const config: TrustPolicyConfig = {
      enforcementMode: 'require-signature',
      lockfileSigners: {
        'test-key': {
          key: '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIKxI3V17l/gA08jIItZlYgZ59B3jJz4gK6H/GkO8V2sY\n-----END PRIVATE KEY-----',
          enabled: true,
          allowedOperations: ['sign'] // verify not allowed
        }
      }
    };
    
    const result = auditTrustPolicyConfig(config);
    expect(result.readiness).toBe('invalid');
    expect(result.findings.some(f => f.code === 'STRICT_ENFORCEMENT_NO_VERIFIERS')).toBe(true);
  });

  test('signer operation misconfiguration', () => {
    const config: TrustPolicyConfig = {
      enforcementMode: 'permissive',
      lockfileSigners: {
        'test-key': {
          key: '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIKxI3V17l/gA08jIItZlYgZ59B3jJz4gK6H/GkO8V2sY\n-----END PRIVATE KEY-----',
          enabled: true,
          allowedOperations: [] // empty
        }
      }
    };
    
    const result = auditTrustPolicyConfig(config);
    expect(result.readiness).toBe('degraded');
    expect(result.findings.some(f => f.code === 'NO_ALLOWED_OPERATIONS')).toBe(true);
  });

  test('disabled signer findings', () => {
    const config: TrustPolicyConfig = {
      enforcementMode: 'permissive',
      lockfileSigners: {
        'test-key': {
          key: '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIKxI3V17l/gA08jIItZlYgZ59B3jJz4gK6H/GkO8V2sY\n-----END PRIVATE KEY-----',
          enabled: false,
          allowedOperations: ['verify']
        }
      }
    };
    
    const result = auditTrustPolicyConfig(config);
    expect(result.readiness).toBe('healthy');
    expect(result.findings.some(f => f.code === 'DISABLED_SIGNER')).toBe(true);
  });

  test('legacy normalization findings', () => {
    const config: TrustPolicyConfig = {
      requireSignatures: true,
      signerLockfileKeys: {
        'test-key': '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIKxI3V17l/gA08jIItZlYgZ59B3jJz4gK6H/GkO8V2sY\n-----END PRIVATE KEY-----'
      }
    };
    
    const result = auditTrustPolicyConfig(config);
    expect(result.readiness).toBe('degraded');
    expect(result.findings.some(f => f.code === 'LEGACY_REQUIRE_SIGNATURES')).toBe(true);
    expect(result.findings.some(f => f.code === 'LEGACY_SIGNER_KEYS')).toBe(true);
  });
});
