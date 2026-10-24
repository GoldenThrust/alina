import { v4 as uuid } from "uuid";
import Websocket from "../../websocket.service";
import { SkincareRepository } from "../tools/skincare/skincare.repository";
import { ToolExecutor } from "../tools/tool.executor";
import { GemmaClient } from "./gemma.service";
import { ToolRegistry } from "../tools/tool.registry";
import { db } from "../../../prisma/db";

const MAX_TURNS = 10;

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
  ): Promise<FunctionResultInput[]> {
    return Promise.all(
      calls.map(async (call): Promise<FunctionResultInput> => {
        try {
          const outcome = await this.executor.execute(
            { name: call.name, args: call.arguments },
            { userId, callId: call.id, interactionId },
          );

          return {
            type: "function_result",
            name: call.name,
            call_id: call.id,
            result: outcome.success ? outcome.data : { error: outcome.error },
          };
        } catch (error) {
          return {
            type: "function_result",
            name: call.name,
            call_id: call.id,
            result: {
              error:
                error instanceof Error ? error.message : "Unknown tool error",
            },
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

      for (let turn = 0; turn < MAX_TURNS; turn++) {
        const interaction = await this.gemma.generate({
          input: inputData,
          previous_interaction_id: previousId,
        } as any);

        lastText = interaction.output_text ?? "";
        previousId = interaction.id;

        const calls: FunctionCall[] = (interaction.steps ?? [])
          .filter((step: any) => step.type === "function_call")
          .map((step: any) => ({
            id: step.id,
            name: step.name,
            arguments: step.arguments ?? {},
          }));

        if (calls.length === 0) break;

        inputData = await this.runCalls(calls, userId, interaction.id);
      }

      await this.remember(userId, previousId);
      Websocket.sendMessage(userId, lastText);
      Websocket.sendNotification(
        userId,
        "Image analysis completed successfully.",
      );

      await db.orm.public.SkinScan.where({ id: scanId }).update({
        status: "COMPLETED",
      });

      Websocket.sendNavigationSignal(userId, `/scan-result/${scanId}`);
      await db.orm.public.Message.create({
        userId,
        content: lastText,
        sender: "ALINA",
      });
      return { text: lastText, id: previousId };
    } catch (error: any) {
      await db.orm.public.SkinScan.where({ id: scanId }).update({
        status: "FAILED",
      });

      Websocket.sendNotification(
        userId,
        "Image analysis failed. Please try again.",
      );

      throw error;

      // return {
      //   error: `Failed to Analyse Data: ${error?.message}`,
      //   id: undefined,
      // };
    }
  }

  async chat(userId: string, input: unknown): Promise<AgentResult> {
    const sessionId = uuid();
    let inputData: unknown = input;
    let previousId = await this.repo.lastInteractionId(userId);
    let fullText = "";

    Websocket.startStream(userId, sessionId);

    try {
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        const { interactionId, status, text, calls } = await this.streamData(
          userId,
          sessionId,
          inputData,
          previousId,
        );

        fullText += text;
        if (interactionId) previousId = interactionId;

        if (
          status !== "requires_action" ||
          calls.length === 0 ||
          !interactionId
        ) {
          break;
        }

        inputData = await this.runCalls(calls, userId, interactionId);
      }
    } catch (error: any) {
      throw error;
    } finally {
      Websocket.endStream(userId, sessionId);
    }

    await this.remember(userId, previousId);
    await db.orm.public.Message.create({
      userId,
      content: fullText,
      sender: "ALINA",
    });
    return { text: fullText, id: previousId };
  }

  private async streamData(
    userId: string,
    sessionId: string,
    input: unknown,
    previousId?: string,
  ): Promise<StreamOutcome> {
    const stream: AsyncIterable<any> = (await this.gemma.stream({
      input,
      previous_interaction_id: previousId,
    } as any)) as any;

    let interactionId = previousId;
    let status: string | null = null;
    let text = "";
    const pending = new Map<number, PendingCall>();

    for await (const event of stream) {
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
          break;

        case "error":
          throw new Error(JSON.stringify(event));

        default:
          break; // unknown event types: ignore (new ones may be added)
      }
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

export const gemmaAgent = new GemmaAgent(
  new GemmaClient(process.env.GOOGLE_API_KEY ?? ""),
  new ToolExecutor(new ToolRegistry()),
  new SkincareRepository(),
);
