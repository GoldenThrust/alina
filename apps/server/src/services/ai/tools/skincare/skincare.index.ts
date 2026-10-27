import {
  QlooCompareTool,
  QlooRecommendTool,
  QlooTrendingTool,
} from "../qloo/qloo.tool";
import type { ToolRegistry } from "../tool.registry";
import { YouCamAnalyzeFaceTool, YouCamAnalyzeFitzpatrickTool, YouCamAnalyzeSkinToneTool, YouCamAnalyzeSkinTool, YouCamReshapeFaceTool, YouCamSimulateAgingTool, YouCamSimulateSkinTool } from "../youcam/youcam.tools";
import { SkincareRepository } from "./skincare.repository";
import {
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
  GetScanHistoryTool,
  RecommendRoutineStepTool,
  RecommendProductTool,
  RecommendRoutineTool,
} from "./skincare.tools";

export function registerSkincareTools(
  registry: ToolRegistry,
  repo: SkincareRepository = new SkincareRepository(),
) {
  const tools = [
    // read
    new GetScanHistoryTool(repo),
    new GetPreviousSummariesTool(repo),
    new GetPreviousObservationsTool(repo),
    new GetRecommendationsTool(repo),
    new GetRoutinesTool(repo),
    new GetRoutineLogsTool(repo),
    new GetConversationTool(repo),
    new GetPreferencesTool(repo),

    // Qloo tools
    new QlooRecommendTool(repo),
    new QlooCompareTool(repo),
    new QlooTrendingTool(repo),

    // write
    new CreateSummaryTool(repo),
    new CreateObservationTool(repo),
    new CreateRoutineTool(repo),
    new RecommendRoutineTool(repo),
    new RecommendRoutineStepTool(repo),
    new RecommendProductTool(repo),

    // YouCam tools
    new YouCamAnalyzeSkinTool(),
    new YouCamAnalyzeSkinToneTool(),
    new YouCamAnalyzeFitzpatrickTool(),
    new YouCamAnalyzeFaceTool(),
    new YouCamSimulateAgingTool(),
    new YouCamSimulateSkinTool(),
    new YouCamReshapeFaceTool(),
  ];

  for (const tool of tools) registry.register(tool);
  return registry;
}
