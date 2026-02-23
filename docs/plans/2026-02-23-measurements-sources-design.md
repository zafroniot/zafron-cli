# Measurements & Sources Commands Design

## Overview

Add two new command groups to the zafron CLI:
1. `zafron devices measurements <id>` — query sensor data for a device
2. `zafron sources list` / `zafron sources get <id>` — read-only source management

## Measurements Command

`zafron devices measurements <id>` queries paginated measurement data.

**Flags:**
- `--channel <ch>` — filter by channel(s), comma-separated
- `--type <type>` — filter by type(s), comma-separated
- `--start <date>` — start date (ISO format)
- `--end <date>` — end date (ISO format)
- `--limit <n>` — results per page (default 25)
- `--page <n>` — page number (default 1)
- `--json` — raw JSON output

**API:** `GET /api/devices/:id/measurements?channels=1,2&types=temperature&startDate=...&endDate=...&page=1&limit=25`

**Default output:** Table with Timestamp, Channel, Type, Value, Unit columns plus pagination info.

## Sources Commands

### `zafron sources list`

Table with ID, Name, Provider, Enabled, Events, Created columns. Supports `--json`.

**API:** `GET /api/sources?page=1&limit=50`

### `zafron sources get <id>`

Detail view showing: Name, ID, Provider, Enabled, Events, API Key, Mask ID, Endpoint URL, Description. Supports `--json`.

**API:** `GET /api/sources/:id`

## New Types

### Source
```typescript
interface Source {
  _id: string;
  name: string;
  maskId: string;
  type: string;
  provider: string;
  apiKey: string;
  owner: string;
  eventCount: number;
  description?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Measurement
```typescript
interface Measurement {
  _id: string;
  value: number;
  array_value?: unknown[];
  timestamp: string;
  metadata: {
    channel: string;
    deviceId: string;
    name: string;
    owner: string;
    serial: string;
    type: string;
    unit: string;
  };
}

interface MeasurementsResponse {
  readings: Measurement[];
  totalPages: number;
  currentPage: number;
  count: number;
}
```
