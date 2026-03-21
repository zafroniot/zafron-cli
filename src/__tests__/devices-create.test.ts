import { validateType, validateSerial } from '../commands/devices/create.js';

describe('validateType', () => {
  it('accepts mqtt', () => {
    expect(validateType('mqtt')).toBe('mqtt');
  });

  it('accepts lora', () => {
    expect(validateType('lora')).toBe('lora');
  });

  it('normalizes case', () => {
    expect(validateType('MQTT')).toBe('mqtt');
    expect(validateType('LoRa')).toBe('lora');
  });

  it('rejects invalid types', () => {
    expect(() => validateType('zigbee')).toThrow("Invalid device type. Must be 'mqtt' or 'lora'.");
  });

  it('rejects empty string', () => {
    expect(() => validateType('')).toThrow("Invalid device type. Must be 'mqtt' or 'lora'.");
  });
});

describe('validateSerial', () => {
  it('accepts valid mqtt serial (6-16 chars)', () => {
    expect(validateSerial('ABCDEF', 'mqtt')).toBe('ABCDEF');
    expect(validateSerial('1234567890ABCDEF', 'mqtt')).toBe('1234567890ABCDEF');
  });

  it('rejects mqtt serial shorter than 6', () => {
    expect(() => validateSerial('ABCDE', 'mqtt')).toThrow('Serial must be 6-16 characters.');
  });

  it('rejects mqtt serial longer than 16', () => {
    expect(() => validateSerial('12345678901234567', 'mqtt')).toThrow('Serial must be 6-16 characters.');
  });

  it('accepts valid lora DevEUI (16 hex chars)', () => {
    expect(validateSerial('A84041000181C061', 'lora')).toBe('A84041000181C061');
    expect(validateSerial('0011aabbccddeeff', 'lora')).toBe('0011aabbccddeeff');
  });

  it('rejects lora DevEUI with wrong length', () => {
    expect(() => validateSerial('A84041', 'lora')).toThrow('DevEUI must be exactly 16 hex characters.');
  });

  it('rejects lora DevEUI with non-hex chars', () => {
    expect(() => validateSerial('G84041000181C061', 'lora')).toThrow('DevEUI must be exactly 16 hex characters.');
  });
});
