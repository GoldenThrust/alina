import { Server } from "socket.io";
import { server } from "../index.js";
import redis from "./redis";
import { createAdapter } from "@socket.io/redis-streams-adapter";
import { prisma } from "./prisma.js";
import { quanbits } from "./AI/AI.js";
import { gameQueue } from "./bullmq/queue/game.js";
import { GameType, Role } from "../generated/prisma/enums.js";
import { voteQueue } from "./bullmq/queue/vote.js";

export const io = new Server(server, {
  adapter: createAdapter(redis),
  cors: {
    origin: [`${process.env.CLIENT_URL}`],
    credentials: true,
  },
});

export const connectedPlayers = new Map();

function getActiveSocket(id: string) {
  return connectedPlayers.get(id);
}

io.on("connection", async (socket) => {
  try {
    const { roomId, playerId } = socket.handshake.query;

    // console.log(`Player ${playerId} connected to room ${roomId}`);

    socket.join(roomId as string);
    socket.join(playerId as string);

    connectedPlayers.set(playerId, socket.id);

    const player = await prisma.player.findUnique({
      where: {
        id: playerId as string,
      },
    });

    const game = await prisma.game.findUnique({
      where: {
        id: roomId as string,
      },
    });

    // const players = await prisma.player.findMany({
    //   where: {
    //     gameId: game!.id,
    //     kicked: false,
    //   },
    // });

    // const humanPlayers = players.filter((player) => player.role === Role.Human);

    // if (
    //   (game!.type === GameType.EyeFold && humanPlayers.length >= 2) ||
    //   players.length >= 10
    // ) {
    //   await gameQueue.add(
    //     "game-queue",
    //     {
    //       gameId: game!.id,
    //       action: "start",
    //     },
    //     {
    //       delay: 2000,
    //     },
    //   );
    // }

    socket.broadcast.to(roomId as string).emit("player:joined", player);

    socket.on("player:left", () => {
      socket.disconnect();
    });

    socket.on("message:send", async ({ from, to, text }) => {
      const senderSocket = connectedPlayers.get(from);

      if (!senderSocket) {
        console.error(`Sender socket not found for player ${from}`);
        return;
      }

      const playerKicked = await prisma.player.findUnique({
        where: {
          id: from,
          kicked: true,
        },
      });

      if (playerKicked) {
        console.error(`Player ${from} is kicked and cannot send messages.`);
        return;
      }

      const chat = await prisma.chat.create({
        data: {
          text,
          playerId: from,
          toPlayerId: game?.type === GameType.EyeFold ? to : undefined,
          gameId: roomId as string,
        },
      });

      socket.to(to).emit("message:receive", {
        id: chat.id,
        text: chat.text,
        from: to,
        to: from,
        createdAt: chat.createdAt,
      });

      if (game!.type === GameType.EyeFold) {
        const quanbit = quanbits.get(to);

        if (!quanbit) return;

        await quanbit.addMessageToQueue({
          gameId: roomId as string,
          from,
          to,
          respondSocket: from,
          text,
          chatId: chat.id,
        });
      } else {
        const AIs = await prisma.player.findMany({
          where: {
            gameId: roomId as string,
            role: Role.Quanbit,
          },
        });

        for (const AI of AIs) {
          const quanbit = quanbits.get(AI.id);

          if (!quanbit) return;

          await quanbit.addMessageToQueue({
            gameId: roomId as string,
            from,
            to: AI.id,
            respondSocket: roomId as string,
            text,
            chatId: chat.id,
          });
        }
      }
    });

    socket.on(
      "vote:cast",
      async ({ voterId, targetId, castVote, publicReason = null }) => {
        const voterSocket = connectedPlayers.get(voterId);

        if (!voterSocket) {
          console.error(`Voter socket not found for player ${voterId}`);
          return;
        }

        await voteQueue.add("vote-queue", {
          gameId: roomId as string,
          voterId,
          targetId,
          castVote,
          publicReason,
        });
      },
    );

    socket.on("disconnect", async () => {
      connectedPlayers.delete(playerId);

      try {
        setTimeout(async () => {
          const activeSocket = getActiveSocket(playerId as string);
          if (activeSocket) return;

          const player = await prisma.player.findUnique({
            where: {
              id: playerId as string,
            },
          });

          if (!player) return;

          const game = await prisma.game.findUnique({
            where: {
              id: player.gameId,
            },
          });

          if (!game) return;

          if (game.startAt) {
            if ((game.type = GameType.EyeFold)) {
              await prisma.game.update({
                where: {
                  id: player.gameId,
                },
                data: {
                  endAt: new Date(),
                },
              });
            }
          } else {
            await prisma.player.delete({
              where: {
                id: playerId as string,
              },
            });
          }

          io.to(roomId as string).emit("player:left", player);
        }, 2000);
      } catch (error) {
        console.error("Error updating player status on disconnect:", error);
      }
    });
  } catch (error) {
    console.error("Error handling WebSocket connection:", error);
  }
});
