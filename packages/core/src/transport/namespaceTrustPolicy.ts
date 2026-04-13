import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';

export const NAMESPACE_TRUST_POLICY_VERSION = 'v1';

export interface NamespaceTrustPolicy {
  trustedNamespaces: string[];
  mirrorEquivalenceMap?: Record<string, string>;
  allowUntrustedNamespaces?: boolean;
}

export function enforceNamespaceTrust(
  namespace: string,
  trustPolicy: NamespaceTrustPolicy
): void {
  // Check if namespace is explicitly trusted
  const isTrusted = trustPolicy.trustedNamespaces.includes(namespace);
  
  if (!isTrusted && trustPolicy.allowUntrustedNamespaces === false) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.UNTRUSTED_NAMESPACE_REJECTION,
      message: `Namespace ${namespace} is not trusted`,
      stage: 'registrySelection',
      contractVersion: NAMESPACE_TRUST_POLICY_VERSION,
      policyNamespace: namespace,
      loaderStageMetadata: {
        contractVersion: NAMESPACE_TRUST_POLICY_VERSION,
        namespace,
        validationStage: 'enforceNamespaceTrust'
      }
    });
  }
}

export function enforceMirrorEquivalence(
  originalNamespace: string,
  mirrorNamespace: string,
  originalManifestHash: string,
  mirrorManifestHash: string,
  trustPolicy: NamespaceTrustPolicy
): void {
  // Only enforce if mapping exists
  if (trustPolicy.mirrorEquivalenceMap && trustPolicy.mirrorEquivalenceMap[originalNamespace] === mirrorNamespace) {
    if (originalManifestHash !== mirrorManifestHash) {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.MIRROR_NAMESPACE_DIVERGENCE,
        message: `Mirror divergence detected between ${originalNamespace} and ${mirrorNamespace}`,
        stage: 'registrySelection',
        contractVersion: NAMESPACE_TRUST_POLICY_VERSION,
        policyNamespace: originalNamespace,
        mirrorNamespace: mirrorNamespace,
        loaderStageMetadata: {
          contractVersion: NAMESPACE_TRUST_POLICY_VERSION,
          namespace: originalNamespace,
          validationStage: 'enforceMirrorEquivalence'
        }
      });
    }
  }
}
