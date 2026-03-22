# Profiles Decoder Commands

## Summary

Add `zafron profiles decoder get|set|test` subcommands to manage a profile's decoder script from the CLI. Designed to be both human-friendly and LLM-friendly (Claude Code can read, modify, and test decoders in a loop).

## Decoder Script Format

A decoder is a JavaScript function with the following signature and return format:

```javascript
// 'decode' function decodes an array of bytes or JSON into Zafron JSON.
//  - fPort contains the LoRaWAN fPort number
//  - buffer is an array of bytes, e.g. [225, 230, 255, 0]
//  - json contains the decoded data from the network if available or json object from generic HTTP endpoint
// The function must return an array of JSON object
function decode(fPort, buffer, json) {
  return [
    {
      channel: "1",
      name: "Temperature",
      value: 23.5,
      unit: "c",
      type: "temp"
    }
  ];
}
```

Each returned object must have: `channel` (string), `name` (string), `value` (number), `unit` (string), `type` (string).

## Commands

### `profiles decoder get <id>`

Fetches the profile and outputs the `decoder` field as raw JS code to stdout (no color, no formatting — just the code).

- `GET /api/profiles/:id`
- Extract `profile.decoder` and print to stdout
- If the profile has no decoder, print nothing (empty output)
- `--json` flag outputs the full profile object instead

**Use case:** `zafron profiles decoder get <id> > decoder.js` to save to a file for editing.

### `profiles decoder set <id> <file>`

Reads a local `.js` file and updates the profile's decoder via the API.

- `PATCH /api/profiles/:id` with `{ "decoder": "<file contents>" }`
- The `<file>` argument is a path to a `.js` file
- Supports `--stdin` flag: read from stdin instead of a file argument (e.g., `cat decoder.js | zafron profiles decoder set <id> --stdin`)
- Validates the file content contains a `function decode` definition before uploading. Error: `"Decoder must contain a 'decode' function."`
- On success: `out.success('Decoder updated')`

### `profiles decoder test <id>`

Tests the profile's decoder with a payload via the API.

- `POST /api/profiles/:id/decode` with `{ payload, fPort }`
- Required: `--payload <string>` — base64-encoded payload (or hex if `--hex` flag is set)
- Optional: `--fport <number>` — LoRaWAN fPort number (default: `1`)
- Optional: `--hex` — indicates the payload string is hex-encoded instead of base64

API response shape:
```json
{
  "decoded": [
    { "channel": "1", "name": "Temperature", "value": 23.5, "unit": "c", "type": "temp" }
  ],
  "errors": [
    { "message": "is not of a type(s) string", "path": ["0", "channel"], "stack": "..." }
  ]
}
```

**Output:**
- Display `decoded` array as a table with columns: Channel, Name, Value, Unit, Type
- If `errors` array is non-empty, display each error's `message` as a warning below the table
- `--json` outputs the raw API response
- If `decoded` is empty and `errors` is empty, print `"No output from decoder."`

## CLI Flags Summary

```
profiles decoder get <id> [--json]
profiles decoder set <id> <file> [--stdin]
profiles decoder test <id> --payload <string> [--fport <number>] [--hex] [--json]
```

## Files

### New:
- `src/commands/profiles/decoder.ts` — all three subcommands (get, set, test) in one file

### Modified:
- `src/commands/profiles/index.ts` — register `decoderCommand`

## Error Handling

| Condition | Message |
|-----------|---------|
| No decode function found in file | `Decoder must contain a 'decode' function.` |
| File not found | `File not found: <path>` |
| Missing --payload on test | Commander handles this (required option) |
| No stdin data when --stdin used | `No input received from stdin.` |
| API error | Standard ApiError handling (existing pattern) |
