import { Worker } from "bullmq";
import { config } from "../../config/index.ts";
import { processYoucam } from "./youcam.processor.ts";

export const youcamWorker = new Worker(
  "youCam",
  async (job) => {
    await processYoucam(job);
  },
  {
    connection: config.redis,
  }
);