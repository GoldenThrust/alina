import type { JsonValue } from "@prisma/orm-postgres/contract/types";
import { db } from "../../prisma/db";
import { YouCamService } from "../../services/yomCam.service";
import { AIProcessingJob } from "../ai/ai.producer";
import { logger } from "../../config/logger";

export async function processYoucam(job: any) {
  console.log("Processing YouCam job:", job.data);
  logger.info("Processing YouCam job:", job.data);
  const { userId, type, source, imagePath, options } =
    job.data as YouCamAnalysisData;
  let response: AnalyzeImageResult | null = null;

  try {
    if (type === "all") {
      response = await YouCamService.analyzeImage(
        source,
        options as AnalyzeImageOptions,
      );

      if (response.skinTone?.ok && response.fitzpatrick?.ok) {
        const skinTone = response.skinTone?.ok ? response.skinTone?.data : null;
        const skinType = response.fitzpatrick?.ok
          ? response.fitzpatrick?.data
          : null;

        await db.orm.public.User.where({ id: userId }).update({
          skinTone: skinTone?.skinColor ?? null,
          skinType: skinType?.type ?? null,
        });
      }
    } else if (type === "skin") {
      response = await YouCamService.analyzeSkinImage(
        source,
        options as AnalyzeImageOptions,
      );
    }

    if (response === null) return;
    if (response?.skinAnalysis?.ok) {
      const skinAnalysis = response.skinAnalysis?.data;

      const skinScan = await db.orm.public.SkinScan.create({
        userId,
        status: "PROCESSING",
        score: skinAnalysis.overallScore,
        skinAge: skinAnalysis.skinAge,
        image: imagePath,
      });

      const user = await db.orm.public.User.where({ id: userId }).first();

      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      await db.orm.public.SkinAnalysis.create({
        scanId: skinScan.id,
        eyeBag: skinAnalysis.concerns["hd_eye_bag"]["whole"] as number,
        droopyLowerEyelid: skinAnalysis.concerns["hd_droopy_lower_eyelid"][
          "whole"
        ] as number,
        tearTrough: skinAnalysis.concerns["hd_tear_trough"]["whole"] as number,
        droopyUpperEyelid: skinAnalysis.concerns["hd_droopy_upper_eyelid"][
          "whole"
        ] as number,
        redness: skinAnalysis.concerns["hd_redness"]["whole"] as number,
        ageSpot: skinAnalysis.concerns["hd_age_spot"]["whole"] as number,
        radiance: skinAnalysis.concerns["hd_radiance"]["whole"] as number,
        moisture: skinAnalysis.concerns["hd_moisture"]["whole"] as number,
        oiliness: skinAnalysis.concerns["hd_oiliness"]["whole"] as number,
        darkCircle: skinAnalysis.concerns["hd_dark_circle"]["whole"] as number,
        firmness: skinAnalysis.concerns["hd_firmness"]["whole"] as number,
        skinType: skinAnalysis.concerns["hd_skin_type"] as JsonValue,
        acne: skinAnalysis.concerns["hd_acne"]["whole"] as number,
        texture: skinAnalysis.concerns["hd_texture"]["whole"] as number,
        pore: skinAnalysis.concerns["hd_pore"] as JsonValue,
        wrinkle: skinAnalysis.concerns["hd_wrinkle"] as JsonValue,
      });

      await AIProcessingJob({
        userId,
        scanId: skinScan.id,
        input: JSON.stringify({
          event: "skin_scan_completed",

          userId,

          scanId: skinScan.id,

          scan: {
            id: skinScan.id,
            score: skinScan.score,
            skinAge: skinScan.skinAge,
            // image: skinScan.image,
            analysis: {
              skinAnalysis,
              skinTone: response.skinTone?.ok
                ? response.skinTone.data
                : user.skinTone,
              fitzpatrick: response.fitzpatrick?.ok
                ? response.fitzpatrick.data
                : user.skinType,
            },
          },
        }),
      });
    } else if (response?.skinAnalysis?.ok === false) {
      throw new Error(
        response.skinAnalysis.error.message ?? response.skinAnalysis.error,
      );
    }

    logger.info("YouCam job processed successfully");
    console.log("YouCam job processed successfully:", response);
  } catch (error: any) {
    logger.error(`Error processing YouCam job:`, error);
    console.error("Error processing YouCam job:", error);
  }
}
