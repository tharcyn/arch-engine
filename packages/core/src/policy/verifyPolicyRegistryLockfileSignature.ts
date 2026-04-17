import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import type { PolicyRegistryLockfile, PolicyRegistryLockfileSignatureEntry } from './PolicyRegistryLockfile';
import { canonicalizeRegistryLockfilePayload } from './canonicalizeRegistryLockfilePayload';
import type { LockfileTrustStore } from './LockfileTrustStore';
import type { LockfileTrustDiagnostic, SignatureSetDiagnosticEntry, LockfileTrustFailureReason } from './LockfileTrustDiagnostic';
import type { TrustPolicyConfig } from '../trust/TrustPolicyConfig';

export interface PolicyRegistryLockfileSignatureVerificationResult {
  readonly verified: boolean;
  readonly expected?: string;
  readonly actual?: string;
  readonly error?: string;
  readonly diagnostic: LockfileTrustDiagnostic;
}

export function verifyPolicyRegistryLockfileSignature(
  lockfilePath: string,
  trustConfig: TrustPolicyConfig,
  trustStore: LockfileTrustStore
): PolicyRegistryLockfileSignatureVerificationResult {
  let lockfile: PolicyRegistryLockfile;
  try {
    const content = fs.readFileSync(lockfilePath, 'utf-8');
    lockfile = JSON.parse(content);
  } catch (e) {
    return { 
      verified: false, 
      diagnostic: {
        success: false,
        evaluatedOperation: 'verify',
        failureReason: 'INVALID_SIGNATURE',
        message: 'Lockfile could not be parsed'
      }
    };
  }

  // Normalize signatures
  let signatures: PolicyRegistryLockfileSignatureEntry[] = [];
  if (lockfile.signatures && Array.isArray(lockfile.signatures)) {
      signatures = [...lockfile.signatures];
  } else if (lockfile.signature && lockfile.signatureKeyId && lockfile.signatureAlgorithm) {
      signatures = [{
          signature: lockfile.signature,
          signatureKeyId: lockfile.signatureKeyId,
          signatureAlgorithm: lockfile.signatureAlgorithm as 'ed25519'
      }];
  }

  // Permissive mode or no enforce
  if (!trustConfig.enforcementMode || trustConfig.enforcementMode === 'permissive') {
      // Not actually strictly enforcing signatures here, but we should verify what we have?
      // Wait, verifyPolicyRegistryLockfileSignature is the core verifier. It shouldn't decide enforcement modes.
      // Actually, if we pass trustConfig, we can read quorum. If we just want to verify signatures, we need quorum.
  }

  const quorumConfig = trustConfig.quorum ?? 1;
  let quorumThreshold: number;
  
  if (quorumConfig === 'all') {
      quorumThreshold = signatures.length;
      if (quorumThreshold === 0) {
        // 'all' of 0 is 0, but we need at least 1 valid signature generally?
        // Wait, if no signatures are present, and quorum is 'all', is it valid? No, usually quorum requires >= 1.
        quorumThreshold = 1; 
      }
  } else {
      quorumThreshold = quorumConfig;
  }

  if (signatures.length === 0) {
      return {
          verified: false,
          diagnostic: {
              success: false,
              evaluatedOperation: 'verify',
              canonicalPayloadSurface: 'registries',
              failureReason: 'MISSING_SIGNATURE',
              message: 'No signatures present on lockfile',
              signaturesPresent: 0,
              signaturesVerified: 0,
              signaturesRejected: 0,
              quorumThreshold,
              quorumSatisfied: false
          }
      };
  }

  const payload = canonicalizeRegistryLockfilePayload(lockfile.registries);
  const payloadBuffer = Buffer.from(payload, 'utf8');

  let verifiedCount = 0;
  let rejectedCount = 0;
  let firstFailureReason: LockfileTrustFailureReason | undefined;
  
  const signatureSet: SignatureSetDiagnosticEntry[] = [];
  const seenSigners = new Set<string>();

  for (const sigEntry of signatures) {
      const keyId = sigEntry.signatureKeyId || 'unknown';
      let status: SignatureSetDiagnosticEntry['status'] = 'invalid';
      let errorReason: LockfileTrustFailureReason | undefined;

      const markInvalid = (reason: LockfileTrustFailureReason) => {
          rejectedCount++;
          firstFailureReason = firstFailureReason ?? reason;
          errorReason = reason;
      };

      if (seenSigners.has(keyId)) {
          status = 'duplicate';
          markInvalid('DUPLICATE_SIGNATURE');
          signatureSet.push({ signatureKeyId: keyId, status, errorReason });
          continue;
      }
      seenSigners.add(keyId);

      if (sigEntry.signatureAlgorithm !== 'ed25519') {
          markInvalid('ALGORITHM_MISMATCH');
          signatureSet.push({ signatureKeyId: keyId, status, errorReason });
          continue;
      }

      const signerIdentity = trustStore.getPublicKey(keyId);
      if (!signerIdentity) {
          markInvalid('UNKNOWN_SIGNER');
          signatureSet.push({ signatureKeyId: keyId, status, errorReason });
          continue;
      }

      if (signerIdentity.algorithm !== 'ed25519') {
          markInvalid('ALGORITHM_MISMATCH');
          signatureSet.push({ signatureKeyId: keyId, status, errorReason });
          continue;
      }

      if (!signerIdentity.enabled) {
          markInvalid('DISABLED_SIGNER');
          status = 'invalid';
          signatureSet.push({ signatureKeyId: keyId, status, errorReason });
          continue;
      }

      if (signerIdentity.status === 'retired') {
          markInvalid('UNAUTHORIZED_OPERATION');
          status = 'retired';
          signatureSet.push({ signatureKeyId: keyId, status, errorReason });
          continue;
      }

      if (!signerIdentity.allowedOperations.includes('verify')) {
          markInvalid('UNAUTHORIZED_OPERATION');
          signatureSet.push({ signatureKeyId: keyId, status, errorReason });
          continue;
      }

      if (!signerIdentity.pem) {
          markInvalid('MALFORMED_KEY_MATERIAL');
          signatureSet.push({ signatureKeyId: keyId, status, errorReason });
          continue;
      }

      try {
          const isVerified = crypto.verify(
            null,
            payloadBuffer,
            signerIdentity.pem,
            Buffer.from(sigEntry.signature, 'hex')
          );
          if (isVerified) {
              if (verifiedCount < quorumThreshold) {
                  verifiedCount++;
                  status = 'counted';
              } else {
                  status = 'valid-but-non-counted';
              }
          } else {
              markInvalid('INVALID_SIGNATURE');
          }
      } catch (e) {
          markInvalid('INVALID_SIGNATURE');
      }
      
      signatureSet.push({ signatureKeyId: keyId, status, errorReason });
  }

  const quorumSatisfied = verifiedCount >= quorumThreshold;
  
  // Check canonical order
  let isCanonical = true;
  for (let i = 1; i < signatures.length; i++) {
      if ((signatures[i-1].signatureKeyId || '').localeCompare(signatures[i].signatureKeyId || '') > 0) {
          isCanonical = false;
          break;
      }
  }

  if (!isCanonical) {
      firstFailureReason = firstFailureReason ?? 'NON_CANONICAL_ORDER';
  }

  let message = quorumSatisfied ? `Quorum satisfied (${verifiedCount}/${quorumThreshold})` : `Quorum not satisfied (${verifiedCount}/${quorumThreshold})`;

  return {
      verified: quorumSatisfied,
      diagnostic: {
          success: quorumSatisfied,
          evaluatedOperation: 'verify',
          canonicalPayloadSurface: 'registries',
          failureReason: quorumSatisfied ? undefined : (firstFailureReason as any ?? 'INVALID_SIGNATURE'),
          message,
          signaturesPresent: signatures.length,
          signaturesVerified: verifiedCount,
          signaturesRejected: rejectedCount,
          quorumThreshold,
          quorumSatisfied,
          signatureSet,
          isCanonical
      }
  };
}
