import { type Transporter } from "nodemailer";
import { mailTransport } from "../config/mail.ts";
import handlebars from "handlebars";
import mjml2html from "mjml";
import fs from "fs";
import { config } from "../config/index.ts";
import { redisService } from "./redis.service.ts";
import { logger } from "../config/logger.ts";

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
  send({
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
    this.transporter.sendMail({
      to,
      sender: subject,
      html: message,
      text,
      from,
    });
  }

  /**
   * Register Handlebars partial templates for email headers
   * Loads header.mjml template and registers it as a partial
   * @private
   */
  private registerPartialTemplate() {
    const header = fs.readFileSync("./template/email/header.mjml", "utf-8");
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
    data["logo"] = `${clientURL}/logo.svg`;
    data["logo-text"] = `${clientURL}/logo-text.svg`;
    data["advert-img"] = `${clientURL}/advert-img.jpg`;

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

      const info = await this.transporter.sendMail({
        from: `"Yummy House" <${config.env.MAIL_FROM}>`,
        to,
        subject,
        html,
        text,
      });
      logger.info(info);

      return info;
    } catch (error: any) {
      console.error(error);
      if (error instanceof Error) logger.error(error.message);
      logger.error(error);
    }
  }
}

export const mailService = new MailService();
