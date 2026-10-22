import { BaseRepository } from "./base.repository";
import type { NewRoutineLog, RoutineLog } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface Adherence {
  windowDays: number;
  completions: number;
  daysWithCompletion: number;
  /** daysWithCompletion / windowDays, between 0 and 1. */
  ratio: number;
}

export class RoutineLogRepository extends BaseRepository<
  RoutineLog,
  NewRoutineLog
> {
  protected readonly model = "RoutineLog";

  log(userId: string, routineId: string, createdAt: Date = new Date()) {
    return this.create({ userId, routineId, createdAt });
  }

  /** Logs since a date, newest first. Filters by date in memory. */
  async listSince(
    userId: string,
    since: Date,
    options: { routineId?: string; limit?: number } = {},
  ): Promise<RoutineLog[]> {
    const where = options.routineId
      ? { userId, routineId: options.routineId }
      : { userId };
    const logs = await this.findMany(where, {
      limit: options.limit ?? 500,
      orderBy: { field: "createdAt" },
    });
    return logs.filter((log) => new Date(log.createdAt) >= since);
  }

  async adherence(
    userId: string,
    days = 14,
    routineId?: string,
  ): Promise<Adherence & { logs: RoutineLog[] }> {
    const since = new Date(Date.now() - days * DAY_MS);
    const logs = await this.listSince(userId, since, { routineId });
    const daysWithCompletion = new Set(
      logs.map((log) => new Date(log.createdAt).toISOString().slice(0, 10)),
    ).size;
    return {
      windowDays: days,
      completions: logs.length,
      daysWithCompletion,
      ratio: Number((daysWithCompletion / days).toFixed(2)),
      logs,
    };
  }
}
