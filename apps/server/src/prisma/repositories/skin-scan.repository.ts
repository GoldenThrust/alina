import { BaseRepository } from "./base.repository";
import type { NewSkinScan, ScanStatus, SkinScan } from "./types";

export class SkinScanRepository extends BaseRepository<
  SkinScan,
  NewSkinScan
> {
  protected readonly model = "SkinScan";

  createPending(userId: string, image?: string | null) {
    return this.create({ userId, status: "PENDING", image: image ?? null });
  }

  /** A scan, only if it belongs to the user. */
  findForUser(userId: string, scanId: string) {
    return this.findOne({ id: scanId, userId });
  }

  listCompleted(userId: string, limit = 10) {
    return this.findMany(
      { userId, status: "COMPLETED" },
      { limit, orderBy: { field: "createdAt" } },
    );
  }

  async latestCompleted(userId: string): Promise<SkinScan | null> {
    return (await this.listCompleted(userId, 1))[0] ?? null;
  }

  listForUser(userId: string, limit = 20) {
    return this.findMany(
      { userId },
      { limit, orderBy: { field: "createdAt" } },
    );
  }

  setStatus(id: string, status: ScanStatus) {
    return this.update(id, { status });
  }

  complete(id: string, result: { score: number; skinAge?: number | null }) {
    return this.update(id, {
      status: "COMPLETED",
      score: result.score,
      skinAge: result.skinAge ?? null,
    });
  }

  fail(id: string) {
    return this.setStatus(id, "FAILED");
  }

  saveSummary(id: string, length: "short" | "long", content: string) {
    return this.update(
      id,
      length === "short" ? { aiShortSummary: content } : { aiSummary: content },
    );
  }

  saveObservation(id: string, length: "short" | "long", content: string) {
    return this.update(
      id,
      length === "short"
        ? { aiShortObservation: content }
        : { aiObservation: content },
    );
  }
}
