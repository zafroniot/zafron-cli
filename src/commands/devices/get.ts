import { Command } from 'commander';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import * as out from '../../lib/output.js';
import type { Device } from '../../types/device.js';

function formatLastOnline(dateStr?: string): string {
  if (!dateStr) return 'Never';

  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 60_000) return 'Just now';

  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffMs / 86_400_000);
  return `${diffDays} days ago`;
}

export const getCommand = new Command('get')
  .description('Get device details')
  .argument('<id>', 'device ID')
  .option('--json', 'output raw JSON')
  .action(async (id: string, options) => {
    try {
      const config = await getConfig();

      if (!config.token) {
        out.error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      const client = new ApiClient(config.apiUrl, config.token);
      const device = (await client.get(`/api/devices/${id}`)) as Device;

      if (options.json) {
        out.printJson(device);
        return;
      }

      out.printDetail([
        ['Name', device.name],
        ['ID', device._id],
        ['Serial', device.serial],
        ['Type', device.type],
        ['Enabled', device.enabled ? 'Yes' : 'No'],
        ['Last Online', formatLastOnline(device.lastOnline)],
      ]);

      if (device.capabilities && device.capabilities.length > 0) {
        console.log('\nCapabilities:');
        for (const cap of device.capabilities) {
          console.log(`  - ${cap.name} (ch: ${cap.channel}) = ${cap.value} ${cap.unit}`);
        }
      }
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
