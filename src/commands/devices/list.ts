import { Command } from 'commander';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import * as out from '../../lib/output.js';
import { formatLastOnline } from '../../lib/output.js';
import type { Device } from '../../types/device.js';

export const listCommand = new Command('list')
  .description('List all devices')
  .option('--json', 'output raw JSON')
  .action(async (options) => {
    try {
      const config = await getConfig();

      if (!config.token) {
        out.error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      const client = new ApiClient(config.apiUrl, config.token);
      const devices = (await client.get('/api/devices')) as Device[];

      if (options.json) {
        out.printJson(devices);
        return;
      }

      if (devices.length === 0) {
        console.log('No devices found.');
        return;
      }

      const rows = devices.map((d) => [
        d._id,
        d.name,
        d.type,
        d.serial,
        d.enabled ? 'Yes' : 'No',
        formatLastOnline(d.lastOnline),
      ]);

      out.printTable(
        ['ID', 'Name', 'Type', 'Serial', 'Enabled', 'Last Online'],
        rows,
      );
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
