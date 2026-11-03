import { getDemoPublicResponse } from '../data/demoGiveaways.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('veloop-demo-token');
  let deviceId = localStorage.getItem('veloop-device-id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('veloop-device-id', deviceId);
  }
  const isJoin = options.method === 'POST' && path.endsWith('/join');
  const idempotencyStorageKey = `veloop-idempotency:${path}`;
  let idempotencyKey = isJoin ? sessionStorage.getItem(idempotencyStorageKey) : null;
  if (isJoin && !idempotencyKey) {
    idempotencyKey = crypto.randomUUID();
    sessionStorage.setItem(idempotencyStorageKey, idempotencyKey);
  }
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Device-ID': deviceId,
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if ((!options.method || options.method === 'GET') && error instanceof TypeError) {
      const demoResponse = getDemoPublicResponse(path);
      if (demoResponse) return demoResponse;
    }
    if (error instanceof TypeError) {
      throw new Error('The account service cannot be reached. Check the backend startup logs and MongoDB connection, then try again.');
    }
    throw error;
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status >= 500) {
      throw new Error('The account service is unavailable. Check the backend startup logs and MongoDB connection, then try again.');
    }
    const error = new Error(body.message ?? 'We could not complete that request. Please try again.');
    error.code = body.code;
    error.status = response.status;
    throw error;
  }
  return body;
}
