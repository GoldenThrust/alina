import { BaseRepository } from "./base.repository";
import type { NewSkinAnalysis, SkinAnalysis } from "./types";

export class SkinAnalysisRepository extends BaseRepository<
  SkinAnalysis,
  NewSkinAnalysis
> {
  protected readonly model = "SkinAnalysis";

  findByScanId(scanId: string) {
    return this.findOne({ scanId });
  }

  /** One analysis per scan: updates it if it exists, creates it otherwise. */
  async upsertForScan(
    scanId: string,
    metrics: Omit<NewSkinAnalysis, "scanId">,
  ): Promise<SkinAnalysis> {
    const existing = await this.findByScanId(scanId);
    if (existing) {
      return (await this.update(existing.id, metrics)) ?? existing;
    }
    return this.create({ ...metrics, scanId });
  }
}
