export interface ToolContext {
    userId: string;
    callId: string;
    interactionId: string;
}

export interface ToolCall {
    name: string;
    args: Record<string, unknown>;
}

export interface Tool {
    readonly name: string;

    execute(
        args: Record<string, unknown>,
        context: ToolContext
    ): Promise<ToolResult>;
}

export interface ToolResult<T = unknown> {

    success: boolean;

    data?: T;

    error?: string;

    metadata?: {

        duration: number;

        cached: boolean;

        source?: string;

    };

}