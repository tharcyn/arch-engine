import type { TrustPolicyConfig } from '../trust/TrustPolicyConfig';
import type { TrustPolicyAuditDiagnostic, TrustPolicyFinding } from './TrustPolicyAuditDiagnostic';
import { StaticLockfileSignerStore } from './LockfileSignerStore';

export function auditTrustPolicyConfig(config: TrustPolicyConfig): TrustPolicyAuditDiagnostic {
  const findings: TrustPolicyFinding[] = [];
  let enabledVerifiers = 0;
  let enabledSigners = 0;
  
  const strictEnforcement = config.enforcementMode === 'require-signature' || config.enforcementMode === 'require-signature-and-freshness';

  if (config.requireSignatures) {
    findings.push({
      code: 'LEGACY_REQUIRE_SIGNATURES',
      severity: 'warning',
      message: 'The `requireSignatures` field is deprecated. Use `enforcementMode` instead.'
    });
  }

  if (config.signerLockfileKeys && Object.keys(config.signerLockfileKeys).length > 0) {
    findings.push({
      code: 'LEGACY_SIGNER_KEYS',
      severity: 'warning',
      message: 'The `signerLockfileKeys` field is deprecated. Use `lockfileSigners` with structured config instead.'
    });
  }

  const signerStore = new StaticLockfileSignerStore(config.signerLockfileKeys, config.lockfileSigners);
  
  // To audit the actual key resolution, we need to inspect the raw keys we have
  const allKeys = new Set<string>();
  if (config.signerLockfileKeys) {
    Object.keys(config.signerLockfileKeys).forEach(k => allKeys.add(k));
  }
  if (config.lockfileSigners) {
    Object.keys(config.lockfileSigners).forEach(k => allKeys.add(k));
  }

  for (const keyId of allKeys) {
    const rawSigner = config.lockfileSigners?.[keyId];
    
    if (rawSigner) {
      if (rawSigner.enabled === false) {
        findings.push({
          code: 'DISABLED_SIGNER',
          severity: 'info',
          message: `Signer ${keyId} is explicitly disabled.`,
          keyId
        });
      }

      if (rawSigner.algorithm && rawSigner.algorithm !== 'ed25519') {
        findings.push({
          code: 'UNSUPPORTED_ALGORITHM',
          severity: 'error',
          message: `Signer ${keyId} declares an unsupported algorithm: ${rawSigner.algorithm}. Only ed25519 is supported.`,
          keyId
        });
      }

      if (!rawSigner.allowedOperations || rawSigner.allowedOperations.length === 0) {
        findings.push({
          code: 'NO_ALLOWED_OPERATIONS',
          severity: 'warning',
          message: `Signer ${keyId} has no allowed operations configured. It cannot verify or sign.`,
          keyId
        });
      }

      if (rawSigner.replacementKeyId && !allKeys.has(rawSigner.replacementKeyId)) {
        findings.push({
          code: 'MISSING_REPLACEMENT_TARGET',
          severity: 'error',
          message: `Signer ${keyId} declares a replacementKeyId '${rawSigner.replacementKeyId}', but that key is not configured.`,
          keyId
        });
      }

      const status = rawSigner.status || 'active';
      const ops = rawSigner.allowedOperations || [];

      if (status === 'retired' && (ops.includes('sign') || ops.includes('verify'))) {
        findings.push({
          code: 'RETIRED_SIGNER_ACTIVE_OPERATIONS',
          severity: 'error',
          message: `Signer ${keyId} is retired but still declares active operations (${ops.join(', ')}). Retired signers cannot verify or sign.`,
          keyId
        });
      }

      if (status === 'verify-only' && ops.includes('sign')) {
        findings.push({
          code: 'VERIFY_ONLY_SIGNER_CANNOT_SIGN',
          severity: 'error',
          message: `Signer ${keyId} is verify-only but declares 'sign' operation.`,
          keyId
        });
      }
    }

    const resolved = signerStore.getPrivateKey(keyId);
    if (!resolved) {
      findings.push({
        code: 'UNREADABLE_KEY_MATERIAL',
        severity: 'error',
        message: `Signer ${keyId} key material is missing, malformed, or unreadable from the filesystem.`,
        keyId
      });
    } else {
      if (!resolved.pem.includes('PRIVATE KEY')) {
        findings.push({
          code: 'MALFORMED_KEY_MATERIAL',
          severity: 'error',
          message: `Signer ${keyId} key material does not appear to be a valid PEM formatted private key.`,
          keyId
        });
      } else if (resolved.enabled) {
        if (resolved.allowedOperations.includes('verify') && resolved.status !== 'retired') enabledVerifiers++;
        if (resolved.allowedOperations.includes('sign') && resolved.status === 'active') enabledSigners++;
      }
    }
  }

  if (strictEnforcement && enabledVerifiers === 0) {
    findings.push({
      code: 'STRICT_ENFORCEMENT_NO_VERIFIERS',
      severity: 'error',
      message: 'Trust policy demands strict enforcement, but no enabled signers are authorized for verification operations.'
    });
  }

  const quorumConfig = config.quorum ?? 1;
  let quorumThreshold: number;
  if (quorumConfig === 'all') {
    quorumThreshold = enabledVerifiers;
    if (quorumThreshold === 0) quorumThreshold = 1; // Needs at least 1 overall usually
  } else {
    quorumThreshold = quorumConfig;
  }

  if (strictEnforcement && enabledVerifiers < quorumThreshold) {
    findings.push({
      code: 'QUORUM_IMPOSSIBLE',
      severity: 'error',
      message: `Trust policy requires a quorum of ${quorumThreshold}, but only ${enabledVerifiers} valid signers are available for verification.`
    });
  }

  let readiness: 'healthy' | 'degraded' | 'invalid' = 'healthy';
  const hasErrors = findings.some(f => f.severity === 'error');
  const hasWarnings = findings.some(f => f.severity === 'warning');
  
  if (hasErrors) {
    readiness = 'invalid';
  } else if (hasWarnings) {
    readiness = 'degraded';
  }

  return {
    readiness,
    findings,
    totalSigners: allKeys.size,
    enabledVerifiers,
    enabledSigners,
    strictEnforcement
  };
}
