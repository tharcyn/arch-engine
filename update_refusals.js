const fs = require('fs');
const path = require('path');

const directories = [
    'packages/adapters/github/src',
    'packages/adapters/github/tests',
    'packages/adapters/gitlab/src',
    'packages/adapters/gitlab/tests',
    'packages/adapters/conformance/tests'
];

const replacements = [
    { from: "'SCHEMA_MISMATCH'", to: "REFUSAL_REASONS.SCHEMA_MISMATCH" },
    { from: "'MISSING_EXPORT_SCHEMA_VERSION'", to: "REFUSAL_REASONS.MISSING_EXPORT_SCHEMA_VERSION" },
    { from: "'missing_integrity_hash_for_branch_suffix'", to: "REFUSAL_REASONS.MISSING_INTEGRITY_HASH" },
    { from: "'MISSING_PRODUCER_IDENTITY'", to: "REFUSAL_REASONS.MISSING_PRODUCER_IDENTITY" },
    { from: "'MISSING_REPOSITORY_HINT'", to: "REFUSAL_REASONS.MISSING_REPOSITORY_HINT" },
    { from: "'MALFORMED_REPOSITORY_HINT'", to: "REFUSAL_REASONS.MALFORMED_REPOSITORY_HINT" },
    { from: "'repository_identity_mismatch_with_runtime_context'", to: "REFUSAL_REASONS.REPOSITORY_IDENTITY_MISMATCH" },
    { from: "'MISSING_GITHUB_TOKEN'", to: "REFUSAL_REASONS.MISSING_GITHUB_TOKEN" },
    { from: "'OCTOKIT_EXECUTION_FAILED'", to: "REFUSAL_REASONS.OCTOKIT_EXECUTION_FAILED" },
    { from: "'MISSING_GITLAB_TOKEN'", to: "REFUSAL_REASONS.MISSING_GITLAB_TOKEN" },
    { from: "'COMMIT_CREATION_FAILED'", to: "REFUSAL_REASONS.COMMIT_CREATION_FAILED" },
    { from: "'MERGE_REQUEST_CREATION_FAILED'", to: "REFUSAL_REASONS.MERGE_REQUEST_CREATION_FAILED" }
];

function walk(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            walk(filePath);
        } else if (filePath.endsWith('.ts')) {
            let content = fs.readFileSync(filePath, 'utf8');
            let modified = false;
            
            // Do not import REFUSAL_REASONS if we are already in the shared package
            if (filePath.includes('packages/adapters/shared')) return;

            replacements.forEach(r => {
                if (content.includes(r.from)) {
                    content = content.split(r.from).join(r.to);
                    modified = true;
                }
            });

            if (modified) {
                if (!content.includes('REFUSAL_REASONS')) {
                    // Prepend import
                    content = "import { REFUSAL_REASONS } from '@arch-engine/adapter-shared';\n" + content;
                }
                fs.writeFileSync(filePath, content, 'utf8');
                console.log('Updated ' + filePath);
            }
        }
    });
}

directories.forEach(dir => walk(dir));
