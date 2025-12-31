function getCookie(name: string) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.split("=")[1];
}

export async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  const hasBody = init.body !== undefined && init.body !== null;

  if (hasBody && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  // CSRF برای درخواست‌های دارای body
  const xsrf = getCookie("XSRF-TOKEN");
  if (xsrf && hasBody) headers.set("X-XSRF-TOKEN", decodeURIComponent(xsrf));

  const res = await fetch(url, { ...init, headers, credentials: "include" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return (await res.json()) as T;

  return undefined as T;
}
