import crypto from "crypto";

export function encodeCursor(data: any) {
  return Buffer.from(JSON.stringify(data)).toString("base64");
}

export function decodeCursor(cursor?: string) {
  if (!cursor) return null;

  return JSON.parse(Buffer.from(cursor, "base64").toString());
}

export function encodeToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}