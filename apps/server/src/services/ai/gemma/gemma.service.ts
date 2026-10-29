import { GoogleGenAI } from "@google/genai";
import { analyserOptions, streamOptions } from "./gemma.options";
import type { GenerateOptions } from "./gemma";

function cleaner(input: Object): any {
  return Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined),
  );
}

/** Only a fresh user message can safely start a new chain. */
const isFreshInput = (input: unknown) =>
  !(
    Array.isArray(input) &&
    input.some((i: any) => i?.type === "function_result")
  );

const isBadHistory = (error: any) =>
  error?.status === 400 &&
  /missing text in content/i.test(String(error?.message ?? error?.body ?? ""));

export class GemmaClient {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  private async create(base: object, data: GenerateOptions, stream: boolean) {
    const build = (d: GenerateOptions) =>
      cleaner({ ...base, ...d, stream });

    try {
      return await this.ai.interactions.create(build(data));
    } catch (error: any) {
      const prev = (data as any).previous_interaction_id;
      if (prev && isBadHistory(error) && isFreshInput((data as any).input)) {
        console.warn(
          `[GemmaClient] interaction ${prev} has unusable history, starting a new chain`,
        );
        return await this.ai.interactions.create(
          build({ ...data, previous_interaction_id: undefined } as any),
        );
      }
      throw error;
    }
  }

  async generate(data: GenerateOptions) {
    return this.create(analyserOptions, data, false);
  }

  async stream(data: GenerateOptions) {
    return this.create(streamOptions, data, true);
  }
}