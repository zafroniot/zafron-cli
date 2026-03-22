# Profiles Decoder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `zafron profiles decoder get|set|test` subcommands to manage profile decoder scripts from the CLI.

**Architecture:** Single new file `src/commands/profiles/decoder.ts` containing a Commander command group with three subcommands. A `validateDecoder` function is exported for testing. Registered in the existing profiles index.

**Tech Stack:** TypeScript, Commander.js, Node fs/readline, Jest (ESM)

**Spec:** `docs/superpowers/specs/2026-03-21-profiles-decoder-design.md`

---

### Task 1: Create decoder command with get and set subcommands

**Files:**
- Create: `src/commands/profiles/decoder.ts`
- Modify: `src/commands/profiles/index.ts`

- [ ] **Step 1: Create `src/commands/profiles/decoder.ts`**

```typescript
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
```

- [ ] **Step 2: Register in `src/commands/profiles/index.ts`**

Add import at the top:
```typescript
import { decoderCommand } from './decoder.js';
```

Add registration at the bottom:
```typescript
profilesCommand.addCommand(decoderCommand);
```

- [ ] **Step 3: Verify build and tests**

Run: `npx tsc --noEmit && npm test`
Expected: No errors, all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/commands/profiles/decoder.ts src/commands/profiles/index.ts
git commit -m "feat: add profiles decoder get and set commands"
```

---

### Task 2: Add decoder test subcommand

**Files:**
- Modify: `src/commands/profiles/decoder.ts`

- [ ] **Step 1: Add test subcommand and DecodeResponse type**

In `src/commands/profiles/decoder.ts`, add the `DecodeResponse` interface near the top (after imports):

```typescript
interface DecodeResponse {
  decoded: {
    channel: string;
    name: string;
    value: number;
    unit: string;
    type: string;
  }[];
  errors: {
    message: string;
    path: unknown[];
    stack: string;
  }[];
}
```

Then add the test command before `export const decoderCommand`:

```typescript
const testCommand = new Command('test')
  .description('Test a decoder with a payload')
  .argument('<id>', 'profile ID')
  .requiredOption('--payload <string>', 'base64 or hex encoded payload')
  .option('--fport <number>', 'LoRaWAN fPort number', '1')
  .option('--hex', 'payload is hex encoded')
  .option('--json', 'output raw JSON response')
  .action(async (id: string, options) => {
    try {
      const config = await getConfig();

      if (!config.token) {
        out.error('Not logged in. Run `zafron login` first.');
        process.exit(1);
      }

      const client = new ApiClient(config.apiUrl, config.token);
      const body = {
        payload: options.payload,
        fPort: parseInt(options.fport, 10),
      };

      const response = (await client.post(`/api/profiles/${id}/decode`, body)) as DecodeResponse;

      if (options.json) {
        out.printJson(response);
        return;
      }

      if (response.decoded && response.decoded.length > 0) {
        const rows = response.decoded.map((d) => [
          d.channel,
          d.name,
          String(d.value),
          d.unit,
          d.type,
        ]);
        out.printTable(['Channel', 'Name', 'Value', 'Unit', 'Type'], rows);
      } else if (!response.errors || response.errors.length === 0) {
        console.log('No output from decoder.');
      }

      if (response.errors && response.errors.length > 0) {
        console.log('\nValidation warnings:');
        for (const err of response.errors) {
          console.log(`  - ${err.message}`);
        }
      }
    } catch (err) {
      out.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });
```

Then register it in the `decoderCommand` group:

```typescript
decoderCommand.addCommand(testCommand);
```

- [ ] **Step 2: Verify build and tests**

Run: `npx tsc --noEmit && npm test`
Expected: No errors, all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/commands/profiles/decoder.ts
git commit -m "feat: add profiles decoder test command"
```

---

### Task 3: Add validateDecoder tests

**Files:**
- Create: `src/__tests__/profiles-decoder.test.ts`

- [ ] **Step 1: Create test file**

```typescript
import { validateDecoder } from '../commands/profiles/decoder.js';

describe('validateDecoder', () => {
  it('accepts valid decoder with decode function', () => {
    const code = `
      function decode(fPort, buffer, json) {
        return [{ channel: "1", name: "Temp", value: 23.5, unit: "c", type: "temp" }];
      }
    `;
    expect(() => validateDecoder(code)).not.toThrow();
  });

  it('accepts decode function with different spacing', () => {
    const code = 'function  decode ( fPort , buffer , json ) { return []; }';
    expect(() => validateDecoder(code)).not.toThrow();
  });

  it('rejects code without decode function', () => {
    const code = 'function encode(data) { return data; }';
    expect(() => validateDecoder(code)).toThrow("Decoder must contain a 'decode' function.");
  });

  it('rejects empty string', () => {
    expect(() => validateDecoder('')).toThrow("Decoder must contain a 'decode' function.");
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npm test -- src/__tests__/profiles-decoder.test.ts`
Expected: All 4 tests pass

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/profiles-decoder.test.ts
git commit -m "test: add validateDecoder tests"
```

---

### Task 4: Smoke test

- [ ] **Step 1: Build**

Run: `npm run build`
Expected: Compiles successfully

- [ ] **Step 2: Test help output**

Run: `node dist/index.js profiles decoder --help`
Expected: Shows subcommands: get, set, test

- [ ] **Step 3: Test decoder get**

Run: `node dist/index.js profiles decoder get 69a493e8b29bae89b37fd36a`
Expected: Outputs the decoder JS code to stdout

- [ ] **Step 4: Test decoder set validation**

Create a temp file with no decode function and try to set it:

```bash
echo "function foo() {}" > /tmp/bad-decoder.js
node dist/index.js profiles decoder set 69a493e8b29bae89b37fd36a /tmp/bad-decoder.js
```
Expected: Error `"Decoder must contain a 'decode' function."`

- [ ] **Step 5: Test decoder test command**

Run: `node dist/index.js profiles decoder test 69a493e8b29bae89b37fd36a --payload aba --fport 1`
Expected: Table showing decoded output or validation warnings
