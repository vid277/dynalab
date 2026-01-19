const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export class AuthError extends Error {
  constructor(message: string = "Not authenticated") {
    super(message);
    this.name = "AuthError";
  }
}

export async function apiFetch(
  path: string,
  options?: RequestInit
): Promise<Response> {
  const token = localStorage.getItem("token");

  const headers: HeadersInit = {
    ...options?.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new AuthError();
  }

  return response;
}

export async function apiFetchJson<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await apiFetch(path, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Request failed: ${response.statusText}`);
  }

  return response.json();
}
