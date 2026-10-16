import { BaseRepository } from "./base.repository";
import type { NewOAuthAccount, OAuthAccount } from "./types";

export class OAuthAccountRepository extends BaseRepository<
  OAuthAccount,
  NewOAuthAccount
> {
  protected readonly model = "OAuthAccount";

  findByProvider(provider: string, providerId: string) {
    return this.findOne({ provider, providerId });
  }

  listForUser(userId: string) {
    return this.findMany({ userId });
  }

  /** Links a provider account to a user, or returns the existing link. */
  async link(
    userId: string,
    provider: string,
    providerId: string,
  ): Promise<OAuthAccount> {
    const existing = await this.findByProvider(provider, providerId);
    if (existing) return existing;
    return this.create({ userId, provider, providerId });
  }
}
