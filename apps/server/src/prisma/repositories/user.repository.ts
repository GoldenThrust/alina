import { BaseRepository } from "./base.repository";
import type { NewUser, User } from "./types";

export class UserRepository extends BaseRepository<User, NewUser> {
  protected readonly model = "User";

  override async create(data: NewUser): Promise<User> {
    return super.create({ ...data, email: data.email.trim().toLowerCase() });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.findOne({ email: email.trim().toLowerCase() });
  }

  markEmailVerified(id: string, at: Date = new Date()) {
    return this.update(id, { emailVerifiedAt: at });
  }

  setSkinProfile(
    id: string,
    profile: { skinType?: string | null; skinTone?: string | null },
  ) {
    return this.update(id, profile);
  }

  setLastScanImage(id: string, image: string | null) {
    return this.update(id, { lastScanImage: image });
  }

  /* ---- Gemma interaction chain (one thread per user) ---- */

  async lastInteractionId(id: string): Promise<string | undefined> {
    return (await this.findById(id))?.lastInteractionId ?? undefined;
  }

  saveInteractionId(id: string, interactionId: string) {
    return this.update(id, { lastInteractionId: interactionId });
  }

  /** Start a fresh Gemma chain on the next request. */
  resetInteraction(id: string) {
    return this.update(id, { lastInteractionId: null });
  }
}
