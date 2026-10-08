import { Queue } from "bullmq";
import { config } from "../../config/index.ts";

export const emailQueue = new Queue("email", {
  connection: config.redis,
});
