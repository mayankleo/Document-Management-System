import axios, { AxiosError } from 'axios';
import type { AxiosInstance } from 'axios';

const baseUrl = 'https://localhost:7097/api';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: baseUrl.replace(/\/$/, ''),
  timeout: 30000,
});

// Request interceptor to inject auth header
api.interceptors.request.use(config => {
  if (authToken) {
    config.headers = config.headers || {};
    (config.headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }
  return config;
});

// Response interceptor for unified error shaping
api.interceptors.response.use(r => r, (error: AxiosError) => {
  if (error.response) {
    const data = error.response.data as unknown;
    let message: string | undefined;
    if (data && typeof data === 'object') {
      const rec = data as Record<string, unknown>;
      if (typeof rec.message === 'string') message = rec.message;
      else if (typeof rec.error === 'string') message = rec.error;
    }
    if (!message) message = error.response.statusText || 'Request failed';
    return Promise.reject(new Error(message));
  }
  if (error.request) {
    return Promise.reject(new Error('Network error or no response from server'));
  }
  return Promise.reject(error);
});

export { api };

export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') usp.append(k, String(v));
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

export function getBaseUrl() { return baseUrl; }
