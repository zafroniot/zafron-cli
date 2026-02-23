import { Command } from 'commander';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import * as out from '../../lib/output.js';
import type { Source } from '../../types/source.js';

export const getCommand = new Command('get')
  .description('Get source details')
  .argument('<id>', 'source ID')
  .option('--json', 'output raw JSON')
  .action(async (id: string, options) => {
    try {
      const config = await getConfig();

      if (!config.token) {
        out.error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      const client = new ApiClient(config.apiUrl, config.token);
      const source = (await client.get(`/api/sources/${id}`)) as Source;

      if (options.json) {
        out.printJson(source);
        return;
      }

      out.printDetail([
        ['Name', source.name],
        ['ID', source._id],
        ['Provider', source.provider],
        ['Enabled', source.enabled ? 'true' : 'false'],
        ['Events', source.eventCount.toLocaleString()],
        ['API Key', source.apiKey],
        ['Mask ID', source.maskId],
        ['Description', source.description || 'None'],
      ]);

      console.log(`\nIngress Endpoint: ${config.apiUrl}/api/ingress/${source.maskId}`);
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
