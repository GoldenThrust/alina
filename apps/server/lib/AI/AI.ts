import {
  FunctionCallingConfigMode,
  GoogleGenAI,
  ThinkingLevel,
} from "@google/genai";
import { systemsInstruction } from "./systemsInstruction";
import { aiQueue } from "../bullmq/queue/ai";
import { eyefoldTools, nightfallTools } from "./gemini/tools";
import { prisma } from "../prisma";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY!,
});
export type AlinaAction =
  | {
      type: "message";
      message: string;
      targetPlayerId?: string;
      typingDelayMs?: number;
    }
  | { type: "vote"; targetPlayerId: string; publicReason: string };

export default class Alina {
  chat: any;
  public gameType: GameType;
  public id: string;
  public roomId: string;
  private mainId: string;
  private lastTime: number | null;
  private intervalId: NodeJS.Timeout | null;
  private jobId: string | undefined;

  constructor(id: string) {
    this.id = id;
    this.gameType = type;
    this.roomId = roomId;
    this.mainId = type === GameType.NightFall ? this.id : this.id.split("-")[0];
    this.jobId;

    const tools = type === GameType.NightFall ? nightfallTools : eyefoldTools;

    this.chat = ai.chats.create({
      model: "gemma-4-31b-it",
      // model: "gemini-3.5-flash",
      config: {
        systemInstruction:
          type === GameType.NightFall
            ? systemsInstruction.NightFall
            : systemsInstruction.EyeFold,
        temperature: 1,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
        },
        tools: [{ functionDeclarations: tools }],
        // force a tool call every turn so we never get unstructured prose
        // we'd have to fall back on
        toolConfig: {
          functionCallingConfig: { mode: FunctionCallingConfigMode.ANY },
        },
      },
    });

    this.lastTime = null;
    this.intervalId = null;

    if (this.gameType === GameType.EyeFold) {
      this.intervalId = setInterval(async () => {
        const randomDelay = Math.floor(Math.random() * 60000) + 60000;
        if (this.lastTime && Date.now() - this.lastTime >= randomDelay) {
          let text = `You have not say anything for ${Date.now() - this.lastTime}ms. You can decide to say something or not.`;

          this.addMessageToQueue({
            gameId: this.roomId,
            from: this.id,
            to: this.id,
            text,
            chatId: 0,
            respondSocket: this.roomId as string,
            myId: this.id,
            system: true,
          });
        }
      }, 30000);
    }
  }

  gameEnded() {
    this.chat = null;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async gameStarted() {
    const players = await prisma.player.findMany({
      where: {
        gameId: this.roomId,
        // kicked: false,
        NOT: {
          id: this.mainId,
        },
      },
    });

    let text =
      "Game Started. Your Id is " +
      this.mainId +
      ". Others Players Id are " +
      players.map((p) => p.id).join(", ") +
      ".";

    this.addMessageToQueue({
      gameId: this.roomId,
      from: this.id,
      to: this.id,
      text,
      chatId: 0,
      respondSocket: this.roomId as string,
      myId: this.id,
      system: true,
    });
  }

  async addMessageToQueue(data: {
    gameId: string;
    from: string;
    to: string;
    text: string;
    chatId: string | number;
    respondSocket: string;
    myId?: string;
    system?: boolean;
  }) {
    this.lastTime = Date.now();
    data["myId"] = this.id;

    const intervalId = setInterval(async () => {
      const job = await aiQueue.getJob(this.jobId as string);
      const state = await job?.getState();

      if (!state || state === "completed" || state === "failed") {
        clearInterval(intervalId);
        const job = await aiQueue.add("respond", data, {
          delay: data.system !== true ? responseDelay(data.text) : 0,
        });

        this.jobId = job.id;
      }
    }, 2000);
  }

  /**
   * Sends a message into the chat's own managed history (the SDK keeps
   * the running conversation internally — we never need to replay turns
   * ourselves) and returns a list of parsed actions instead of raw text.
   */
  async sendMessageToAI(text: string): Promise<AlinaAction[]> {
    const response = await this.chat.sendMessage({
      message: text,
    });

    const actions = this.parseFunctionCalls(response);

    return actions;
  }

  private parseFunctionCalls(response: any): AlinaAction[] {
    const calls = response.functionCalls ?? [];

    if (calls.length === 0) {
      console.warn(
        "Gemini returned no function calls (likely plain text). Treating as no action.",
        response.text,
      );
      return [];
    }

    const actions: AlinaAction[] = [];

    for (const call of calls) {
      switch (call.name) {
        case "respondToMessage": {
          const { message, targetPlayerId, typingDelayMs } = call.args ?? {};
          if (!message || typeof message !== "string") {
            console.warn(
              "Malformed respondToMessage args, skipping:",
              call.args,
            );
            break;
          }
          actions.push({
            type: "message",
            message,
            targetPlayerId,
            typingDelayMs,
          });
          break;
        }

        case "voteAgainst": {
          if (this.gameType !== GameType.NightFall) {
            console.warn("voteAgainst called outside NightFall, ignoring.");
            break;
          }
          const { targetPlayerId, publicReason } = call.args ?? {};
          if (!targetPlayerId) {
            console.warn("Malformed voteAgainst args, skipping:", call.args);
            break;
          }
          actions.push({
            type: "vote",
            targetPlayerId,
            // castVote: castVote ?? true,
            publicReason: publicReason ?? "",
          });
          break;
        }

        default:
          console.warn("Unrecognized function call from model:", call.name);
      }
    }

    return actions;
  }
}

export const Alinas = new Map<string, Alina>();
