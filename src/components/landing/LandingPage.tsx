import Link from "next/link";
import { ArrowRight, Luggage } from "lucide-react";
import "./landing.css";

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
      <header className="landing-header landing-container">
        <Link href="/" className="landing-brand" aria-label="Knapsack home">
          <Luggage size={24} strokeWidth={1.8} aria-hidden="true" />
          <span>knapsack</span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <Link href="/pack" className="landing-header-link">
            Start packing <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </nav>
      </header>

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

          <div
            className="landing-illustration"
            role="img"
            aria-label="Illustration of an example packing layout in a suitcase"
          >
            <div className="landing-illustration-top">
              <span>YOUR PACKING PLAN</span>
              <span>EXAMPLE / 01</span>
            </div>
            <div className="landing-case">
              <div className="landing-case-handle" />
              <div className="landing-case-interior">
                <div className="landing-packed-item landing-item-clothes" />
                <div className="landing-packed-item landing-item-shoes" />
                <div className="landing-packed-item landing-item-pouch" />
                <div className="landing-packed-item landing-item-book" />
              </div>
            </div>
          </div>
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
