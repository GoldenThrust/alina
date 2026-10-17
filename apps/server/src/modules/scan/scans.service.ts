import path from "path";
import { assertOwned, createOwnedService, pick } from "../../lib/crud";
import { ORM } from "../../prisma/db";
import APIError from "../../errors/APIError";
import type { UpsertAnalysisBody } from "./scans";
import { YouCamAnalysis } from "../../queues/youcam/youcam.producer";

const EMAIL_TEMPLATE_PATH = path.join(import.meta.dirname, "emails");

/* ===================== SkinScan ===================== */
const scanBase = createOwnedService({
  label: "Scan",
  model: ORM.Scan,
  createFields: ["image"],
  updateFields: [], // score / AI fields are written by your analysis pipeline, never by clients
  filterFields: ["status"],
  prepareCreate: async (_userId, data) => ({ ...data, status: "PENDING" }),
});

export const scanService = {
  ...scanBase,
  async create(userId: string, payload: { image: string }) {
    const user = await ORM.User().where({
      id: userId,
    }).first();

    if (!user) {
      throw new APIError("User not found!", 401);
    }

    YouCamAnalysis({
      imagePath: payload.image,
      type: user.skinTone ? "skin" : "all",
      source: payload.image,
      userId: userId,
      options: {},
    });
  },
  async get(userId: string, id: string) {
    const scan = await assertOwned(ORM.Scan, id, userId, "Scan");
    const analysis = await ORM.Analysis().where({ scanId: id }).first();
    return { ...scan, analysis: analysis ?? null };
  },
  async remove(userId: string, id: string) {
    await assertOwned(ORM.Scan, id, userId, "Scan");
    // SkinAnalysis has no cascade, so delete it first
    await ORM.Analysis().where({ scanId: id }).delete();
    await ORM.Scan().where({ id, userId }).delete();
    return { message: "Scan deleted successfully" };
  },
};

/* ===================== SkinAnalysis (1:1 with scan) ===================== */
const ANALYSIS_FIELDS = [
  "redness",
  "ageSpot",
  "radiance",
  "moisture",
  "oiliness",
  "darkCircle",
  "eyeBag",
  "droopyUpperEyelid",
  "droopyLowerEyelid",
  "firmness",
  "texture",
  "acne",
  "pore",
  "wrinkle",
  "tearTrough",
  "skinType",
] as const;

export const analysisService = {
  async get(userId: string, scanId: string) {
    await assertOwned(ORM.Scan, scanId, userId, "Scan");
    const analysis = await ORM.Analysis().where({ scanId }).first();
    if (!analysis) throw new APIError("Analysis not found", 404);
    return analysis;
  },
  async upsert(userId: string, scanId: string, payload: UpsertAnalysisBody) {
    await assertOwned(ORM.Scan, scanId, userId, "Scan");
    const data = pick(payload, ANALYSIS_FIELDS);
    const existing = await ORM.Analysis().where({ scanId }).first();
    if (existing) return ORM.Analysis().where({ scanId }).update(data);
    return ORM.Analysis().create({ ...data, scanId });
  },
  async remove(userId: string, scanId: string) {
    await assertOwned(ORM.Scan, scanId, userId, "Scan");
    const existing = await ORM.Analysis().where({ scanId }).first();
    if (!existing) throw new APIError("Analysis not found", 404);
    await ORM.Analysis().where({ scanId }).delete();
    return { message: "Analysis deleted successfully" };
  },
};
