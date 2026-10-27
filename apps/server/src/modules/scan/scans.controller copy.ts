import type { FastifyReply, FastifyRequest } from "fastify";
import { fileManager } from "../../common/files/file";
import APIError from "../../errors/APIError";
import { db } from "../../prisma/db";
import { YouCamAnalysis } from "../../queues/youcam/youcam.producer";

export async function scanAnalysisHandler(
  req: FastifyRequest,
  res: FastifyReply,
) {
  const payload = req.user as JwtPayload;

  try {
    const imagePath = await fileManager.uploadFile(req, "image", "scans");

    const user = await db.orm.public.User.where({
      id: payload.sub,
    }).first();

    if (!user) {
      throw new APIError("User not found!", 401);
    }

    YouCamAnalysis({
      imagePath,
      type: user.skinTone ? "skin" : "all",
      source: imagePath,
      userId: payload.sub,
      options: {},
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return res.status(500).send({ error: "Failed to upload file" });
  }

  return res.send({
    message:
      "File received successfully. Your scan is being processed. You will receive a notification once the analysis is complete.",
  });
}
