import "dotenv/config";
import path from "path";

import { fileURLToPath } from "url";
export const __filename = fileURLToPath(import.meta.url);
// const __dirname = process.cwd();
const __dirname = path.dirname(__filename);

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;

  if (!value) {
    throw new Error(`Missing env variable: ${key}`);
  }

  return value;
}

// console.log("Current working directory:", process.cwd(), __dirname, __filename);

export const env = {
  NODE_ENV: getEnv("NODE_ENV", "development"),
  HOST: getEnv("HOST", "0.0.0.0"),
  PORT: Number(getEnv("PORT", "3000")),

  HOST_URL: getEnv("HOST_URL"),
  CLIENT_URL: getEnv("CLIENT_URL"),

  ACCESS_TOKEN_SECRET: getEnv("ACCESS_TOKEN_SECRET"),
  REFRESH_TOKEN_SECRET: getEnv("REFRESH_TOKEN_SECRET"),

  DATABASE_URL: getEnv("DATABASE_URL"),

  REDIS_HOST: getEnv("REDIS_HOST"),
  REDIS_PORT: getEnv("REDIS_PORT"),

  MAIL_PORT: getEnv("MAIL_PORT"),
  MAIL_HOST: getEnv("MAIL_HOST"),
  MAIL_USERNAME: getEnv("MAIL_USERNAME"),
  MAIL_PASSWORD: getEnv("MAIL_PASSWORD"),
  MAIL_FROM: getEnv("MAIL_FROM", "customersupport@Alina.com"),

  GOOGLE_CLIENT_ID: getEnv("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: getEnv("GOOGLE_CLIENT_SECRET"),
  GOOGLE_CALLBACK_URL: getEnv("GOOGLE_CALLBACK_URL"),

  X_CLIENT_ID: getEnv("X_CLIENT_ID"),
  X_CLIENT_SECRET: getEnv("X_CLIENT_SECRET"),
  X_CALLBACK_URL: getEnv("X_CALLBACK_URL"),

  FACEBOOK_CLIENT_ID: getEnv("FACEBOOK_CLIENT_ID"),
  FACEBOOK_CLIENT_SECRET: getEnv("FACEBOOK_CLIENT_SECRET"),
  FACEBOOK_CALLBACK_URL: getEnv("FACEBOOK_CALLBACK_URL"),
  UPLOAD_DIR: path.join(__dirname, getEnv("UPLOAD_DIR")),
};
