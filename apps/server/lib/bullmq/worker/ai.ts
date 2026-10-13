import { ConnectionOptions, Worker } from "bullmq";
import { quanbits } from "../../AI/AI";
import { prisma } from "../../prisma";
import { io } from "../../socket";
import redis from "../../redis";
import { Role } from "../../../generated/prisma/browser";
import { voteQueue } from "../queue/vote";

export const aiWorker = new Worker(
  "respond",
  async (job) => {
    try {
      // console.log("Processing AI job with data:", job.data);

      let { gameId, from, to, respondSocket, text, myId, system } = job.data;

      console.log(
        `Processing AI job for game ${gameId} from ${from} to ${to} respond to ${respondSocket}: ${text}`,
      );

      from = from.split("-")[0];
      to = to.split("-")[0];

      const isSystemMessage = system === true || from === to;

      const quanbit = quanbits.get(myId);

      if (!quanbit) {
        console.warn(
          `Quanbit with ID ${to} not found for game ${gameId}. Available quanbits: ${[...quanbits.keys()].join(", ")}`,
        );
        return;
      }

      const newText = isSystemMessage
        ? `System Instruction: ${text}`
        : `Player ${from}: ${text}`;

      const actions = await quanbit.sendMessageToAI(newText);

      console.log(
        `AI actions for game ${gameId}:`,
        JSON.stringify(actions),
        `for message from ${from} to ${to} respond to ${respondSocket}: ${text}`,
      );

      const createdChats = [];

      for (const action of actions) {
        if (action.type === "message") {
          const chat = await prisma.chat.create({
            data: {
              text: action.message,
              playerId: to,
              toPlayerId: action.targetPlayerId ?? from,
              gameId,
            },
          });

          if (action.typingDelayMs && action.typingDelayMs > 0) {
            await new Promise<void>((resolve, reject) => {
              setTimeout(async () => {
                try {
                  // console.log(
                  //   `Sending message from ${to} to ${action.targetPlayerId ?? from} after typing delay of ${action.typingDelayMs}ms: ${action.message} using socket ${respondSocket}`,
                  // );
                  io.to(action.targetPlayerId ?? respondSocket).emit("message:receive", {
                    id: chat.id,
                    text: chat.text,
                    from: to,
                    to: action.targetPlayerId ?? from,
                    createdAt: chat.createdAt,
                  });

                  const AIs = await prisma.player.findMany({
                    where: {
                      gameId: gameId as string,
                      role: Role.Quanbit,
                    },
                  });

                  for (const AI of AIs) {
                    const quanbit = quanbits.get(AI.id);

                    if (!quanbit || AI.id === myId) continue;

                    await quanbit.addMessageToQueue({
                      gameId: gameId as string,
                      from,
                      to: AI.id,
                      respondSocket: gameId as string,
                      text,
                      chatId: chat.id,
                    });
                  }

                  resolve();
                } catch (err) {
                  reject(err); // ✅ don't swallow errors silently
                }
              }, action.typingDelayMs);
            });
          }

          createdChats.push(chat);
        }

        if (action.type === "vote") {
          await voteQueue.add("vote-queue", {
            gameId,
            voterId: myId,
            // castVote: action.castVote,
            targetId: action.targetPlayerId,
            reason: action.publicReason,
          });
        }
      }

      return createdChats;
    } catch (error) {
      console.error("Error processing AI job:", error);
    }
  },
  {
    connection: redis as ConnectionOptions,
    concurrency: 5,
  },
);
