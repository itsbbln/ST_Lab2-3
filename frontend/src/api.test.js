import { afterEach, describe, expect, it, vi } from 'vitest';
import apiRequest, { ApiError, SESSION_EXPIRED_EVENT } from './api.js';

describe('API client', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('sends a bearer token and parses successful JSON', async () => {
    localStorage.setItem('sim_token', 'test-token');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: 7 } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/students')).resolves.toMatchObject({ data: { id: 7 } });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token');
  });

  it('preserves field validation errors and the response status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ message: 'Validation failed.', errors: { email: ['Enter a valid email.'] } }),
    }));

    await expect(apiRequest('/students', { method: 'POST', body: {} })).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
      errors: { email: ['Enter a valid email.'] },
      message: 'Enter a valid email.',
    });
  });

  it('clears an expired session and emits a session event on 401', async () => {
    localStorage.setItem('sim_token', 'expired-token');
    localStorage.setItem('sim_user', '{"id":1}');
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Authentication is required.' }),
    }));

    await expect(apiRequest('/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem('sim_token')).toBeNull();
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
  });

  it('returns a controlled network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));

    await expect(apiRequest('/students')).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      message: 'The server could not be reached. Check your connection and try again.',
    });
  });
});