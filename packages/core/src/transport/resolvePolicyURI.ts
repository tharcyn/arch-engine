import { PolicyURIResult } from './types.js';
import { URI_RESOLUTION_CONTRACT_VERSION, normalizeURI } from '../policy/contracts/uriResolutionContract.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';

export function resolvePolicyURI(uri: string): PolicyURIResult {
  try {
    const norm = normalizeURI(uri);
    return {
      namespace: norm.namespace,
      policyId: norm.id,
      versionRange: norm.range || norm.version,
      registrySource: undefined
    };
  } catch (error: any) {
    throw new PolicyRuntimeError({
      code: PolicyRuntimeErrorCode.URI_RESOLUTION_FAILED,
      message: `URI Resolution failed: ${error.message}`,
      contractVersion: URI_RESOLUTION_CONTRACT_VERSION
    });
  }
}
