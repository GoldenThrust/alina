import { fileManager } from "../../common/files/file";
import { encodeCursor } from "../../common/utils/crypto";
import APIError from "../../errors/APIError";
import { createOwnedHandlers, getUserId, handle } from "../../lib/crud";
import { ORM } from "../../prisma/db";
import { historyQuery } from "./scans.schema";
import * as S from "./scans.service";

/* ---------- SkinScan: create needs an image upload ---------- */
export const scanController = {
  ...createOwnedHandlers(S.scanService as any, "scan"),
  history: handle(
    "Failed to fetch scan history",
    async (req: any) => {
      const { startDate } = req.query;
      const query = historyQuery.parse({ startDate });
      const userId = getUserId(req);

      let rows = await ORM.Scan()
        .include("analysis")
        .where({ userId, ...(startDate ? { createdAt: { gte: query.startDate } } : {}) })
        .orderBy([(r: any) => r.createdAt.desc(), (r: any) => r.id.desc()])
        .all();

        console.log(rows[rows.length - 1]);

      return {
        items: rows,
        nextCursor: encodeCursor(rows[rows.length - 1]) || null,
      };
    },
    200,
  ),
  create: handle(
    "Failed to create scan",
    async (req: any) => {
      const userId = getUserId(req);

      let image: string | undefined;
      try {
        image = await fileManager.uploadFile(req, "image");
      } catch {}
      if (!image) throw new APIError("Scan image is required", 400);

      return S.scanService.create(userId, { image });
    },
    201,
  ),
};

/* ---------- SkinAnalysis (nested under a scan) ---------- */
export const analysisController = {
  get: handle("Failed to fetch analysis", (req: any) =>
    S.analysisService.get(getUserId(req), req.params.scanId),
  ),
  upsert: handle("Failed to save analysis", (req: any) =>
    S.analysisService.upsert(getUserId(req), req.params.scanId, req.body),
  ),
  remove: handle("Failed to delete analysis", (req: any) =>
    S.analysisService.remove(getUserId(req), req.params.scanId),
  ),
};
