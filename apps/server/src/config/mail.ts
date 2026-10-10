import { createTransport, type Transporter } from "nodemailer";
import { config } from "./index.ts";

export const mailTransport: Transporter = createTransport({
  host: config.env.MAIL_HOST,
  port: Number(config.env.MAIL_PORT),
  secure: config.env.NODE_ENV !== "development",
  auth: {
    user: config.env.MAIL_USERNAME,
    pass: config.env.MAIL_PASSWORD,
  },
  from: config.env.MAIL_FROM,
});
