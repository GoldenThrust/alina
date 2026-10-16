import { BaseRepository } from "./base.repository";
import type { NewRoutineStep, RoutineStep, StepInput } from "./types";

export class RoutineStepRepository extends BaseRepository<
  RoutineStep,
  NewRoutineStep
> {
  protected readonly model = "RoutineStep";

  listByRoutine(routineId: string) {
    return this.findMany(
      { routineId },
      { orderBy: { field: "position", direction: "asc" } },
    );
  }

  /** Creates steps for a routine, numbering positions from 1 in order. */
  addSteps(routineId: string, steps: StepInput[], startAt = 1) {
    return this.createMany(
      steps.map((step, index) => ({
        routineId,
        period: step.period,
        title: step.title,
        instruction: step.instruction,
        position: startAt + index,
      })),
    );
  }

  /** Replaces every step of a routine. */
  async replaceSteps(routineId: string, steps: StepInput[]) {
    await this.deleteWhere({ routineId });
    return this.addSteps(routineId, steps);
  }
}
