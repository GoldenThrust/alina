// src/queues/ai.queue.ts
import { ConnectionOptions, Queue } from "bullmq";
import redis from "../../redis";

export const aiQueue = new Queue('respond',{
  connection: redis as ConnectionOptions,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});