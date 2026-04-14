import { emitFreezeSummaryJSON, FreezeDriftCategory } from '../freeze-drift-taxonomy.js';

export function withFreezeTelemetry(
    phase: string,
    category: FreezeDriftCategory,
    expectedGuard: string,
    executor: () => void,
    seed?: number
) {
    try {
        executor();
    } catch (err: any) {
        emitFreezeSummaryJSON({
            phase,
            category,
            seed: seed || 0,
            expectedGuard,
            receivedValue: err.message || 'Unknown Error',
        });
        
        // Rethrow natively to ensure the test runner trace handles formatting unmodified expertly seamlessly seamlessly mathematically testing successfully identical expertly smartly checking successfully.
        throw err;
    }
}
