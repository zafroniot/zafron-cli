import { Command } from 'commander';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import * as out from '../../lib/output.js';
import type { Profile, CreateProfileInput } from '../../types/device.js';
import type { Source, SourcesResponse } from '../../types/source.js';

const PROFILE_IMAGES = [
  'server', 'microchip', 'network', 'thermometer', 'water', 'battery',
  'sun', 'wind', 'cloud', 'leaf', 'signal', 'satellite',
  'bolt', 'gauge', 'cube', 'box', 'industry', 'warehouse',
  'location', 'map', 'globe', 'tower',
] as const;

export function validateImage(value: string): string {
  if (!PROFILE_IMAGES.includes(value as typeof PROFILE_IMAGES[number])) {
    throw new Error(`Invalid image. Allowed values: ${PROFILE_IMAGES.join(', ')}`);
  }
  return value;
}

async function promptMenu(
  rl: readline.Interface,
  label: string,
  items: { display: string; value: string }[],
): Promise<string> {
  console.log(`${label}:`);
  items.forEach((item, i) => console.log(`  ${i + 1}) ${item.display}`));
  const answer = await rl.question('Select: ');
  const index = parseInt(answer, 10) - 1;
  if (isNaN(index) || index < 0 || index >= items.length) {
    throw new Error(`Invalid selection. Enter a number between 1 and ${items.length}.`);
  }
  return items[index].value;
}

async function fetchSources(client: ApiClient): Promise<Source[]> {
  try {
    const response = (await client.get('/api/sources?page=1&limit=50')) as SourcesResponse;
    return response.data;
  } catch (err) {
    throw new Error(`Failed to fetch sources: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function promptMissing(
  options: { name?: string; source?: string; image?: string },
  client: ApiClient,
): Promise<CreateProfileInput> {
  let { name, source, image } = options;

  const needsPrompt = !name || !source || !image;
  let rl: readline.Interface | undefined;

  if (needsPrompt) {
    rl = readline.createInterface({ input, output });
  }

  try {
    // 1. Name
    if (!name) {
      name = await rl!.question('Profile name: ');
    }

    // 2. Source
    if (source) {
      const sources = await fetchSources(client);
      const match = sources.find((s) => s._id === source);
      if (!match) {
        const names = sources.map((s) => s.name).join(', ');
        throw new Error(`Invalid source. Available sources: ${names}`);
      }
    } else {
      const sources = await fetchSources(client);
      if (sources.length === 0) {
        throw new Error('No sources available. Create a source first.');
      }
      source = await promptMenu(
        rl!,
        'Source',
        sources.map((s) => ({ display: s.name, value: s._id })),
      );
    }

    // 3. Image
    if (image) {
      validateImage(image);
    } else {
      image = await promptMenu(
        rl!,
        'Image',
        PROFILE_IMAGES.map((img) => ({ display: img, value: img })),
      );
    }

    return { name, source, image };
  } finally {
    rl?.close();
  }
}

export const createCommand = new Command('create')
  .description('Create a new profile')
  .option('-n, --name <name>', 'profile name')
  .option('-s, --source <source>', 'source ID')
  .option('-i, --image <image>', 'profile image')
  .option('--json', 'output raw JSON')
  .action(async (options) => {
    try {
      const config = await getConfig();

      if (!config.token) {
        out.error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      const client = new ApiClient(config.apiUrl, config.token);
      const profileInput = await promptMissing(options, client);

      const profile = (await client.post('/api/profiles', profileInput)) as Profile;

      if (options.json) {
        out.printJson(profile);
      } else {
        out.success(`Profile created successfully (ID: ${profile._id})`);
      }
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
