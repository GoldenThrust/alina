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

youcamWorker.on("ready", () => {
    console.log("Worker ready");
});

youcamWorker.on("active", (job) => {
    console.log("Processing", job.id);
});

youcamWorker.on("completed", (job) => {
    console.log("Completed", job.id);
});

youcamWorker.on("failed", (job, err) => {
    console.log("Failed", job?.id, err);
});

youcamWorker.on("error", (err) => {
    console.error(err);
});