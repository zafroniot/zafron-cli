import { Command } from 'commander';
import * as fs from 'node:fs';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import * as out from '../../lib/output.js';
import type { Profile } from '../../types/device.js';

export function validateDecoder(content: string): void {
  if (!/function\s+decode\s*\(/.test(content)) {
    throw new Error("Decoder must contain a 'decode' function.");
  }
}

const getCommand = new Command('get')
  .description('Get the decoder script for a profile')
  .argument('<id>', 'profile ID')
  .option('--json', 'output full profile as JSON')
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

      if (profile.decoder) {
        process.stdout.write(profile.decoder);
      }
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

const setCommand = new Command('set')
  .description('Set the decoder script for a profile')
  .argument('<id>', 'profile ID')
  .argument('[file]', 'path to .js decoder file')
  .option('--stdin', 'read decoder from stdin')
  .action(async (id: string, file: string | undefined, options) => {
    try {
      const config = await getConfig();

      if (!config.token) {
        out.error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      let content: string;

      if (options.stdin) {
        const chunks: Buffer[] = [];
        for await (const chunk of process.stdin) {
          chunks.push(chunk as Buffer);
        }
        content = Buffer.concat(chunks).toString('utf-8');
        if (!content.trim()) {
          out.error('No input received from stdin.');
          process.exit(1);
        }
      } else if (file) {
        if (!fs.existsSync(file)) {
          out.error(`File not found: ${file}`);
          process.exit(1);
        }
        content = fs.readFileSync(file, 'utf-8');
      } else {
        out.error('Provide a file path or use --stdin.');
        process.exit(1);
      }

      validateDecoder(content);

      const client = new ApiClient(config.apiUrl, config.token);
      await client.patch(`/api/profiles/${id}`, { decoder: content });

      out.success('Decoder updated');
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

export const decoderCommand = new Command('decoder')
  .description('Manage profile decoder scripts');

decoderCommand.addCommand(getCommand);
decoderCommand.addCommand(setCommand);
