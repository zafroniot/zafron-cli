import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getConfig,
  saveConfig,
  clearAuth,
  DEFAULT_API_URL,
} from '../lib/config.js';

describe('config', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'zafron-test-'));
    configPath = join(tempDir, 'config.json');
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns default config when no file exists', async () => {
    const config = await getConfig(configPath);
    expect(config).toEqual({ apiUrl: DEFAULT_API_URL });
    expect(config.token).toBeUndefined();
  });

  it('saves and reads config', async () => {
    const testConfig = { apiUrl: 'https://custom.api.dev', token: 'abc123' };
    await saveConfig(testConfig, configPath);

    const loaded = await getConfig(configPath);
    expect(loaded).toEqual(testConfig);
    expect(loaded.token).toBe('abc123');
    expect(loaded.apiUrl).toBe('https://custom.api.dev');
  });

  it('clears token on clearAuth', async () => {
    const testConfig = { apiUrl: DEFAULT_API_URL, token: 'secret-token' };
    await saveConfig(testConfig, configPath);

    await clearAuth(configPath);

    const loaded = await getConfig(configPath);
    expect(loaded.token).toBeUndefined();
    expect(loaded.apiUrl).toBe(DEFAULT_API_URL);
  });
});
