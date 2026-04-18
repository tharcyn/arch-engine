import { ProfilerRuntime } from '../../../../core/src/profiler/index.js';

export async function profileEvaluateCommand(options: any) {
    const profile = ProfilerRuntime.profileEvaluationRuntime();
    if (options.json) console.log(JSON.stringify(profile, null, 2));
    else console.log(JSON.stringify(profile, null, 2));
}
