# Devices Create Command Optimization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize `zafron devices create` with constrained types (mqtt/lora), serial validation, and interactive profile selection for LoRa devices.

**Architecture:** All changes are in two files: types in `src/types/device.ts` and command logic in `src/commands/devices/create.ts`. Validation and prompting stay inline in the create command. A new test file covers validation logic extracted into pure functions.

**Tech Stack:** TypeScript, Commander.js, Node readline, Jest (ESM)

**Spec:** `docs/superpowers/specs/2026-03-21-devices-create-optimization-design.md`

---

### Task 1: Add Profile and ProfilesResponse types, update CreateDeviceInput and Device

**Files:**
- Modify: `src/types/device.ts`

- [ ] **Step 1: Add types**

Add `profile` to `CreateDeviceInput` and `Device`, and add `Profile`/`ProfilesResponse` interfaces:

```typescript
// Update CreateDeviceInput (profile is optional so existing callers still compile):
export interface CreateDeviceInput {
  name: string;
  serial: string;
  type: string;
  profile?: string;
}

// Add profile to Device (after `type`):
profile?: string;

// Add new interfaces at end of file:
export interface Profile {
  _id: string;
  name: string;
}

export interface ProfilesResponse {
  total: number;
  pages: number;
  page: number;
  limit: number;
  data: Profile[];
}
```

Note: `profile` is optional (`?`) in `CreateDeviceInput` so the build doesn't break before Task 3 updates the caller. Task 3 will always provide it.

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/types/device.ts
git commit -m "feat: add profile types for device creation"
```

---

### Task 2: Add validation functions with tests

**Files:**
- Create: `src/__tests__/devices-create.test.ts`
- Modify: `src/commands/devices/create.ts` (export validation functions)

- [ ] **Step 1: Write validation functions in create.ts**

Add these exported functions near the top of `src/commands/devices/create.ts` (below imports):

```typescript
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
```

- [ ] **Step 2: Write tests**

Create `src/__tests__/devices-create.test.ts`:

```typescript
import { validateType, validateSerial } from '../commands/devices/create.js';

describe('validateType', () => {
  it('accepts mqtt', () => {
    expect(validateType('mqtt')).toBe('mqtt');
  });

  it('accepts lora', () => {
    expect(validateType('lora')).toBe('lora');
  });

  it('normalizes case', () => {
    expect(validateType('MQTT')).toBe('mqtt');
    expect(validateType('LoRa')).toBe('lora');
  });

  it('rejects invalid types', () => {
    expect(() => validateType('zigbee')).toThrow("Invalid device type. Must be 'mqtt' or 'lora'.");
  });

  it('rejects empty string', () => {
    expect(() => validateType('')).toThrow("Invalid device type. Must be 'mqtt' or 'lora'.");
  });
});

describe('validateSerial', () => {
  it('accepts valid mqtt serial (6-16 chars)', () => {
    expect(validateSerial('ABCDEF', 'mqtt')).toBe('ABCDEF');
    expect(validateSerial('1234567890ABCDEF', 'mqtt')).toBe('1234567890ABCDEF');
  });

  it('rejects mqtt serial shorter than 6', () => {
    expect(() => validateSerial('ABCDE', 'mqtt')).toThrow('Serial must be 6-16 characters.');
  });

  it('rejects mqtt serial longer than 16', () => {
    expect(() => validateSerial('12345678901234567', 'mqtt')).toThrow('Serial must be 6-16 characters.');
  });

  it('accepts valid lora DevEUI (16 hex chars)', () => {
    expect(validateSerial('A84041000181C061', 'lora')).toBe('A84041000181C061');
    expect(validateSerial('0011aabbccddeeff', 'lora')).toBe('0011aabbccddeeff');
  });

  it('rejects lora DevEUI with wrong length', () => {
    expect(() => validateSerial('A84041', 'lora')).toThrow('DevEUI must be exactly 16 hex characters.');
  });

  it('rejects lora DevEUI with non-hex chars', () => {
    expect(() => validateSerial('G84041000181C061', 'lora')).toThrow('DevEUI must be exactly 16 hex characters.');
  });
});
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npm test -- src/__tests__/devices-create.test.ts`
Expected: All 9 tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/commands/devices/create.ts src/__tests__/devices-create.test.ts
git commit -m "feat: add type and serial validation with tests"
```

---

### Task 3: Rewrite interactive prompts with type menu, serial validation, and profile selection

**Files:**
- Modify: `src/commands/devices/create.ts`

- [ ] **Step 1: Rewrite the promptMissing function and command options**

Replace the entire contents of `src/commands/devices/create.ts` with the following. This preserves the exported validation functions from Task 2 and adds the new interactive flow:

```typescript
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
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run existing tests to verify nothing breaks**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/commands/devices/create.ts
git commit -m "feat: add type menu, serial validation, and profile selection to devices create"
```

---

### Task 4: Manual smoke test

- [ ] **Step 1: Build the project**

Run: `npm run build`
Expected: Compiles successfully

- [ ] **Step 2: Test help output**

Run: `node dist/index.js devices create --help`
Expected: Shows all flags including `-t, --type` and `-p, --profile`

- [ ] **Step 3: Test type validation from flag**

Run: `node dist/index.js devices create -n test -t zigbee -s ABCDEF`
Expected: Error `"Invalid device type. Must be 'mqtt' or 'lora'."`

- [ ] **Step 4: Test serial validation from flag**

Run: `node dist/index.js devices create -n test -t lora -s TOOSHORT`
Expected: Error `"DevEUI must be exactly 16 hex characters."`

- [ ] **Step 5: Commit any final fixes if needed**
