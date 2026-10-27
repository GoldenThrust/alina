export interface ToolContext {
    userId: string;
    callId: string;
    interactionId: string;
    sessionId: string;
}

export interface ToolCall {
    name: string;
    args: Record<string, unknown>;
}

export interface Tool {
    readonly name: string;

    abstract readonly description: string;

    abstract readonly schema: z.ZodType<TInput>;

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