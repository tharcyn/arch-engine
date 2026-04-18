import { ProtocolPortalBootstrapRuntime } from '../../../../spec-portal/src/export/index.js';

export async function protocolExportAgpSiteCommand(options: any) {
    const result = { status: ProtocolPortalBootstrapRuntime.exportAgpSite() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
