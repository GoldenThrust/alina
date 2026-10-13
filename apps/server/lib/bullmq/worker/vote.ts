// src/workers/join.worker.ts
import { ConnectionOptions, Worker } from "bullmq";

import { connectedPlayers, io } from "../../socket";
import redis from "../../redis";
import { prisma } from "../../prisma";
import { quanbits } from "../../AI/AI";
import { Role } from "../../../generated/prisma/enums";
import { gameQueue } from "../queue/game";

export const voteWorker = new Worker(
  "vote-queue",
  async (job) => {
    try {
      const { gameId, voterId, targetId } = job.data;

      const playerKicked = await prisma.player.findUnique({
        where: {
          id: voterId,
          kicked: true,
        },
      });

      if (playerKicked) {
        console.error(`Player ${voterId} is kicked and cannot vote.`);
        return;
      }

      const vote = await prisma.vote.upsert({
        where: {
          gameId_voterId: {
            voterId,
            gameId,
          },
        },
        update: {
          targetId,
        },
        create: {
          voterId,
          targetId,
          gameId,
        },
      });

      io.to(gameId as string).emit("vote:cast", {
        voterId: vote.voterId,
        targetId: vote.targetId,
      });

      const AIs = await prisma.player.findMany({
        where: {
          gameId: gameId as string,
          role: Role.Quanbit,
        },
      });

      // console.log(
      //   `Processing vote job for game ${gameId}: voter ${voterId} voted against target ${targetId}`,
      // );
      for (const AI of AIs) {
        const quanbit = quanbits.get(AI.id);

        if (!quanbit || AI.id === voterId) continue;

        await quanbit.addMessageToQueue({
          gameId: gameId as string,
          from: voterId,
          to: AI.id,
          respondSocket: gameId as string,
          text:
            AI.id === targetId
              ? `Player ${voterId} voted against you`
              : `Player ${voterId} voted against Player ${targetId}`,
          chatId: vote.id,
          system: true,
        });
      }

      const voteAgainstTarget = await prisma.vote.findMany({
        where: {
          targetId: targetId,
        },
      });

      const players = await prisma.player.findMany({
        where: {
          gameId: gameId as string,
          kicked: false,
        },
      });

      let kickedPlayer;

      // console.log(
      //   voteAgainstTarget.length,
      //   players.length,
      //   voteAgainstTarget.length >= Math.ceil(players.length / 2),
      // );

      if (voteAgainstTarget.length >= Math.ceil(players.length / 2)) {
        kickedPlayer = await prisma.player.update({
          where: {
            id: targetId,
          },
          data: {
            kicked: true,
          },
        });

        connectedPlayers.delete(targetId);
        quanbits.delete(targetId);

        for (const AI of AIs) {
          const quanbit = quanbits.get(AI.id);

          if (!quanbit || AI.id === voterId) continue;

          await quanbit.addMessageToQueue({
            gameId: gameId as string,
            from: voterId,
            to: AI.id,
            respondSocket: gameId as string,
            text: `Player ${targetId} eliminated`,
            chatId: vote.id,
            system: true,
          });
        }

        io.to(gameId as string).emit("player:kicked", {
          playerId: targetId,
        });
      }

      const totalHumans = await prisma.player.count({
        where: { gameId: gameId as string, role: Role.Human },
      });

      const remainingHumans = await prisma.player.count({
        where: { gameId: gameId as string, role: Role.Human, kicked: false },
      });

      const remainingAIs = await prisma.player.count({
        where: { gameId: gameId as string, role: Role.Quanbit, kicked: false },
      });

      const eliminatedHumans = totalHumans - remainingHumans;
      const eliminationThreshold = Math.ceil(totalHumans * (4 / 5));

      const shouldEndGame =
        remainingAIs <= 0 ||
        totalHumans <= 0 ||
        eliminatedHumans >= eliminationThreshold;

      if (shouldEndGame) {
        gameQueue.add("game-queue", {
          gameId,
          action: "end",
        });
      }
    } catch (error) {
      console.error("Error processing vote job:", error);
    }
  },
  { connection: redis as ConnectionOptions, concurrency: 5 },
);
