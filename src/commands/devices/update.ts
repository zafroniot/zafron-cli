import { Command } from 'commander';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import * as out from '../../lib/output.js';

export const updateCommand = new Command('update')
  .description('Update a device')
  .argument('<id>', 'device ID')
  .option('-n, --name <name>', 'device name')
  .option('-e, --enabled <boolean>', 'enable or disable the device (true/false)')
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

      if (options.enabled !== undefined) {
        body.enabled = options.enabled === 'true';
      }

      if (Object.keys(body).length === 0) {
        out.error('No update flags provided. Use --name or --enabled.');
        process.exit(1);
      }

      const client = new ApiClient(config.apiUrl, config.token);
      await client.patch(`/api/devices/${id}`, body);

      out.success('Device updated');
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
