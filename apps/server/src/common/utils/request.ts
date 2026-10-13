/* -------------------------------------------------------------------------- */
/*  HTTP helpers                                                              */
/* -------------------------------------------------------------------------- */

export async function httpRequest(
  method: Method,
  fullUrl: string,
  { headers = {}, body }: RequestInit = {},
): Promise<{
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  text: string;
  json: Record<string, any>;
}> {
  const init: RequestInit | any = { method, headers };
  if (body !== undefined)
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  const res = await fetch(fullUrl, init);
  const text = await res.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {}
  return {
    status: res.status,
    ok: res.ok,
    headers: Object.fromEntries(res.headers.entries()),
    text,
    json,
  };
}
