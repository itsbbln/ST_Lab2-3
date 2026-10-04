const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
export const SESSION_EXPIRED_EVENT = 'sim:session-expired';

export class ApiError extends Error {
  constructor(message, { status = 0, errors = {}, payload = null, cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.payload = payload;
  }
}

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('sim_token');
  const { headers: requestHeaders = {}, body, ...fetchOptions } = options;

  const config = {
    ...fetchOptions,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...requestHeaders,
    },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  };

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, config);
  } catch (cause) {
    if (cause.name === 'AbortError') throw cause;
    throw new ApiError('The server could not be reached. Check your connection and try again.', { cause });
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const errors = payload?.errors || {};
    if (response.status === 401 && path !== '/auth/login') {
      localStorage.removeItem('sim_token');
      localStorage.removeItem('sim_user');
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }

    const message = Object.values(errors).flat().join(' ') || payload?.message || 'Request failed.';
    throw new ApiError(message, { status: response.status, errors, payload });
  }

  return payload;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export default apiRequest;
