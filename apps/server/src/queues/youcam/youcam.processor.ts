import type { JsonValue } from "@prisma/orm-postgres/contract/types";
import { db } from "../../prisma/db";
import { YouCamService } from "../../services/yomCam.service";

export async function processYoucam(job: any) {
  const { userId, type, source, options } = job.data as YouCamAnalysisData;
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

    // hd_eye_bag: { whole: 69.57069635391235 },
    // hd_droopy_lower_eyelid: { whole: 73.1261134147644 },
    // hd_tear_trough: { whole: 58.610981702804565 },
    // hd_droopy_upper_eyelid: { whole: 51.26069188117981 },
    // hd_redness: { whole: 98.29786682128906 },
    // hd_age_spot: { whole: 94.92694091796875 },
    // hd_radiance: { whole: 67.52793788909912 },
    // hd_moisture: { whole: 24.97687041759491 },
    // hd_oiliness: { whole: 26.178157806396484 },
    // hd_dark_circle: { whole: 86.2421303987503 },
    // hd_firmness: { whole: 75.00045895576477 },
    // hd_skin_type: { whole: 'Oily', t_zone: 'Oily', u_zone: 'Oily' },
    // hd_acne: { whole: 61.487850189208984 },
    // hd_texture: { whole: 26.356923076923078 },
    // hd_pore: {
    //   forehead: 0.25397300720214844,
    //   nose: 54.503780364990234,
    //   cheek: 52.53663635253906,
    //   whole: 39.95775604248047
    // },
    // hd_wrinkle: {
    //   forehead: 79.65228796005249,
    //   glabellar: 61.52321815490723,
    //   crowfeet: 99,
    //   periocular: 78.88111591339111,
    //   nasolabial: 93.22141885757446,
    //   marionette: 99,
    //   whole: 72.7150011062622
    // },

    if (response === null) return;
    if (response?.skinAnalysis?.ok) {
      const skinAnalysis = response.skinAnalysis?.data;

      const skinScan = await db.orm.public.SkinScan.create({
        userId,
        status: "PROCESSING",
        score: skinAnalysis.overallScore,
        skinAge: skinAnalysis.skinAge,
      })

      await db.orm.public.SkinAnalysis.create({
        scanId: skinScan.id,
        eyeBag: skinAnalysis.concerns["hd_eye_bag"]["whole"] as number,
        droopyLowerEyelid: skinAnalysis.concerns["hd_droopy_lower_eyelid"]["whole"] as number,
        tearTrough: skinAnalysis.concerns["hd_tear_trough"]["whole"] as number,
        droopyUpperEyelid: skinAnalysis.concerns["hd_droopy_upper_eyelid"]["whole"] as number,
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
      })
    } else if (response?.skinAnalysis?.ok === false) {
      throw new Error(response.skinAnalysis.error.message ?? response.skinAnalysis.error);
    }
  } catch (error) {
    console.error("Error processing YouCam job:", error);
  }
}
