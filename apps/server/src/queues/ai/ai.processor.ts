import { logger } from "../../config/logger";
import { gemmaAgent } from "../../services/ai/gemma/gemma.agents";

export async function processAI(job: any) {
  const { userId, scanId, input } = job.data as AIData;
  console.log("Processing AI job:", job.data);
  logger.info("Processing AI job:", job.data);

  if (scanId) {
    await gemmaAgent.analyze(userId, scanId, input);
  } else {
    await gemmaAgent.chat(userId, input);
  } 

  logger.info("AI job processed successfully");
  console.log("AI job processed successfully");
}
