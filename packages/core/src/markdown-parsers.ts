// lib/markdown-parsers.ts

export function extractMarkdownSection(content: string, headingRegex: RegExp): string | null {
    const lines = content.split('\n');
    let inSection = false;
    let sectionLevel = 0;
    const extracted: string[] = [];

    for (const line of lines) {
        const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
        
        if (headingMatch) {
            const level = headingMatch[1].length;
            const text = headingMatch[2];

            if (!inSection) {
                if (headingRegex.test(text)) {
                    inSection = true;
                    sectionLevel = level;
                }
            } else {
                if (level <= sectionLevel) {
                    break;
                } else {
                    extracted.push(line);
                }
            }
        } else if (inSection) {
            extracted.push(line);
        }
    }

    return inSection ? extracted.join('\n').trim() : null;
}

export function parseList(content: string): string[] {
    return content.split('\n')
        .filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'))
        .map(l => l.replace(/^[-*]\s*/, '').trim());
}

export function parseTable(content: string): Record<string, string>[] {
    const lines = content.split('\n').filter(l => l.trim().startsWith('|'));
    if (lines.length < 3) return [];
    
    const headers = lines[0].split('|').slice(1, -1).map(h => h.trim());
    const rows: Record<string, string>[] = [];
    
    for (let i = 2; i < lines.length; i++) {
        const cells = lines[i].split('|').slice(1, -1).map(c => c.trim());
        const rowData: Record<string, string> = {};
        headers.forEach((h, idx) => {
            rowData[h] = cells[idx] || '';
        });
        rows.push(rowData);
    }
    return rows;
}

// 1. Authority Registry Parser
export function parseAuthorityRegistry(content: string): any[] {
    const sections = content.split(/^##\s+/m).slice(1);
    const results = [];

    for (const section of sections) {
        const lines = section.split('\n');
        const entity = lines[0].trim();
        const tableStr = section.substring(section.indexOf('|'));
        if (!tableStr.startsWith('|')) continue;
        
        const table = parseTable(tableStr);
        let writePath = '';
        let readPath = '';
        let forbidden = '';
        let linked = '';
        let authorityOwner = '';

        for (const row of table) {
            if (row['Attribute']?.includes('Write Path')) writePath = row['Value'];
            if (row['Attribute']?.includes('Read Paths')) readPath = row['Value'];
            if (row['Attribute']?.includes('Forbidden Inference Zones')) forbidden = row['Value'];
            if (row['Attribute']?.includes('Linked Invariants')) linked = row['Value'];
            if (row['Attribute']?.includes('Authority Layer')) authorityOwner = row['Value'];
        }

        results.push({
            entity,
            authority_owner_entity: authorityOwner ? authorityOwner.match(/`([^`]+)`/g)?.map(s=>s.replace(/`/g,'').trim()).filter(Boolean) || [authorityOwner.trim()] : [],
            allowed_writers: readPath ? readPath.split(',').map(s=>s.replace(/`/g,'').trim()).filter(Boolean) : [],
            forbidden_writers: forbidden ? forbidden.split('🚫').map(s=>s.replace(/`/g,'').trim()).filter(Boolean) : [],
            mutation_surfaces: writePath ? writePath.split(',').map(s=>s.replace(/`/g,'').trim()).filter(Boolean) : [],
            protected_invariants: linked ? linked.match(/\[\[(.*?)\]\]/g)?.map(m => m.replace(/\[\[|\]\]/g, '')) || [] : [],
            notes: null,
            source_file: "authority-registry.md"
        });
    }

    return results;
}

// 2. Invariant Registry Parser
export function parseInvariantRegistry(content: string): any[] {
    const sections = content.split(/^###\s+/m).slice(1); // Invariants are ###
    const results = [];

    for (const section of sections) {
        const lines = section.split('\n');
        const titleLine = lines[0].trim();
        const idMatch = titleLine.match(/^(INV-[A-Z0-9]+):?(.*)/);
        const id = idMatch ? idMatch[1].trim() : titleLine;
        const name = idMatch ? idMatch[2].trim() : titleLine;

        let verificationLevel = 'declared';
        let staticEvidence = null;
        let testEvidence = null;
        let runtimeEvidence = null;
        let enforcedBy = null;
        let dependents = '';
        let notes = null;
        let blastRadius = 'DOMAIN_LAYER';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('**verification_level**:')) verificationLevel = line.split('**:')[1].trim();
            if (line.includes('**static**:')) staticEvidence = lines[i+1]?.trim() || null;
            if (line.includes('**test**:')) testEvidence = lines[i+1]?.trim() || null;
            if (line.includes('**runtime**:')) runtimeEvidence = lines[i+1]?.trim() || null;
            if (line.includes('**How Enforced**:')) enforcedBy = line.split('**:')[1].trim();
            if (line.includes('**Dependents**:')) dependents = line.split('**:')[1].trim();
            if (line.includes('**Breaks If Violated**:')) notes = line.split('**:')[1].trim();
        }

        const journeys = dependents.match(/\[\[(.*?)\]\]/g)?.map(m => m.replace(/\[\[|\]\]/g, '')) || [];
        if (journeys.length >= 3 || (runtimeEvidence && runtimeEvidence !== 'Not defined') || (id.startsWith('INV-CB'))) {
            blastRadius = 'SYSTEM_CRITICAL';
        }

        results.push({
            id,
            name,
            authority_owner_entity: enforcedBy ? [enforcedBy] : [],
            verification_level: verificationLevel,
            source_of_truth: 'invariant-enforcement-map.md',
            blast_radius: blastRadius,
            journeys,
            code_refs: [],
            static: staticEvidence,
            test: testEvidence ? testEvidence.split(',').map(s=>s.replace(/`/g,'').trim()).filter(Boolean) : [],
            runtime: runtimeEvidence,
            notes
        });
    }

    return results;
}

// 3. Journey Coverage Parser
export function parseJourneyCoverage(content: string): any[] {
    const sections = content.split(/^##\s+\d+\.\s+/m).slice(1);
    const results = [];

    for (const section of sections) {
        const lines = section.split('\n');
        const journeyNameMatch = lines[0].match(/\[\[(.*?)\]\]/) || [null, lines[0].trim()];
        const journeyName = journeyNameMatch[1]?.trim() || lines[0].trim();

        const routes: string[] = [];
        const controllers: string[] = [];
        const services: string[] = [];
        const events: string[] = [];
        const jobs: string[] = [];
        const contracts: string[] = [];
        const tests: string[] = [];
        let protected_invariants: string[] = [];

        const ctrlSec = extractMarkdownSection(section, /Controllers/i);
        if (ctrlSec) controllers.push(...parseTable(ctrlSec).map(r => r['Controller']?.replace(/`/g,'').trim()).filter(Boolean));
        
        const svcSec = extractMarkdownSection(section, /Services/i);
        if (svcSec) services.push(...parseTable(svcSec).map(r => (r['Service'] || r['Component'])?.replace(/`/g,'').trim()).filter(Boolean));

        const jobsSec = extractMarkdownSection(section, /Jobs/i);
        if (jobsSec) jobs.push(...parseTable(jobsSec).map(r => r['Job']?.replace(/`/g,'').trim()).filter(Boolean));

        const eventsSec = extractMarkdownSection(section, /Events/i);
        if (eventsSec) events.push(...parseTable(eventsSec).map(r => r['Event']?.replace(/`/g,'').trim()).filter(Boolean));

        const testsSec = extractMarkdownSection(section, /Tests/i);
        if (testsSec) tests.push(...parseTable(testsSec).map(r => (r['Test File'] || r['Test'])?.replace(/`/g,'').trim()).filter(Boolean));

        const invSec = extractMarkdownSection(section, /Invariants/i);
        if (invSec) {
            const rows = parseTable(invSec);
            if (rows.length > 0) {
                protected_invariants = rows.map(r => r['ID']?.replace(/`/g,'').trim()).filter(Boolean);
            } else {
                protected_invariants = parseList(invSec).map(i => i.split(':')[0].trim());
            }
        }

        results.push({
            journey_name: journeyName,
            routes,
            controllers,
            services,
            events,
            jobs,
            contracts,
            frontend_composables: [],
            frontend_routes: [],
            tests,
            runtime_sentinels: [],
            protected_invariants,
            notes: null
        });
    }

    return results;
}

// 4. Decision Impact Map Parser
export function parseDecisionImpactMap(content: string): any[] {
    const sections = content.split(/^##\s+CHANGE:\s+/m).slice(1);
    const results = [];

    for (const section of sections) {
        const lines = section.split('\n');
        const changeTitle = lines[0].trim();
        const entityMatch = changeTitle.match(/(.*?)\s+Modified/i);
        const entity = entityMatch ? entityMatch[1].trim() : changeTitle;

        const domains = parseList(extractMarkdownSection(section, /Affected Domains/i) || '').map(d => d.replace(/—.*/, '').replace(/\\*\\*/g, '').trim());
        const journeys = parseList(extractMarkdownSection(section, /Affected Journeys/i) || '').map(j => j.replace(/\[\[|\]\]/g, '').replace(/—.*/, '').trim());
        const contracts = parseList(extractMarkdownSection(section, /Affected Contracts/i) || '');
        const invariants = parseList(extractMarkdownSection(section, /Affected Invariants/i) || '');
        const tests = parseList(extractMarkdownSection(section, /Affected Tests/i) || '');

        let isPlatformKillSwitch = false;
        if (invariants.some(i => i.toLowerCase().includes('kill switch') || i.toLowerCase().includes('platform'))) {
            isPlatformKillSwitch = true;
        }
        
        let isRuntimeVerified = false;
        if (invariants.some(i => i.toLowerCase().includes('runtime'))) {
            isRuntimeVerified = true;
        }

        let blastRadius = 'LOCAL';
        if (domains.length >= 3 || journeys.length >= 3 || isPlatformKillSwitch || isRuntimeVerified) blastRadius = 'SYSTEM_CRITICAL';
        else if (domains.length === 2) blastRadius = 'MULTI_DOMAIN';
        else if (domains.length === 1 && journeys.length >= 2) blastRadius = 'DOMAIN_LAYER';
        else if (domains.length === 1 && journeys.length === 1) blastRadius = 'SERVICE_LAYER';

        results.push({
            entity,
            change_type: "modification",
            affected_domains: domains,
            affected_journeys: journeys,
            affected_invariants: invariants,
            affected_contracts: contracts,
            affected_dependencies: tests,
            blast_radius_hint: blastRadius,
            notes: null
        });
    }

    return results;
}

// 5. Deployment Dependencies Parser
export function parseDeploymentDependencies(content: string): any[] {
    const sections = content.split(/^##\s+\d+\.\s+/m).slice(1);
    const results = [];

    for (const section of sections) {
        const lines = section.split('\n');
        const subsystem = lines[0].trim();
        
        let dependencies: any[] = [];
        let requiredEnv: string[] = [];
        
        const depsSec = extractMarkdownSection(section, /Required Dependencies/i);
        if (depsSec) {
            const table = parseTable(depsSec);
            for (const row of table) {
                const depName = row['Dependency']?.replace(/`/g, '').trim();
                const type = row['Type']?.trim();
                const requiredBy = row['Required By']?.replace(/`/g, '').trim();
                const failure = row['Failure Mode']?.trim();

                dependencies.push({
                    name: depName,
                    type,
                    required_by: requiredBy,
                    failure_mode: failure
                });

                if (type?.toLowerCase().includes('env')) {
                    requiredEnv.push(depName.split('=')[0]);
                }
            }
        }

        const fallbackSec = extractMarkdownSection(section, /Dependencies/i);
        if (!depsSec && fallbackSec) {
            const list = parseList(fallbackSec);
            if (list.length > 0) {
                 dependencies.push(...list.map(l => ({ name: l, type: 'unknown', required_by: 'unknown', failure_mode: 'unknown'})));
            } else {
                 const table = parseTable(fallbackSec);
                 if (table.length > 0) {
                      dependencies.push(...table.map(r => ({ name: r['Dependency']?.replace(/`/g,'').trim(), type: 'unknown', required_by: r['Required By']?.trim(), failure_mode: r['Failure Mode']?.trim() })));
                 }
            }
        }

        const failSec = extractMarkdownSection(section, /Failure Cascade/i);
        const failureCascades = failSec ? [failSec.replace(/```/g, '').trim()] : [];

        results.push({
            subsystem,
            dependencies,
            failure_cascades: failureCascades,
            required_env: requiredEnv,
            runtime_assumptions: [],
            safety_notes: null
        });
    }

    return results;
}

// 6. Contracts Parity Parser
export function parseContractsParity(content: string): any[] {
    const sections = content.split(/^##\s+/m).slice(1);
    const results = [];

    // The user requested: operationId, endpoint, method, controller, frontend_client, schema_refs, status, notes
    // However, the parity md defines conceptual mappings.
    // We will extract tables where Backend Field maps to Frontend Field as conceptual contracts
    for (const section of sections) {
        if (!section.includes('Field') && !section.includes('Resource')) continue;
        
        const lines = section.split('\n');
        const changeTitle = lines[0].trim();
        
        if (changeTitle.includes('PARITY GAP SUMMARY')) continue; // Skip summary

        const endpoints = extractMarkdownSection(section, /Backend Response/i) ? [{
            operationId: null,
            endpoint: changeTitle.replace(/Parity/g, '').trim() || null,
            method: null,
            controller: null,
            frontend_client: null,
            schema_refs: [],
            status: "Conceptual",
            notes: "Extracted from parity map response block"
        }] : [];

        // Tables holding mapping
        const tables = parseTable(section);
        if (tables.length > 0) {
            const noteAccumulator: string[] = [];
            for (const table of tables) {
                if (table['Backend Field'] || table['Frontend Field']) {
                     // Just adding a skeleton if doesn't exist, we map fields into notes for now
                     if (endpoints.length === 0) {
                         endpoints.push({
                             operationId: null,
                             endpoint: changeTitle,
                             method: null,
                             controller: null,
                             frontend_client: null,
                             schema_refs: [],
                             status: table['Match']?.includes('NOT') ? "Gap" : "Parity",
                             notes: ''
                         });
                     }
                     noteAccumulator.push(`${table['Backend Field']} -> ${table['Frontend Field']} (${table['Match']})`);
                }
            }
            if (endpoints.length > 0 && noteAccumulator.length > 0) {
                endpoints[0].notes = noteAccumulator.join(', ');
            }
        }

        if (endpoints.length > 0) {
            results.push(...endpoints);
        }
    }

    return results;
}

// 7. Peripheral Surface Taxonomy Parser
export function parsePeripheralSurfaceTaxonomy(content: string): any[] {
    const sections = content.split(/^##\s+/m).slice(1);
    const results = [];

    for (const section of sections) {
        const lines = section.split('\n');
        const groupMatch = lines[0].match(/(\d+\.)?(.*)/);
        const groupName = groupMatch ? groupMatch[2].trim() : lines[0].trim();
        const reason = lines.length > 1 ? lines[1].trim() : null;

        const namespaces = parseList(section);

        for (const ns of namespaces) {
            results.push({
                namespace_pattern: ns.replace(/`/g, '').trim(),
                surface_type: ns.includes('Webhook') ? 'webhook' : (ns.includes('Api') ? 'api' : 'web'),
                classification: 'peripheral',
                domain: null,
                reason,
                group_name: groupName,
                reporting_policy: 'standard'
            });
        }
    }

    return results;
}

// ══════════════════════════════════════════════════════
//  INDEX PARSERS — Extract entity names from indices/*.md
//  These produce declared name sets the drift engine
//  can consume via JSON instead of manual regex parsing.
// ══════════════════════════════════════════════════════

// 8. Service Index Parser
export function parseServiceIndex(content: string): { name: string; domain: string; path: string }[] {
    const results: { name: string; domain: string; path: string }[] = [];
    const EXCLUDED = new Set(['Service', 'Model', 'Job', 'Event', 'Path', 'Purpose', 'Dependencies']);

    // Extract backtick-wrapped names from table rows: | `ServiceName` |
    const regex = /\|\s*`([A-Za-z0-9_]+)`\s*\|/g;
    let currentDomain = '';
    
    for (const line of content.split('\n')) {
        const domainMatch = line.match(/^##\s+(.+)/);
        if (domainMatch) {
            currentDomain = domainMatch[1].replace(/\(.*\)/, '').trim();
            continue;
        }
        
        let m: RegExpExecArray | null;
        // Reset regex for each line
        const lineRegex = /\|\s*`([A-Za-z0-9_]+)`\s*\|/;
        m = lineRegex.exec(line);
        if (m && !EXCLUDED.has(m[1])) {
            // Extract path from second column if present
            const cells = line.split('|').map(c => c.trim()).filter(Boolean);
            const pathCell = cells.length >= 2 ? cells[1].replace(/`/g, '').trim() : '';
            results.push({
                name: m[1],
                domain: currentDomain,
                path: pathCell
            });
        }
    }
    return results;
}

// 9. Model Index Parser
export function parseModelIndex(content: string): { name: string; domain: string }[] {
    const results: { name: string; domain: string }[] = [];
    const EXCLUDED = new Set([
        'Model', 'Layer', 'Models', 'Attribute', 'Backend', 'Frontend',
        'Severity', 'Invariant', 'Step', 'Guard', 'Domain', 'Immutable',
        'Journey', 'Convention', 'Marketing', 'Financial',
        'Purpose', 'Summary', 'Related', 'Topics', 'Check',
        'RBAC', 'Authority', 'Linkage',
    ]);
    
    let currentDomain = '';
    for (const line of content.split('\n')) {
        const domainMatch = line.match(/^##\s+(.+)/);
        if (domainMatch) {
            currentDomain = domainMatch[1].replace(/\(.*\)/, '').trim();
            continue;
        }
        
        // Models use plain names (no backticks) in first column
        const m = line.match(/^\|\s*([A-Z][A-Za-z0-9]+)(?:\s*\([^)]*\))?\s*\|/);
        if (m && !EXCLUDED.has(m[1]) && /[a-z]/.test(m[1]) && m[1].length >= 3) {
            results.push({ name: m[1], domain: currentDomain });
        }
    }
    return results;
}

// 10. Job Index Parser
export function parseJobIndex(content: string): { name: string; domain: string }[] {
    const results: { name: string; domain: string }[] = [];
    const EXCLUDED = new Set(['Job', 'Domain', 'Trigger', 'Purpose', 'Trait', 'Path', 'Frequency', 'Lock']);

    let currentDomain = '';
    for (const line of content.split('\n')) {
        const domainMatch = line.match(/^##\s+(.+)/);
        if (domainMatch) {
            currentDomain = domainMatch[1].replace(/\(.*\)/, '').trim();
            continue;
        }
        
        const m = line.match(/\|\s*`([A-Z][A-Za-z0-9]+)`\s*\|/);
        if (m && !EXCLUDED.has(m[1]) && !m[1].includes(':') && /^[A-Z][a-z]/.test(m[1])) {
            results.push({ name: m[1], domain: currentDomain });
        }
    }
    return results;
}

// 11. Event Index Parser
export function parseEventIndex(content: string): { name: string; domain: string; broadcast: boolean }[] {
    const results: { name: string; domain: string; broadcast: boolean }[] = [];
    const EXCLUDED = new Set([
        'Event', 'Domain', 'Broadcast', 'Listeners', 'Journey',
        'Channel', 'Consumer', 'Trait', 'Path', 'Purpose',
    ]);

    // Only parse the primary table (before ## Broadcast Events section)
    const primarySection = content.split(/^## Broadcast Events/m)[0] || content;
    
    for (const line of primarySection.split('\n')) {
        // Events use plain names in first column
        const m = line.match(/^\|\s*([A-Z][A-Za-z0-9]+)\s*\|/);
        if (m && !EXCLUDED.has(m[1]) && /^[A-Z][a-z]/.test(m[1])) {
            const cells = line.split('|').map(c => c.trim()).filter(Boolean);
            const domain = cells.length >= 2 ? cells[1] : '';
            const broadcast = cells.length >= 3 ? cells[2].includes('✓') : false;
            results.push({ name: m[1], domain, broadcast });
        }
    }
    return results;
}
