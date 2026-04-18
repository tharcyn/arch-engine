import { GovernanceExchangeRuntime } from '../../../../exchange/src/index.js';
import { PolicySubscriptionRuntime } from '../../../../exchange/src/subscriptions/index.js';
import { BundleExchangePropagationRuntime } from '../../../../exchange/src/propagation/index.js';
import { GovernanceTelemetryExchangeRuntime } from '../../../../exchange/src/telemetry/index.js';

export async function exchangePeerAddCommand(options: any) {
    const result = { status: 'peer-added' };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function exchangePeerListCommand(options: any) {
    const result = GovernanceExchangeRuntime.resolvePeers();
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function exchangeSubscribeCommand(options: any) {
    const result = { status: PolicySubscriptionRuntime.subscribe() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function exchangeSyncCommand(options: any) {
    const result = GovernanceExchangeRuntime.syncSession();
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function exchangeSubscribePublisherCommand(options: any) {
    const result = { status: PolicySubscriptionRuntime.subscribeToPublisher() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function exchangeSubscribeRegistryCommand(options: any) {
    const result = { status: PolicySubscriptionRuntime.subscribeToRegistry() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function exchangeSubscribeBundleChannelCommand(options: any) {
    const result = { status: PolicySubscriptionRuntime.subscribeToBundleChannel() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function exchangePropagateBundlesCommand(options: any) {
    const result = { status: BundleExchangePropagationRuntime.propagateBundles() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function exchangeTelemetrySyncCommand(options: any) {
    const result = { status: GovernanceTelemetryExchangeRuntime.syncTelemetry() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
