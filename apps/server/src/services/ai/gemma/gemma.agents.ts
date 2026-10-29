import { v4 as uuid } from "uuid";
import Websocket from "../../websocket.service";
import { SkincareRepository } from "../tools/skincare/skincare.repository";
import { ToolExecutor } from "../tools/tool.executor";
import { GemmaClient } from "./gemma.service";
import { ToolRegistry } from "../tools/tool.registry";
import { db } from "../../../prisma/db";
import { logger } from "../../../config/logger";
import { registerSkincareTools } from "../tools/skincare/skincare.index";
import { env } from "../../../config/env";

const MAX_TURNS = 20;

interface FunctionCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface FunctionResultInput {
  type: "function_result";
  name: string;
  call_id: string;
  result: unknown;
}

interface PendingCall {
  id: string;
  name: string;
  args: string;
}

interface StreamOutcome {
  interactionId: string | undefined;
  status: string | null;
  text: string;
  calls: FunctionCall[];
}

export interface AgentResult {
  error?: string;
  text?: string;
  id: string | undefined;
}

const EMPTY_NOTE =
  "No data yet. This is expected. Do not call this tool again.";

/**
 * function_result.result is a list of content blocks, so the tool output is
 * JSON-stringified into a single text block:
 *   [{ type: "text", text: JSON.stringify(result) }]
 * Empty results are made explicit so the model does not retry the tool.
 */
const toResultBlocks = (data: unknown): { type: "text"; text: string }[] => {
  const isEmpty =
    data === null ||
    data === undefined ||
    (Array.isArray(data) && data.length === 0);

  const payload = isEmpty ? { items: [], note: EMPTY_NOTE } : data;
  return [{ type: "text", text: JSON.stringify(payload) }];
};

export class GemmaAgent {
  constructor(
    private readonly gemma: GemmaClient,
    private readonly executor: ToolExecutor,
    private readonly repo: SkincareRepository = new SkincareRepository(),
  ) {}

  /** Persist the latest interaction id so the next request can continue it. */
  private async remember(userId: string, interactionId: string | undefined) {
    if (!interactionId) return;
    try {
      await this.repo.saveInteractionId(userId, interactionId);
    } catch (error) {
      console.error("[GemmaAgent] failed to save interaction id", error);
    }
  }

  /**
   * Runs every function call in parallel and converts each outcome into a
   * `function_result` input. Failures are sent back to the model as an
   * error payload so it can recover instead of silently losing the call.
   */
  private async runCalls(
    calls: FunctionCall[],
    userId: string,
    interactionId: string,
    sessionId: string,
  ): Promise<FunctionResultInput[]> {
    return Promise.all(
      calls.map(async (call): Promise<FunctionResultInput> => {
        try {
          const outcome = await this.executor.execute(
            { name: call.name, args: call.arguments },
            { userId, callId: call.id, interactionId, sessionId },
          );

          console.log(`[GemmaAgent] executed call ${call.name}:`, outcome);

          return {
            type: "function_result",
            name: call.name,
            call_id: call.id,
            result: toResultBlocks(
              outcome.success ? outcome.data : { error: outcome.error },
            ),
          };
        } catch (error: any) {
          console.error(
            `[GemmaAgent] failed to execute call ${call.name}:`,
            error,
          );
          logger.error(
            `GemmaAgent failed to execute call ${call.name}:`,
            error,
          );
          return {
            type: "function_result",
            name: call.name,
            call_id: call.id,
            result: toResultBlocks({
              error:
                error instanceof Error ? error.message : "Unknown tool error",
            }),
          };
        }
      }),
    );
  }

  async analyze(
    userId: string,
    scanId: string,
    input: unknown,
  ): Promise<AgentResult> {
    try {
      let inputData: unknown = input;
      let previousId = await this.repo.lastInteractionId(userId);
      let lastText = "";
      const sessionId = uuid();

      for (let turn = 0; turn < MAX_TURNS; turn++) {
        console.log(`[GemmaAgent] start analyze turn ${turn + 1}:`, {
          previousId,
          input: JSON.stringify(inputData),
          text: lastText,
        });
        const interaction = await this.gemma.generate({
          input: inputData,
          previous_interaction_id: previousId,
        } as any);

        lastText = interaction.output_text ?? "";
        previousId = interaction.id;

        console.log(`[GemmaAgent] analyze turn ${turn + 1}:`, {
          interactionId: interaction.id,
          status: interaction.status,
          input: interaction.input,
          calls: JSON.stringify(
            interaction.steps?.filter(
              (step: any) => step.type === "function_call",
            ),
          ),
        });

        const calls: FunctionCall[] = (interaction.steps ?? [])
          .filter((step: any) => step.type === "function_call")
          .map((step: any) => ({
            id: step.id,
            name: step.name,
            arguments: step.arguments ?? {},
          }));

        if (calls.length === 0) break;

        inputData = await this.runCalls(
          calls,
          userId,
          interaction.id,
          sessionId,
        );
      }

      if (lastText.trim()) {
        await db.orm.public.Message.upsert({
          create: {
            userId,
            sessionId,
            content: lastText,
            sender: "ALINA",
          },
          update: {
            content: lastText,
          },
          where: { userId, sessionId: sessionId, sender: "ALINA" },
        });
        
        await this.remember(userId, previousId);
        Websocket.sendMessage(userId, lastText);
      }

      await db.orm.public.SkinScan.where({ id: scanId }).update({
        status: "COMPLETED",
      });

      Websocket.sendNotification(
        userId,
        "success",
        "Image analysis completed successfully.",
      );
      Websocket.sendNavigationSignal(userId, `/scan-result/${scanId}`);
      logger.info(`Gemma analysis completed successfully for user: ${userId}`);

      return { text: lastText, id: previousId };
    } catch (error: any) {
      await db.orm.public.SkinScan.where({ id: scanId }).update({
        status: "FAILED",
      });

      logger.error(`Gemma analysis failed for user: ${userId}, Error:`, error);
      console.error("Gemma analysis failed for user:", userId, "Error:", error);

      throw error;
    }
  }

  async chat(userId: string, input: unknown): Promise<AgentResult> {
    const sessionId = uuid();
    let inputData: unknown = input;
    let previousId = await this.repo.lastInteractionId(userId);
    let fullText = "";

    Websocket.startStream(userId, sessionId);

    console.log(`[GemmaAgent] start chat session ${sessionId}:`, {
      previousId,
      input: JSON.stringify(inputData),
    });

    try {
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        // console.log(`[GemmaAgent] chat turn ${turn + 1}:`, {
        //   previousId,
        //   input: JSON.stringify(inputData),
        // });
        const { interactionId, status, text, calls } = await this.streamData(
          userId,
          sessionId,
          inputData,
          previousId,
        );

        console.log(`[GemmaAgent] chat turn ${turn + 1} result:`, {
          interactionId,
          status,
          text,
          fullText,
          calls: JSON.stringify(calls),
        });

        fullText += text;
        if (interactionId) previousId = interactionId;

        if (
          status !== "requires_action" ||
          calls.length === 0 ||
          !interactionId
        ) {
          break;
        }

        inputData = await this.runCalls(
          calls,
          userId,
          interactionId,
          sessionId,
        );
      }
    } catch (error: any) {
      console.error("Gemma chat failed for user:", userId, "Error:", error);
      logger.error(`Gemma chat failed for user: ${userId}, Error:`, error);
      throw error;
    } finally {
      console.log(
        "Chat session ended for user:",
        userId,
        "Session ID:",
        sessionId,
      );
      Websocket.endStream(userId, sessionId);
    }

    if (fullText.trim()) {
      await this.remember(userId, previousId);
      await db.orm.public.Message.upsert({
        create: {
          userId,
          sessionId,
          content: fullText,
          sender: "ALINA",
        },
        update: {
          content: fullText,
        },
        where: { userId, sessionId: sessionId, sender: "ALINA" },
      });
    }
    return { text: fullText, id: previousId };
  }

  private async streamData(
    userId: string,
    sessionId: string,
    input: unknown,
    previousId?: string,
  ): Promise<StreamOutcome> {
    console.log(
      `[GemmaAgent] streaming data for user ${userId}, session ${sessionId}:`,
      {
        previousId,
        input: JSON.stringify(input),
      },
    );
    const stream: AsyncIterable<any> = (await this.gemma.stream({
      input,
      previous_interaction_id: previousId,
    } as any)) as any;

    let interactionId = previousId;
    let status: string | null = null;
    let text = "";
    const pending = new Map<number, PendingCall>();
    let completed = false;

    for await (const event of stream) {
      console.log(`[GemmaAgent] stream event:`, event);
      switch (event.event_type) {
        case "interaction.created":
          interactionId = event.interaction.id;
          break;

        case "step.start":
          if (event.step.type === "function_call") {
            pending.set(event.index, {
              id: event.step.id,
              name: event.step.name,
              args: "",
            });
          }
          break;

        case "step.delta": {
          const delta = event.delta;
          if (delta.type === "text") {
            text += delta.text;
            Websocket.streamData(userId, sessionId, delta.text);
          } else if (delta.type === "arguments_delta") {
            const call = pending.get(event.index);
            if (call) call.args += delta.arguments;
          }
          break;
        }

        case "interaction.completed":
          status = event.interaction.status;
          completed = true;
          break;

        case "error":
          throw new Error(JSON.stringify(event));

        default:
          break; // unknown event types: ignore (new ones may be added)
      }
    }

    if (!completed) {
      throw new Error("STREAM_ENDED_EARLY");
    }

    const calls: FunctionCall[] = [...pending.values()].map((call) => ({
      id: call.id,
      name: call.name,
      arguments: this.parseArgs(call.args),
    }));

    return { interactionId, status, text, calls };
  }

  private parseArgs(raw: string): Record<string, unknown> {
    if (!raw) return {};
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
}

const toolRegistry = new ToolRegistry();
const skincareRepo = new SkincareRepository();

registerSkincareTools(toolRegistry, skincareRepo);

export const gemmaAgent = new GemmaAgent(
  new GemmaClient(env.GOOGLE_API_KEY),
  new ToolExecutor(toolRegistry),
  skincareRepo,
);
