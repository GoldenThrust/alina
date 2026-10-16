import { BaseRepository } from "./base.repository";
import type { Message, NewMessage, Sender } from "./types";

export class MessageRepository extends BaseRepository<Message, NewMessage> {
  protected readonly model = "Message";

  add(userId: string, sender: Sender, content: string, createdAt?: Date) {
    return this.create(
      createdAt
        ? { userId, sender, content, createdAt }
        : { userId, sender, content },
    );
  }

  addUserMessage(userId: string, content: string, createdAt?: Date) {
    return this.add(userId, "USER", content, createdAt);
  }

  addAlinaMessage(userId: string, content: string, createdAt?: Date) {
    return this.add(userId, "ALINA", content, createdAt);
  }

  /** The latest messages for a user, oldest first. */
  async latest(userId: string, limit = 20): Promise<Message[]> {
    const rows = await this.findMany(
      { userId },
      { limit, orderBy: { field: "createdAt" } },
    );
    return rows.reverse();
  }

  clear(userId: string) {
    return this.deleteWhere({ userId });
  }
}
