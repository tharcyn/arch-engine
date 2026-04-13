import { RegistryResolutionResult } from '../../core/src/transport/types.js';
import { REGISTRY_RESOLUTION_CONTRACT_VERSION, RegistryResolutionCandidate, resolveRegistryCandidate } from '../../core/src/policy/contracts/registryResolutionContract.js';
import { PolicyRuntimeError, PolicyRuntimeErrorCode } from '../../core/src/errors/policyErrors.js';
import { enforceMirrorEquivalence } from '../../core/src/transport/namespaceTrustPolicy.js';
import { resolveScopedTrust, ScopedNamespaceTrustPolicy } from '../../core/src/transport/namespaceTrustScopePolicy.js';
import * as crypto from 'node:crypto';
import { RegistryAdapter } from '../../core/src/transport/registryAdapter.js';

export class MockRegistryAdapter extends RegistryAdapter {
  
  private mockStore: Record<string, any> = {};

  public seed(namespace: string, id: string, version: string, manifest: any) {
    const key = `${namespace}/${id}`;
    if (!this.mockStore[key]) {
      this.mockStore[key] = {
        namespace,
        policyId: id,
        versions: {},
        manifests: {}
      };
    }
    this.mockStore[key].versions[version] = true;
    this.mockStore[key].manifests[version] = manifest;
  }

  public lookup(
    namespace: string,
    policyId: string,
    lockfileEntries?: { namespace: string; id: string; lockedVersion: string }[],
    scopedTrustPolicy?: ScopedNamespaceTrustPolicy
  ): RegistryResolutionResult {

    const candidates: RegistryResolutionCandidate[] = [
      { uri: 'default', source: 'default_registry', resolvedNamespace: namespace },
      { uri: 'mirror', source: 'mirror_registry', resolvedNamespace: namespace }
    ];

    if (lockfileEntries?.some(l => l.namespace === namespace && l.id === policyId)) {
      candidates.push({ uri: 'lockfile', source: 'lockfile', resolvedNamespace: namespace });
    }

    const resolved = resolveRegistryCandidate(candidates);

    if (!resolved) {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.REGISTRY_LOOKUP_FAILED,
        message: 'No registry candidates resolved',
        policyId,
        policyNamespace: namespace,
        registrySource: 'none',
        contractVersion: REGISTRY_RESOLUTION_CONTRACT_VERSION
      });
    }

    if (scopedTrustPolicy) {
      resolveScopedTrust(resolved.resolvedNamespace, scopedTrustPolicy);
    }

    const key = `${resolved.resolvedNamespace}/${policyId}`;
    const storeEntry = this.mockStore[key];
    if (!storeEntry) {
      throw new PolicyRuntimeError({
        code: PolicyRuntimeErrorCode.REGISTRY_LOOKUP_FAILED,
        message: `Policy not found in registry: ${key}`,
        policyId,
        policyNamespace: resolved.resolvedNamespace,
        registrySource: resolved.source,
        contractVersion: REGISTRY_RESOLUTION_CONTRACT_VERSION
      });
    }

    if (resolved.source === 'default_registry') {
      const mirrorCandidate = candidates.find(c => c.source === 'mirror_registry');
      if (mirrorCandidate && scopedTrustPolicy) {
        const defaultKey = `${resolved.resolvedNamespace}/${policyId}`;
        const mirrorKey = `${mirrorCandidate.resolvedNamespace}/${policyId}`;
        const defaultEntry = this.mockStore[defaultKey];
        const mirrorEntry = this.mockStore[mirrorKey];
        if (defaultEntry && mirrorEntry) {
          const defaultVersions = Object.keys(defaultEntry.manifests);
          for (const v of defaultVersions) {
            if (mirrorEntry.manifests[v]) {
              const defaultHash = crypto.createHash('sha256')
                .update(JSON.stringify(defaultEntry.manifests[v])).digest('hex');
              const mirrorHash = crypto.createHash('sha256')
                .update(JSON.stringify(mirrorEntry.manifests[v])).digest('hex');
              enforceMirrorEquivalence(
                resolved.resolvedNamespace, mirrorCandidate.resolvedNamespace,
                defaultHash, mirrorHash,
                { trustedNamespaces: scopedTrustPolicy.scopes?.global?.trustedNamespaces || [],
                  mirrorEquivalenceMap: { [resolved.resolvedNamespace]: mirrorCandidate.resolvedNamespace } }
              );
            }
          }
        }
      }
    }

    return {
      namespace: resolved.resolvedNamespace,
      policyId,
      availableVersions: Object.keys(storeEntry.versions),
      registrySource: resolved.source,
      manifests: storeEntry.manifests
    };
  }
}
