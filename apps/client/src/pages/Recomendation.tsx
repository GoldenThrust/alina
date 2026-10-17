import {
  ArrowRight,
  Check,
  Droplets,
  Heart,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
} from "lucide-react";
import { useCallback } from "react";
import { Link } from "react-router";
import PageHeading from "../components/PageHeading";
import { useRoutine } from "../hooks/useRoutine";

interface Product {
  name: string;
  maker: string;
  detail: string;
  price: string;
  tone: "blue" | "mint";
  // What gets written to RoutineStep when the product is added.
  period: RoutinePeriod;
  instruction: string;
}

const featured: Product = {
  name: "Cloudwater Barrier Serum",
  maker: "Soft Theory",
  detail: "",
  price: "",
  tone: "blue",
  period: "MORNING",
  instruction:
    "After cleansing, apply 2-3 drops to damp skin and press in gently. Follow with your moisturizer.",
};

const alternatives: Product[] = [
  {
    name: "Calm Current Gel Cream",
    maker: "Common Ground",
    detail: "Lightweight · fragrance-free",
    price: "$18",
    tone: "blue",
    period: "MORNING",
    instruction: "Apply a pea-sized amount over serum and smooth across face and neck.",
  },
  {
    name: "Everyday Barrier Lotion",
    maker: "Kind Form",
    detail: "Ceramide-rich · sensitive skin",
    price: "$24",
    tone: "mint",
    period: "EVENING",
    instruction: "Smooth over clean, slightly damp skin as the last step of your evening routine.",
  },
];

export default function Recommendation() {
  const { routine, status, error, busy, addStep } = useRoutine();

  const inRoutine = useCallback(
    (title: string) => Boolean(routine?.steps.some((s) => s.title === title)),
    [routine],
  );

  const saveProduct = useCallback(
    (product: Product) => {
      if (inRoutine(product.name)) return;
      void addStep({
        period: product.period,
        title: product.name,
        instruction: product.instruction,
      });
    },
    [addStep, inRoutine],
  );

  const noRoutine = status === "ready" && !routine;
  const featuredAdded = inRoutine(featured.name);
  const disabled = busy || status !== "ready" || noRoutine;

  return (
    <div className="page-content recommendations-page">
      <PageHeading
        eyebrow="A little guidance, not a hard sell"
        title="Thoughtful recommendations"
        description="A sample selection shaped around the demo skin snapshot and preferences."
      />

      {noRoutine ? (
        <div className="routine-proposal" role="status">
          <Sparkles size={16} />
          <p>
            <strong>You don't have a routine yet.</strong> Complete a skin scan first, then you can
            add products as steps.
          </p>
        </div>
      ) : null}
      {error ? <p className="form-message form-error">{error}</p> : null}

      <div className="recommendation-layout">
        <section className="panel featured-recommendation">
          <div className="recommendation-art">
            <span className="sample-product-tag">SAMPLE PRODUCT</span>
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
          </div>
          <div className="recommendation-copy">
            <div className="section-kicker">
              <span className="demo-label">DEMO CATALOG · NOT QLOO</span>
              <span className="match-rating">
                <Star size={14} fill="currentColor" /> SAMPLE MATCH
              </span>
            </div>
            <p className="product-maker">{featured.maker.toUpperCase()}</p>
            <h2>{featured.name}</h2>
            <p className="product-description">
              A lightweight hydrating layer designed to sit comfortably under your everyday
              moisturizer.
            </p>
            <div className="product-reason">
              <span>
                <Droplets size={16} />
              </span>
              <p>
                <strong>Why it appears here</strong>
                <small>
                  The sample profile prioritizes hydration and a simple routine. This is an
                  illustrative match, not a live recommendation.
                </small>
              </p>
            </div>
            <div className="recommendation-buttons">
              <button
                className="button button-primary"
                type="button"
                disabled={disabled || featuredAdded}
                onClick={() => saveProduct(featured)}
              >
                {featuredAdded ? <Check size={16} /> : <Heart size={16} />}
                {featuredAdded ? "Added to your routine" : busy ? "Adding…" : "Add to routine"}
              </button>
              <Link className="button button-secondary" to="/routine">
                View routine <ArrowRight size={16} />
              </Link>
            </div>
            <div className="recommendation-safety">
              <ShieldCheck size={15} /> Patch test new products and check ingredient lists for
              your needs.
            </div>
          </div>
        </section>

        <section className="alternatives-section">
          <div className="section-heading">
            <div>
              <p className="page-eyebrow">OTHER SAMPLE IDEAS</p>
              <h2>More to explore</h2>
            </div>
            <span className="demo-label">ILLUSTRATIVE</span>
          </div>
          <div className="alternatives-grid">
            {alternatives.map((product) => {
              const added = inRoutine(product.name);
              return (
                <article className="panel alternative-card" key={product.name}>
                  <div className={`alternative-art ${product.tone}`}>
                    <span className="mini-bottle" />
                  </div>
                  <p className="product-maker">{product.maker}</p>
                  <h3>{product.name}</h3>
                  <p>{product.detail}</p>
                  <div>
                    <strong>{product.price}</strong>
                    <button
                      className="icon-button"
                      type="button"
                      disabled={disabled || added}
                      aria-label={
                        added
                          ? `${product.name} is in your routine`
                          : `Add ${product.name} to routine`
                      }
                      onClick={() => saveProduct(product)}
                    >
                      {added ? <Check size={16} /> : <ShoppingBag size={16} />}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}