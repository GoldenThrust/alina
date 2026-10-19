import {
  ArrowRight,
  Check,
  Droplets,
  Heart,
  // ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
} from "lucide-react";
import { Link } from "react-router";
import PageHeading from "../components/PageHeading";
import {
  usePendingRecommendationsOfType,
  useRecommendedProducts,
} from "../stores";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";

export default function Recommendation() {
  const [busy, setBusy] = useState(false);
  const [featuredAdded, setFeaturedAdded] = useState(false);
  const [routine, setRoutine] = useState<string[]>([]);
  const productRecommendations = usePendingRecommendationsOfType("PRODUCT");

  const recommendedProductIds = productRecommendations
    .map((r) => r.productId)
    .filter((id): id is string => !!id);

  const products = useRecommendedProducts(recommendedProductIds);

  const featured = products[0];
  const alternatives = products.slice(1);

  const featuredRecommendation = productRecommendations.find(
    (r) => r.productId === featured?.id,
  );

  const addToRoutine = useCallback((product: Product) => {
    setBusy(true);
    toast.loading(`Adding ${product.name} to your routine…`, { id: "add-to-routine" });

    setTimeout(() => {
      setRoutine((prev) => [...prev, product.id]);
      if (featured && product.id === featured.id) {
        setFeaturedAdded(true);
      }
      setBusy(false);
      toast.success(`Added ${product.name} to your routine!`, { id: "add-to-routine" });
    }, 500);
  }, [featured]);


  const inRoutine = useCallback(
    (productId: string) => {
      return routine.includes(productId);
    },
    [routine],
  );


  return (
    <div className="page-content recommendations-page">
      <PageHeading
        eyebrow="A little guidance, not a hard sell"
        title="Thoughtful recommendations"
        description="A selection of products that may be relevant to your skin profile."
      />

      {!featured ? (
        <div className="routine-proposal" role="status">
          <Sparkles size={16} />
          <p>
            <strong>You don't have a recommended product yet.</strong> Complete
            a skin scan first, then you can add products as steps.
          </p>
        </div>
      ) : null}
      {/* {error ? <p className="form-message form-error">{error}</p> : null} */}

      <div className="recommendation-layout">
        {featured && (
          <section className="panel featured-recommendation">
            <div className="recommendation-art">
              <span className="sample-product-tag">{featured.category}</span>
              {featured.image ? (
                <img src={featured.image} alt={featured.name} />
              ) : (
                <>
                  <div className="product-bottle">
                    <span>
                      alina
                      <br />
                      <small>daily care</small>
                    </span>
                  </div>
                  <span className="art-sparkle">
                    <Sparkles size={17} />
                  </span>
                </>
              )}
            </div>
            <div className="recommendation-copy flex flex-col justify-between">
              <div>
                <div className="section-kicker">
                  {/* <span className="demo-label">DEMO CATALOG · NOT QLOO</span> */}
                  <span className="match-rating">
                    <Star size={14} fill="currentColor" /> FEATURED PRODUCT
                  </span>
                </div>
                <p className="product-maker">{featured.brand.toUpperCase()}</p>
                <div className="product-header flex items-center gap-1">
                  <h2>{featured.name}</h2>
                  <div className="mt-2 font-bold text-slate-500 font-[monospace] text-sm">
                    {featured.price && `$${featured.price}`}
                  </div>
                </div>
                <p className="product-description">{featured.description}</p>
                <div className="product-reason">
                  <span>
                    <Droplets size={16} />
                  </span>
                  <p>
                    <strong>Why it appears here</strong>
                    <small>
                      {featuredRecommendation?.explanation ||
                        "This product may be relevant to your skin profile."}
                    </small>
                  </p>
                </div>
              </div>
              <div className="recommendation-buttons">
                <button
                  className="button button-primary"
                  type="button"
                  disabled={featuredAdded}
                  onClick={() => {
                    toast.loading("Adding to your routine…", { id: "add-to-routine" });
                    addToRoutine(featured)
                    if (featured.affiliateUrl) {
                      window.open(featured.affiliateUrl, "_blank");
                    }
                  }}
                >
                  {featuredAdded ? <Check size={16} /> : <Heart size={16} />}
                  {featuredAdded ? "Added to your routine" : busy ? "Adding…" : "Add to routine"}
                </button>
                <Link className="button button-secondary" to="/routine">
                  View routine <ArrowRight size={16} />
                </Link>
              </div>
              {/* <div className="recommendation-safety">
              <ShieldCheck size={15} /> Patch test new products and check
              ingredient lists for your needs.
            </div> */}
            </div>
          </section>
        )}

        {alternatives.length > 0 && (
          <section className="alternatives-section">
            <div className="section-heading">
              <div>
                <p className="page-eyebrow">OTHER SAMPLE IDEAS</p>
                <h2>More to explore</h2>
              </div>
              {/* <span className="demo-label">ILLUSTRATIVE</span> */}
            </div>
            <div className="alternatives-grid">
              {alternatives.map((product) => {
                const added = inRoutine(product.id);
                return (
                  <article
                    className="panel alternative-card"
                    key={product.name}
                  >
                    <div className={`alternative-art`}>
                      {product.image ? (
                        <img src={product.image} alt={product.name} />
                      ) : (
                        <span className="mini-bottle" />
                      )}
                    </div>
                    <p className="product-maker">{product.brand}</p>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <div>
                      <strong>{product.price && `$${product.price}`}</strong>
                      <button
                        className="icon-button"
                        type="button"
                        disabled={added}
                        aria-label={
                          added
                            ? `${product.name} is in your routine`
                            : `Add ${product.name} to routine`
                        }
                        onClick={() => {
                          toast.loading("Adding to your routine…", { id: "add-to-routine" });
                          addToRoutine(product)
                          if (product.affiliateUrl) {
                            window.open(product.affiliateUrl, "_blank");
                          }
                        }}
                      >
                        {added ? <Check size={16} /> : <ShoppingBag size={16} />}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
