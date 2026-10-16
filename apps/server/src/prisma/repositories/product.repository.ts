import { BaseRepository } from "./base.repository";
import type { NewProduct, Product, ProductCategory } from "./types";

export class ProductRepository extends BaseRepository<Product, NewProduct> {
  protected readonly model = "Product";

  findByNameAndBrand(name: string, brand: string) {
    return this.findOne({ name, brand });
  }

  /** Returns the existing product with this name and brand, or creates it. */
  async findOrCreate(data: NewProduct): Promise<Product> {
    const existing = await this.findByNameAndBrand(data.name, data.brand);
    return existing ?? this.create(data);
  }

  listByCategory(category: ProductCategory, limit = 50) {
    return this.findMany({ category }, { limit });
  }

  /** Case-insensitive match on name, brand or description (in memory). */
  async search(text: string, limit = 20): Promise<Product[]> {
    const needle = text.trim().toLowerCase();
    if (!needle) return [];
    const all = await this.findMany();
    return all
      .filter((p) =>
        [p.name, p.brand, p.description].some((field) =>
          field.toLowerCase().includes(needle),
        ),
      )
      .slice(0, limit);
  }
}
