import type { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const base = process.env.API_INTERNAL_URL || "http://127.0.0.1:8000";
  const target = `${base}/api/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const headers = new Headers();
  for (const name of [
    "content-type",
    "cookie",
    "x-csrf-token",
    "origin",
    "accept",
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method)
        ? undefined
        : await request.arrayBuffer(),
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    });
    const output = new Headers();
    for (const name of [
      "content-type",
      "content-disposition",
      "set-cookie",
      "cache-control",
    ]) {
      const value = upstream.headers.get(name);
      if (value) output.set(name, value);
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: output,
    });
  } catch {
    return Response.json(
      {
        error: {
          code: "API_UNAVAILABLE",
          message:
            "The API is unavailable. Check that the API and database are running.",
        },
      },
      { status: 503 },
    );
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
