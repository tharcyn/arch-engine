import * as fs from 'fs';
import * as path from 'path';
import {
    loadTopologyDataset,
    loadPolicyPack,
    assessFederationExecutionPreflight,
    materializeFederationExecutionPlan,
    runFederationEvaluationPlan,
    lintFederationFindingRegistry
} from '@arch-engine/core';

export async function lintFindingsCommand(args: string[]): Promise<void> {
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

    const report = lintFederationFindingRegistry(result);

    if (jsonFlag) {
        console.log(JSON.stringify(report, null, 2));
        if (report.issuesBySeverity.error > 0) process.exit(1);
        return;
    }

    console.log(`\n${report.summaryMessage}`);

    if (report.totalIssues > 0) {
        console.log('\n--- Registry Lint Issues ---');
        for (const issue of report.issues) {
            console.log(`\n[${issue.severity.toUpperCase()}] ${issue.issueType}`);
            console.log(`  Code: ${issue.code}`);
            console.log(`  Category: ${issue.category}`);
            if (issue.packName) {
                console.log(`  Pack: ${issue.packName}`);
            }
            console.log(`  Message: ${issue.summaryMessage}`);
        }
    }

    if (report.issuesBySeverity.error > 0) {
        process.exit(1);
    }
}
