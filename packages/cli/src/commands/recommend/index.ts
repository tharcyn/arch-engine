import { CapabilityGapRecommendationEngine, DatasetProducerRecommendationEngine, MigrationStrategyRecommendationEngine } from '../../../../recommendation-graph/src/index.js';

export async function recommendBaselineCommand(options: any) {
    const result = { status: CapabilityGapRecommendationEngine.recommendBaseline() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function recommendDatasetsCommand(options: any) {
    const result = { status: DatasetProducerRecommendationEngine.recommendDatasets() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function recommendMigrationCommand(options: any) {
    const result = { status: MigrationStrategyRecommendationEngine.recommendMigration() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
