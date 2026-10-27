/* ---------------------------- OPTIONS ---------------------------- */

import { analyserSystemInstruction, streamSystemInstruction } from "./gemma.instructions";
import { analyserTools, streamTools } from "./gemma.tools";


const baseOptions = {
  model: "gemma-4-31b-it",
  generation_config: {
    // thinking_level: "high",
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
  system_instruction: streamSystemInstruction,
};