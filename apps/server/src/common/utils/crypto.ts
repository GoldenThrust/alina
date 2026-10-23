import { Temporal } from "@js-temporal/polyfill";
import crypto from "crypto";

type cursorData = {
  createdAt: Date;
  id: string;
}
export function encodeCursor(data: cursorData) {
  const { createdAt, id } = data;
  return Buffer.from(JSON.stringify({ createdAt, id })).toString("base64");
}

export function decodeCursor(cursor?: string): cursorData | null {
  if (!cursor) return null;

  const data = JSON.parse(Buffer.from(cursor, "base64").toString());
  data.createdAt = Temporal.Instant.from(data.createdAt);

  return data;
}

export function encodeToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}