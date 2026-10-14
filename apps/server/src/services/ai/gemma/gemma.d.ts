import type {
  CompareScanSchema,
  GetRoutineSchema,
  NotificationSchema,
  RememberSchema,
  RespondSchema,
  ScanHistorySchema,
  SearchConversationSchema,
  SearchKnowledgeSchema,
  SearchProductSchema,
  SearchWebSchema,
} from "./gemma.schema";

export type SearchKnowledgeInput = z.infer<typeof SearchKnowledgeSchema>;

export type SearchConversationInput = z.infer<typeof SearchConversationSchema>;

export type ScanHistoryInput = z.infer<typeof ScanHistorySchema>;

export type CompareScanInput = z.infer<typeof CompareScanSchema>;

export type GetRoutineInput = z.infer<typeof GetRoutineSchema>;

export type RememberInput = z.infer<typeof RememberSchema>;

export type SearchProductInput = z.infer<typeof SearchProductSchema>;

export type SearchWebInput = z.infer<typeof SearchWebSchema>;

export type NotificationInput = z.infer<typeof NotificationSchema>;

export type RespondInput = z.infer<typeof RespondSchema>;

export interface GenerateOptions {
  model?: string;
  system_instruction?: string;
  input: InteractionsInput | string;
  tools?: any[];
  stream?: boolean;
  maxOutputTokens?: number;
  previous_interaction_id?: string;
  generation_config?: GenerationConfig_2;
}
