# Profiles CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `zafron profiles list|get|create|update|delete` commands following existing codebase patterns.

**Architecture:** New `src/commands/profiles/` directory with one file per subcommand plus an `index.ts` barrel. Types expanded in `src/types/device.ts`. Registered in `src/index.ts`. The `profiles create` command reuses the `promptMenu` pattern from `devices create` (duplicated locally, not extracted — YAGNI).

**Tech Stack:** TypeScript, Commander.js, Node readline, Jest (ESM)

**Spec:** `docs/superpowers/specs/2026-03-21-profiles-crud-design.md`

---

### Task 1: Expand Profile type, add CreateProfileInput

**Files:**
- Modify: `src/types/device.ts`

- [ ] **Step 1: Update types**

Replace the existing `Profile` interface and add `CreateProfileInput`. The existing `ProfilesResponse` stays as-is (it references `Profile[]` so it picks up the expanded shape).

In `src/types/device.ts`, replace:
```typescript
export interface Profile {
  _id: string;
  name: string;
}
```

With:
```typescript
export interface Profile {
  _id: string;
  name: string;
  source: {
    _id: string;
    name: string;
  };
  image: string;
  decoder_type: string;
  decoder: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProfileInput {
  name: string;
  source: string;
  image: string;
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors. The `devices create` command only accesses `p._id` and `p.name` which still exist.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/types/device.ts
git commit -m "feat: expand Profile type and add CreateProfileInput"
```

---

### Task 2: Add profiles list and get commands

**Files:**
- Create: `src/commands/profiles/index.ts`
- Create: `src/commands/profiles/list.ts`
- Create: `src/commands/profiles/get.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create `src/commands/profiles/list.ts`**

```typescript
import { Command } from 'commander';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import * as out from '../../lib/output.js';
import type { Profile, ProfilesResponse } from '../../types/device.js';

export const listCommand = new Command('list')
  .description('List all profiles')
  .option('--json', 'output raw JSON')
  .action(async (options) => {
    try {
      const config = await getConfig();

      if (!config.token) {
        out.error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      const client = new ApiClient(config.apiUrl, config.token);
      const response = (await client.get('/api/profiles?page=1&limit=50')) as ProfilesResponse;

      if (options.json) {
        out.printJson(response);
        return;
      }

      if (response.data.length === 0) {
        console.log('No profiles found.');
        return;
      }

      const rows = response.data.map((p: Profile) => [
        p._id,
        p.name,
        p.source?.name ?? 'N/A',
        p.image,
        new Date(p.createdAt).toLocaleDateString(),
      ]);

      out.printTable(['ID', 'Name', 'Source', 'Image', 'Created'], rows);
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
```

- [ ] **Step 2: Create `src/commands/profiles/get.ts`**

```typescript
import { Command } from 'commander';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import * as out from '../../lib/output.js';
import type { Profile } from '../../types/device.js';

export const getCommand = new Command('get')
  .description('Get profile details')
  .argument('<id>', 'profile ID')
  .option('--json', 'output raw JSON')
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

      out.printDetail([
        ['Name', profile.name],
        ['ID', profile._id],
        ['Source', profile.source?.name ?? 'N/A'],
        ['Image', profile.image],
        ['Decoder Type', profile.decoder_type],
        ['Created', new Date(profile.createdAt).toLocaleDateString()],
        ['Updated', new Date(profile.updatedAt).toLocaleDateString()],
      ]);
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
```

- [ ] **Step 3: Create `src/commands/profiles/index.ts`**

```typescript
import { Command } from 'commander';
import { listCommand } from './list.js';
import { getCommand } from './get.js';

export const profilesCommand = new Command('profiles')
  .description('Manage device profiles');

profilesCommand.addCommand(listCommand);
profilesCommand.addCommand(getCommand);
```

- [ ] **Step 4: Register in `src/index.ts`**

Add import and registration. After the existing `sourcesCommand` import, add:
```typescript
import { profilesCommand } from './commands/profiles/index.js';
```

After `program.addCommand(sourcesCommand);`, add:
```typescript
program.addCommand(profilesCommand);
```

- [ ] **Step 5: Verify build and tests**

Run: `npx tsc --noEmit && npm test`
Expected: No errors, all tests pass

- [ ] **Step 6: Commit**

```bash
git add src/commands/profiles/ src/index.ts
git commit -m "feat: add profiles list and get commands"
```

---

### Task 3: Add profiles create command with image validation

**Files:**
- Create: `src/commands/profiles/create.ts`
- Modify: `src/commands/profiles/index.ts`

- [ ] **Step 1: Create `src/commands/profiles/create.ts`**

```typescript
import { Command } from 'commander';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import * as out from '../../lib/output.js';
import type { Profile, CreateProfileInput } from '../../types/device.js';
import type { Source, SourcesResponse } from '../../types/source.js';

const PROFILE_IMAGES = [
  'server', 'microchip', 'network', 'thermometer', 'water', 'battery',
  'sun', 'wind', 'cloud', 'leaf', 'signal', 'satellite',
  'bolt', 'gauge', 'cube', 'box', 'industry', 'warehouse',
  'location', 'map', 'globe', 'tower',
] as const;

export function validateImage(value: string): string {
  if (!PROFILE_IMAGES.includes(value as typeof PROFILE_IMAGES[number])) {
    throw new Error(`Invalid image. Allowed values: ${PROFILE_IMAGES.join(', ')}`);
  }
  return value;
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

async function fetchSources(client: ApiClient): Promise<Source[]> {
  try {
    const response = (await client.get('/api/sources?page=1&limit=50')) as SourcesResponse;
    return response.data;
  } catch (err) {
    throw new Error(`Failed to fetch sources: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function promptMissing(
  options: { name?: string; source?: string; image?: string },
  client: ApiClient,
): Promise<CreateProfileInput> {
  let { name, source, image } = options;

  const needsPrompt = !name || !source || !image;
  let rl: readline.Interface | undefined;

  if (needsPrompt) {
    rl = readline.createInterface({ input, output });
  }

  try {
    // 1. Name
    if (!name) {
      name = await rl!.question('Profile name: ');
    }

    // 2. Source
    if (source) {
      const sources = await fetchSources(client);
      const match = sources.find((s) => s._id === source);
      if (!match) {
        const names = sources.map((s) => s.name).join(', ');
        throw new Error(`Invalid source. Available sources: ${names}`);
      }
    } else {
      const sources = await fetchSources(client);
      if (sources.length === 0) {
        throw new Error('No sources available. Create a source first.');
      }
      source = await promptMenu(
        rl!,
        'Source',
        sources.map((s) => ({ display: s.name, value: s._id })),
      );
    }

    // 3. Image
    if (image) {
      validateImage(image);
    } else {
      image = await promptMenu(
        rl!,
        'Image',
        PROFILE_IMAGES.map((img) => ({ display: img, value: img })),
      );
    }

    return { name, source, image };
  } finally {
    rl?.close();
  }
}

export const createCommand = new Command('create')
  .description('Create a new profile')
  .option('-n, --name <name>', 'profile name')
  .option('-s, --source <source>', 'source ID')
  .option('-i, --image <image>', 'profile image')
  .option('--json', 'output raw JSON')
  .action(async (options) => {
    try {
      const config = await getConfig();

      if (!config.token) {
        out.error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      const client = new ApiClient(config.apiUrl, config.token);
      const profileInput = await promptMissing(options, client);

      const profile = (await client.post('/api/profiles', profileInput)) as Profile;

      if (options.json) {
        out.printJson(profile);
      } else {
        out.success(`Profile created successfully (ID: ${profile._id})`);
      }
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
```

- [ ] **Step 2: Add createCommand to `src/commands/profiles/index.ts`**

Update the file to import and register the create command:

```typescript
import { Command } from 'commander';
import { listCommand } from './list.js';
import { getCommand } from './get.js';
import { createCommand } from './create.js';

export const profilesCommand = new Command('profiles')
  .description('Manage device profiles');

profilesCommand.addCommand(createCommand);
profilesCommand.addCommand(listCommand);
profilesCommand.addCommand(getCommand);
```

- [ ] **Step 3: Verify build and tests**

Run: `npx tsc --noEmit && npm test`
Expected: No errors, all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/commands/profiles/create.ts src/commands/profiles/index.ts
git commit -m "feat: add profiles create command with source and image selection"
```

---

### Task 4: Add profiles update and delete commands

**Files:**
- Create: `src/commands/profiles/update.ts`
- Create: `src/commands/profiles/delete.ts`
- Modify: `src/commands/profiles/index.ts`

- [ ] **Step 1: Create `src/commands/profiles/update.ts`**

```typescript
import { Command } from 'commander';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import * as out from '../../lib/output.js';
import { validateImage } from './create.js';

export const updateCommand = new Command('update')
  .description('Update a profile')
  .argument('<id>', 'profile ID')
  .option('-n, --name <name>', 'profile name')
  .option('-s, --source <source>', 'source ID')
  .option('-i, --image <image>', 'profile image')
  .action(async (id: string, options) => {
    try {
      const config = await getConfig();

      if (!config.token) {
        out.error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      const body: Record<string, unknown> = {};

      if (options.name !== undefined) {
        body.name = options.name;
      }

      if (options.source !== undefined) {
        body.source = options.source;
      }

      if (options.image !== undefined) {
        validateImage(options.image);
        body.image = options.image;
      }

      if (Object.keys(body).length === 0) {
        out.error('No update flags provided. Use --name, --source, or --image.');
        process.exit(1);
      }

      const client = new ApiClient(config.apiUrl, config.token);
      await client.patch(`/api/profiles/${id}`, body);

      out.success('Profile updated');
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
```

- [ ] **Step 2: Create `src/commands/profiles/delete.ts`**

```typescript
import { Command } from 'commander';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { ApiClient } from '../../lib/api-client.js';
import { getConfig } from '../../lib/config.js';
import * as out from '../../lib/output.js';
import type { Profile } from '../../types/device.js';

export const deleteCommand = new Command('delete')
  .description('Delete a profile')
  .argument('<id>', 'profile ID')
  .option('-y, --yes', 'skip confirmation prompt')
  .action(async (id: string, options) => {
    try {
      const config = await getConfig();

      if (!config.token) {
        out.error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      const client = new ApiClient(config.apiUrl, config.token);

      if (!options.yes) {
        const profile = (await client.get(`/api/profiles/${id}`)) as Profile;
        const rl = readline.createInterface({ input, output });

        try {
          const answer = await rl.question(
            `Are you sure you want to delete "${profile.name}"? (y/N): `,
          );

          if (answer.toLowerCase() !== 'y') {
            console.log('Cancelled.');
            return;
          }
        } finally {
          rl.close();
        }
      }

      await client.delete(`/api/profiles/${id}`);
      out.success('Profile deleted');
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
```

- [ ] **Step 3: Update `src/commands/profiles/index.ts`**

Add imports and registration for update and delete:

```typescript
import { Command } from 'commander';
import { createCommand } from './create.js';
import { listCommand } from './list.js';
import { getCommand } from './get.js';
import { updateCommand } from './update.js';
import { deleteCommand } from './delete.js';

export const profilesCommand = new Command('profiles')
  .description('Manage device profiles');

profilesCommand.addCommand(createCommand);
profilesCommand.addCommand(listCommand);
profilesCommand.addCommand(getCommand);
profilesCommand.addCommand(updateCommand);
profilesCommand.addCommand(deleteCommand);
```

- [ ] **Step 4: Verify build and tests**

Run: `npx tsc --noEmit && npm test`
Expected: No errors, all tests pass

- [ ] **Step 5: Commit**

```bash
git add src/commands/profiles/update.ts src/commands/profiles/delete.ts src/commands/profiles/index.ts
git commit -m "feat: add profiles update and delete commands"
```

---

### Task 5: Add image validation tests

**Files:**
- Create: `src/__tests__/profiles-create.test.ts`

- [ ] **Step 1: Create test file**

```typescript
import { validateImage } from '../commands/profiles/create.js';

describe('validateImage', () => {
  it('accepts valid image values', () => {
    expect(validateImage('cube')).toBe('cube');
    expect(validateImage('microchip')).toBe('microchip');
    expect(validateImage('server')).toBe('server');
    expect(validateImage('tower')).toBe('tower');
  });

  it('rejects invalid image values', () => {
    expect(() => validateImage('invalid')).toThrow('Invalid image. Allowed values:');
  });

  it('rejects empty string', () => {
    expect(() => validateImage('')).toThrow('Invalid image. Allowed values:');
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npm test -- src/__tests__/profiles-create.test.ts`
Expected: All 3 tests pass

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/profiles-create.test.ts
git commit -m "test: add image validation tests for profiles create"
```

---

### Task 6: Smoke test

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: Compiles successfully

- [ ] **Step 2: Test help output**

Run: `node dist/index.js profiles --help`
Expected: Shows subcommands: create, list, get, update, delete

- [ ] **Step 3: Test profiles list**

Run: `node dist/index.js profiles list`
Expected: Table of profiles or "No profiles found."

- [ ] **Step 4: Test image validation**

Run: `node dist/index.js profiles update someId -i badimage`
Expected: Error `"Invalid image. Allowed values: server, microchip, ..."`

- [ ] **Step 5: Test no-flags update**

Run: `node dist/index.js profiles update someId`
Expected: Error `"No update flags provided. Use --name, --source, or --image."`
