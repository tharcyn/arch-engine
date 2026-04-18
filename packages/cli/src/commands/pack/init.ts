import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { testing, bundles } from '@arch-engine/sdk';

export async function packInitCommand(packId: string, options: any): Promise<number> {
    const outputDir = join(process.cwd(), packId);
    
    try {
        mkdirSync(outputDir, { recursive: true });
        
        writeFileSync(join(outputDir, 'PolicyPackManifest.ts'), `import { createPolicyPackManifest } from '@arch-engine/sdk';\n\nexport default createPolicyPackManifest({\n  policyPackId: '${packId}',\n  policyPackVersion: '1.0.0',\n  supportedCapabilities: ['A'],\n  supportedDatasetSchemas: ['schema-v1'],\n  supportedExecutionModes: ['single-provider']\n});\n`);
        
        writeFileSync(join(outputDir, 'capabilities.template.ts'), `import { capabilities } from '@arch-engine/sdk';\n\nexport const required = capabilities.declareRequiredCapabilities(['A']);\n`);
        
        writeFileSync(join(outputDir, 'dataset-compatibility.template.ts'), `import { datasetCompatibility } from '@arch-engine/sdk';\n\nexport const schemas = datasetCompatibility.declareSupportedDatasetSchemas(['schema-v1']);\n`);
        
        writeFileSync(join(outputDir, 'execution-modes.template.ts'), `import { executionModes } from '@arch-engine/sdk';\n\nexport const modes = executionModes.declareSupportedExecutionModes(['single-provider']);\n`);
        
        writeFileSync(join(outputDir, 'dependencies.template.ts'), `import { defineDependencies } from '@arch-engine/sdk';\n\nexport const deps = defineDependencies([]);\n`);
        
        writeFileSync(join(outputDir, 'policy-pack.entry.ts'), `export function evaluate() { return []; }\n`);
        
        writeFileSync(join(outputDir, 'policy-pack.rules.ts'), `export const rules = [];\n`);
        
        writeFileSync(join(outputDir, 'policy-pack.tests.ts'), testing.createPolicyPackTestHarness(packId));
        
        writeFileSync(join(outputDir, 'bundle.config.ts'), bundles.generateBundleConfig(packId));

        if (options.json) {
            console.log(JSON.stringify({ success: true, directory: outputDir }, null, 2));
        } else {
            console.log(`✅ Successfully scaffolded policy pack ${packId} in ${outputDir}`);
        }
        return 0;

    } catch (e: any) {
        if (options.json) {
            console.log(JSON.stringify({ success: false, error: e.message }, null, 2));
        } else {
            console.error(`❌ Failed to scaffold policy pack: ${e.message}`);
        }
        return 1;
    }
}
