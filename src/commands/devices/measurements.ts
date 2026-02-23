import { Command } from 'commander';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import * as out from '../../lib/output.js';
import type { MeasurementsResponse } from '../../types/device.js';

export const measurementsCommand = new Command('measurements')
  .description('Get measurements for a device')
  .argument('<id>', 'device ID')
  .option('--channel <channels>', 'filter by channel(s), comma-separated')
  .option('--type <types>', 'filter by type(s), comma-separated')
  .option('--start <date>', 'start date')
  .option('--end <date>', 'end date')
  .option('--limit <n>', 'results per page', '25')
  .option('--page <n>', 'page number', '1')
  .option('--json', 'output raw JSON')
  .action(async (id: string, options) => {
    try {
      const config = await getConfig();

      if (!config.token) {
        out.error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      const params = new URLSearchParams();

      if (options.channel) {
        params.set('channels', options.channel);
      }
      if (options.type) {
        params.set('types', options.type);
      }
      if (options.start) {
        params.set('startDate', options.start);
      }
      if (options.end) {
        params.set('endDate', options.end);
      }

      params.set('page', options.page);
      params.set('limit', options.limit);

      const queryString = params.toString();
      const client = new ApiClient(config.apiUrl, config.token);
      const response = (await client.get(
        `/api/devices/${id}/measurements?${queryString}`,
      )) as MeasurementsResponse;

      if (options.json) {
        out.printJson(response);
        return;
      }

      if (!response.readings || response.readings.length === 0) {
        console.log('No measurements found.');
        return;
      }

      const rows = response.readings.map((r) => [
        new Date(r.timestamp).toLocaleString(),
        r.metadata.channel,
        r.metadata.type,
        String(r.value),
        r.metadata.unit,
      ]);

      out.printTable(
        ['Timestamp', 'Channel', 'Type', 'Value', 'Unit'],
        rows,
      );

      console.log(
        `\nPage ${response.currentPage} of ${response.totalPages} (${response.count} total)`,
      );
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
