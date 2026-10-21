import { BaseRepository } from "./base.repository";
import { RoutineStepRepository } from "./routine-step.repository";
import type { NewRoutine, Routine, RoutineStep, StepInput } from "./types";

export type RoutineWithSteps = Routine & { steps: RoutineStep[] };

export class RoutineRepository extends BaseRepository<Routine, NewRoutine> {
  protected readonly model = "Routine";

  constructor(
    private readonly steps: RoutineStepRepository = new RoutineStepRepository(),
  ) {
    super();
  }

  async createWithSteps(data: {
    userId: string;
    title: string;
    accepted?: boolean;
    steps: StepInput[];
  }): Promise<RoutineWithSteps> {
    const routine = await this.create({
      userId: data.userId,
      title: data.title,
    });
    const steps = await this.steps.addSteps(routine.id, data.steps);
    return { ...routine, steps };
  }

  async findWithSteps(id: string): Promise<RoutineWithSteps | null> {
    const routine = await this.findById(id);
    if (!routine) return null;
    return { ...routine, steps: await this.steps.listByRoutine(id) };
  }

  async listForUser(
    userId: string,
  ): Promise<RoutineWithSteps[]> {
    const routines = await this.findMany( { userId },
      { orderBy: { field: "createdAt" } },
    );
    return Promise.all(
      routines.map(async (routine) => ({
        ...routine,
        steps: await this.steps.listByRoutine(routine.id),
      })),
    );
  }

  // accept(id: string) {
  //   return this.update(id, { accepted: true });
  // }

  // unaccept(id: string) {
  //   return this.update(id, { accepted: false });
  // }

  replaceSteps(id: string, steps: StepInput[]) {
    return this.steps.replaceSteps(id, steps);
  }

  /** Deletes the routine and its steps. */
  async deleteWithSteps(id: string): Promise<void> {
    await this.steps.deleteWhere({ routineId: id });
    await this.delete(id);
  }
}
