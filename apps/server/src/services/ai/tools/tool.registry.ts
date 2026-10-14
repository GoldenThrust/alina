import type { Tool } from "./tool";
import { z } from "zod";

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool {
    const tool = this.tools.get(name);

    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    return tool;
  }

  has(name: string) {
    return this.tools.has(name);
  }

  list() {
    return [...this.tools.keys()];
  }

  declarations() {
    return [...this.tools.values()].map((t) => ({
      type: "function" as const,
      name: t.name,
      description: t.description,
      parameters: z.toJSONSchema(t.schema), // zod v4; on v3 use zod-to-json-schema
    }));
  }
}
