import { GovernanceProductizationRuntime } from '../../../../productization/src/index.js';
import { LicensingRuntime, EntitlementVerificationRuntime } from '../../../../productization/src/licensing/index.js';
import { TierDefinitionRuntime } from '../../../../productization/src/tiers/index.js';
import { UsageMeteringRuntime } from '../../../../productization/src/metering/index.js';
import { QuotaEnforcementRuntime } from '../../../../productization/src/quota/index.js';
import { PremiumCapabilityGateRuntime } from '../../../../productization/src/gating/index.js';
import { DeploymentPackagingRuntime } from '../../../../productization/src/packaging/index.js';

export async function productTiersCommand(options: any) {
    const result = { status: GovernanceProductizationRuntime.inspectTiers() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function productInspectCommand(options: any) {
    const result = { status: GovernanceProductizationRuntime.inspectProduct() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function licenseInspectCommand(options: any) {
    const result = { status: LicensingRuntime.inspectLicense() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function entitlementVerifyCommand(options: any) {
    const result = { status: EntitlementVerificationRuntime.verifyEntitlement() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function productCompareTiersCommand(options: any) {
    const result = { status: TierDefinitionRuntime.compareTiers() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function usageInspectCommand(options: any) {
    const result = { status: UsageMeteringRuntime.inspectUsage() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function usageSummaryCommand(options: any) {
    const result = { status: UsageMeteringRuntime.summaryUsage() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function quotaInspectCommand(options: any) {
    const result = { status: QuotaEnforcementRuntime.inspectQuota() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function quotaValidateCommand(options: any) {
    const result = { status: QuotaEnforcementRuntime.validateQuota() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function featureAccessCommand(options: any) {
    const result = { status: PremiumCapabilityGateRuntime.checkAccess() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function productDeploymentModesCommand(options: any) {
    const result = { status: DeploymentPackagingRuntime.listDeploymentModes() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
