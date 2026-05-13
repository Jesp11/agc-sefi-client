const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const headers = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      // Opcional: Redirigir a login si no estamos en la página de login
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
  }

  return response;
}
