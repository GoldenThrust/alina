import { mailService } from "../../services/mail.service.ts";

export async function processEmail(job: any) {
  const { to, subject, template, payload, text } = job.data;

  await mailService.sendMail(
    to,
    subject,
    template,
    payload,
    text
  );
}