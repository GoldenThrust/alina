import type { ToolRegistry } from "../tool.registry";
import { SkincareRepository } from "./skincare.repository";
import {
  CreateConversationTool,
  CreateObservationTool,
  CreateRoutineTool,
  CreateSummaryTool,
  GetConversationTool,
  GetPreferencesTool,
  GetPreviousObservationsTool,
  GetPreviousSummariesTool,
  GetRecommendationsTool,
  GetRoutineLogsTool,
  GetRoutinesTool,
  RecommendProductTool,
  RecommendRoutineTool,
} from "./skincare.tools";

export function registerSkincareTools(
  registry: ToolRegistry,
  repo: SkincareRepository = new SkincareRepository(),
) {
  const tools = [
    // read
    new GetPreviousSummariesTool(repo),
    new GetPreviousObservationsTool(repo),
    new GetRecommendationsTool(repo),
    new GetRoutinesTool(repo),
    new GetRoutineLogsTool(repo),
    new GetConversationTool(repo),
    new GetPreferencesTool(repo),
    // write
    new CreateSummaryTool(repo),
    new CreateObservationTool(repo),
    new CreateRoutineTool(repo),
    new RecommendRoutineTool(repo),
    new RecommendProductTool(repo),
    new CreateConversationTool(repo),
  ];

  for (const tool of tools) registry.register(tool);
  return registry;
}
