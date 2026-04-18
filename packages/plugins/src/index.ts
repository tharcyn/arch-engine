export interface PluginAdapter {
    readonly pluginId: string;
    readonly capabilities: PluginCapabilityDescriptor[];
}

export interface PluginCapabilityDescriptor {
    readonly type: string;
}

export interface PluginExecutionContext {
    readonly contextId: string;
}

export class PluginRegistrationSurface {
    static registerPlugin(pluginId: string): PluginAdapter {
        return { pluginId, capabilities: [{ type: 'enforcement' }] };
    }

    static listPlugins(): PluginAdapter[] {
        return [{ pluginId: 'kubernetes-admission', capabilities: [{ type: 'enforcement' }] }];
    }

    static inspectPlugin(pluginId: string): PluginAdapter {
        return { pluginId, capabilities: [{ type: 'enforcement' }] };
    }
}
