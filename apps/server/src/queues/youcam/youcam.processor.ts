import { db } from "../../prisma/db";
import { YouCamService } from "../../services/yomCam.service";

export async function processYoucam(job: any) {
  const { type, source, options } = job.data as YouCamAnalysisData;
  let response;
  try {
    if (type === "all") {
      response = await YouCamService.analyzeImage(source, options as AnalyzeImageOptions);
    } else if (type === "skin") {
      response = await YouCamService.analyzeSkinImage(source, options as AnalyzeImageOptions);
    }

    // db.orm.public.
  } catch (error) {
    console.error("Error processing YouCam job:", error);
  }
}