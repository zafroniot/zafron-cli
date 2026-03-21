import { Command } from 'commander';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import * as out from '../../lib/output.js';
import type { Profile } from '../../types/device.js';

export const deleteCommand = new Command('delete')
  .description('Delete a profile')
  .argument('<id>', 'profile ID')
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
        const profile = (await client.get(`/api/profiles/${id}`)) as Profile;
        const rl = readline.createInterface({ input, output });

        try {
          const answer = await rl.question(
            `Are you sure you want to delete "${profile.name}"? (y/N): `,
          );

          if (answer.toLowerCase() !== 'y') {
            console.log('Cancelled.');
            return;
          }
        } finally {
          rl.close();
        }
      }

      await client.delete(`/api/profiles/${id}`);
      out.success('Profile deleted');
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
