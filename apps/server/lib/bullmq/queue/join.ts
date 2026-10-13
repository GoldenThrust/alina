// src/queues/join.queue.ts
import { ConnectionOptions, Queue } from "bullmq";
import redis from "../../redis.js";


export const joinQueue = new Queue("join-queue", {
  connection: redis as ConnectionOptions,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
  },
});