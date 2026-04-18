import { SpecificationPortalRuntime } from '../../../../spec-portal/src/index.js';
import { SpecNavigationGraphRuntime } from '../../../../spec-portal/src/navigation/index.js';
import { WhitepaperBundleRuntime } from '../../../../spec-portal/src/whitepaper/index.js';

export async function specBuildPortalCommand(options: any) {
    const result = { status: SpecificationPortalRuntime.buildPortal() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function specExportHtmlCommand(options: any) {
    const result = { status: SpecificationPortalRuntime.exportHtml() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function specNavigationMapCommand(options: any) {
    const result = { status: SpecNavigationGraphRuntime.mapNavigation() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function specExportWhitepaperCommand(options: any) {
    const result = { status: WhitepaperBundleRuntime.exportWhitepaper() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
