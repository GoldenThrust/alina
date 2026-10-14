import { v4 as uuid } from "uuid";
import { db } from "../../../prisma/db";
import Websocket from "../../websocket.service";
import type { ToolExecutor } from "../tools/tool.executor";
import type { GemmaClient } from "./gemma.service";

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
  text: string;
  id: string | undefined;
}

export class GemmaAgent {
  constructor(
    private readonly gemma: GemmaClient,
    private readonly executor: ToolExecutor,
  ) {}

  private async previousInteractionId(
    userId: string,
  ): Promise<string | undefined> {
    const conversation = await db.orm.public.Conversation.where({ userId })
      .include("messages", (messages) =>
        messages.orderBy((message) => message.id.desc()),
      )
      .first();

    return conversation?.messages?.[0]?.id ?? undefined;
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

  async analyze(userId: string, input: unknown): Promise<AgentResult> {
    let inputData: unknown = input;
    let previousId = await this.previousInteractionId(userId);
    let lastText = "";

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const interaction = await this.gemma.generate({
        input: inputData,
        previous_interaction_id: previousId,
      } as any);

      lastText = interaction.output_text ?? "";

      const calls: FunctionCall[] = (interaction.steps ?? [])
        .filter((step: any) => step.type === "function_call")
        .map((step: any) => ({
          id: step.id,
          name: step.name,
          arguments: step.arguments ?? {},
        }));

      if (calls.length === 0) {
        Websocket.sendMessage(userId, lastText);
        return { text: lastText, id: interaction.id };
      }

      inputData = await this.runCalls(calls, userId, interaction.id);
      previousId = interaction.id;
    }

    Websocket.sendMessage(userId, lastText);
    return { text: lastText, id: previousId };
  }

  async chat(userId: string, input: unknown): Promise<AgentResult> {
    const sessionId = uuid();
    let inputData: unknown = input;
    let previousId = await this.previousInteractionId(userId);
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

        if (status !== "requires_action" || calls.length === 0 || !interactionId) {
          break;
        }

        inputData = await this.runCalls(calls, userId, interactionId);
      }
    } finally {
      Websocket.endStream(userId, sessionId);
    }

    return { text: fullText, id: previousId };
  }

  async streamData(
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