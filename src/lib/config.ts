import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';

export const CONFIG_DIR = join(homedir(), '.zafron');
export const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export interface ZafronConfig {
  token?: string;
  apiUrl: string;
}

export const DEFAULT_API_URL = 'https://api.zafron.dev';

/**
 * Reads config from the given path (or the default CONFIG_PATH).
 * Returns a default config if the file does not exist.
 */
export async function getConfig(
  configPath: string = CONFIG_PATH,
): Promise<ZafronConfig> {
  try {
    const raw = await readFile(configPath, 'utf-8');
    return JSON.parse(raw) as ZafronConfig;
  } catch {
    return { apiUrl: DEFAULT_API_URL };
  }
}

/**
 * Writes config to the given path (or the default CONFIG_PATH).
 * Creates the parent directory if it does not exist.
 */
export async function saveConfig(
  config: ZafronConfig,
  configPath: string = CONFIG_PATH,
): Promise<void> {
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Removes the token from the config file.
 */
export async function clearAuth(
  configPath: string = CONFIG_PATH,
): Promise<void> {
  const config = await getConfig(configPath);
  delete config.token;
  await saveConfig(config, configPath);
}
