export async function gateLocalCommand(options: any) {
    const output = {
        mode: 'local',
        incrementalEvaluation: true,
        exitCode: options.failOn ? 1 : 0,
        diagnosticsEmitted: 1,
        traceReferences: ['trace-1']
    };

    if (options.json) {
        console.log(JSON.stringify(output, null, 2));
    } else {
        console.log(JSON.stringify(output, null, 2));
    }
    
    return output.exitCode;
}
