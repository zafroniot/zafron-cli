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
