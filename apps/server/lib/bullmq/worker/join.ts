// src/workers/join.worker.ts
import { ConnectionOptions, Worker } from "bullmq";

import { io } from "../../socket";
import { humanJoinDelay, sleep } from "../../../utils";
import redis from "../../redis";
import { prisma } from "../../prisma";
import Quanbit, { quanbits } from "../../AI/AI";
import { GameType, Role } from "../../../generated/prisma/enums";
import { gameQueue } from "../queue/game";
import { checkToStart } from "../../utils";

export const joinWorker = new Worker(
  "join-queue",
  async (job) => {
    try {
      const { gameId, isAI } = job.data;

      if (isAI) {
        await sleep(humanJoinDelay());
      }

      let game = await prisma.game.findFirst({
        where: {
          id: gameId,
        },
      });

      if (!game) return;

      const players = await prisma.player.findMany({
        where: {
          gameId: gameId,
          kicked: false,
        },
      });

      const AIPlayers = players.filter(
        (player) => player.role === Role.Quanbit,
      );

      if (game.type === GameType.EyeFold && AIPlayers.length >= 1) {
        return;
      }

      if (players.length >= 10) {
        return;
      }

      const player = await prisma.player.create({
        data: {
          gameId: gameId,
          role: isAI ? Role.Quanbit : Role.Human,
        },
      });

      if (isAI) {
        quanbits.set(player.id, new Quanbit(game.type, player.id, game.id));
        io.to(gameId).emit("player:joined", player);
      }

      if (await checkToStart(game.id)) {
        gameQueue.add(
          "game-queue",
          {
            gameId: game.id,
            action: "start",
          },
          {
            delay: game.type === GameType.NightFall ? 10000 : 2000,
          },
        );
      }

      return player;
    } catch (error) {
      console.error("Error processing join job:", error);
    }
  },
  { connection: redis as ConnectionOptions, concurrency: 5 },
);
