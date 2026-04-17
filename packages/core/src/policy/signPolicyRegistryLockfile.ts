import * as crypto from 'node:crypto';
import type { PolicyRegistryLockfile } from './PolicyRegistryLockfile';
import { canonicalizeRegistryLockfilePayload } from './canonicalizeRegistryLockfilePayload';
import type { LockfileSignerStore } from './LockfileSignerStore';
import type { LockfileTrustDiagnostic } from './LockfileTrustDiagnostic';

export interface SignPolicyRegistryLockfileResult {
  readonly success: boolean;
  readonly lockfile?: PolicyRegistryLockfile;
  readonly error?: string;
  readonly diagnostic: LockfileTrustDiagnostic;
}

export function signPolicyRegistryLockfile(
  lockfile: PolicyRegistryLockfile,
  signatureKeyId: string,
  signerStore: LockfileSignerStore
): SignPolicyRegistryLockfileResult {
  const signerIdentity = signerStore.getPrivateKey(signatureKeyId);
  if (!signerIdentity) {
    return { 
      success: false, 
      error: `Signer identity ${signatureKeyId} is unknown`,
      diagnostic: {
        success: false,
        signerKeyId: signatureKeyId,
        evaluatedOperation: 'sign',
        canonicalPayloadSurface: 'registries',
        failureReason: 'UNKNOWN_SIGNER',
        message: `Signer identity ${signatureKeyId} is unknown`
      }
    };
  }

  if (!signerIdentity.enabled) {
    return { 
      success: false, 
      error: `Signer identity ${signatureKeyId} is disabled`,
      diagnostic: {
        success: false,
        signerKeyId: signatureKeyId,
        signerRole: signerIdentity.role,
        signatureAlgorithm: signerIdentity.algorithm,
        evaluatedOperation: 'sign',
        canonicalPayloadSurface: 'registries',
        failureReason: 'DISABLED_SIGNER',
        message: `Signer identity ${signatureKeyId} is disabled`
      }
    };
  }

  if (signerIdentity.status === 'retired') {
    return {
      success: false,
      error: `Signer identity ${signatureKeyId} is retired and cannot be used for signing`,
      diagnostic: {
        success: false,
        signerKeyId: signatureKeyId,
        signerRole: signerIdentity.role,
        signatureAlgorithm: signerIdentity.algorithm,
        evaluatedOperation: 'sign',
        canonicalPayloadSurface: 'registries',
        failureReason: 'UNAUTHORIZED_OPERATION',
        message: `Signer identity ${signatureKeyId} is retired and cannot be used for signing`
      }
    };
  }

  if (signerIdentity.status === 'verify-only') {
    return {
      success: false,
      error: `Signer identity ${signatureKeyId} is verify-only and cannot be used for signing`,
      diagnostic: {
        success: false,
        signerKeyId: signatureKeyId,
        signerRole: signerIdentity.role,
        signatureAlgorithm: signerIdentity.algorithm,
        evaluatedOperation: 'sign',
        canonicalPayloadSurface: 'registries',
        failureReason: 'UNAUTHORIZED_OPERATION',
        message: `Signer identity ${signatureKeyId} is verify-only and cannot be used for signing`
      }
    };
  }

  if (!signerIdentity.allowedOperations.includes('sign')) {
    return { 
      success: false, 
      error: `Signer identity ${signatureKeyId} is not authorized for signing`,
      diagnostic: {
        success: false,
        signerKeyId: signatureKeyId,
        signerRole: signerIdentity.role,
        signatureAlgorithm: signerIdentity.algorithm,
        evaluatedOperation: 'sign',
        canonicalPayloadSurface: 'registries',
        failureReason: 'UNAUTHORIZED_OPERATION',
        message: `Signer identity ${signatureKeyId} is not authorized for signing`
      }
    };
  }



  if (signerIdentity.algorithm !== 'ed25519') {
    return { 
      success: false, 
      error: `Signer identity ${signatureKeyId} configured with unsupported algorithm ${signerIdentity.algorithm}`,
      diagnostic: {
        success: false,
        signerKeyId: signatureKeyId,
        signerRole: signerIdentity.role,
        signatureAlgorithm: signerIdentity.algorithm,
        evaluatedOperation: 'sign',
        canonicalPayloadSurface: 'registries',
        failureReason: 'ALGORITHM_MISMATCH',
        message: `Signer identity ${signatureKeyId} configured with unsupported algorithm ${signerIdentity.algorithm}`
      }
    };
  }

  if (!signerIdentity.pem) {
    return { 
      success: false, 
      error: `Signer identity ${signatureKeyId} could not be resolved to a valid private key`,
      diagnostic: {
        success: false,
        signerKeyId: signatureKeyId,
        signerRole: signerIdentity.role,
        signatureAlgorithm: signerIdentity.algorithm,
        evaluatedOperation: 'sign',
        canonicalPayloadSurface: 'registries',
        failureReason: 'MALFORMED_KEY_MATERIAL',
        message: `Signer identity ${signatureKeyId} could not be resolved to a valid private key`
      }
    };
  }

  const payload = canonicalizeRegistryLockfilePayload(lockfile.registries);

  try {
    const signature = crypto.sign(
      null,
      Buffer.from(payload, 'utf8'),
      signerIdentity.pem
    ).toString('hex');

    let existingSignatures = lockfile.signatures ? [...lockfile.signatures] : [];
    if (!lockfile.signatures && lockfile.signature && lockfile.signatureKeyId && lockfile.signatureAlgorithm) {
        existingSignatures.push({
            signatureKeyId: lockfile.signatureKeyId,
            signatureAlgorithm: lockfile.signatureAlgorithm as 'ed25519',
            signature: lockfile.signature
        });
    }

    // Prevent duplicate signatures from the same key
    existingSignatures = existingSignatures.filter(s => s.signatureKeyId !== signatureKeyId);

    existingSignatures.push({
        signatureKeyId,
        signatureAlgorithm: 'ed25519',
        signature
    });

    // Enforce canonical signature ordering
    existingSignatures.sort((a, b) => a.signatureKeyId.localeCompare(b.signatureKeyId));

    const signedLockfile: PolicyRegistryLockfile = {
      ...lockfile,
      signature: undefined,
      signatureKeyId: undefined,
      signatureAlgorithm: undefined,
      signatures: existingSignatures
    };
    
    // Clean up undefined legacy properties
    delete (signedLockfile as any).signature;
    delete (signedLockfile as any).signatureKeyId;
    delete (signedLockfile as any).signatureAlgorithm;

    return { 
      success: true, 
      lockfile: signedLockfile,
      diagnostic: {
        success: true,
        signerKeyId: signatureKeyId,
        signerRole: signerIdentity.role,
        signatureAlgorithm: signerIdentity.algorithm,
        evaluatedOperation: 'sign',
        canonicalPayloadSurface: 'registries',
        message: 'Signing successful'
      }
    };
  } catch (e: any) {
    return { 
      success: false, 
      error: `Signing failed: ${e.message}`,
      diagnostic: {
        success: false,
        signerKeyId: signatureKeyId,
        signerRole: signerIdentity.role,
        signatureAlgorithm: signerIdentity.algorithm,
        evaluatedOperation: 'sign',
        canonicalPayloadSurface: 'registries',
        failureReason: 'INVALID_SIGNATURE',
        message: `Signing failed: ${e.message}`
      }
    };
  }
}
