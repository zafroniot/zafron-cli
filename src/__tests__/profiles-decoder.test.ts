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
