import { AIQueue } from "./ai.queue";


export async function AIProcessingJob(data: AIData) {
  await AIQueue.add("process-AI", data, {
    attempts: 20,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  });
}
