export async function federationExplainCommand(options: any): Promise<number> {
    const providers = Array.isArray(options.providers) ? options.providers : (options.providers ? [options.providers] : []);
    
    if (providers.length === 0) {
        console.error('Error: Must specify at least one provider using --providers');
        return 1;
    }

    console.log('\n📖 --- Federation Explanation Report --- 📖\n');
    console.log('Executing evaluation to build explanation surface...');
    
    // We import and defer to the existing evaluate command with --show-provenance
    const { runFederatedEvaluationCommand } = await import('../runFederatedEvaluationCommand.js');
    
    // Force showProvenance for the explain command
    const explainOptions = { ...options, showProvenance: true };
    const exitCode = await runFederatedEvaluationCommand(explainOptions);
    
    console.log('\n✅ Explanation Complete\n');
    return exitCode;
}
