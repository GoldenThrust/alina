import { analyserTools, streamTools } from "./gemma.tools";
import { analyserSystemInstruction, streamSystemInstruction } from "./gemma.instructions";


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
  system_instruction: streamSystemInstruction,
};
