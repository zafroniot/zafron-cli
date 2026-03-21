import { Command } from 'commander';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import * as out from '../../lib/output.js';
import { validateImage } from './create.js';

export const updateCommand = new Command('update')
  .description('Update a profile')
  .argument('<id>', 'profile ID')
  .option('-n, --name <name>', 'profile name')
  .option('-s, --source <source>', 'source ID')
  .option('-i, --image <image>', 'profile image')
  .action(async (id: string, options) => {
    try {
      const config = await getConfig();

      if (!config.token) {
        out.error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      const body: Record<string, unknown> = {};

      if (options.name !== undefined) {
        body.name = options.name;
      }

      if (options.source !== undefined) {
        body.source = options.source;
      }

      if (options.image !== undefined) {
        validateImage(options.image);
        body.image = options.image;
      }

      if (Object.keys(body).length === 0) {
        out.error('No update flags provided. Use --name, --source, or --image.');
        process.exit(1);
      }

      const client = new ApiClient(config.apiUrl, config.token);
      await client.patch(`/api/profiles/${id}`, body);

      out.success('Profile updated');
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
