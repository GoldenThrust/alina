import { gemmaAgent } from "../../services/ai/gemma/gemma.agents";

export async function processAI(job: any) {
  const { userId, scanId, input } = job.data as AIData;
  if (scanId) {
    await gemmaAgent.analyze(userId, scanId, input);
  } else {
    await gemmaAgent.chat(userId, input);
  } 
}
