import type {
  CapabilityManifestCompatibilityVerified,
  DatasetIngestionDiagnostic,
  SchemaCompatibilityVerified,
} from './external-topology-types';
import {
  supportsVersionRequirement,
  TopologyDatasetIngestionError,
} from './external-topology-types';

const REQUIRED_TOPOLOGY_CAPABILITIES = [
  'supports_authority_scope',
  'supports_directionality',
  'supports_edge_confidence',
] as const;

const SUPPORTED_POLICY_PACKS: Record<string, string> = {
  authority_pack: '1.0.0',
  rest_contract_pack: '1.0.0',
  journey_pack: '1.0.0',
};

export function verifyCapabilityManifestCompatibility(
  input: SchemaCompatibilityVerified,
  requiredCapabilities: string[] = [...REQUIRED_TOPOLOGY_CAPABILITIES],
  supportedPolicyPacks: Record<string, string> = SUPPORTED_POLICY_PACKS,
): CapabilityManifestCompatibilityVerified {
  const diagnostics: DatasetIngestionDiagnostic[] = [...input.diagnostics];
  const capabilityManifest = input.dataset.topology_capability_manifest;
  const policyPackCompatibility = input.dataset.policy_pack_compatibility;

  if (
    !capabilityManifest ||
    typeof capabilityManifest !== 'object' ||
    Array.isArray(capabilityManifest)
  ) {
    diagnostics.push({
      gate: 'CapabilityManifestGate',
      code: 'MISSING_CAPABILITY_MANIFEST',
      status: 'failure',
      reason: 'topology_capability_manifest is required for ingestion compatibility checks.',
      field: 'topology_capability_manifest',
      expected: 'object',
      received: capabilityManifest,
    });

    throw new TopologyDatasetIngestionError(
      'topology_capability_manifest is required.',
      diagnostics,
    );
  }

  for (const capability of requiredCapabilities) {
    if (capabilityManifest[capability] !== true) {
      diagnostics.push({
        gate: 'CapabilityManifestGate',
        code: 'MISSING_REQUIRED_CAPABILITY',
        status: 'failure',
        reason: `Required capability not declared as supported: ${capability}`,
        field: `topology_capability_manifest.${capability}`,
        expected: 'true',
        received: String(capabilityManifest[capability]),
      });

      throw new TopologyDatasetIngestionError(
        `Required capability not declared as supported: ${capability}`,
        diagnostics,
      );
    }

    diagnostics.push({
      gate: 'CapabilityManifestGate',
      code: 'REQUIRED_CAPABILITY_PRESENT',
      status: 'success',
      reason: `Required capability declared: ${capability}`,
      field: `topology_capability_manifest.${capability}`,
      received: true,
    });
  }

  for (const [policyPackName, supportedVersion] of Object.entries(
    supportedPolicyPacks,
  )) {
    const requiredRange = policyPackCompatibility?.[policyPackName];

    if (typeof requiredRange !== 'string') {
      diagnostics.push({
        gate: 'CapabilityManifestGate',
        code: 'MISSING_POLICY_PACK_COMPATIBILITY',
        status: 'failure',
        reason: `Missing policy pack compatibility declaration: ${policyPackName}`,
        field: `policy_pack_compatibility.${policyPackName}`,
        expected: 'version range string',
        received: requiredRange,
      });

      throw new TopologyDatasetIngestionError(
        `Missing policy pack compatibility declaration: ${policyPackName}`,
        diagnostics,
      );
    }

    if (!supportsVersionRequirement(supportedVersion, requiredRange)) {
      diagnostics.push({
        gate: 'CapabilityManifestGate',
        code: 'UNSUPPORTED_POLICY_PACK_RANGE',
        status: 'failure',
        reason: `Unsupported policy pack compatibility requirement for ${policyPackName}: ${requiredRange}`,
        field: `policy_pack_compatibility.${policyPackName}`,
        expected: `compatible with engine-supported version ${supportedVersion}`,
        received: requiredRange,
      });

      throw new TopologyDatasetIngestionError(
        `Unsupported policy pack compatibility requirement for ${policyPackName}: ${requiredRange}`,
        diagnostics,
      );
    }

    diagnostics.push({
      gate: 'CapabilityManifestGate',
      code: 'POLICY_PACK_COMPATIBLE',
      status: 'success',
      reason: `Policy pack compatibility verified for ${policyPackName}`,
      field: `policy_pack_compatibility.${policyPackName}`,
      expected: `compatible with ${supportedVersion}`,
      received: requiredRange,
    });
  }

  return {
    ...input,
    diagnostics,
    requiredCapabilities,
    supportedPolicyPacks,
  };
}
