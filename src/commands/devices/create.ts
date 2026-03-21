import { Command } from 'commander';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import * as out from '../../lib/output.js';
import type { Device, CreateDeviceInput } from '../../types/device.js';

const DEVICE_TYPES = ['mqtt', 'lora'] as const;
type DeviceType = typeof DEVICE_TYPES[number];

export function validateType(value: string): DeviceType {
  const normalized = value.toLowerCase().trim();
  if (normalized !== 'mqtt' && normalized !== 'lora') {
    throw new Error("Invalid device type. Must be 'mqtt' or 'lora'.");
  }
  return normalized;
}

export function validateSerial(serial: string, type: DeviceType): string {
  if (type === 'lora') {
    if (!/^[0-9a-fA-F]{16}$/.test(serial)) {
      throw new Error('DevEUI must be exactly 16 hex characters.');
    }
  } else {
    if (serial.length < 6 || serial.length > 16) {
      throw new Error('Serial must be 6-16 characters.');
    }
  }
  return serial;
}

async function promptMissing(
  options: { name?: string; serial?: string; type?: string },
): Promise<CreateDeviceInput> {
  let { name, serial, type } = options;

  if (!name || !serial || !type) {
    const rl = readline.createInterface({ input, output });

    try {
      if (!name) {
        name = await rl.question('Device name: ');
      }
      if (!serial) {
        serial = await rl.question('Serial number: ');
      }
      if (!type) {
        type = await rl.question('Device type: ');
      }
    } finally {
      rl.close();
    }
  }

  return { name, serial, type };
}

export const createCommand = new Command('create')
  .description('Create a new device')
  .option('-n, --name <name>', 'device name')
  .option('-s, --serial <serial>', 'serial number')
  .option('-t, --type <type>', 'device type')
  .option('--json', 'output raw JSON')
  .action(async (options) => {
    try {
      const config = await getConfig();

      if (!config.token) {
        out.error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      const deviceInput = await promptMissing(options);

      const client = new ApiClient(config.apiUrl, config.token);
      const device = (await client.post('/api/devices', deviceInput)) as Device;

      if (options.json) {
        out.printJson(device);
      } else {
        out.success(`Device created successfully (ID: ${device._id})`);
      }
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
