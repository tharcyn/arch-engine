import * as fs from 'fs';
import * as path from 'path';
import {
    loadTopologyDataset,
    loadPolicyPack,
    assessFederationExecutionPreflight,
    materializeFederationExecutionPlan,
    runFederationEvaluationPlan,
    inspectFederationEvaluationFindings
} from '@arch-engine/core';

export async function inspectFindingsCommand(args: string[]): Promise<void> {
    let topologyPath = 'topology-export.json';
    const packDirs: string[] = [];
    let jsonFlag = false;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '-t' || args[i] === '--topology') {
            topologyPath = args[++i];
        } else if (args[i] === '-p' || args[i] === '--pack') {
            packDirs.push(args[++i]);
        } else if (args[i] === '--json') {
            jsonFlag = true;
        }
    }

    if (!fs.existsSync(topologyPath)) {
        console.error(`Topology file not found: ${topologyPath}`);
        process.exit(1);
    }
    
    const rawTopology = fs.readFileSync(path.resolve(topologyPath), 'utf-8');
    const dataset = loadTopologyDataset(rawTopology);

    const packs = packDirs.map(dir => {
        const manifestPath = path.resolve(dir, 'policy-pack.json');
        const rawManifest = fs.readFileSync(manifestPath, 'utf-8');
        return loadPolicyPack(rawManifest);
    });

    const preflight = assessFederationExecutionPreflight(dataset, packs);
    if (!preflight.preflightAccepted) {
        console.error('Preflight rejected.');
        process.exit(1);
    }

    const plan = materializeFederationExecutionPlan(preflight);
    const result = runFederationEvaluationPlan(plan);

    const inspection = inspectFederationEvaluationFindings(result);

    if (jsonFlag) {
        console.log(JSON.stringify(inspection, null, 2));
        return;
    }

    console.log(`Findings observed: ${inspection.totalFindings}`);
    console.log(`Codes observed: ${inspection.codesObserved}`);
    console.log(`Core reserved codes observed: ${inspection.coreReservedCodesObserved}`);
    console.log(`Pack-local codes observed: ${inspection.packLocalCodesObserved}`);
    console.log(`Taxonomy repaired findings: ${inspection.taxonomyRepairedCount}`);

    console.log('\n--- Code Summaries ---');
    for (const codeSum of inspection.codeSummaries) {
        console.log(`\nCode: ${codeSum.code}`);
        console.log(`  Category: ${codeSum.category}`);
        console.log(`  Core Reserved: ${codeSum.coreReserved}`);
        console.log(`  Taxonomy Repaired: ${codeSum.taxonomyRepairedObserved}`);
        console.log(`  Severities: info=${codeSum.countsBySeverity.info}, warning=${codeSum.countsBySeverity.warning}, error=${codeSum.countsBySeverity.error}`);
        console.log(`  Observed in packs: ${codeSum.observedPacks.join(', ')}`);
    }
}
