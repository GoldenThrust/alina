import { BaseRepository } from "./base.repository";
import { ProductRepository } from "./product.repository";
import {
  RoutineRepository,
  type RoutineWithSteps,
} from "./routine.repository";
import type {
  NewRecommendation,
  Product,
  Recommendation,
  RecommendationType,
} from "./types";

export type RecommendationWithRelations = Recommendation & {
  product: Product | null;
  routine: RoutineWithSteps | null;
};

export class RecommendationRepository extends BaseRepository<
  Recommendation,
  NewRecommendation
> {
  protected readonly model = "Recommendation";

  constructor(
    private readonly products: ProductRepository = new ProductRepository(),
    private readonly routines: RoutineRepository = new RoutineRepository(),
  ) {
    super();
  }

  listForUser(
    userId: string,
    options: {
      type?: RecommendationType;
      accepted?: boolean;
      limit?: number;
    } = {},
  ) {
    const where: Partial<Recommendation> = { userId };
    if (options.type) where.type = options.type;
    if (options.accepted !== undefined) where.accepted = options.accepted;
    return this.findMany(where, {
      limit: options.limit ?? 20,
      orderBy: { field: "createdAt" },
    });
  }

  listForScan(scanId: string) {
    return this.findMany({ scanId }, { orderBy: { field: "createdAt" } });
  }

  async withRelations(
    recommendations: Recommendation[],
  ): Promise<RecommendationWithRelations[]> {
    return Promise.all(
      recommendations.map(async (rec) => ({
        ...rec,
        product: rec.productId
          ? await this.products.findById(rec.productId)
          : null,
        routine: rec.routineId
          ? await this.routines.findWithSteps(rec.routineId)
          : null,
      })),
    );
  }

  /** Accepting a routine or habit recommendation also accepts its routine. */
  async accept(id: string): Promise<Recommendation | null> {
    const rec = await this.update(id, { accepted: true });
    if (rec?.routineId) await this.routines.accept(rec.routineId);
    return rec;
  }

  dismiss(id: string) {
    return this.update(id, { accepted: false });
  }
}
