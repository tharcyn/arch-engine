import type { TrustPolicyConfig } from './TrustPolicyConfig';

export function validateTrustPolicyConfig(obj: any): obj is TrustPolicyConfig {
    if (typeof obj !== 'object' || obj === null) return false;
    
    if ('requireSignatures' in obj && obj.requireSignatures !== undefined) {
        if (typeof obj.requireSignatures !== 'boolean') return false;
    }

    if ('enforcementMode' in obj && obj.enforcementMode !== undefined) {
        if (!['permissive', 'require-signature', 'require-signature-and-freshness'].includes(obj.enforcementMode)) return false;
    }

    if ('quorum' in obj && obj.quorum !== undefined) {
        if (obj.quorum !== 'all' && typeof obj.quorum !== 'number') return false;
        if (typeof obj.quorum === 'number' && obj.quorum < 1) return false;
    }

    if ('allowRemoteExecution' in obj && obj.allowRemoteExecution !== undefined) {
        if (typeof obj.allowRemoteExecution !== 'boolean') return false;
    }

    if ('allowedNamespaces' in obj && obj.allowedNamespaces !== undefined) {
        if (!Array.isArray(obj.allowedNamespaces)) return false;
        if (!obj.allowedNamespaces.every((ns: any) => typeof ns === 'string')) return false;
    }

    if ('trustedRegistries' in obj && obj.trustedRegistries !== undefined) {
        if (!Array.isArray(obj.trustedRegistries)) return false;
        if (!obj.trustedRegistries.every((reg: any) => typeof reg === 'string')) return false;
    }

    return true;
}
