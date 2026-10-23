import { z } from "zod";
import type { Tool, ToolContext, ToolResult } from "./tool";


export abstract class BaseTool<TInput, TResult = unknown>
    implements Tool
{
    abstract readonly name: string;

    abstract readonly description: string;

    abstract readonly schema: z.ZodType<TInput>;

    protected abstract executeInternal(
        input: TInput,
        context: ToolContext
    ): Promise<TResult>;

    async execute(
        args: Record<string, unknown>,
        context: ToolContext
    ): Promise<ToolResult<TResult>> {

        const startedAt = Date.now();

        try {

            const input = this.schema.parse(args);

            const data = await this.executeInternal(
                input,
                context
            );

            // console.log(
            //     `[Tool] ${this.name} (${Date.now() - startedAt}ms)`
            // );

            return {
                success: true,
                data
            };

        } catch (error) {

            console.error(error);

            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown tool error"
            };

        }

    }

}