import type { PolicyRegistryLockfile, PolicyRegistryLockfileSignatureEntry } from './PolicyRegistryLockfile';
import type { LockfileTrustStore } from './LockfileTrustStore';

export interface LockfileMigrationAdvisory {
  readonly isPreferredSignatureSet: boolean;
  readonly legacyIdentitiesInUse: string[];
  readonly availableReplacements: string[];
  readonly migrationRecommended: boolean;
  readonly recommendationStrength: 'none' | 'optional' | 'strongly-recommended';
  readonly rationale: string;
  readonly suggestedCommand?: string;
}

export function deriveLockfileMigrationSuggestedAction(advisory: Omit<LockfileMigrationAdvisory, 'suggestedCommand'>): string | undefined {
  if (advisory.recommendationStrength === 'none') {
    return undefined;
  }
  if (advisory.availableReplacements.length > 0) {
    return `arch-engine policies refresh-lockfile --sign ${advisory.availableReplacements[0]}`;
  }
  return undefined;
}

export function adviseLockfileMigration(
  lockfile: PolicyRegistryLockfile | undefined,
  trustStore: LockfileTrustStore
): LockfileMigrationAdvisory {
    if (!lockfile) {
        return {
            isPreferredSignatureSet: true,
            legacyIdentitiesInUse: [],
            availableReplacements: [],
            migrationRecommended: false,
            recommendationStrength: 'none',
            rationale: 'No lockfile present to evaluate for migration'
        };
    }

    let signatures: PolicyRegistryLockfileSignatureEntry[] = lockfile.signatures ? [...lockfile.signatures] : [];
    if (signatures.length === 0 && lockfile.signature && lockfile.signatureKeyId && lockfile.signatureAlgorithm) {
        signatures = [{
            signatureKeyId: lockfile.signatureKeyId,
            signatureAlgorithm: lockfile.signatureAlgorithm as 'ed25519',
            signature: lockfile.signature
        }];
    }

    if (signatures.length === 0) {
        return {
            isPreferredSignatureSet: true,
            legacyIdentitiesInUse: [],
            availableReplacements: [],
            migrationRecommended: false,
            recommendationStrength: 'none',
            rationale: 'No signatures present to evaluate for migration'
        };
    }

    const legacyIdentitiesInUse: string[] = [];
    const availableReplacements: string[] = [];

    for (const sig of signatures) {
        if (!sig.signatureKeyId) continue;
        
        const identity = trustStore.getPublicKey(sig.signatureKeyId);
        if (!identity) continue; // Unknown signers are verified out of band

        if (identity.status === 'verify-only' || identity.status === 'retired') {
            legacyIdentitiesInUse.push(sig.signatureKeyId);
            
            if (identity.replacementKeyId) {
                const replacement = trustStore.getPublicKey(identity.replacementKeyId);
                // We only consider the replacement if it is known and active
                if (replacement && (!replacement.status || replacement.status === 'active')) {
                    const replacementInLockfile = signatures.some(s => s.signatureKeyId === identity.replacementKeyId);
                    if (!replacementInLockfile && !availableReplacements.includes(identity.replacementKeyId)) {
                        availableReplacements.push(identity.replacementKeyId);
                    }
                }
            }
        }
    }

    const isPreferredSignatureSet = legacyIdentitiesInUse.length === 0;

    let recommendationStrength: 'none' | 'optional' | 'strongly-recommended' = 'none';
    let migrationRecommended = false;
    let rationale = 'Signature set is aligned with the preferred current signer topology';

    if (!isPreferredSignatureSet) {
        migrationRecommended = true;
        if (availableReplacements.length > 0) {
            recommendationStrength = 'strongly-recommended';
            rationale = `Legacy signers (${legacyIdentitiesInUse.join(', ')}) are in use, and active replacements (${availableReplacements.join(', ')}) are available but absent from the lockfile`;
        } else {
            recommendationStrength = 'optional';
            rationale = `Legacy signers (${legacyIdentitiesInUse.join(', ')}) are in use, but no active replacements are currently available`;
        }
    }

    const baseAdvisory = {
        isPreferredSignatureSet,
        legacyIdentitiesInUse,
        availableReplacements,
        migrationRecommended,
        recommendationStrength,
        rationale
    };

    return {
        ...baseAdvisory,
        suggestedCommand: deriveLockfileMigrationSuggestedAction(baseAdvisory)
    };
}
