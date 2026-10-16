import { BaseRepository } from "./base.repository";
import type { NewPreference, Preference } from "./types";

export type PreferenceInput = Partial<Omit<NewPreference, "userId">>;

export class PreferenceRepository extends BaseRepository<
  Preference,
  NewPreference
> {
  protected readonly model = "Preference";

  findByUser(userId: string) {
    return this.findOne({ userId });
  }

  /** One preference row per user: updates it if it exists, creates it otherwise. */
  async upsert(userId: string, data: PreferenceInput): Promise<Preference> {
    const existing = await this.findByUser(userId);
    if (existing) return (await this.update(existing.id, data)) ?? existing;
    return this.create({ ...data, userId });
  }

  async avoidIngredient(userId: string, ingredient: string) {
    const current = await this.findByUser(userId);
    const avoided = new Set(current?.avoidedIngredients ?? []);
    avoided.add(ingredient.trim().toLowerCase());
    return this.upsert(userId, { avoidedIngredients: [...avoided] });
  }

  async allowIngredient(userId: string, ingredient: string) {
    const current = await this.findByUser(userId);
    const needle = ingredient.trim().toLowerCase();
    return this.upsert(userId, {
      avoidedIngredients: (current?.avoidedIngredients ?? []).filter(
        (i) => i.toLowerCase() !== needle,
      ),
    });
  }
}
