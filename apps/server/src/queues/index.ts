import "./email/email.worker.ts";
import "./youcam/youcam.worker.ts";
import "./ai/ai.worker.ts";

export function initQueues() {
  console.info("Queues initialized");
}

initQueues();