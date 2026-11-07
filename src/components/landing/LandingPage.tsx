import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SiteHeader from "./SiteHeader";
import BackpackDiagram from "./BackpackDiagram";

const steps = [
  {
    number: "01",
    title: "Add your things",
    description: "Use photos, add items by hand, or try the sample list.",
  },
  {
    number: "02",
    title: "Choose your suitcase",
    description: "Pick a bag and adjust your item sizes.",
  },
  {
    number: "03",
    title: "See your plan",
    description: "Explore your layout in 3D and start packing.",
  },
];

export default function LandingPage() {
  return (
    <div className="landing">
      <SiteHeader />

      <main>
        <section className="landing-hero landing-container">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">A little help for your next trip</p>
            <h1>See what fits before you pack.</h1>
            <p className="landing-intro">
              Turn your belongings into a 3D packing plan.
            </p>
            <Link href="/pack" className="landing-button">
              Start packing <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>

          <BackpackDiagram />
        </section>

        <section className="landing-how" id="how-it-works">
          <div className="landing-container">
            <div className="landing-section-heading">
              <p className="landing-eyebrow">HOW IT WORKS</p>
              <h2>Ready in three steps.</h2>
            </div>
            <div className="landing-steps">
              {steps.map((step) => (
                <article className="landing-step" key={step.number}>
                  <span className="landing-step-number">{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer landing-container">
        <span>knapsack</span>
        <Link href="/pack">
          Start packing <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </footer>
    </div>
  );
}
