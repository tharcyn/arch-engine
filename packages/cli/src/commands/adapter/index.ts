import { AdapterAuthoringRuntime } from '../../../../adapter-sdk/src/index.js';
import { AdapterComplianceCertificationRuntime } from '../../../../adapter-sdk/src/certification/index.js';
import { ProviderIntegrationTemplates } from '../../../../adapter-sdk/src/templates/index.js';

export async function adapterInitCommand(options: any) {
    const result = { status: AdapterAuthoringRuntime.initAdapter() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function adapterValidateCommand(options: any) {
    const result = { status: AdapterAuthoringRuntime.validateAdapter() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function adapterCertifyCommand(options: any) {
    const result = { status: AdapterComplianceCertificationRuntime.certifyAdapter() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function adapterTemplatesCommand(options: any) {
    const result = { status: ProviderIntegrationTemplates.listTemplates() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
