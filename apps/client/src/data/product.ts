/* ---------- Dummy products (remove once the API is wired up) ---------- */

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "product-1",
    name: "Hydra Boost Hyaluronic Serum",
    brand: "Aqualume",
    category: "SERUM",
    description:
      "Multi-weight hyaluronic acid serum that plumps and hydrates without feeling sticky.",
    image: "https://picsum.photos/seed/product-1/400/400",
    affiliateUrl: "https://example.com/products/hydra-boost-serum",
    price: 28.0,
  },
  {
    id: "product-2",
    name: "Barrier Repair Ceramide Cream",
    brand: "Dermacalm",
    category: "MOISTURIZER",
    description:
      "Fragrance-free cream with ceramides and panthenol to soothe redness and strengthen the skin barrier.",
    image: "https://picsum.photos/seed/product-2/400/400",
    affiliateUrl: "https://example.com/products/barrier-repair-cream",
    price: 24.5,
  },
  {
    id: "product-3",
    name: "Oil Balance Niacinamide Gel",
    brand: "Clarivo",
    category: "MOISTURIZER",
    description:
      "Lightweight gel moisturizer with 5% niacinamide to regulate oil and refine the look of pores.",
    image: "https://picsum.photos/seed/product-3/400/400",
    affiliateUrl: "https://example.com/products/oil-balance-gel",
    price: 19.99,
  },
  {
    id: "product-4",
    name: "Daily Glow Vitamin C Serum",
    brand: "Lumiere Lab",
    category: "SERUM",
    description:
      "Stable 15% vitamin C formula that brightens dullness and helps even out skin tone.",
    image: "https://picsum.photos/seed/product-4/400/400",
    affiliateUrl: "https://example.com/products/daily-glow-vitamin-c",
    price: 34.0,
  },
  {
    id: "product-5",
    name: "Gentle Gel Cleanser",
    brand: "Dermacalm",
    category: "CLEANSER",
    description:
      "Low-foam, pH-balanced cleanser that removes impurities without stripping moisture.",
    image: "https://picsum.photos/seed/product-5/400/400",
    affiliateUrl: "https://example.com/products/gentle-gel-cleanser",
    price: 14.0,
  },
  {
    id: "product-6",
    name: "Soothing Rose Water Toner",
    brand: "Aqualume",
    category: "TONER",
    description:
      "Alcohol-free toner that rebalances skin after cleansing and preps it for serums.",
    image: "https://picsum.photos/seed/product-6/400/400",
    affiliateUrl: "https://example.com/products/rose-water-toner",
    price: 16.5,
  },
  {
    id: "product-7",
    name: "Invisible Shield SPF 50",
    brand: "Solenne",
    category: "SUNSCREEN",
    description:
      "Broad-spectrum, lightweight sunscreen with no white cast, suitable for daily wear under makeup.",
    image: "https://picsum.photos/seed/product-7/400/400",
    affiliateUrl: "https://example.com/products/invisible-shield-spf50",
    price: 22.0,
  },
  {
    id: "product-8",
    name: "Renew 0.3% Retinol Treatment",
    brand: "Clarivo",
    category: "TREATMENT",
    description:
      "Gentle encapsulated retinol that targets fine lines and uneven texture. For evening use.",
    image: "https://picsum.photos/seed/product-8/400/400",
    affiliateUrl: "https://example.com/products/renew-retinol",
    price: 38.0,
  },
  {
    id: "product-9",
    name: "Smooth Away BHA Exfoliant",
    brand: "Lumiere Lab",
    category: "TREATMENT",
    description:
      "2% salicylic acid liquid exfoliant that unclogs pores and smooths rough texture.",
    image: "https://picsum.photos/seed/product-9/400/400",
    affiliateUrl: "https://example.com/products/smooth-away-bha",
    price: 29.0,
  },
  {
    id: "product-10",
    name: "Cooling Under-Eye Roller",
    brand: "Aqualume",
    category: "OTHER",
    description:
      "Metal-tipped roller with caffeine gel to reduce the look of puffiness and dark circles.",
    image: null, // exercises the nullable image case
    affiliateUrl: null, // exercises the nullable affiliate case
    price: null, // exercises the nullable price case
  },
];

export async function fetchProducts(
  options: { ids?: string[]; category?: ProductCategory; signal?: AbortSignal } = {},
): Promise<Product[]> {
  const { ids, category, signal } = options;

  // Swap this body for the real request:
  //   const params = new URLSearchParams();
  //   if (category) params.set("category", category);
  //   if (ids?.length) params.set("ids", ids.join(","));
  //   const res = await fetch(`/api/products?${params}`, { signal });
  //   if (!res.ok) throw new Error(`Request failed (${res.status})`);
  //   return (await res.json()) as Product[];
  await new Promise<void>((resolve, reject) => {
    const id = setTimeout(resolve, 600);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

  return MOCK_PRODUCTS.filter(
    (p) =>
      (!ids || ids.includes(p.id)) && (!category || p.category === category),
  );
}