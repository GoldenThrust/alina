import type { Job } from "bullmq";

export function getNextRetryDelay(job: Job): number {
  const backoff = job.opts.backoff;

  if (
    typeof backoff !== "object" ||
    backoff.type !== "exponential" || typeof backoff.delay !== "number"
  ) {
    return 0;
  }

  return backoff.delay * 2 ** job.attemptsMade;
}