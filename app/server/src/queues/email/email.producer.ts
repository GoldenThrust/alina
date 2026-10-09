import { emailQueue } from "./email.queue.ts";

export async function sendEmailJob(data: {
  to: string;
  subject: string;
  template: string;
  payload: any;
}) {
  await emailQueue.add("send-email", data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  });
}