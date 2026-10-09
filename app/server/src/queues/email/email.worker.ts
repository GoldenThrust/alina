import { Worker } from "bullmq";
import { processEmail } from "./email.processor.ts";
import { config } from "../../config/index.ts";

export const emailWorker = new Worker(
  "email",
  async (job) => {
    await processEmail(job);
  },
  {
    connection: config.redis,
  }
);