import type { ToolContext, ToolResult } from "./tool";
import {
    ToolRegistry
} from "./tool.registry";

export class ToolExecutor {
    private functionResults: Map<string, Record<string, any>> = new Map();
    constructor(
        private readonly registry: ToolRegistry
    ) {}

    async execute(
        call: {
            name: string;
            args: Record<string, unknown>;
        },
        context: ToolContext
    ): Promise<ToolResult> {

        const tool = this.registry.get(call.name);

        return tool.execute(
            call.args,
            context
        );

    }

}