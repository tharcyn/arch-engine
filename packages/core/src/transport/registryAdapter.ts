import { RegistryResolutionResult } from './types.js';
import { REGISTRY_RESOLUTION_CONTRACT_VERSION, RegistryResolutionCandidate, resolveRegistryCandidate } from '../policy/contracts/registryResolutionContract.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../errors/policyErrors.js';
import { enforceNamespaceTrust, enforceMirrorEquivalence, NamespaceTrustPolicy } from './namespaceTrustPolicy.js';
import { resolveScopedTrust, ScopedNamespaceTrustPolicy } from './namespaceTrustScopePolicy.js';
import * as crypto from 'node:crypto';

export abstract class RegistryAdapter {
  abstract lookup(
    namespace: string,
    policyId: string,
    lockfileEntries?: { namespace: string; id: string; lockedVersion: string }[],
    scopedTrustPolicy?: ScopedNamespaceTrustPolicy
  ): RegistryResolutionResult;
}
