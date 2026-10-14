import {} from "@google/genai";

const baseTools = [{ type: "google_search" }];
const analyserTools = [...baseTools];

const streamTools = [...baseTools];

const analyserSystemInstruction = ``;
const streamSystemInstruction = ``;

const baseOptions = {
  model: "gemma-4-31b-it",
  generation_config: {
    thinking_level: "high",
    tool_choice: "auto",
  },
} as const;

export const analyserOptions = {
  ...baseOptions,
  tools: analyserTools,
  system_instruction: analyserSystemInstruction,
};

export const streamOptions = {
  ...baseOptions,
  tools: streamTools,
  stream: true,
};
