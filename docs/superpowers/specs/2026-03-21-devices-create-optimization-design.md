# Devices Create Command Optimization

## Summary

Optimize the `zafron devices create` command with constrained device types, serial number validation, and interactive profile selection for LoRa devices.

## Current State

The create command accepts free-text `name`, `serial`, and `type` fields with no validation. It sends `{name, serial, type}` to `POST /api/devices`. There is no `profile` field.

## Changes

### 1. Type Constraint

Only two device types are supported: `mqtt` and `lora`.

- **Interactive mode**: Present a numbered menu:
  ```
  Device type:
    1) mqtt
    2) lora
  Select type:
  ```
- **Flag mode** (`--type <type>`): Validate the value is `mqtt` or `lora`. Reject with: `"Invalid device type. Must be 'mqtt' or 'lora'."`

### 2. Serial Validation

Validation rules depend on the selected type:

- **mqtt**: 6–16 characters. Error: `"Serial must be 6-16 characters."`
- **lora**: Exactly 16 hex characters (DevEUI). Regex: `/^[0-9a-fA-F]{16}$/`. Error: `"DevEUI must be exactly 16 hex characters."`

### 3. Profile Selection (LoRa only)

When type is `lora`:

- Fetch available profiles from `GET /api/profiles` (authenticated).
- Present a numbered menu of profile names.
- Support `--profile` flag for non-interactive use; validate that the provided value exists in the API response.

When type is `mqtt`:

- Send `profile: ""` in the payload. No prompt.

### 4. Payload Update

Update `CreateDeviceInput` to include `profile`:

```typescript
export interface CreateDeviceInput {
  name: string;
  serial: string;
  type: string;
  profile: string;
}
```

Example payloads:

```json
{"name": "congri-bandwidth", "type": "mqtt", "serial": "09DABFFF", "profile": ""}
{"name": "lora-sensor-1", "type": "lora", "serial": "0011AABBCCDDEEFF", "profile": "class-a-otaa"}
```

### 5. Prompt Flow

When flags are missing, prompt in this order:

1. **Name** (if `--name` not provided)
2. **Type** (numbered menu if `--type` not provided)
3. **Serial** (with type-specific validation)
4. **Profile** (numbered menu from API, only if type is `lora` and `--profile` not provided)

When all flags are provided, skip prompts entirely — validate and call the API.

### 6. CLI Flags

```
-n, --name <name>        device name
-s, --serial <serial>    serial number
-t, --type <type>        device type (mqtt or lora)
-p, --profile <profile>  device profile (lora only)
--json                   output raw JSON
```

## Files Modified

- `src/types/device.ts` — add `profile` to `CreateDeviceInput`
- `src/commands/devices/create.ts` — type menu, serial validation, profile fetch/menu, `--profile` flag

## Error Handling

| Condition | Message |
|-----------|---------|
| Invalid type (flag) | `Invalid device type. Must be 'mqtt' or 'lora'.` |
| Invalid mqtt serial | `Serial must be 6-16 characters.` |
| Invalid lora serial | `DevEUI must be exactly 16 hex characters.` |
| Profile fetch fails | `Failed to fetch profiles: <error>` |
| Invalid profile (flag) | `Invalid profile. Available profiles: <list>` |
