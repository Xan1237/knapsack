import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SiteHeader from "@/components/landing/SiteHeader";

export const metadata: Metadata = { title: "About — Knapsack" };

export default function AboutPage() {
  return (
    <div className="landing landing-page">
      <SiteHeader />
      <main className="landing-container landing-inner-page landing-about">
        <div>
          <p className="landing-eyebrow">ABOUT KNAPSACK</p>
          <h1>A little more room for the journey.</h1>
          <p className="landing-inner-intro">
            Knapsack helps you see how your things could fit before you start
            packing.
          </p>
          <Link href="/pack" className="landing-button">
            Start packing <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <div className="landing-about-art" aria-hidden="true">
          <div className="landing-about-tag">MADE FOR GETTING THERE</div>
          <div className="landing-about-case">
            <div />
            <span>knapsack</span>
          </div>
          <span className="landing-about-coordinate">YOUR NEXT TRIP ↗</span>
        </div>
      </main>
      <footer className="landing-footer landing-container">
        <span>knapsack</span>
      </footer>
    </div>
  );
}
