import { Check, LockKeyhole, Sparkles } from "lucide-react";
import PageHeading from "../components/PageHeading";

const plans = [
  {
    name: "Free",
    price: "$0",
    cadence: "always",
    description: "A gentle place to begin.",
    features: [
      "A personal skin journal",
      "Sample scan history",
      "Routine notes",
    ],
    selected: false,
  },
  {
    name: "Premium",
    price: "$9.99",
    cadence: "per month",
    description: "More room for your journey.",
    features: [
      "More frequent check-ins",
      "Longer progress history",
      "Personalized insights",
    ],
    selected: true,
  },
  {
    name: "Family",
    price: "$19.99",
    cadence: "per month",
    description: "Care that fits your household.",
    features: [
      "Separate skin journals",
      "Shared plan overview",
      "Flexible profiles",
    ],
    selected: false,
  },
];

export default function Subscription() {
  return (
    <div className="page-content subscription-page">
      <PageHeading
        eyebrow="A preview of future plans"
        title="Choose your plan"
        description="Compare the example tiers. Plans are illustrative; this prototype does not create subscriptions or collect payment."
        action={
          <span className="demo-label">
            <LockKeyhole size={14} /> NO BILLING
          </span>
        }
      />
      <div className="plan-switch" role="group" aria-label="Billing period">
        <button className="selected" type="button">
          Monthly
        </button>
        <button type="button" disabled>
          Yearly <span>Coming later</span>
        </button>
      </div>
      <div className="plan-grid">
        {plans.map((plan) => (
          <article
            className={`panel plan-card${plan.selected ? " recommended-plan" : ""}`}
            key={plan.name}
          >
            {plan.selected ? (
              <span className="plan-ribbon">
                <Sparkles size={13} /> MOST POPULAR
              </span>
            ) : null}
            <div className="plan-card-heading">
              <span className={`plan-symbol ${plan.name.toLowerCase()}`}>
                {plan.name.slice(0, 1)}
              </span>
              <h2>{plan.name}</h2>
            </div>
            <p>{plan.description}</p>
            <div className="plan-price">
              <strong>{plan.price}</strong>
              <span>{plan.cadence}</span>
            </div>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <Check size={15} />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              className={
                plan.selected
                  ? "button button-primary plan-cta"
                  : "button button-secondary plan-cta"
              }
              type="button"
              disabled
            >
              {plan.selected ? "Preview only" : `View ${plan.name}`}
            </button>
            <small className="plan-note">For demonstration only</small>
          </article>
        ))}
      </div>
      <div className="subscription-footnote">
        <LockKeyhole size={16} />
        <p>
          <strong>No subscription is active.</strong> Plan selection and payment
          are intentionally disabled in this preview.
        </p>
      </div>
    </div>
  );
}
