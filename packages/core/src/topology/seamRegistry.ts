import { OverlaySeamContract } from './seamContracts.js';

export const OverlaySeamRegistry: Record<string, OverlaySeamContract> = Object.freeze({
  'overlay::transport::uriResolutionBoundary': Object.freeze({
    identity: 'overlay::transport::uriResolutionBoundary',
    layer: 'transport',
    target: 'resolvePolicyURI',
    allowedOperationType: 'substitute_uri_resolution',
    mergeMode: 'replace-if-authorized',
    precedenceMode: 'overlay_wins',
    determinismConstraints: Object.freeze(['must_return_serializable_uriLoc']),
    auditIdentity: 'freeze::overlay::transport::uriResolutionBoundary',
    defaultInactive: true
  }),

  'overlay::registry::precedenceBoundary': Object.freeze({
    identity: 'overlay::registry::precedenceBoundary',
    layer: 'registry',
    target: 'registryLookup',
    allowedOperationType: 'override_registry_source',
    mergeMode: 'replace-if-authorized',
    precedenceMode: 'overlay_wins',
    determinismConstraints: Object.freeze(['must_return_compatible_manifest_schema', 'must_retain_namespace']),
    auditIdentity: 'freeze::overlay::registry::precedenceBoundary',
    defaultInactive: true
  }),

  'overlay::registry::versionResolutionBoundary': Object.freeze({
    identity: 'overlay::registry::versionResolutionBoundary',
    layer: 'registry',
    target: 'selectPolicyVersion',
    allowedOperationType: 'override_version_selection',
    mergeMode: 'replace-if-authorized',
    precedenceMode: 'overlay_wins',
    determinismConstraints: Object.freeze(['must_return_valid_semver_string']),
    auditIdentity: 'freeze::overlay::registry::versionResolutionBoundary',
    defaultInactive: true
  }),

  'overlay::manifest::mergeBoundary': Object.freeze({
    identity: 'overlay::manifest::mergeBoundary',
    layer: 'manifest',
    target: 'hydratePolicyManifest',
    allowedOperationType: 'extend_manifest_keys',
    mergeMode: 'merge-by-key',
    precedenceMode: 'core_wins_on_conflict',
    determinismConstraints: Object.freeze(['cannot_delete_core_keys', 'must_maintain_capabilities']),
    auditIdentity: 'freeze::overlay::manifest::mergeBoundary',
    defaultInactive: true
  }),

  'overlay::dependency::closureBoundary': Object.freeze({
    identity: 'overlay::dependency::closureBoundary',
    layer: 'dependency',
    target: 'resolvePolicyDependencyGraph',
    allowedOperationType: 'append_transitive_dependencies',
    mergeMode: 'append',
    precedenceMode: 'core_retains_head',
    determinismConstraints: Object.freeze(['must_not_introduce_cycles', 'must_resolve_deterministically']),
    auditIdentity: 'freeze::overlay::dependency::closureBoundary',
    defaultInactive: true
  }),

  'overlay::transport::mirrorBoundary': Object.freeze({
    identity: 'overlay::transport::mirrorBoundary',
    layer: 'transport',
    target: 'fallbackRouting',
    allowedOperationType: 'substitute_mirror_source',
    mergeMode: 'replace-if-authorized',
    precedenceMode: 'overlay_wins',
    determinismConstraints: Object.freeze(['must_guarantee_crypto_hash_parity']),
    auditIdentity: 'freeze::overlay::transport::mirrorBoundary',
    defaultInactive: true
  })
});

// Deep freeze to satisfy immutability of registry statically.
Object.keys(OverlaySeamRegistry).forEach(k => Object.freeze(OverlaySeamRegistry[k]));
