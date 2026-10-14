import { z } from "zod";

/**
 * Generic search
 */
export const SearchKnowledgeSchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(20).default(5),
});

/**
 * Search previous conversations
 */
export const SearchConversationSchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(20).default(5),
});

/**
 * Retrieve scan history
 */
export const ScanHistorySchema = z.object({
  userId: z.string().uuid(),
  limit: z.number().default(10),
});

/**
 * Compare two scans
 */
export const CompareScanSchema = z.object({
  previousScanId: z.string().uuid(),
  currentScanId: z.string().uuid(),
});

/**
 * Get routine
 */
export const GetRoutineSchema = z.object({
  userId: z.string().uuid(),
});

/**
 * Save memory
 */
export const RememberSchema = z.object({
  category: z.string(),
  content: z.string(),
});

/**
 * Search products
 */
export const SearchProductSchema = z.object({
  query: z.string(),
  limit: z.number().default(10),
});

/**
 * Search online
 */
export const SearchWebSchema = z.object({
  query: z.string(),
});

/**
 * Send notification
 */
export const NotificationSchema = z.object({
  title: z.string(),
  body: z.string(),
});

/**
 * Final response
 */
export const RespondSchema = z.object({
  message: z.string(),
});