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
        
        console.log(`[ToolExecutor] tool:`, tool);
        console.log(`[ToolExecutor] executing tool: ${tool.name} ${call.name} with args:`, call.args);
        console.log(`[ToolExecutor] context:`, context);

        return await tool.execute(
            call.args,
            context
        );

    }

}