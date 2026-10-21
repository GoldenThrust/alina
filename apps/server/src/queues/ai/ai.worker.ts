import { Worker } from "bullmq";
import { config } from "../../config/index.ts";
import { processAI } from "./ai.processor.ts";

export const AIWorker = new Worker(
  "AI",
  async (job) => {
    await processAI(job);
  },
  {
    connection: config.redis,
  }
);