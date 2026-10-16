// The only import of the database in the whole repositories folder.
// Adjust this path to match where this folder lives in your project.
import { db } from "../../prisma/db";

export interface FindOptions<T> {
  limit?: number;
  orderBy?: { field: keyof T & string; direction?: "asc" | "desc" };
}

/**
 * Thin typed wrapper over one ORM model. Every query goes through `table`,
 * so if your ORM's API differs (where/first/all/take/create/update/delete),
 * this is the only file to adapt.
 */
export abstract class BaseRepository<
  T extends { id: string },
  TCreate extends object,
> {
  /** Model name exactly as exposed by db.orm.public, e.g. "SkinScan". */
  protected abstract readonly model: string;

  protected get table(): any {
    return (db.orm.public as any)[this.model];
  }

  protected query(where: Partial<T>, options?: FindOptions<T>) {
    let query = this.table.where(where);
    if (options?.orderBy) {
      const { field, direction = "desc" } = options.orderBy;
      query = query.orderBy((row: any) => row[field][direction]());
    }
    if (options?.limit) query = query.take(options.limit);
    return query;
  }

  async findById(id: string): Promise<T | null> {
    return (await this.table.where({ id }).first()) ?? null;
  }

  async findOne(
    where: Partial<T>,
    options?: FindOptions<T>,
  ): Promise<T | null> {
    return (await this.query(where, options).first()) ?? null;
  }

  async findMany(
    where: Partial<T> = {},
    options?: FindOptions<T>,
  ): Promise<T[]> {
    return this.query(where, options).all();
  }

  async create(data: TCreate): Promise<T> {
    return this.table.create(data);
  }

  async createMany(items: TCreate[]): Promise<T[]> {
    const created: T[] = [];
    for (const item of items) created.push(await this.create(item));
    return created;
  }

  async update(
    id: string,
    data: Partial<Omit<T, "id">>,
  ): Promise<T | null> {
    await this.table.where({ id }).update(data);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.table.where({ id }).delete();
  }

  async deleteWhere(where: Partial<T>): Promise<void> {
    await this.table.where(where).delete();
  }

  async count(where: Partial<T> = {}): Promise<number> {
    return (await this.findMany(where)).length;
  }

  async exists(where: Partial<T>): Promise<boolean> {
    return (await this.findOne(where)) !== null;
  }
}
