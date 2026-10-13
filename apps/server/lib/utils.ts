import { Game, GameType, Role } from "../generated/prisma/client";
import { prisma } from "./prisma";

export async function checkToStart(gameId: string): Promise<boolean> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
  });

  const players = await prisma.player.findMany({
    where: {
      gameId: gameId,
      kicked: false,
    },
  });

  if (!game) return false;

  const humanPlayers = players.filter((player) => player.role === Role.Human);

  const AIPlayers = players.filter((player) => player.role === Role.Quanbit);

  if (game.type === GameType.NightFall && players.length >= 5) {
    return true;
  }

  if (
    game.type === GameType.EyeFold &&
    humanPlayers.length >= 2 &&
    AIPlayers.length >= 1
  ) {
    return true;
  }

  return false;
}
