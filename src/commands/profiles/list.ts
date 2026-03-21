import { Command } from 'commander';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import * as out from '../../lib/output.js';
import type { Profile, ProfilesResponse } from '../../types/device.js';

export const listCommand = new Command('list')
  .description('List all profiles')
  .option('--json', 'output raw JSON')
  .action(async (options) => {
    try {
      const config = await getConfig();

      if (!config.token) {
        out.error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      const client = new ApiClient(config.apiUrl, config.token);
      const response = (await client.get('/api/profiles?page=1&limit=50')) as ProfilesResponse;

      if (options.json) {
        out.printJson(response);
        return;
      }

      if (response.data.length === 0) {
        console.log('No profiles found.');
        return;
      }

      const rows = response.data.map((p: Profile) => [
        p._id,
        p.name,
        p.source?.name ?? 'N/A',
        p.image,
        new Date(p.createdAt).toLocaleDateString(),
      ]);

      out.printTable(['ID', 'Name', 'Source', 'Image', 'Created'], rows);
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
