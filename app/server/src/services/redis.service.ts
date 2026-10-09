import type { Redis } from "ioredis";
import { config } from "../config/index.ts";

class RedisService {
  public redis: Redis;
  constructor(redis: Redis) {
    this.redis = redis;
  }

  async setRefreshToken(key: string, value: string, ex: number = 604800): Promise<string> {
    return await this.redis.setex(`refresh_token:${key}`, ex, value);
  }

  async getRefreshToken(key: string): Promise<string | null> {
    return await this.redis.get(`refresh_token:${key}`);
  }

  async setAccountVerificationToken(key: string, value: string, ex: number = 604800): Promise<string> {
    return await this.redis.setex(`account_verification_token:${key}`, ex, value);
  }

  async getAccountVerificationToken(key: string): Promise<string | null> {
    const userId = await this.redis.get(`account_verification_token:${key}`);
  
    await this.redis.del(`account_verification_token:${key}`);

    return userId;
  }

  async setAccountPasswordResetToken(key: string, value: string, ex: number = 604800): Promise<string> {
    return await this.redis.setex(`account_password_reset_token:${key}`, ex, value);
  }

  async getAccountPasswordResetToken(key: string): Promise<string | null> {
    const token = await this.redis.get(`account_password_reset_token:${key}`)

    await this.redis.del(`account_password_reset_token:${key}`);
    return token;
  }

  async setAccountResetToken(key: string, value: string, ex: number = 604800): Promise<string> {
    return await this.redis.setex(`account_reset_token:${key}`, ex, value);
  }

  async getAccountResetToken(key: string): Promise<string | null> {
    const token = await this.redis.get(`account_reset_token:${key}`)

    await this.redis.del(`account_reset_token:${key}`);
    return token;
  }

  async setAccountEmailPassword(key: string, value: string, ex: number = 604800): Promise<string> {
    return await this.redis.setex(`account-email-password:${key}`, ex, value);
  }

  async getAccountEmailPassword(key: string): Promise<string | null> {
    const token = await this.redis.get(`account-email-password:${key}`);
    await this.redis.del(`account-email-password:${key}`);
    return token;
  }

  async setAccountEmail(key: string, value: string, ex: number = 604800): Promise<string> {
    return await this.redis.setex(`account-email:${key}`, ex, value);
  }

  async getAccountEmail(key: string): Promise<string | null> {
    const token = await this.redis.get(`account-email:${key}`);

    await this.redis.del(`account-email:${key}`);
    return token;
  }

  async setEmailTemplate(templateLocation: string, template: string, ex: number = 604800): Promise<string> {
    return await this.redis.setex(`email_template:${templateLocation}`, ex, template);
  }

  async getEmailTemplate(templateLocation: string): Promise<string | null> {
    return await this.redis.get(`email_template:${templateLocation}`);
  }

  async cacheEmailHeader(template: string,): Promise<string> {
    return await this.redis.set("email_header-template", template);
  }

  async getEmailHeader(): Promise<string | null> {
    return await this.redis.get("email_header-template");
  }
}

export const redisService = new RedisService(config.redis);
