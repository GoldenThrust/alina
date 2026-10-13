// src/queues/join.queue.ts
import { ConnectionOptions, Queue } from "bullmq";
import redis from "../../redis.js";

export const voteQueue = new Queue("vote-queue", {
  connection: redis as ConnectionOptions,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
  },
});