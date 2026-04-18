import { GovernanceKnowledgeOntologyRuntime } from '../../../../ontology/src/index.js';

export async function ontologyListCommand(options: any) {
    const result = { status: GovernanceKnowledgeOntologyRuntime.listOntology() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}

export async function ontologyInspectCommand(options: any) {
    const result = { status: GovernanceKnowledgeOntologyRuntime.inspectOntology() };
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(JSON.stringify(result, null, 2));
}
