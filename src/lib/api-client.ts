export class ApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export class ApiClient {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl: string, token?: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      throw new ApiError(
        'Session expired. Run `zafron login` to re-authenticate.',
        401,
      );
    }

    if (!response.ok) {
      let message: string;
      try {
        const errorBody = (await response.json()) as { error?: string };
        message = errorBody.error ?? `Request failed with status ${response.status}`;
      } catch {
        message = `Request failed with status ${response.status}`;
      }
      throw new ApiError(message, response.status);
    }

    return response.json();
  }

  async get(path: string): Promise<unknown> {
    return this.request('GET', path);
  }

  async post(path: string, body: unknown): Promise<unknown> {
    return this.request('POST', path, body);
  }

  async patch(path: string, body: unknown): Promise<unknown> {
    return this.request('PATCH', path, body);
  }

  async delete(path: string): Promise<unknown> {
    return this.request('DELETE', path);
  }
}
