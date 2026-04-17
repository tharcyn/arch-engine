import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';

const MOCK_ROOT = path.resolve(__dirname, '../.test-workspace-advise-migration');
const TEST_DIR = path.join(MOCK_ROOT, '.arch-engine');
const TRUSTFILE = path.join(TEST_DIR, 'trust.json');
const LOCKFILE = path.join(TEST_DIR, 'policy-lock.json');

describe('advise-migration CLI command', () => {
  const originalCwd = process.cwd;
  const originalExit = process.exit;
  const originalLog = console.log;
  const originalArgv = process.argv;

  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    process.cwd = () => MOCK_ROOT;
  });

  afterEach(() => {
    process.cwd = originalCwd;
    process.exit = originalExit;
    console.log = originalLog;
    process.argv = originalArgv;
    if (fs.existsSync(MOCK_ROOT)) {
      fs.rmSync(MOCK_ROOT, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  const setupMockData = (lockfileData: any) => {
    fs.writeFileSync(TRUSTFILE, JSON.stringify({
      enforcementMode: 'require-signature',
      lockfileSigners: {
        'active-key': {
          key: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAxP6/J...=\n-----END PUBLIC KEY-----',
          status: 'active'
        },
        'verify-only-key': {
          key: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAxP6/J...=\n-----END PUBLIC KEY-----',
          status: 'verify-only',
          replacementKeyId: 'active-key'
        }
      }
    }));
    fs.writeFileSync(LOCKFILE, JSON.stringify(lockfileData));
  };

  const runCommand = async (args: string[]) => {
    const mockExit = vi.fn().mockImplementation(() => { throw new Error('mock-exit'); });
    const mockLog = vi.fn();
    
    process.exit = mockExit as any;
    console.log = mockLog;
    process.argv = ['node', 'arch-engine', ...args];

    try {
        const index = await import('../src/index');
        await index.main();
    } catch (e: any) {
        if (e.message !== 'mock-exit') throw e;
    }
    return { mockExit, mockLog };
  };

  test('no migration required output', async () => {
    setupMockData({
      lockfileSurfaceVersion: '1.0.0',
      registries: [],
      signatures: [{ signatureKeyId: 'active-key', signatureAlgorithm: 'ed25519', signature: 'sig' }]
    });

    const { mockExit, mockLog } = await runCommand(['policies', 'advise-migration']);

    expect(mockExit).toHaveBeenCalledWith(0);
    expect(mockLog.mock.calls.some((c: any) => c[0].includes('No migration recommended'))).toBe(true);
    expect(mockLog.mock.calls.some((c: any) => c[0].includes('is aligned with the preferred'))).toBe(true);
  });

  test('strongly recommended migration output', async () => {
    setupMockData({
      lockfileSurfaceVersion: '1.0.0',
      registries: [],
      signatures: [{ signatureKeyId: 'verify-only-key', signatureAlgorithm: 'ed25519', signature: 'sig' }]
    });

    const { mockExit, mockLog } = await runCommand(['policies', 'advise-migration']);

    expect(mockExit).toHaveBeenCalledWith(0);
    expect(mockLog.mock.calls.some((c: any) => c[0].includes('Migration Strongly Recommended'))).toBe(true);
    expect(mockLog.mock.calls.some((c: any) => c[0].includes('Legacy Identities: verify-only-key'))).toBe(true);
    expect(mockLog.mock.calls.some((c: any) => c[0].includes('Available Replacements: active-key'))).toBe(true);
    expect(mockLog.mock.calls.some((c: any) => c[0].includes('Suggested Action: arch-engine policies refresh-lockfile --sign active-key'))).toBe(true);
  });

  test('JSON output behavior', async () => {
    setupMockData({
      lockfileSurfaceVersion: '1.0.0',
      registries: [],
      signatures: [{ signatureKeyId: 'verify-only-key', signatureAlgorithm: 'ed25519', signature: 'sig' }]
    });

    const { mockExit, mockLog } = await runCommand(['policies', 'advise-migration', '--json']);

    expect(mockExit).toHaveBeenCalledWith(0);
    const jsonOutput = JSON.parse(mockLog.mock.calls[0][0]);
    expect(jsonOutput.migrationRecommended).toBe(true);
    expect(jsonOutput.recommendationStrength).toBe('strongly-recommended');
    expect(jsonOutput.suggestedCommand).toBe('arch-engine policies refresh-lockfile --sign active-key');
  });

  test('optional migration output', async () => {
    setupMockData({
      lockfileSurfaceVersion: '1.0.0',
      registries: [],
      signatures: [
        { signatureKeyId: 'active-key', signatureAlgorithm: 'ed25519', signature: 'sig' },
        { signatureKeyId: 'verify-only-key', signatureAlgorithm: 'ed25519', signature: 'sig' }
      ]
    });

    const { mockExit, mockLog } = await runCommand(['policies', 'advise-migration']);

    expect(mockExit).toHaveBeenCalledWith(0);
    expect(mockLog.mock.calls.some((c: any) => c[0].includes('Migration Optional'))).toBe(true);
    expect(mockLog.mock.calls.some((c: any) => c[0].includes('Legacy Identities: verify-only-key'))).toBe(true);
  });
});
