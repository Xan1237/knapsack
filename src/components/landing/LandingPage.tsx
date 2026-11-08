import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import SiteHeader from "./SiteHeader";
import BackpackDiagram from "./BackpackDiagram";

const steps = [
  {
    number: "01",
    image: "/guide/travel-pack.png",
    title: "Add your things",
    description: "Use photos, add items by hand, or try the sample list.",
  },
  {
    number: "02",
    image: "/guide/suitcase.png",
    title: "Choose your suitcase",
    description: "Pick a bag and adjust your item sizes.",
  },
  {
    number: "03",
    image: "/guide/planner.png",
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
            <p className="landing-eyebrow">
              <span>01</span> THE ART OF PACKING
            </p>
            <h1>
              See what fits <em>before</em> you pack.
            </h1>
            <p className="landing-intro">
              Turn your belongings into a 3D packing plan.
            </p>
            <Link href="/pack" className="landing-button">
              Start packing <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>

          <BackpackDiagram />
        </section>

        <section className="landing-about-section" id="about">
          <div className="landing-container landing-about-inner">
            <div>
              <p className="landing-eyebrow">ABOUT KNAPSACK</p>
              <h2>A little more room for the journey.</h2>
            </div>
            <div className="landing-about-content">
              <p>
                Knapsack helps you see how your things could fit before you
                start packing.
              </p>
              <Link href="/pack" className="landing-button">
                Start packing <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <div className="landing-about-art" aria-hidden="true">
                <span className="landing-about-art-label">
                  MADE FOR GETTING THERE
                </span>
                <div className="landing-about-case">
                  <div />
                  <span>knapsack</span>
                </div>
                <span className="landing-about-art-caption">
                  YOUR NEXT TRIP ↗
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-how" id="how-it-works">
          <div className="landing-container">
            <div className="landing-section-heading">
              <p className="landing-eyebrow">THE QUICK GUIDE / 01—03</p>
              <h2>From pile to packed.</h2>
            </div>
            <div className="landing-steps">
              {steps.map((step) => (
                <article className="landing-step" key={step.number}>
                  <div className="landing-step-top">
                    <span className="landing-step-number">{step.number}</span>
                    <Image
                      src={step.image}
                      alt=""
                      width={200}
                      height={200}
                      className="landing-step-image"
                    />
                  </div>
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
