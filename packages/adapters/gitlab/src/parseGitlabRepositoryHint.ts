export function parseGitlabRepositoryHint(repositoryHint?: string): { repositoryNamespace: string; repositoryName: string } | null {
    if (!repositoryHint) return null;
    
    let clean = repositoryHint.trim();
    if (clean.endsWith('.git')) {
        clean = clean.slice(0, -4);
    }
    
    if (clean.startsWith('https://gitlab.com/')) {
        clean = clean.slice('https://gitlab.com/'.length);
    } else if (clean.startsWith('http://gitlab.com/')) {
        clean = clean.slice('http://gitlab.com/'.length);
    } else if (clean.startsWith('git@gitlab.com:')) {
        clean = clean.slice('git@gitlab.com:'.length);
    } else if (clean.startsWith('gitlab.com/')) {
        clean = clean.slice('gitlab.com/'.length);
    }

    const parts = clean.split('/');
    if (parts.length >= 2) {
        // Project name is the last part, namespace is everything before it
        const repositoryName = parts[parts.length - 1];
        const repositoryNamespace = parts.slice(0, -1).join('/');
        
        if (repositoryName.length > 0 && repositoryNamespace.length > 0) {
            return { repositoryNamespace, repositoryName };
        }
    }

    return null;
}
