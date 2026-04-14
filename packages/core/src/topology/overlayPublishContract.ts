import { validateNamespaceOwnership } from './overlayNamespaceOwnership.js';
import { OverlayCompatibilityRecord } from './overlayCompatibilityMatrix.js';

import { resolveActiveTrustRoot } from './registryTrustLifecycle.js';

export interface OverlayPublishRequest {
  overlaySourceId: string;
  overlayVersion: string;
  namespace: string;
  originRegistryId: string;
  targetRegistryId: string;
  manifestContentHash?: string;
  signatureDigest?: string;
  signatureTrustRootId?: string; // Newly added
  compatibilityRecord?: OverlayCompatibilityRecord;
}

export interface PublishValidationDecision {
  allowed: boolean;
  reason?: string;
}

export function validateOverlayPublishContract(request: OverlayPublishRequest, computedCanonicalManifestHash?: string): PublishValidationDecision {
  if (!request.manifestContentHash) {
    return { allowed: false, reason: 'Reject publish: manifestContentHash missing' };
  }

  // Ensure computed matches provided. The environment would pass the computed deterministic hash here.
  if (computedCanonicalManifestHash && computedCanonicalManifestHash !== request.manifestContentHash) {
    return { allowed: false, reason: 'Reject publish: manifestContentHash mismatches canonical payload hash' };
  }

  if (!request.signatureDigest) {
    return { allowed: false, reason: 'Reject publish: signatureDigest missing' };
  }

  if (!request.signatureTrustRootId) {
    return { allowed: false, reason: 'Reject publish: signatureTrustRootId missing' };
  }

  const root = resolveActiveTrustRoot(request.signatureTrustRootId);
  if (!root) {
    return { allowed: false, reason: 'Reject publish: registryTrustRootId is not resolvable' };
  }

  // compatibilityMatrix was renamed to compatibilityRecord

  if (!request.compatibilityRecord) {
    return { allowed: false, reason: 'Reject publish: compatibility matrix missing' };
  }

  // Namespace ownership compliance
  const nsCheck = validateNamespaceOwnership(request.namespace, request.originRegistryId, request.targetRegistryId);
  if (!nsCheck.valid) {
    return { allowed: false, reason: `Namespace violation: ${nsCheck.reason}` };
  }

  return { allowed: true };
}
