import { useCallback, useEffect, useMemo, useRef } from "react";
import { AnimatePresence, MotionConfig, motion, useInView } from "motion/react";
import {
  ArrowRight,
  Droplets,
  ExternalLink,
  Heart,
  Loader2,
  RefreshCw,
  ScanFace,
  ShoppingBag,
  Sparkles,
  Star,
} from "lucide-react";
import { Link } from "react-router";
import toast from "react-hot-toast";
import PageHeading from "../components/PageHeading";
import StatusBanner from "../components/StatusBanner";
import { useProduct } from "../hooks/useProduct";
import {
  usePendingRecommendationsOfType,
  useRecommendedProducts,
} from "../stores";
import { EASE, container, item as fadeUp } from "../utils/motion";
import { useEnsureProducts } from "../hooks/useEnsureProducts";

interface Entry {
  recommendation: Recommendation;
  product: Product;
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const formatPrice = (price: number | null) =>
  price == null ? null : money.format(price);

/* ---------- Pieces ---------- */

function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />;
}

function RecommendationsSkeleton() {
  return (
    <div className="recommendation-layout" aria-hidden="true">
      <section className="panel featured-recommendation">
        <div className="recommendation-art">
          <Skeleton className="skeleton-art" />
        </div>
        <div className="recommendation-copy">
          <div className="skeleton-stack">
            <Skeleton className="skeleton-line short" />
            <Skeleton className="skeleton-title" />
            <Skeleton className="skeleton-line" />
            <Skeleton className="skeleton-line" />
            <Skeleton className="skeleton-line short" />
          </div>
          <Skeleton className="skeleton-btn" />
        </div>
      </section>
      <div className="alternatives-grid">
        {[0, 1].map((i) => (
          <div className="panel alternative-card" key={i}>
            <Skeleton className="skeleton-art-sm" />
            <Skeleton className="skeleton-line short" />
            <Skeleton className="skeleton-line" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturedCard({
  entry,
  adding,
  onAdd,
}: {
  entry: Entry;
  adding: boolean;
  onAdd: (entry: Entry) => void;
}) {
  const { product, recommendation } = entry;
  const price = formatPrice(product.price);

  return (
    <motion.section
      className="panel featured-recommendation"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <div className="recommendation-art">
        <span className="sample-product-tag">{product.category}</span>
        {product.image ? (
          <motion.img
            src={product.image}
            alt={product.name}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: EASE }}
          />
        ) : (
          <>
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="product-bottle">
                <span>
                  alina
                  <br />
                  <small>daily care</small>
                </span>
              </div>
            </motion.div>
            <span className="art-sparkle">
              <Sparkles size={17} />
            </span>
          </>
        )}
      </div>

      <div className="recommendation-copy">
        <div>
          <div className="section-kicker">
            <span className="match-rating">
              <Star size={14} fill="currentColor" /> FEATURED PRODUCT
            </span>
          </div>
          <p className="product-maker">{product.brand.toUpperCase()}</p>
          <div className="product-title-row">
            <h2>{product.name}</h2>
            {price ? <span className="product-price">{price}</span> : null}
          </div>
          <p className="product-description">{product.description}</p>
          <div className="product-reason">
            <span>
              <Droplets size={16} />
            </span>
            <p>
              <strong>Why it appears here</strong>
              <small>
                {recommendation.explanation ||
                  "This product may be relevant to your skin profile."}
              </small>
            </p>
          </div>
        </div>

        <div className="recommendation-buttons">
          <button
            className="button button-primary"
            type="button"
            disabled={adding}
            onClick={() => onAdd(entry)}
          >
            {adding ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Heart size={16} />
            )}
            {adding ? "Adding…" : "Add to routine"}
          </button>
          {product.affiliateUrl ? (
            <a
              className="button button-secondary"
              href={product.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
            >
              View product <ExternalLink size={15} />
            </a>
          ) : null}
          <Link className="quiet-link" to="/routine">
            View routine <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

function AlternativeCard({
  entry,
  adding,
  onAdd,
}: {
  entry: Entry;
  adding: boolean;
  onAdd: (entry: Entry) => void;
}) {
  const { product } = entry;
  const price = formatPrice(product.price);

  return (
    <motion.article
      className="panel alternative-card"
      layout
      initial={{ opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      <div className="alternative-art">
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
        <strong>{price}</strong>
        <span className="card-actions">
          {product.affiliateUrl ? (
            <a
              className="icon-button"
              href={product.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              aria-label={`View ${product.name}`}
            >
              <ExternalLink size={15} />
            </a>
          ) : null}
          <motion.button
            className="icon-button"
            type="button"
            disabled={adding}
            whileTap={{ scale: 0.9 }}
            aria-label={`Add ${product.name} to routine`}
            onClick={() => onAdd(entry)}
          >
            {adding ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <ShoppingBag size={16} />
            )}
          </motion.button>
        </span>
      </div>
    </motion.article>
  );
}

/* ---------- Page ---------- */

export default function Recommendation() {

const { status, hasMore, loadingMore, moreError, addingIds, loadMore, retry, addToRoutine } = useProduct();

  const productRecommendations = usePendingRecommendationsOfType("PRODUCT");
  const productIds = useMemo(
    () =>
      productRecommendations.flatMap((r) => (r.productId ? [r.productId] : [])),
    [productRecommendations],
  );

  const { fetching: fetchingProducts } = useEnsureProducts(productIds);
  const products = useRecommendedProducts(productIds);

  // Pair each pending recommendation with its product, keeping the server's order
  const entries = useMemo<Entry[]>(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    return productRecommendations.flatMap((recommendation) => {
      const product = recommendation.productId
        ? byId.get(recommendation.productId)
        : undefined;
      return product ? [{ recommendation, product }] : [];
    });
  }, [productRecommendations, products]);

  const featured = entries[0];
  const alternatives = entries.slice(1);

  const isLoading =
    (status === "loading" || fetchingProducts) && entries.length === 0;
  const isEmpty =
    status === "ready" && !fetchingProducts && entries.length === 0 && !hasMore;

  const handleAdd = useCallback(
    async ({ recommendation, product }: Entry) => {
      const id = `add-${recommendation.id}`;
      toast.loading(`Adding ${product.name}…`, { id });
      const ok = await addToRoutine(recommendation.id);
      if (ok) toast.success(`${product.name} added to your routine`, { id });
      else
        toast.error(`Couldn’t add ${product.name}. Please try again.`, { id });
    },
    [addToRoutine],
  );

  // Infinite scroll: load the next page when the sentinel gets near the viewport
  const sentinelRef = useRef<HTMLDivElement>(null);
  const nearEnd = useInView(sentinelRef, { margin: "0px 0px 240px 0px" });

  useEffect(() => {
    if (nearEnd && hasMore && !loadingMore && !moreError && status === "ready")
      void loadMore();
  }, [nearEnd, hasMore, loadingMore, moreError, status, loadMore]);

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="page-content recommendations-page"
        variants={container}
        initial="hidden"
        animate="show"
        aria-busy={isLoading}
      >
        {isLoading ? (
          <p className="sr-only" role="status">
            Loading recommendations…
          </p>
        ) : null}

        <motion.div variants={fadeUp}>
          <PageHeading
            eyebrow="A little guidance, not a hard sell"
            title="Thoughtful recommendations"
            description="A selection of products that may be relevant to your skin profile."
            action={
              entries.length > 0 ? (
                <span className="rec-count">
                  <Sparkles size={13} /> {entries.length}
                  {hasMore ? "+" : ""} suggestion
                  {entries.length === 1 && !hasMore ? "" : "s"}
                </span>
              ) : undefined
            }
          />
        </motion.div>

        <AnimatePresence initial={false}>
          {status === "loadError" ? (
            <StatusBanner
              key="load-error"
              title="We couldn’t load your recommendations."
              text="Check your connection and try again."
              onRetry={retry}
            />
          ) : null}
        </AnimatePresence>

        {isLoading ? (
          <RecommendationsSkeleton />
        ) : isEmpty ? (
          <motion.div className="panel progress-empty" variants={fadeUp}>
            <span className="empty-panel-icon">
              <Sparkles size={20} />
            </span>
            <h2>No recommendations yet</h2>
            <p>
              Complete a skin scan and Alina will suggest products that fit your
              skin.
            </p>
            <Link className="button button-primary" to="/scan">
              <ScanFace size={16} /> Start a scan
            </Link>
          </motion.div>
        ) : (
          <motion.div className="recommendation-layout" variants={fadeUp}>
            <AnimatePresence mode="wait" initial={false}>
              {featured ? (
                <FeaturedCard
                  key={featured.recommendation.id}
                  entry={featured}
                  adding={addingIds.has(featured.recommendation.id)}
                  onAdd={handleAdd}
                />
              ) : null}
            </AnimatePresence>

            {alternatives.length > 0 ? (
              <section className="alternatives-section">
                <div className="section-heading">
                  <div>
                    <p className="page-eyebrow">MORE FOR YOUR SKIN</p>
                    <h2>More to explore</h2>
                  </div>
                </div>
                <div className="alternatives-grid">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {alternatives.map((entry) => (
                      <AlternativeCard
                        key={entry.recommendation.id}
                        entry={entry}
                        adding={addingIds.has(entry.recommendation.id)}
                        onAdd={handleAdd}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            ) : null}

            <div
              className="load-sentinel"
              ref={sentinelRef}
              aria-hidden="true"
            />
            <div className="load-more" aria-live="polite">
              {moreError ? (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => void loadMore()}
                >
                  <RefreshCw size={14} /> Couldn’t load more. Try again
                </button>
              ) : loadingMore ? (
                <>
                  <Loader2 size={15} className="spin" /> Loading more…
                </>
              ) : hasMore ? (
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => void loadMore()}
                >
                  Show more
                </button>
              ) : entries.length > 1 ? (
                <span className="end-note">You’re all caught up</span>
              ) : null}
            </div>
          </motion.div>
        )}
      </motion.div>
    </MotionConfig>
  );
}
