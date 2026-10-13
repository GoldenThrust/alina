type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type HttpRequestInit = {
  method: Method;
  headers: Record<string, string>;
  body?: string | object;
};
