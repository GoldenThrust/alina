import { AIQueue } from "./ai.queue";


export async function AIProcessingJob(data: AIData) {
  await AIQueue.add("process-AI", data, {
    attempts: 10,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  });
}
