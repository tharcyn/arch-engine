import { describe, test, expect } from 'vitest';
import { parseGitlabRepositoryHint } from '../src/parseGitlabRepositoryHint.js';

describe('parseGitlabRepositoryHint', () => {
    test('parses group/project', () => {
        expect(parseGitlabRepositoryHint('group/project')).toEqual({
            repositoryNamespace: 'group',
            repositoryName: 'project'
        });
    });

    test('parses nested group/subgroup/project', () => {
        expect(parseGitlabRepositoryHint('group/subgroup/project')).toEqual({
            repositoryNamespace: 'group/subgroup',
            repositoryName: 'project'
        });
    });

    test('parses https URL', () => {
        expect(parseGitlabRepositoryHint('https://gitlab.com/group/project')).toEqual({
            repositoryNamespace: 'group',
            repositoryName: 'project'
        });
        
        expect(parseGitlabRepositoryHint('https://gitlab.com/group/subgroup/project')).toEqual({
            repositoryNamespace: 'group/subgroup',
            repositoryName: 'project'
        });
    });

    test('parses git SSH URL', () => {
        expect(parseGitlabRepositoryHint('git@gitlab.com:group/project.git')).toEqual({
            repositoryNamespace: 'group',
            repositoryName: 'project'
        });

        expect(parseGitlabRepositoryHint('git@gitlab.com:group/subgroup/project.git')).toEqual({
            repositoryNamespace: 'group/subgroup',
            repositoryName: 'project'
        });
    });

    test('rejects malformed inputs', () => {
        expect(parseGitlabRepositoryHint('')).toBeNull();
        expect(parseGitlabRepositoryHint('group')).toBeNull(); // missing project
        expect(parseGitlabRepositoryHint('group/')).toBeNull(); // empty project
        expect(parseGitlabRepositoryHint('/project')).toBeNull(); // empty namespace
    });
});
