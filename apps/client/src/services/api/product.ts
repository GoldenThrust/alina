import { get } from "./api";
type ListResponse = { items: Product[]; nextCursor: string | null };

export interface RecommendedProduct {
    /** Products with the nested recommendation stripped off. */
    products: Product[];
    /** The recommendations that were nested inside the products. */
    recommendations: Recommendation[];
    /** Pass back as `cursor` for the next page. null means there are no more pages. */
    nextCursor: string | null;
}

export async function getRecommendedProducts(
  options: { cursor?: string | null; limit?: number; signal?: AbortSignal } = {},
): Promise<RecommendedProduct> {
    const { cursor, limit, signal } = options;
    
    const response = await get<ListResponse>("/products/recommended", {
        ...(cursor ? { cursor } : {}),
        ...(limit ? { limit } : {}),
        signal,
    });
    
    const products: Product[] = [];
    const recommendations: Recommendation[] = [];
    
    for (const { recommendation, ...product } of response.items) {
        products.push(product);
        if (recommendation) {
            recommendations.push({
                ...recommendation,
                // make sure the link back to the product always exists
                productId: recommendation.productId ?? product.id,
                createdAt: new Date(recommendation.createdAt),
            });
        }
    }
    
    return { products, recommendations, nextCursor: response.nextCursor ?? null };
}

export async function getProductsByIds(ids: string[], signal?: AbortSignal): Promise<Product[]> {
  const res = await get<{ items: Product[] }>("/products/ids", {
    q: ids.join(","),
    signal,
  });
  return res.items;
}