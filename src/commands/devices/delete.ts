import { Command } from 'commander';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import * as out from '../../lib/output.js';
import type { Device } from '../../types/device.js';

export const deleteCommand = new Command('delete')
  .description('Delete a device')
  .argument('<id>', 'device ID')
  .option('-y, --yes', 'skip confirmation prompt')
  .action(async (id: string, options) => {
    try {
      const config = await getConfig();

      if (!config.token) {
        out.error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      const client = new ApiClient(config.apiUrl, config.token);

      if (!options.yes) {
        const device = (await client.get(`/api/devices/${id}`)) as Device;
        const rl = readline.createInterface({ input, output });

        try {
          const answer = await rl.question(
            `Are you sure you want to delete "${device.name}"? (y/N): `,
          );

          if (answer.toLowerCase() !== 'y') {
            console.log('Cancelled.');
            return;
          }
        } finally {
          rl.close();
        }
      }

      await client.delete(`/api/devices/${id}`);
      out.success('Device deleted');
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
