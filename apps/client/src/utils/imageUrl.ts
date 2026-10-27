const BASE = (import.meta.env.VITE_SERVER_URL as string | undefined)?.replace(
  /\/$/,
  "",
);
 
export function imageUrl(src: string): string {
  console.log("BASE", BASE);
  if (/^(https?:|blob:|data:)/i.test(src)) return src;
  return `${BASE ?? ""}/${src.replace(/^\/+/, "")}`;
}
 