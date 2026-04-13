import { FreezeDriftTaxonomy } from '../freeze-drift-taxonomy.js';

export const FederationTaxonomyMap = {
    policy_uri_resolution: FreezeDriftTaxonomy.TOPOLOGY,
    registry_adapter_selection: FreezeDriftTaxonomy.TOPOLOGY,
    semver_selection: FreezeDriftTaxonomy.TOPOLOGY,
    manifest_hydration: FreezeDriftTaxonomy.TOPOLOGY,
    dependency_closure: FreezeDriftTaxonomy.TOPOLOGY,
    lockfile_override_precedence: FreezeDriftTaxonomy.TOPOLOGY,
    mirror_substitution: FreezeDriftTaxonomy.TOPOLOGY,
    trust_boundary: FreezeDriftTaxonomy.TOPOLOGY,
    snapshot_envelope_compatibility: FreezeDriftTaxonomy.TOPOLOGY,
    policy_loader_pipeline_contract: FreezeDriftTaxonomy.TOPOLOGY,
    registry_adapter_map: FreezeDriftTaxonomy.TOPOLOGY,
    policy_identity_hash: FreezeDriftTaxonomy.HASH
} as const;

Object.freeze(FederationTaxonomyMap);

export type FederationFreezeTarget = keyof typeof FederationTaxonomyMap;
