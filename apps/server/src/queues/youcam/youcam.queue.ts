import { Queue } from "bullmq";
import { config } from "../../config/index.ts";

export const youcamQueue = new Queue("youCam", {
  connection: config.redis,
});
