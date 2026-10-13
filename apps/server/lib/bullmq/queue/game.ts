// src/queues/game.queue.ts
import { ConnectionOptions, Queue } from "bullmq";
import redis from "../../redis.js";

export const gameQueue = new Queue("game-queue", {
  connection: redis as ConnectionOptions,
});