import Link from "next/link";
import { ArrowRight, Luggage } from "lucide-react";
import "./landing.css";

export default function SiteHeader() {
  return (
    <header className="landing-header landing-container">
      <Link href="/" className="landing-brand" aria-label="Knapsack home">
        <Luggage size={24} strokeWidth={1.8} aria-hidden="true" />
        <span>knapsack</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/about">About</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/pack" className="landing-header-link">
          Start packing <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </nav>
    </header>
  );
}
