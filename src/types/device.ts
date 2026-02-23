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

export interface Measurement {
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

export interface MeasurementsResponse {
  readings: Measurement[];
  totalPages: number;
  currentPage: number;
  count: number;
}
