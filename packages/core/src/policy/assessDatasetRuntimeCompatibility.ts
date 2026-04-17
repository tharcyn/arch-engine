import type { ExternalTopologyDataset, TopologyCapabilityManifest } from '../topology/external-topology-types.js';
import { supportsVersionRequirement } from '../topology/external-topology-types.js';

export interface EngineRuntimeMetadata {
    readonly supportedSchemaVersions: string[];
    readonly supportedFormatIdentifiers: string[];
    readonly installedPolicyPacks: Record<string, string>;
    readonly engineCapabilityRegistry: Record<string, boolean>;
}

export interface DatasetCompatibilityFinding {
    readonly surface: string;
    readonly code: string;
    readonly status: 'compatible' | 'incompatible' | 'partial' | 'skipped';
    readonly message: string;
    readonly expected?: unknown;
    readonly received?: unknown;
}

export interface DatasetRuntimeCompatibilityDiagnostic {
    readonly overallStatus: 'compatible' | 'partially-compatible' | 'incompatible' | 'unknown';
    readonly schemaCompatible: boolean | undefined;
    readonly formatCompatible: boolean | undefined;
    readonly policyPackCompatible: boolean | undefined;
    readonly capabilityCompatible: boolean | undefined;
    readonly findings: readonly DatasetCompatibilityFinding[];
    readonly summaryMessage: string;
}

export const DEFAULT_ENGINE_RUNTIME_METADATA: EngineRuntimeMetadata = {
    supportedSchemaVersions: ['1.0.0'],
    supportedFormatIdentifiers: ['arch_engine_topology_export_v1'],
    installedPolicyPacks: {
        authority_pack: '1.0.0',
        rest_contract_pack: '1.0.0',
        journey_pack: '1.0.0'
    },
    engineCapabilityRegistry: {
        supports_authority_scope: true,
        supports_directionality: true,
        supports_edge_confidence: true
    }
};

export function assessDatasetRuntimeCompatibility(
    dataset: ExternalTopologyDataset,
    engineMeta: EngineRuntimeMetadata = DEFAULT_ENGINE_RUNTIME_METADATA
): DatasetRuntimeCompatibilityDiagnostic {
    const findings: DatasetCompatibilityFinding[] = [];
    let schemaCompatible: boolean | undefined = undefined;
    let formatCompatible: boolean | undefined = undefined;
    let policyPackCompatible: boolean | undefined = undefined;
    let capabilityCompatible: boolean | undefined = undefined;

    // ── 1. Schema compatibility ──────────────────────────
    const schemaVersion = typeof dataset.topology_schema_version === 'string'
        ? dataset.topology_schema_version
        : (dataset.topology_schema_version && typeof dataset.topology_schema_version === 'object'
            ? (dataset.topology_schema_version as any).version
            : undefined);

    if (typeof schemaVersion === 'string') {
        if (engineMeta.supportedSchemaVersions.includes(schemaVersion)) {
            schemaCompatible = true;
            findings.push({
                surface: 'topology_schema_version',
                code: 'DATASET_SCHEMA_COMPATIBLE',
                status: 'compatible',
                message: `Schema version ${schemaVersion} is supported`,
                received: schemaVersion
            });
        } else {
            schemaCompatible = false;
            findings.push({
                surface: 'topology_schema_version',
                code: 'DATASET_SCHEMA_INCOMPATIBLE',
                status: 'incompatible',
                message: `Schema version ${schemaVersion} is not supported by this engine`,
                expected: engineMeta.supportedSchemaVersions,
                received: schemaVersion
            });
        }
    } else {
        schemaCompatible = false;
        findings.push({
            surface: 'topology_schema_version',
            code: 'DATASET_SCHEMA_INCOMPATIBLE',
            status: 'incompatible',
            message: 'Dataset does not declare a valid topology_schema_version',
            expected: engineMeta.supportedSchemaVersions,
            received: dataset.topology_schema_version
        });
    }

    // ── 2. Format compatibility ──────────────────────────
    const formatId = dataset.dataset_format_identifier;
    if (typeof formatId === 'string' && engineMeta.supportedFormatIdentifiers.includes(formatId)) {
        formatCompatible = true;
        findings.push({
            surface: 'dataset_format_identifier',
            code: 'DATASET_FORMAT_SUPPORTED',
            status: 'compatible',
            message: `Dataset format ${formatId} is supported`,
            received: formatId
        });
    } else {
        formatCompatible = false;
        findings.push({
            surface: 'dataset_format_identifier',
            code: 'DATASET_FORMAT_UNSUPPORTED',
            status: 'incompatible',
            message: `Dataset format ${String(formatId)} is not supported by this engine`,
            expected: engineMeta.supportedFormatIdentifiers,
            received: formatId
        });
    }

    // ── 3. Policy-pack compatibility ─────────────────────
    const policyPackCompat = dataset.policy_pack_compatibility;
    if (policyPackCompat && typeof policyPackCompat === 'object') {
        policyPackCompatible = true;
        for (const [packName, requiredRange] of Object.entries(policyPackCompat)) {
            const installedVersion = engineMeta.installedPolicyPacks[packName];
            if (!installedVersion) {
                policyPackCompatible = false;
                findings.push({
                    surface: 'policy_pack_compatibility',
                    code: 'POLICY_PACK_INCOMPATIBLE',
                    status: 'incompatible',
                    message: `Required policy pack '${packName}' is not installed`,
                    expected: requiredRange,
                    received: undefined
                });
            } else if (!supportsVersionRequirement(installedVersion, requiredRange)) {
                policyPackCompatible = false;
                findings.push({
                    surface: 'policy_pack_compatibility',
                    code: 'POLICY_PACK_INCOMPATIBLE',
                    status: 'incompatible',
                    message: `Policy pack '${packName}' version ${installedVersion} does not satisfy required range ${requiredRange}`,
                    expected: requiredRange,
                    received: installedVersion
                });
            } else {
                findings.push({
                    surface: 'policy_pack_compatibility',
                    code: 'POLICY_PACK_COMPATIBLE',
                    status: 'compatible',
                    message: `Policy pack '${packName}' is compatible`,
                    expected: requiredRange,
                    received: installedVersion
                });
            }
        }
    } else {
        policyPackCompatible = true;
        findings.push({
            surface: 'policy_pack_compatibility',
            code: 'POLICY_PACK_COMPATIBLE',
            status: 'skipped',
            message: 'No policy pack compatibility constraints declared'
        });
    }

    // ── 4. Capability negotiation ────────────────────────
    const capManifest = dataset.topology_capability_manifest;
    if (capManifest && typeof capManifest === 'object') {
        capabilityCompatible = true;
        for (const [capName, required] of Object.entries(capManifest as TopologyCapabilityManifest)) {
            if (required === true && engineMeta.engineCapabilityRegistry[capName] !== true) {
                capabilityCompatible = false;
                findings.push({
                    surface: 'topology_capability_manifest',
                    code: 'ENGINE_CAPABILITY_MISSING',
                    status: 'incompatible',
                    message: `Dataset requires capability '${capName}' which is not supported by this engine`,
                    expected: true,
                    received: engineMeta.engineCapabilityRegistry[capName]
                });
            } else if (required === true) {
                findings.push({
                    surface: 'topology_capability_manifest',
                    code: 'ENGINE_CAPABILITY_PRESENT',
                    status: 'compatible',
                    message: `Engine supports required capability '${capName}'`,
                    expected: true,
                    received: true
                });
            }
        }
    } else {
        capabilityCompatible = true;
        findings.push({
            surface: 'topology_capability_manifest',
            code: 'ENGINE_CAPABILITY_PRESENT',
            status: 'skipped',
            message: 'No capability manifest declared'
        });
    }

    // ── 5. Compute overall status ────────────────────────
    let overallStatus: DatasetRuntimeCompatibilityDiagnostic['overallStatus'];
    if (schemaCompatible === false || formatCompatible === false || policyPackCompatible === false) {
        overallStatus = 'incompatible';
    } else if (capabilityCompatible === false) {
        overallStatus = 'partially-compatible';
    } else if (schemaCompatible === undefined || formatCompatible === undefined || policyPackCompatible === undefined || capabilityCompatible === undefined) {
        overallStatus = 'unknown';
    } else {
        overallStatus = 'compatible';
    }

    const summaryParts: string[] = [];
    summaryParts.push(`Dataset runtime compatibility: ${overallStatus}`);
    if (schemaCompatible === false) summaryParts.push('Schema incompatible');
    if (formatCompatible === false) summaryParts.push('Format unsupported');
    if (policyPackCompatible === false) summaryParts.push('Policy pack requirements unmet');
    if (capabilityCompatible === false) summaryParts.push('Engine capabilities insufficient');

    return {
        overallStatus,
        schemaCompatible,
        formatCompatible,
        policyPackCompatible,
        capabilityCompatible,
        findings,
        summaryMessage: summaryParts.join('. ')
    };
}
