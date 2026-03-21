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
