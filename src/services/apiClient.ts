import { API_URL } from './config';
import { getToken } from './session';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Fetch wrapper: adjunta el token de sesión y la URL base del backend "portero". Nunca lleva claves de IA. */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!API_URL) throw new ApiError('backend_no_configurado', 0, 'no_backend');
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body?.error ?? 'error_desconocido', res.status, body?.error);
  }
  return body as T;
}
