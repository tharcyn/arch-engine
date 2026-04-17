import type { AdapterExecutionOutcome } from './AdapterExecutionOutcome.js';
import type { RefusalReason } from '../constants/refusalReasons.js';

export interface AdapterExecutionResultBase {
    readonly adapterOutcome: AdapterExecutionOutcome;
    readonly executionMode: 'dry-run' | 'execute';
    readonly executionPerformed: boolean;
    readonly branchName: string;
    readonly branchCreated: boolean;
    readonly branchReused?: boolean;
    
    // Core telemetry present across any provider execution
    readonly refusalReason?: RefusalReason;
    readonly repositoryContextVerified: boolean;
    readonly runtimeRepository?: string;
    readonly repositoryIdentityAdvisory: boolean;
}
