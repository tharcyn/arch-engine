import { PluginRegistrationSurface } from '../../../../plugins/src/index.js';

export async function pluginRegisterCommand(options: any) {
    const result = PluginRegistrationSurface.registerPlugin('new-plugin');
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function pluginListCommand(options: any) {
    const result = PluginRegistrationSurface.listPlugins();
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function pluginInspectCommand(options: any) {
    const result = PluginRegistrationSurface.inspectPlugin('plugin-id');
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
