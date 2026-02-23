# Zafron CLI Design

## Overview

A Node.js/TypeScript CLI tool for managing Zafron IoT devices from the terminal. Targets both developers scripting device provisioning and end users who prefer CLI over the web dashboard.

- **Command structure**: Noun-verb (`zafron devices create`)
- **Framework**: Commander.js
- **Auth**: Email/password login flow, token stored locally
- **Default API**: `https://api.zafron.dev`

## Project Structure

```
zafron-cli/
├── src/
│   ├── index.ts              # Entry point, top-level program
│   ├── commands/
│   │   ├── login.ts          # zafron login
│   │   └── devices/
│   │       ├── index.ts      # zafron devices (parent command)
│   │       ├── create.ts     # zafron devices create
│   │       ├── list.ts       # zafron devices list
│   │       ├── get.ts        # zafron devices get <id>
│   │       ├── update.ts     # zafron devices update <id>
│   │       └── delete.ts     # zafron devices delete <id>
│   ├── lib/
│   │   ├── api-client.ts     # HTTP client wrapping fetch for Zafron API
│   │   ├── config.ts         # Config management (~/.zafron/config.json)
│   │   └── output.ts         # Output formatting (table, JSON)
│   └── types/
│       └── device.ts         # TypeScript types matching API models
├── package.json
├── tsconfig.json
└── bin/
    └── zafron               # Shebang entry: #!/usr/bin/env node
```

## Authentication

1. `zafron login` prompts for email and password (password hidden)
2. Calls `POST /api/users/login` with `{ email, password }`
3. Stores `{ token, apiUrl }` in `~/.zafron/config.json`
4. Subsequent commands read token from config and send `Authorization: Bearer <token>`
5. On 401 responses, prints "Session expired. Run `zafron login` to re-authenticate."

### Config file (`~/.zafron/config.json`)

```json
{
  "token": "eyJhbG...",
  "apiUrl": "https://api.zafron.dev"
}
```

## Device Commands

### `zafron devices create`

Supports both flag-based (scriptable) and interactive (prompts for missing required fields).

Flags: `--name`, `--serial`, `--type` (mqtt|lora)

Calls `POST /api/devices` with `{ name, serial, type }`.

### `zafron devices list`

Displays devices in a table: ID, Name, Type, Serial, Enabled, Last Online.

Supports `--json` flag for raw JSON output.

Calls `GET /api/devices`.

### `zafron devices get <id>`

Shows device detail view: name, serial, type, enabled status, last online, capabilities.

Supports `--json` flag.

Calls `GET /api/devices/<id>`.

### `zafron devices update <id>`

Flags: `--name`, `--enabled` (true|false)

Calls `PATCH /api/devices/<id>`.

### `zafron devices delete <id>`

Prompts for confirmation before deleting.

Calls `DELETE /api/devices/<id>`.

## Output Formatting

- Default: human-readable tables and detail views using `cli-table3` and `chalk`
- `--json` flag on any command outputs raw JSON for piping/scripting

## Dependencies

| Package | Purpose |
|---------|---------|
| `commander` | CLI framework, command routing |
| `typescript` | Type safety |
| `chalk` | Terminal colors |
| `cli-table3` | Table formatting |

Uses Node.js built-ins for HTTP (`fetch`), interactive prompts (`readline`), and config file I/O (`fs`, `path`).

## API Reference

- **Base URL**: `https://api.zafron.dev`
- **Auth**: `Authorization: Bearer <token>`
- **Devices**: `POST /api/devices`, `GET /api/devices`, `GET /api/devices/:id`, `PATCH /api/devices/:id`, `DELETE /api/devices/:id`
- **Login**: `POST /api/users/login` with `{ email, password }` returns `{ user, token }`
