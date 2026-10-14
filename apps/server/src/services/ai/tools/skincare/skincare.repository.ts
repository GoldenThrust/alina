import { db } from "../../../../prisma/db";

/**
 * Single place that touches the database for the skincare tools.
 * If your ORM's query syntax differs from what is used here, adapt only
 * this file — the tools depend on the interface below, not on the ORM.
 */

export type SummaryLength = "short" | "long";
export type RecommendationType = "routine" | "product";
export type RoutineSlot = "morning" | "evening" | "weekly";

export interface RoutineStep {
  order: number;
  instruction: string;
  productName?: string;
  productCategory?: string;
}

export interface SummaryRecord {
  id: string;
  userId: string;
  length: SummaryLength;
  content: string;
  scanId?: string | null;
  createdAt: Date;
}

export interface ObservationRecord {
  id: string;
  userId: string;
  length: SummaryLength;
  content: string;
  concerns: string[];
  scanId?: string | null;
  createdAt: Date;
}

export interface RecommendationRecord {
  id: string;
  userId: string;
  type: RecommendationType;
  title: string;
  reason: string;
  payload: Record<string, unknown>;
  status: "suggested" | "accepted" | "dismissed";
  createdAt: Date;
}

export interface RoutineRecord {
  id: string;
  userId: string;
  name: string;
  slot: RoutineSlot;
  goal?: string | null;
  steps: RoutineStep[];
  active: boolean;
  createdAt: Date;
}

export interface RoutineLogRecord {
  id: string;
  userId: string;
  routineId: string;
  completed: boolean;
  notes?: string | null;
  loggedAt: Date;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  interactionId?: string | null;
}

export interface ConversationRecord {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  messages?: MessageRecord[];
}

export interface PreferenceRecord {
  id: string;
  userId: string;
  skinType?: string | null;
  concerns: string[];
  allergies: string[];
  avoidIngredients: string[];
  budget?: string | null;
  routineComplexity?: string | null;
  notes?: string | null;
}

const orm = () => db.orm.public as any;

export class SkincareRepository {
  // ---------- reads ----------

  async summaries(
    userId: string,
    opts: { length?: SummaryLength; limit: number },
  ): Promise<SummaryRecord[]> {
    const where = opts.length ? { userId, length: opts.length } : { userId };
    return orm()
      .Summary.where(where)
      .orderBy((s: any) => s.createdAt.desc())
      .limit(opts.limit)
      .all();
  }

  async observations(
    userId: string,
    opts: { length?: SummaryLength; limit: number },
  ): Promise<ObservationRecord[]> {
    const where = opts.length ? { userId, length: opts.length } : { userId };
    return orm()
      .Observation.where(where)
      .orderBy((o: any) => o.createdAt.desc())
      .limit(opts.limit)
      .all();
  }

  async recommendations(
    userId: string,
    opts: { type?: RecommendationType; limit: number },
  ): Promise<RecommendationRecord[]> {
    const where = opts.type ? { userId, type: opts.type } : { userId };
    return orm()
      .Recommendation.where(where)
      .orderBy((r: any) => r.createdAt.desc())
      .limit(opts.limit)
      .all();
  }

  async routines(
    userId: string,
    opts: { activeOnly: boolean },
  ): Promise<RoutineRecord[]> {
    const where = opts.activeOnly ? { userId, active: true } : { userId };
    return orm()
      .Routine.where(where)
      .orderBy((r: any) => r.createdAt.desc())
      .all();
  }

  async routineLogs(
    userId: string,
    opts: { routineId?: string; since: Date; limit: number },
  ): Promise<RoutineLogRecord[]> {
    const where = opts.routineId
      ? { userId, routineId: opts.routineId }
      : { userId };
    const logs: RoutineLogRecord[] = await orm()
      .RoutineLog.where(where)
      .orderBy((l: any) => l.loggedAt.desc())
      .limit(opts.limit)
      .all();
    return logs.filter((l) => new Date(l.loggedAt) >= opts.since);
  }

  async conversation(
    userId: string,
    opts: { conversationId?: string; limit: number },
  ): Promise<ConversationRecord | null> {
    const where = opts.conversationId
      ? { userId, id: opts.conversationId }
      : { userId };
    const convo = await orm()
      .Conversation.where(where)
      .include("messages", (messages: any) =>
        messages.orderBy((m: any) => m.id.desc()),
      )
      .first();
    if (!convo) return null;
    return {
      ...convo,
      messages: (convo.messages ?? []).slice(0, opts.limit).reverse(),
    };
  }

  async preferences(userId: string): Promise<PreferenceRecord | null> {
    return (await orm().Preference.where({ userId }).first()) ?? null;
  }

  // ---------- writes ----------

  async createSummary(
    data: Omit<SummaryRecord, "id" | "createdAt">,
  ): Promise<SummaryRecord> {
    return orm().Summary.create({ ...data, createdAt: new Date() });
  }

  async createObservation(
    data: Omit<ObservationRecord, "id" | "createdAt">,
  ): Promise<ObservationRecord> {
    return orm().Observation.create({ ...data, createdAt: new Date() });
  }

  async createRoutine(
    data: Omit<RoutineRecord, "id" | "createdAt" | "active">,
  ): Promise<RoutineRecord> {
    return orm().Routine.create({
      ...data,
      active: true,
      createdAt: new Date(),
    });
  }

  async createRecommendation(
    data: Omit<RecommendationRecord, "id" | "createdAt" | "status">,
  ): Promise<RecommendationRecord> {
    return orm().Recommendation.create({
      ...data,
      status: "suggested",
      createdAt: new Date(),
    });
  }

  async createConversation(
    data: Pick<ConversationRecord, "userId" | "title">,
    firstMessage?: { role: "user" | "assistant"; content: string },
  ): Promise<ConversationRecord> {
    const convo: ConversationRecord = await orm().Conversation.create({
      ...data,
      createdAt: new Date(),
    });
    if (firstMessage) {
      await orm().Message.create({
        conversationId: convo.id,
        role: firstMessage.role,
        content: firstMessage.content,
      });
    }
    return convo;
  }
}
