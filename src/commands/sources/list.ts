import { Command } from 'commander';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import * as out from '../../lib/output.js';
import type { Source, SourcesResponse } from '../../types/source.js';

export const listCommand = new Command('list')
  .description('List all sources')
  .option('--json', 'output raw JSON')
  .action(async (options) => {
    try {
      const config = await getConfig();

      if (!config.token) {
        out.error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      const client = new ApiClient(config.apiUrl, config.token);
      const response = (await client.get('/api/sources?page=1&limit=50')) as SourcesResponse;

      if (options.json) {
        out.printJson(response);
        return;
      }

      if (response.data.length === 0) {
        console.log('No sources found.');
        return;
      }

      const rows = response.data.map((source: Source) => [
        source._id,
        source.name,
        source.provider,
        source.enabled ? 'true' : 'false',
        source.eventCount.toLocaleString(),
        new Date(source.createdAt).toLocaleDateString(),
      ]);

      out.printTable(
        ['ID', 'Name', 'Provider', 'Enabled', 'Events', 'Created'],
        rows,
      );
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
