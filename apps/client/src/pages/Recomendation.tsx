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
import { useCallback, useState } from "react";
import { Link } from "react-router";
import PageHeading from "../components/PageHeading";
import { useSessionStore } from "../stores/session";

const alternatives = [
  {
    name: "Calm Current Gel Cream",
    maker: "Common Ground",
    detail: "Lightweight · fragrance-free",
    price: "$18",
    tone: "blue",
  },
  {
    name: "Everyday Barrier Lotion",
    maker: "Kind Form",
    detail: "Ceramide-rich · sensitive skin",
    price: "$24",
    tone: "mint",
  },
];

export default function Recommendation() {
  const addRoutineItem = useSessionStore((state) => state.addRoutineItem);
  const [saved, setSaved] = useState(false);
  const saveProduct = useCallback(
    (product: string) => {
      addRoutineItem(product);
      setSaved(true);
    },
    [addRoutineItem],
  );

  return (
    <div className="page-content recommendations-page">
      <PageHeading
        eyebrow="A little guidance, not a hard sell"
        title="Thoughtful recommendations"
        description="A sample selection shaped around the demo skin snapshot and preferences."
      />
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
            <p className="product-maker">SOFT THEORY</p>
            <h2>Cloudwater Barrier Serum</h2>
            <p className="product-description">
              A lightweight hydrating layer designed to sit comfortably under
              your everyday moisturizer.
            </p>
            <div className="product-reason">
              <span>
                <Droplets size={16} />
              </span>
              <p>
                <strong>Why it appears here</strong>
                <small>
                  The sample profile prioritizes hydration and a simple routine.
                  This is an illustrative match, not a live recommendation.
                </small>
              </p>
            </div>
            <div className="recommendation-buttons">
              <button
                className="button button-primary"
                type="button"
                onClick={() => saveProduct("Cloudwater Barrier Serum")}
              >
                {saved ? <Check size={16} /> : <Heart size={16} />}
                {saved ? "Added to your routine" : "Add to routine"}
              </button>
              <Link className="button button-secondary" to="/routine">
                View routine <ArrowRight size={16} />
              </Link>
            </div>
            <div className="recommendation-safety">
              <ShieldCheck size={15} /> Patch test new products and check
              ingredient lists for your needs.
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
            {alternatives.map((product) => (
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
                    aria-label={`Add ${product.name} to routine`}
                    onClick={() => saveProduct(product.name)}
                  >
                    <ShoppingBag size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
