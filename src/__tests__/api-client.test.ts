import { jest } from '@jest/globals';
import { ApiClient, ApiError } from '../lib/api-client.js';

const mockFetch = jest.fn<typeof fetch>();
global.fetch = mockFetch;

describe('ApiClient', () => {
  const baseUrl = 'https://api.zafron.dev';
  const token = 'test-token-123';

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('sends GET requests with auth header', async () => {
    const payload = { id: 1, name: 'device-1' };
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    const client = new ApiClient(baseUrl, token);
    const result = await client.get('/devices/1');

    expect(result).toEqual(payload);
    expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/devices/1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: undefined,
    });
  });

  it('sends POST requests with body', async () => {
    const body = { name: 'new-device' };
    const payload = { id: 2, name: 'new-device' };
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(payload), { status: 201 }),
    );

    const client = new ApiClient(baseUrl, token);
    const result = await client.post('/devices', body);

    expect(result).toEqual(payload);
    expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  });

  it('throws on 401 with auth error message', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    );

    const client = new ApiClient(baseUrl, token);

    await expect(client.get('/devices')).rejects.toThrow(ApiError);

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    );

    await expect(client.get('/devices')).rejects.toThrow(
      'Session expired. Run `zafron login` to re-authenticate.',
    );
  });
});
