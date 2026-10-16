import { Queue } from "bullmq";
import { config } from "../../config/index.ts";

export const AIQueue = new Queue("AI", {
  connection: config.redis,
});
