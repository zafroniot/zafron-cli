import { Command } from 'commander';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import * as out from '../../lib/output.js';
import type { Device, CreateDeviceInput, Profile, ProfilesResponse } from '../../types/device.js';

const DEVICE_TYPES = ['mqtt', 'lora'] as const;
type DeviceType = (typeof DEVICE_TYPES)[number];

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

async function promptMenu(
  rl: readline.Interface,
  label: string,
  items: { display: string; value: string }[],
): Promise<string> {
  console.log(`${label}:`);
  items.forEach((item, i) => console.log(`  ${i + 1}) ${item.display}`));
  const answer = await rl.question('Select: ');
  const index = parseInt(answer, 10) - 1;
  if (isNaN(index) || index < 0 || index >= items.length) {
    throw new Error(`Invalid selection. Enter a number between 1 and ${items.length}.`);
  }
  return items[index].value;
}

async function fetchProfiles(client: ApiClient): Promise<Profile[]> {
  try {
    const response = (await client.get('/api/profiles')) as ProfilesResponse;
    return response.data;
  } catch (err) {
    throw new Error(`Failed to fetch profiles: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function promptMissing(
  options: { name?: string; serial?: string; type?: string; profile?: string },
  client: ApiClient,
): Promise<CreateDeviceInput> {
  let { name, serial, type, profile } = options;

  const needsPrompt = !name || !type || !serial || (type?.toLowerCase() === 'lora' && !profile);
  let rl: readline.Interface | undefined;

  if (needsPrompt) {
    rl = readline.createInterface({ input, output });
  }

  try {
    // 1. Name
    if (!name) {
      name = await rl!.question('Device name: ');
    }

    // 2. Type
    let deviceType: DeviceType;
    if (type) {
      deviceType = validateType(type);
    } else {
      const typeValue = await promptMenu(rl!, 'Device type', [
        { display: 'mqtt', value: 'mqtt' },
        { display: 'lora', value: 'lora' },
      ]);
      deviceType = typeValue as DeviceType;
    }

    // 3. Serial
    if (!serial) {
      const serialLabel = deviceType === 'lora' ? 'DevEUI (16 hex characters): ' : 'Serial number: ';
      serial = await rl!.question(serialLabel);
    }
    validateSerial(serial, deviceType);

    // 4. Profile
    let profileId = '';
    if (deviceType === 'lora') {
      if (profile) {
        // Validate --profile flag against API
        const profiles = await fetchProfiles(client);
        const match = profiles.find((p) => p._id === profile);
        if (!match) {
          const names = profiles.map((p) => p.name).join(', ');
          throw new Error(`Invalid profile. Available profiles: ${names}`);
        }
        profileId = profile;
      } else {
        const profiles = await fetchProfiles(client);
        if (profiles.length === 0) {
          throw new Error('No profiles available. Cannot create a LoRa device without a profile.');
        }
        profileId = await promptMenu(
          rl!,
          'Device profile',
          profiles.map((p) => ({ display: p.name, value: p._id })),
        );
      }
    }

    return { name, serial, type: deviceType, profile: profileId };
  } finally {
    rl?.close();
  }
}

export const createCommand = new Command('create')
  .description('Create a new device')
  .option('-n, --name <name>', 'device name')
  .option('-s, --serial <serial>', 'serial number')
  .option('-t, --type <type>', 'device type (mqtt or lora)')
  .option('-p, --profile <profile>', 'device profile ID (lora only)')
  .option('--json', 'output raw JSON')
  .action(async (options) => {
    try {
      const config = await getConfig();

      if (!config.token) {
        out.error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      const client = new ApiClient(config.apiUrl, config.token);
      const deviceInput = await promptMissing(options, client);

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
