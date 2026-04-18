import { ArchitectureDatasetExchangeRuntime } from '../../../../dataset-exchange/src/index.js';
import { FederatedTopologyLearningRuntime, PrivacySafeBenchmarkAggregator } from '../../../../dataset-exchange/src/federated-learning/index.js';

export async function datasetExchangePublishCommand(options: any) {
    const result = { status: ArchitectureDatasetExchangeRuntime.publishDataset() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function datasetExchangeSubscribeCommand(options: any) {
    const result = { status: ArchitectureDatasetExchangeRuntime.subscribeDataset() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function datasetLearningAggregateCommand(options: any) {
    const result = { status: FederatedTopologyLearningRuntime.aggregateLearning() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function datasetBenchmarkAggregateCommand(options: any) {
    const result = { status: PrivacySafeBenchmarkAggregator.aggregateBenchmark() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
