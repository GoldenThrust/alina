import { youcamQueue } from "./youcam.queue";


export async function YouCamAnalysis(data: YouCamAnalysisData) {
  await youcamQueue.add("process-youCam", data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  });
}
