import type { Command } from "./types";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
  csrf?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("content-type", "application/json");
  if (csrf) headers.set("x-csrf-token", csrf);
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) {
    if (
      response.status === 401 &&
      path !== "/auth/login" &&
      path !== "/auth/session" &&
      typeof window !== "undefined"
    )
      window.dispatchEvent(new Event("ct-session-expired"));
    const data = await response.json().catch(() => ({}));
    throw new ApiError(
      data.error?.message || "Something went wrong. Please try again.",
      response.status,
      data.error?.code || "REQUEST_FAILED",
    );
  }
  return response.json();
}
export const command = (body: Command, csrf: string) =>
  api<{ message: string }>(
    "/actions",
    { method: "POST", body: JSON.stringify(body) },
    csrf,
  );
export async function download(
  kind: string,
  csrf: string,
  ids: string[] = [],
  q = "",
  provider = "",
) {
  const response = await fetch("/api/v1/downloads", {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": csrf },
    body: JSON.stringify({ kind, ids, q, provider }),
  });
  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error?.message || "Export unavailable");
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download =
    response.headers
      .get("content-disposition")
      ?.match(/filename="([^"]+)"/)?.[1] || "perform-plus-export";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export const label = (value: string) =>
  value
    ?.replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .replace(/\bqa\b/gi, "QA")
    .replace(/\bai\b/gi, "AI") || "—";
export const num = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);
