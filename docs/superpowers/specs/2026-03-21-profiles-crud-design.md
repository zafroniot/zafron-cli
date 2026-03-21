# Profiles CRUD Commands

## Summary

Add full CRUD commands for device profiles: `zafron profiles list|get|create|update|delete`. Follows existing patterns from `devices` and `sources` commands.

## API Endpoints

- `GET /api/profiles` — paginated list: `{ total, pages, page, limit, data: [...] }`
- `GET /api/profiles/:id` — single profile
- `POST /api/profiles` — create: `{ name, source, image }`
- `PATCH /api/profiles/:id` — update: `{ name?, source?, image? }`
- `DELETE /api/profiles/:id` — delete

## Commands

### `profiles list`

Table columns: ID, Name, Source (display source name), Image, Created.

Flags: `--json`

### `profiles get <id>`

Detail view with all fields: Name, ID, Source (name), Image, Decoder Type, Created, Updated.

Flags: `--json`

### `profiles create`

Create payload: `{ name: string, source: string, image: string }`

- `source` is a source `_id` — fetched from `GET /api/sources` and presented as a numbered menu of source names.
- `image` is one of the 22 allowed values — presented as a numbered menu.

Flags:
```
-n, --name <name>        profile name
-s, --source <source>    source ID
-i, --image <image>      profile image
--json                   output raw JSON
```

Interactive flow (prompt for missing flags):
1. Name
2. Source (numbered menu from API)
3. Image (numbered menu from allowed list)

When all flags provided, validate and skip prompts.

Allowed image values: `server`, `microchip`, `network`, `thermometer`, `water`, `battery`, `sun`, `wind`, `cloud`, `leaf`, `signal`, `satellite`, `bolt`, `gauge`, `cube`, `box`, `industry`, `warehouse`, `location`, `map`, `globe`, `tower`

Validation:
- `--image` flag must be one of the allowed values. Error: `"Invalid image. Allowed values: server, microchip, ..."`
- `--source` flag validated against API response. Error: `"Invalid source. Available sources: <names>"`
- Empty sources list: `"No sources available. Create a source first."`

### `profiles update <id>`

Flags:
```
-n, --name <name>        profile name
-s, --source <source>    source ID
-i, --image <image>      profile image
```

At least one flag required. Error: `"No update flags provided. Use --name, --source, or --image."`

Validate `--image` against allowed list. No interactive prompts — flags only (matches devices update pattern).

### `profiles delete <id>`

Confirmation prompt: `Are you sure you want to delete "<profile.name>"? (y/N):`

Flags: `-y, --yes` to skip confirmation.

## Types

Update `src/types/device.ts`:

```typescript
// Expand existing Profile interface:
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

// Add:
export interface CreateProfileInput {
  name: string;
  source: string;
  image: string;
}
```

Note: The `ProfilesResponse` interface already exists from the devices create optimization.

## Files

### New files:
- `src/commands/profiles/index.ts` — command group, wires subcommands
- `src/commands/profiles/list.ts`
- `src/commands/profiles/get.ts`
- `src/commands/profiles/create.ts`
- `src/commands/profiles/update.ts`
- `src/commands/profiles/delete.ts`

### Modified files:
- `src/types/device.ts` — expand `Profile`, add `CreateProfileInput`
- `src/index.ts` — register `profilesCommand`

## Error Handling

| Condition | Message |
|-----------|---------|
| Invalid image (flag) | `Invalid image. Allowed values: server, microchip, network, thermometer, water, battery, sun, wind, cloud, leaf, signal, satellite, bolt, gauge, cube, box, industry, warehouse, location, map, globe, tower` |
| Invalid source (flag) | `Invalid source. Available sources: <names>` |
| No sources available | `No sources available. Create a source first.` |
| No update flags | `No update flags provided. Use --name, --source, or --image.` |
