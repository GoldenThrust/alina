import type { Job } from "bullmq";
import { config } from "../../config";
import { logger } from "../../config/logger";
import { db } from "../../prisma/db";
import { gemmaAgent } from "../../services/ai/gemma/gemma.agents";
import { sendEmailJob } from "../email/email.producer";
import path from "path";
import Websocket from "../../services/websocket.service";
import { getNextRetryDelay } from "../../common/utils/bullmqJob";
import type { AgentCheckpoint } from "../../services/ai/gemma/gemma.agents";

const appUrl = config.env.CLIENT_URL;

const GOOD = { color: "#16886c", bg: "#e8f6f0" };
const BAD = { color: "#c55f83", bg: "#fbeef3" };
const FLAT = { color: "#7b8092", bg: "#f3f3f7" };


// extend your existing AIData type wherever it's declared
type AIJobData = AIData & { checkpoint?: AgentCheckpoint };

export async function processAI(job: Job) {
  const attemptsMade = job.attemptsMade + 1;
  const maxAttempts = job.opts.attempts ?? 1;
  const isLastAttempt = attemptsMade >= maxAttempts;

  const { userId, scanId, input, checkpoint } = job.data as AIJobData;
  logger.info(`Processing AI job: ${JSON.stringify({ userId, scanId, resumed: !!checkpoint })}`);

  // Persist progress on the job itself; BullMQ reuses job.data on every retry.
  const save = (cp: AgentCheckpoint) =>
    job.updateData({ ...job.data, checkpoint: cp });


  try {
    if (scanId) {
      await gemmaAgent.analyze(
        userId,
        scanId,
        input,
        checkpoint,
        save,
      );

      try {
        const user = await db.orm.public.User.where({ id: userId }).first();
        const scan = await db.orm.public.SkinScan.where({
          id: scanId,
          status: "COMPLETED",
        })
          .orderBy((r: any) => r.createdAt.desc())
          .include("analysis")
          .limit(2)
          .all();

        if (user && scan.length > 2) {
          const latestScan = scan[0];
          const previousScan = scan[1];

          const firstName =
            user.fullName?.trim().split(/\s+/)[0] ||
            user.email.split("@")[0] ||
            "Alina member";

          const score =
            latestScan.score != null ? Math.round(latestScan.score) : null;
          const scoreDelta =
            latestScan.score != null && previousScan?.score != null
              ? Math.round(latestScan.score - previousScan.score)
              : null;
          const tone =
            scoreDelta === null || scoreDelta === 0
              ? FLAT
              : scoreDelta > 0
                ? GOOD
                : BAD;

          const highlights = [
            {
              label: "Moisture",
              changeText: "+6 pts",
              arrow: "▲",
              color: GOOD.color,
            },
            {
              label: "Redness",
              changeText: "−3 pts",
              arrow: "▼",
              color: GOOD.color,
            },
            {
              label: "Oiliness",
              changeText: "+2 pts",
              arrow: "▲",
              color: BAD.color,
            },
          ];

          await sendEmailJob({
            to: user.email,
            subject: `Your scan results are ready, ${firstName}`,
            template: path.join(
              config.env.EMAIL_TEMPLATE_PATH,
              "scan-ready.mjml",
            ),
            payload: {
              /* ---------- Header / meta ---------- */
              subject: `Your scan results are ready, ${firstName}`, // used in <mj-title>
              preheader:
                score !== null
                  ? `Skin score ${score}${scoreDelta ? ` (${scoreDelta > 0 ? "+" : "−"}${Math.abs(scoreDelta)} vs. last scan)` : ""}. Tap to see what changed.`
                  : "Your latest scan has been analyzed.",
              firstName,
              year: new Date().getFullYear(),

              /* ---------- The scan ---------- */
              scanDate: latestScan.createdAt.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC", // use the user's time zone if you store it
              }),
              scanId: latestScan.id,
              scanImage: latestScan.image
                ? `${appUrl}\\${latestScan.image}`
                : null,
              /* ---------- Score ---------- */
              hasScore: score !== null,
              score,
              scoreColor:
                score === null || score >= 80
                  ? "#7051eb"
                  : score >= 60
                    ? "#d9930d"
                    : "#dc4c4c",
              skinAge: latestScan.skinAge ?? null,

              /* ---------- Change vs. last scan ---------- */
              hasDelta: scoreDelta !== null,
              deltaText:
                scoreDelta === null
                  ? ""
                  : scoreDelta === 0
                    ? "No change"
                    : `${scoreDelta > 0 ? "+" : "−"}${Math.abs(scoreDelta)} pts`,
              deltaArrow:
                scoreDelta === null
                  ? ""
                  : scoreDelta > 0
                    ? "▲"
                    : scoreDelta < 0
                      ? "▼"
                      : "–",
              deltaColor: tone.color,
              deltaBg: tone.bg,

              /* ---------- AI text ---------- */
              observation:
                latestScan.aiShortObservation ?? "Your scan has been analyzed.",
              summary: latestScan.aiSummary ?? "",

              /* ---------- What changed ---------- */
              hasHighlights: highlights.length > 0,
              highlights,

              /* ---------- Links ---------- */
              resultUrl: `${appUrl}/scan-result/${latestScan.id}`,
              chatUrl: `${appUrl}/chat`,
              preferencesUrl: `${appUrl}/profile`,
              privacyUrl: `${appUrl}/privacy`,
            },
          });
        } else {
          throw new Error(
            `User or Scan not found for userId: ${userId}, scanId: ${scanId}`,
          );
        }
      } catch (error: Error | any) {
        logger.error(
          `Failed to send result email for user: ${userId}, Error:`,
          error,
        );
      }
    } else {
  await gemmaAgent.chat(userId, input, checkpoint, save);
    }

    logger.info("AI job processed successfully");
  } catch (error: any) {
    console.error("Error processing AI job:", error);
    logger.error("Error processing AI job:", error);

    Websocket.sendNotification(
      userId,
      "error",
      `Image analysis failed. ${!isLastAttempt ? `Retrying in ${getNextRetryDelay(job)} seconds` : `Max attempts reached`}: ${error?.message || "Unknown error"}`,
    );
    throw error;
  }
}
