import { Command } from 'commander';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import * as out from '../../lib/output.js';
import type { Profile } from '../../types/device.js';

export const getCommand = new Command('get')
  .description('Get profile details')
  .argument('<id>', 'profile ID')
  .option('--json', 'output raw JSON')
  .action(async (id: string, options) => {
    try {
      const config = await getConfig();

      if (!config.token) {
        out.error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      const client = new ApiClient(config.apiUrl, config.token);
      const profile = (await client.get(`/api/profiles/${id}`)) as Profile;

      if (options.json) {
        out.printJson(profile);
        return;
      }

      out.printDetail([
        ['Name', profile.name],
        ['ID', profile._id],
        ['Source', profile.source?.name ?? 'N/A'],
        ['Image', profile.image],
        ['Decoder Type', profile.decoder_type],
        ['Created', new Date(profile.createdAt).toLocaleDateString()],
        ['Updated', new Date(profile.updatedAt).toLocaleDateString()],
      ]);
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
