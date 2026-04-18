import { ArchitectureGovernanceLanguageRuntime, AGLCompatibilityTranslator } from '../../../../agl/src/index.js';

export async function aglParseCommand(options: any) {
    const result = { status: ArchitectureGovernanceLanguageRuntime.parseAGL() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function aglValidateCommand(options: any) {
    const result = { status: ArchitectureGovernanceLanguageRuntime.validateAGL() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function aglTranslateCommand(options: any) {
    const result = { status: AGLCompatibilityTranslator.translateAGL() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
