import { HydratedPolicyManifest } from './types.js';
import { MANIFEST_HYDRATION_CONTRACT_VERSION, hydrateManifest } from '../policy/contracts/manifestHydrationContract.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';
import { validateManifestCapabilities, LoaderRuntimeCapabilities } from './validateManifestCapabilities.js';

export function hydratePolicyManifest(
  namespace: string,
  policyId: string,
  manifestObject: any,
  engineVersion: string
): HydratedPolicyManifest {
  try {
    const hydrated = hydrateManifest(manifestObject);
    const result: HydratedPolicyManifest = {
      dependencies: hydrated.dependencies,
      extends: hydrated.extends,
      namespaces: hydrated.namespaces,
      issuerData: hydrated.issuerData,
      manifestMetadata: manifestObject?.manifestMetadata || {}
    };

    // Phase 4.5 Guardrail: Ensure capability compat (negotiation mode aware)
    const defaultRuntime: LoaderRuntimeCapabilities = {
      engineVersion, // Explicit requirement instead of legacy testing hack
      supportedLayers: ['governance', 'security', 'routing'],
      supportedDomains: ['inventory', 'network', 'identity'],
      providedCapabilities: ['auth-v1', 'metrics-v1']
    };
    validateManifestCapabilities(result, namespace, policyId, defaultRuntime, result);

    return result;
  } catch (error: any) {
    if (error instanceof PolicyRuntimeError) {
      throw error;
    }
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.MANIFEST_HYDRATION_FAILED,
      message: `Manifest Hydration Failed: ${error.message}`,
      policyId,
      policyNamespace: namespace,
      contractVersion: MANIFEST_HYDRATION_CONTRACT_VERSION
    });
  }
}
