import { type Transporter } from "nodemailer";
import { mailTransport } from "../config/mail.ts";
import handlebars from "handlebars";
import mjml2html from "mjml";
import fs from "fs";
import { config } from "../config/index.ts";
import { redisService } from "./redis.service.ts";
import { logger } from "../config/logger.ts";
import path from "path";
import { Resend } from "resend";
import { env } from "../config/env.ts";

const resend = new Resend(env.RESEND_API_KEY);

/**
 * Mail service for sending transactional emails using Nodemailer
 * Supports template rendering with Handlebars and MJML to HTML conversion
 */
class MailService {
  private transporter: Transporter = mailTransport;
  constructor() {
    this.registerPartialTemplate();
  }

  /**
   * Send email with basic HTML content (deprecated - use sendMail instead)
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param message - HTML message content
   * @param text - Plain text fallback
   * @param from - Sender email address
   */
  async send({
    to,
    subject,
    message,
    text,
    from,
  }: {
    to: string;
    subject: string;
    message: string;
    text?: string;
    from?: string;
  }) {
    if (env.NODE_ENV === "development") {
      await this.transporter.sendMail({
        to,
        sender: subject,
        html: message,
        text,
        from,
      });
    } else {
      const { data, error } = await resend.emails.send({
        from: from || env.MAIL_FROM,
        to: to,
        subject: subject,
        html: message,
      });

      if (error) {
        return console.error({ error });
      }

      console.log({ data });
    }
  }

  /**
   * Register Handlebars partial templates for email headers
   * Loads header.mjml template and registers it as a partial
   * @private
   */
  private registerPartialTemplate() {
    const header = fs.readFileSync(
      path.join(config.env.EMAIL_TEMPLATE_PATH, "header.mjml"),
      "utf-8",
    );
    handlebars.registerPartial("header", header);
  }

  /**
   * Render email template with data and convert MJML to HTML
   * Uses Redis caching for compiled templates
   * @param templateLocation - Path to template file
   * @param data - Context data for template interpolation
   * @returns Rendered HTML string
   * @private
   */
  private async renderTemplate(templateLocation: string, data?: any) {
    const clientURL = config.env.CLIENT_URL;
    // 1. Load template
    let cache = await redisService.getEmailTemplate(templateLocation);

    const template = cache ?? fs.readFileSync(templateLocation, "utf-8");

    if (!cache) await redisService.setEmailTemplate(templateLocation, template);

    data["year"] = new Date().getFullYear();
    data["appUrl"] = clientURL;
    data["appDisplayUrl"] = clientURL;
    data["privacyUrl"] = `${clientURL}/privacy`;
    data["twitterUrl"] = "https://twitter.com/alinaapp";
    data["instagramUrl"] = "https://instagram.com/alinaapp";
    data["youtubeUrl"] = "https://youtube.com/alinaapp";
    data["xIconUrl"] = "https://cdn.simpleicons.org/x/000000";
    data["instagramIconUrl"] = "https://cdn.simpleicons.org/instagram/000000";
    data["youtubeIconUrl"] = "https://cdn.simpleicons.org/youtube/000000";
    data["logoUrl"] = `${clientURL}/alina.svg`;
    data["unsubscribeUrl"] = `${clientURL}/unsubscribe`;
    data["dashboardUrl"] = `${clientURL}/dashboard`;
    // 2. Compile with Handlebars
    const compiled = handlebars.compile(template);
    const mjml = compiled(data);

    const { html, errors } = await mjml2html(mjml);

    // 3. Convert MJML → HTML
    if (errors.length) {
      console.error(errors);
      throw new Error("MJML rendering error");
    }

    return html;
  }

  /**
   * Send email using template with Handlebars and MJML rendering
   * @param to - Recipient email address
   * @param subject - Email subject line
   * @param template - Path to template file (supports .mjml with Handlebars syntax)
   * @param data - Template variables for Handlebars interpolation
   * @param text - Plain text fallback content
   * @returns Nodemailer response with messageId
   * @throws Error if MJML rendering fails
   */
  async sendMail(
    to: string,
    subject: string,
    template: string,
    data?: any,
    text?: string,
  ) {
    try {
      const html = await this.renderTemplate(template, data);
      const from = `Alina <${config.env.MAIL_FROM}>`;

      let response;
      if (env.NODE_ENV === "development") {
        response = await this.transporter.sendMail({
          from,
          to,
          subject,
          html,
          text,
        });
      } else {
        const { data, error } = await resend.emails.send({
          from,
          to,
          subject,
          html,
        });

        if (error) {
          throw new Error(`Failed to send email: ${error.message}`);
        }

        response = data;
      }

      logger.info(`Email sent to ${to} with subject "${subject}"`);
      return response;
    } catch (error: any) {
      console.error(error);
      if (error instanceof Error) logger.error(error.message);
      logger.error(error);
    }
  }
}

export const mailService = new MailService();
