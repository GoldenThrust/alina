import "dotenv/config";
import path from "node:path";

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;

  if (!value) {
    throw new Error(`Missing env variable: ${key}`);
  }

  return value;
}

export const env = {
  NODE_ENV: getEnv("NODE_ENV", "development"),
  HOST: getEnv("HOST", "0.0.0.0"),
  PORT: Number(getEnv("PORT", "3000")),

  HOST_URL: getEnv("HOST_URL"),
  CLIENT_URL: getEnv("CLIENT_URL"),

  ACCESS_TOKEN_SECRET: getEnv("ACCESS_TOKEN_SECRET"),
  REFRESH_TOKEN_SECRET: getEnv("REFRESH_TOKEN_SECRET"),

  DATABASE_URL: getEnv("DATABASE_URL"),

  REDIS_USERNAME: getEnv("REDIS_USERNAME", "default"),
  REDIS_HOST: getEnv("REDIS_HOST"),
  REDIS_PORT: getEnv("REDIS_PORT"),
  REDIS_PASSWORD: getEnv("REDIS_PASSWORD"),

  MAIL_PORT: getEnv("MAIL_PORT"),
  MAIL_HOST: getEnv("MAIL_HOST"),
  MAIL_USERNAME: getEnv("MAIL_USERNAME"),
  MAIL_PASSWORD: getEnv("MAIL_PASSWORD"),
  MAIL_FROM: getEnv("MAIL_FROM", "customersupport@Alina.com"),

  EMAIL_TEMPLATE_PATH: path.join(process.cwd(), "templates", "emails"),

  RESEND_API_KEY: getEnv("RESEND_API_KEY"),

  GOOGLE_CLIENT_ID: getEnv("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: getEnv("GOOGLE_CLIENT_SECRET"),
  GOOGLE_CALLBACK_URL: getEnv("GOOGLE_CALLBACK_URL"),

  X_CLIENT_ID: getEnv("X_CLIENT_ID"),
  X_CLIENT_SECRET: getEnv("X_CLIENT_SECRET"),
  X_CALLBACK_URL: getEnv("X_CALLBACK_URL"),

  FACEBOOK_CLIENT_ID: getEnv("FACEBOOK_CLIENT_ID"),
  FACEBOOK_CLIENT_SECRET: getEnv("FACEBOOK_CLIENT_SECRET"),
  FACEBOOK_CALLBACK_URL: getEnv("FACEBOOK_CALLBACK_URL"),
  ROOT_DIR: process.cwd(),

  UPLOAD_DIR: path.join(process.cwd(), getEnv("UPLOAD_DIR")),

  YOUCAM_API_KEY: getEnv("YOUCAM_API_KEY"),
  GOOGLE_API_KEY: getEnv("GOOGLE_API_KEY"),
  IPINFO_API_KEY: getEnv("IPINFO_API_KEY"),
  YOUCAM_BASE_URL: getEnv("YOUCAM_BASE_URL", "https://yce-api-01.makeupar.com"),
  QLOO_API_URL: getEnv("QLOO_API_URL", "https://hackathon.api.qloo.com"),
  QLOO_API_KEY: getEnv("QLOO_API_KEY"),
};
