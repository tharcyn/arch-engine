import type {
  TopologyCapabilityManifest,
  PolicyPackCompatibilitySurface,
} from './external-topology-types';

export interface ValidatorTopologyIdentitySurface {
  readonly dataset_id: string;
  readonly dataset_semver: string;
  readonly dataset_producer_version: string;
  readonly producer?: string;
  readonly dataset?: string;
}

export interface ValidatorTopologyCapabilitySurface {
  readonly manifest: Readonly<TopologyCapabilityManifest>;
  readonly policyPackCompatibility: Readonly<PolicyPackCompatibilitySurface>;
  readonly supportedPolicyPacks: Readonly<Record<string, string>>;
  readonly requiredCapabilities: ReadonlyArray<string>;
}

export interface ValidatorTopologyView {
  readonly projectionSurfaceVersion: '1.0.0';
  readonly projectionSurfaceHash: string;
  readonly identity: ValidatorTopologyIdentitySurface;
  readonly schemaVersion: string;
  readonly capabilities: ValidatorTopologyCapabilitySurface;
  readonly datasetPath: string;
  readonly datasetSemver: string;
}
