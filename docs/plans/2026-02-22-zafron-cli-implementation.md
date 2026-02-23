# Zafron CLI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Node.js/TypeScript CLI tool (`zafron`) for managing IoT devices on the Zafron platform, starting with login and full device CRUD.

**Architecture:** Commander.js-based CLI with noun-verb command structure (`zafron devices create`). Auth via email/password login storing a JWT token locally. Thin API client wrapping Node's built-in `fetch`.

**Tech Stack:** TypeScript, Commander.js, chalk, cli-table3, Node 18+ built-ins (fetch, readline, fs)

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `bin/zafron`
- Create: `src/index.ts`

**Step 1: Initialize package.json**

```bash
cd /Users/asanchezdelc/Ticadia/zafron/zafron-cli
npm init -y
```

Then edit `package.json` to:

```json
{
  "name": "zafron",
  "version": "0.1.0",
  "description": "CLI tool for the Zafron IoT platform",
  "main": "dist/index.js",
  "bin": {
    "zafron": "./bin/zafron"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "node --experimental-vm-modules node_modules/.bin/jest"
  },
  "keywords": ["zafron", "iot", "cli"],
  "license": "MIT",
  "type": "module"
}
```

**Step 2: Install dependencies**

```bash
npm install commander chalk cli-table3
npm install -D typescript @types/node jest ts-jest @types/jest
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create bin/zafron**

```bash
#!/usr/bin/env node
import '../dist/index.js';
```

Wait — since we're using ESM, the bin file should be:

```
#!/usr/bin/env node
await import('../dist/index.js');
```

Actually, simplest approach: make `bin/zafron` just:

```
#!/usr/bin/env node
import('../dist/index.js');
```

**Step 5: Create src/index.ts**

```typescript
import { Command } from 'commander';

const program = new Command();

program
  .name('zafron')
  .description('CLI tool for the Zafron IoT platform')
  .version('0.1.0');

program.parse();
```

**Step 6: Build and verify**

```bash
npx tsc
chmod +x bin/zafron
node bin/zafron --help
```

Expected: Shows help text with name, description, version.

**Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json bin/ src/index.ts
git commit -m "feat: scaffold zafron CLI project"
```

---

### Task 2: Config management

**Files:**
- Create: `src/lib/config.ts`
- Test: `src/__tests__/config.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/config.test.ts`:

```typescript
import { jest } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Use a temp directory for tests
const TEST_DIR = path.join(os.tmpdir(), '.zafron-test-' + Date.now());
const TEST_CONFIG_PATH = path.join(TEST_DIR, 'config.json');

// We'll need to mock the config path
jest.unstable_mockModule('../lib/config.js', async () => {
  const actual = await import('../lib/config.js');
  return {
    ...actual,
    CONFIG_DIR: TEST_DIR,
    CONFIG_PATH: TEST_CONFIG_PATH,
  };
});

afterEach(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
});

describe('config', () => {
  it('returns default config when no file exists', async () => {
    const { getConfig, CONFIG_PATH } = await import('../lib/config.js');
    // Override for this test
    const config = getConfig(TEST_CONFIG_PATH);
    expect(config).toEqual({ apiUrl: 'https://api.zafron.dev' });
  });

  it('saves and reads config', async () => {
    const { saveConfig, getConfig } = await import('../lib/config.js');
    saveConfig({ token: 'test-token', apiUrl: 'https://api.zafron.dev' }, TEST_CONFIG_PATH);
    const config = getConfig(TEST_CONFIG_PATH);
    expect(config.token).toBe('test-token');
    expect(config.apiUrl).toBe('https://api.zafron.dev');
  });

  it('clears token on clearAuth', async () => {
    const { saveConfig, clearAuth, getConfig } = await import('../lib/config.js');
    saveConfig({ token: 'test-token', apiUrl: 'https://api.zafron.dev' }, TEST_CONFIG_PATH);
    clearAuth(TEST_CONFIG_PATH);
    const config = getConfig(TEST_CONFIG_PATH);
    expect(config.token).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npx jest --config='{"transform":{},"extensionsToTreatAsEsm":[".ts"]}'
```

Expected: FAIL — module not found.

**Step 3: Implement config module**

Create `src/lib/config.ts`:

```typescript
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface ZafronConfig {
  token?: string;
  apiUrl: string;
}

const DEFAULT_API_URL = 'https://api.zafron.dev';

export const CONFIG_DIR = path.join(os.homedir(), '.zafron');
export const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

export function getConfig(configPath: string = CONFIG_PATH): ZafronConfig {
  try {
    const data = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { apiUrl: DEFAULT_API_URL };
  }
}

export function saveConfig(config: ZafronConfig, configPath: string = CONFIG_PATH): void {
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

export function clearAuth(configPath: string = CONFIG_PATH): void {
  const config = getConfig(configPath);
  delete config.token;
  saveConfig(config, configPath);
}
```

**Step 4: Configure Jest for ESM TypeScript**

Create `jest.config.ts`:

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }],
  },
};

export default config;
```

**Step 5: Run tests**

```bash
npm test
```

Expected: All 3 tests PASS.

**Step 6: Commit**

```bash
git add src/lib/config.ts src/__tests__/config.test.ts jest.config.ts
git commit -m "feat: add config management for token and API URL"
```

---

### Task 3: API client

**Files:**
- Create: `src/lib/api-client.ts`
- Test: `src/__tests__/api-client.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/api-client.test.ts`:

```typescript
import { jest } from '@jest/globals';

// Mock global fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

import { ApiClient } from '../lib/api-client.js';

describe('ApiClient', () => {
  const client = new ApiClient('https://api.zafron.dev', 'test-token');

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('sends GET requests with auth header', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify([]), { status: 200 }));

    await client.get('/api/devices');

    expect(mockFetch).toHaveBeenCalledWith('https://api.zafron.dev/api/devices', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json',
      },
    });
  });

  it('sends POST requests with body', async () => {
    const body = { name: 'Test', serial: 'S001', type: 'mqtt' };
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify(body), { status: 201 }));

    await client.post('/api/devices', body);

    expect(mockFetch).toHaveBeenCalledWith('https://api.zafron.dev/api/devices', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  });

  it('throws on 401 with auth error message', async () => {
    mockFetch.mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));

    await expect(client.get('/api/devices')).rejects.toThrow(
      'Session expired. Run `zafron login` to re-authenticate.'
    );
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- api-client
```

Expected: FAIL — module not found.

**Step 3: Implement API client**

Create `src/lib/api-client.ts`:

```typescript
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  constructor(
    private baseUrl: string,
    private token?: string
  ) {}

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const options: RequestInit = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${path}`, options);

    if (response.status === 401) {
      throw new ApiError(401, 'Session expired. Run `zafron login` to re-authenticate.');
    }

    if (!response.ok) {
      const text = await response.text();
      let message: string;
      try {
        const json = JSON.parse(text);
        message = json.error || `Request failed with status ${response.status}`;
      } catch {
        message = `Request failed with status ${response.status}`;
      }
      throw new ApiError(response.status, message);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  get(path: string) {
    return this.request('GET', path);
  }

  post(path: string, body: unknown) {
    return this.request('POST', path, body);
  }

  patch(path: string, body: unknown) {
    return this.request('PATCH', path, body);
  }

  delete(path: string) {
    return this.request('DELETE', path);
  }
}
```

**Step 4: Run tests**

```bash
npm test -- api-client
```

Expected: All 3 tests PASS.

**Step 5: Commit**

```bash
git add src/lib/api-client.ts src/__tests__/api-client.test.ts
git commit -m "feat: add API client with auth header and error handling"
```

---

### Task 4: Device types

**Files:**
- Create: `src/types/device.ts`

**Step 1: Create device types**

Create `src/types/device.ts`:

```typescript
export interface DeviceCapability {
  _id?: string;
  name: string;
  value: number;
  channel: string;
  type: string;
  unit: string;
  array_value?: unknown[];
}

export interface Device {
  _id: string;
  name: string;
  serial: string;
  type: string;
  enabled: boolean;
  owner: string;
  lastOnline?: string;
  capabilities: DeviceCapability[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeviceInput {
  name: string;
  serial: string;
  type: string;
}
```

**Step 2: Build to verify types compile**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

```bash
git add src/types/device.ts
git commit -m "feat: add device TypeScript types"
```

---

### Task 5: Output formatting helpers

**Files:**
- Create: `src/lib/output.ts`

**Step 1: Create output helpers**

Create `src/lib/output.ts`:

```typescript
import chalk from 'chalk';
import Table from 'cli-table3';

export function success(message: string): void {
  console.log(chalk.green('✓') + ' ' + message);
}

export function error(message: string): void {
  console.error(chalk.red('Error:') + ' ' + message);
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function printTable(headers: string[], rows: string[][]): void {
  const table = new Table({
    head: headers.map(h => chalk.cyan(h)),
    style: { head: [], border: [] },
  });

  for (const row of rows) {
    table.push(row);
  }

  console.log(table.toString());
}

export function printDetail(fields: [string, string][]): void {
  const maxLabel = Math.max(...fields.map(([label]) => label.length));
  for (const [label, value] of fields) {
    console.log(`${chalk.bold(label.padEnd(maxLabel + 1))} ${value}`);
  }
}
```

**Step 2: Build to verify**

```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/output.ts
git commit -m "feat: add output formatting helpers (table, detail, JSON)"
```

---

### Task 6: Login command

**Files:**
- Create: `src/commands/login.ts`
- Modify: `src/index.ts`

**Step 1: Implement login command**

Create `src/commands/login.ts`:

```typescript
import { Command } from 'commander';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { ApiClient } from '../lib/api-client.js';
import { getConfig, saveConfig } from '../lib/config.js';
import { success, error } from '../lib/output.js';

export const loginCommand = new Command('login')
  .description('Authenticate with the Zafron platform')
  .action(async () => {
    const rl = readline.createInterface({ input, output });

    try {
      const email = await rl.question('Email: ');

      // Hide password input
      const password = await new Promise<string>((resolve) => {
        const rl2 = readline.createInterface({ input, output: output, terminal: true });
        process.stdout.write('Password: ');

        // Mute output for password
        let pwd = '';
        if (input.isTTY) {
          input.setRawMode(true);
        }
        input.resume();

        const onData = (ch: Buffer) => {
          const char = ch.toString();
          if (char === '\n' || char === '\r' || char === '\u0004') {
            if (input.isTTY) {
              input.setRawMode(false);
            }
            input.removeListener('data', onData);
            process.stdout.write('\n');
            rl2.close();
            resolve(pwd);
          } else if (char === '\u0003') {
            // Ctrl+C
            process.exit(1);
          } else if (char === '\u007F' || char === '\b') {
            // Backspace
            if (pwd.length > 0) {
              pwd = pwd.slice(0, -1);
            }
          } else {
            pwd += char;
          }
        };

        input.on('data', onData);
      });

      rl.close();

      const config = getConfig();
      const client = new ApiClient(config.apiUrl);

      const result = await client.post('/api/users/login', {
        username: email,
        password,
      }) as { token: string };

      saveConfig({ ...config, token: result.token });
      success('Logged in successfully. Token saved.');
    } catch (err: unknown) {
      rl.close();
      const message = err instanceof Error ? err.message : 'Login failed';
      error(message);
      process.exit(1);
    }
  });
```

Note: The API login endpoint expects `username` (not `email`) as the field name — see `POST /api/users/login` in the API code.

**Step 2: Wire login into index.ts**

Update `src/index.ts`:

```typescript
import { Command } from 'commander';
import { loginCommand } from './commands/login.js';

const program = new Command();

program
  .name('zafron')
  .description('CLI tool for the Zafron IoT platform')
  .version('0.1.0');

program.addCommand(loginCommand);

program.parse();
```

**Step 3: Build and verify**

```bash
npx tsc
node bin/zafron login --help
```

Expected: Shows login command help.

**Step 4: Commit**

```bash
git add src/commands/login.ts src/index.ts
git commit -m "feat: add login command with hidden password input"
```

---

### Task 7: Devices parent command + create

**Files:**
- Create: `src/commands/devices/index.ts`
- Create: `src/commands/devices/create.ts`
- Modify: `src/index.ts`

**Step 1: Create devices parent command**

Create `src/commands/devices/index.ts`:

```typescript
import { Command } from 'commander';
import { createCommand } from './create.js';

export const devicesCommand = new Command('devices')
  .description('Manage devices');

devicesCommand.addCommand(createCommand);
```

**Step 2: Create the create subcommand**

Create `src/commands/devices/create.ts`:

```typescript
import { Command } from 'commander';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import { success, error, printJson } from '../../lib/output.js';
import { Device } from '../../types/device.js';

export const createCommand = new Command('create')
  .description('Create a new device')
  .option('-n, --name <name>', 'Device name')
  .option('-s, --serial <serial>', 'Device serial number')
  .option('-t, --type <type>', 'Device type (mqtt or lora)')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    try {
      const config = getConfig();
      if (!config.token) {
        error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      let { name, serial, type } = opts;

      // Prompt for missing required fields
      if (!name || !serial || !type) {
        const rl = readline.createInterface({ input, output });

        if (!name) {
          name = await rl.question('Device name: ');
        }
        if (!serial) {
          serial = await rl.question('Serial number: ');
        }
        if (!type) {
          type = await rl.question('Type (mqtt/lora): ');
        }

        rl.close();
      }

      const client = new ApiClient(config.apiUrl, config.token);
      const device = await client.post('/api/devices', { name, serial, type }) as Device;

      if (opts.json) {
        printJson(device);
      } else {
        success(`Device created (id: ${device._id})`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create device';
      error(message);
      process.exit(1);
    }
  });
```

**Step 3: Wire devices into index.ts**

Update `src/index.ts`:

```typescript
import { Command } from 'commander';
import { loginCommand } from './commands/login.js';
import { devicesCommand } from './commands/devices/index.js';

const program = new Command();

program
  .name('zafron')
  .description('CLI tool for the Zafron IoT platform')
  .version('0.1.0');

program.addCommand(loginCommand);
program.addCommand(devicesCommand);

program.parse();
```

**Step 4: Build and verify**

```bash
npx tsc
node bin/zafron devices create --help
```

Expected: Shows create command with `--name`, `--serial`, `--type`, `--json` options.

**Step 5: Commit**

```bash
git add src/commands/devices/ src/index.ts
git commit -m "feat: add devices create command with interactive prompts"
```

---

### Task 8: Devices list command

**Files:**
- Create: `src/commands/devices/list.ts`
- Modify: `src/commands/devices/index.ts`

**Step 1: Implement list command**

Create `src/commands/devices/list.ts`:

```typescript
import { Command } from 'commander';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import { error, printJson, printTable } from '../../lib/output.js';
import { Device } from '../../types/device.js';

function formatLastOnline(dateStr?: string): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export const listCommand = new Command('list')
  .description('List all devices')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    try {
      const config = getConfig();
      if (!config.token) {
        error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      const client = new ApiClient(config.apiUrl, config.token);
      const devices = await client.get('/api/devices') as Device[];

      if (opts.json) {
        printJson(devices);
        return;
      }

      if (devices.length === 0) {
        console.log('No devices found.');
        return;
      }

      printTable(
        ['ID', 'Name', 'Type', 'Serial', 'Enabled', 'Last Online'],
        devices.map(d => [
          d._id,
          d.name,
          d.type,
          d.serial,
          d.enabled ? 'true' : 'false',
          formatLastOnline(d.lastOnline),
        ])
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to list devices';
      error(message);
      process.exit(1);
    }
  });
```

**Step 2: Register in devices/index.ts**

Add to `src/commands/devices/index.ts`:

```typescript
import { Command } from 'commander';
import { createCommand } from './create.js';
import { listCommand } from './list.js';

export const devicesCommand = new Command('devices')
  .description('Manage devices');

devicesCommand.addCommand(createCommand);
devicesCommand.addCommand(listCommand);
```

**Step 3: Build and verify**

```bash
npx tsc
node bin/zafron devices list --help
```

Expected: Shows list command with `--json` option.

**Step 4: Commit**

```bash
git add src/commands/devices/list.ts src/commands/devices/index.ts
git commit -m "feat: add devices list command with table output"
```

---

### Task 9: Devices get command

**Files:**
- Create: `src/commands/devices/get.ts`
- Modify: `src/commands/devices/index.ts`

**Step 1: Implement get command**

Create `src/commands/devices/get.ts`:

```typescript
import { Command } from 'commander';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import { error, printJson, printDetail } from '../../lib/output.js';
import { Device } from '../../types/device.js';

export const getCommand = new Command('get')
  .description('Get device details')
  .argument('<id>', 'Device ID')
  .option('--json', 'Output as JSON')
  .action(async (id: string, opts) => {
    try {
      const config = getConfig();
      if (!config.token) {
        error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      const client = new ApiClient(config.apiUrl, config.token);
      const device = await client.get(`/api/devices/${id}`) as Device;

      if (opts.json) {
        printJson(device);
        return;
      }

      printDetail([
        ['Name:', device.name],
        ['ID:', device._id],
        ['Serial:', device.serial],
        ['Type:', device.type],
        ['Enabled:', device.enabled ? 'true' : 'false'],
        ['Last Online:', device.lastOnline || 'Never'],
      ]);

      if (device.capabilities && device.capabilities.length > 0) {
        console.log('\nCapabilities:');
        for (const cap of device.capabilities) {
          console.log(`  - ${cap.name} (ch: ${cap.channel}) = ${cap.value} ${cap.unit}`);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get device';
      error(message);
      process.exit(1);
    }
  });
```

**Step 2: Register in devices/index.ts**

Add import and `devicesCommand.addCommand(getCommand)`.

**Step 3: Build and verify**

```bash
npx tsc
node bin/zafron devices get --help
```

Expected: Shows get command with `<id>` argument and `--json` option.

**Step 4: Commit**

```bash
git add src/commands/devices/get.ts src/commands/devices/index.ts
git commit -m "feat: add devices get command with detail view"
```

---

### Task 10: Devices update command

**Files:**
- Create: `src/commands/devices/update.ts`
- Modify: `src/commands/devices/index.ts`

**Step 1: Implement update command**

Create `src/commands/devices/update.ts`:

```typescript
import { Command } from 'commander';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import { success, error } from '../../lib/output.js';

export const updateCommand = new Command('update')
  .description('Update a device')
  .argument('<id>', 'Device ID')
  .option('-n, --name <name>', 'New device name')
  .option('--enabled <boolean>', 'Enable or disable device')
  .action(async (id: string, opts) => {
    try {
      const config = getConfig();
      if (!config.token) {
        error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      const body: Record<string, unknown> = {};
      if (opts.name) body.name = opts.name;
      if (opts.enabled !== undefined) body.enabled = opts.enabled === 'true';

      if (Object.keys(body).length === 0) {
        error('No update flags provided. Use --name or --enabled.');
        process.exit(1);
      }

      const client = new ApiClient(config.apiUrl, config.token);
      await client.patch(`/api/devices/${id}`, body);

      success('Device updated');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update device';
      error(message);
      process.exit(1);
    }
  });
```

**Step 2: Register in devices/index.ts**

Add import and `devicesCommand.addCommand(updateCommand)`.

**Step 3: Build and verify**

```bash
npx tsc
node bin/zafron devices update --help
```

Expected: Shows update command with `<id>`, `--name`, `--enabled` options.

**Step 4: Commit**

```bash
git add src/commands/devices/update.ts src/commands/devices/index.ts
git commit -m "feat: add devices update command"
```

---

### Task 11: Devices delete command

**Files:**
- Create: `src/commands/devices/delete.ts`
- Modify: `src/commands/devices/index.ts`

**Step 1: Implement delete command**

Create `src/commands/devices/delete.ts`:

```typescript
import { Command } from 'commander';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import { success, error } from '../../lib/output.js';
import { Device } from '../../types/device.js';

export const deleteCommand = new Command('delete')
  .description('Delete a device')
  .argument('<id>', 'Device ID')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (id: string, opts) => {
    try {
      const config = getConfig();
      if (!config.token) {
        error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      const client = new ApiClient(config.apiUrl, config.token);

      if (!opts.yes) {
        // Fetch device name for confirmation
        const device = await client.get(`/api/devices/${id}`) as Device;
        const rl = readline.createInterface({ input, output });
        const answer = await rl.question(`Are you sure you want to delete "${device.name}"? (y/N): `);
        rl.close();

        if (answer.toLowerCase() !== 'y') {
          console.log('Cancelled.');
          return;
        }
      }

      await client.delete(`/api/devices/${id}`);
      success('Device deleted');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete device';
      error(message);
      process.exit(1);
    }
  });
```

**Step 2: Register in devices/index.ts**

Final `src/commands/devices/index.ts`:

```typescript
import { Command } from 'commander';
import { createCommand } from './create.js';
import { listCommand } from './list.js';
import { getCommand } from './get.js';
import { updateCommand } from './update.js';
import { deleteCommand } from './delete.js';

export const devicesCommand = new Command('devices')
  .description('Manage devices');

devicesCommand.addCommand(createCommand);
devicesCommand.addCommand(listCommand);
devicesCommand.addCommand(getCommand);
devicesCommand.addCommand(updateCommand);
devicesCommand.addCommand(deleteCommand);
```

**Step 3: Build and verify**

```bash
npx tsc
node bin/zafron devices delete --help
```

Expected: Shows delete command with `<id>` and `--yes` option.

**Step 4: Commit**

```bash
git add src/commands/devices/delete.ts src/commands/devices/index.ts
git commit -m "feat: add devices delete command with confirmation"
```

---

### Task 12: Final build, link, and smoke test

**Step 1: Full build**

```bash
npx tsc
```

Expected: No errors.

**Step 2: Link globally for testing**

```bash
npm link
```

**Step 3: Smoke test all commands**

```bash
zafron --help
zafron login --help
zafron devices --help
zafron devices create --help
zafron devices list --help
zafron devices get --help
zafron devices update --help
zafron devices delete --help
```

Expected: All commands show correct help text.

**Step 4: Run all tests**

```bash
npm test
```

Expected: All tests pass.

**Step 5: Commit any remaining changes**

```bash
git add -A
git commit -m "chore: final build verification"
```
