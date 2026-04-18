import { GovernanceStandardsSpecificationRuntime } from '../../../../standards/src/index.js';
import { CapabilitySemanticsRegistry } from '../../../../standards/src/capabilities/index.js';
import { DatasetGovernanceProfileRegistry } from '../../../../standards/src/datasets/index.js';
import { MigrationCompatibilityTierRegistry } from '../../../../standards/src/migration/index.js';
import { ComplianceMappingProfileRuntime } from '../../../../standards/src/compliance/index.js';
import { ArchitectureMaturityClassificationRuntime } from '../../../../standards/src/maturity/index.js';

export async function standardsListCommand(options: any) {
    const result = { status: GovernanceStandardsSpecificationRuntime.listStandards() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function standardsInspectCommand(options: any) {
    const result = { status: GovernanceStandardsSpecificationRuntime.inspectStandard() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function standardsCapabilitiesCommand(options: any) {
    const result = { status: CapabilitySemanticsRegistry.listCapabilities() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function standardsDatasetsCommand(options: any) {
    const result = { status: DatasetGovernanceProfileRegistry.listDatasets() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function standardsMigrationTiersCommand(options: any) {
    const result = { status: MigrationCompatibilityTierRegistry.listMigrationTiers() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function standardsComplianceProfilesCommand(options: any) {
    const result = { status: ComplianceMappingProfileRuntime.listComplianceProfiles() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function standardsMaturityTiersCommand(options: any) {
    const result = { status: ArchitectureMaturityClassificationRuntime.listMaturityTiers() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
