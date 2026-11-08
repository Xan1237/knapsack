import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import "./landing.css";

export default function SiteHeader() {
  return (
    <header className="landing-header landing-container">
      <div className="landing-masthead">
        <span className="landing-masthead-note">
          THE PACKING EDIT
          <br />
          ISSUE NO. 01
        </span>
        <Link href="/" className="landing-brand" aria-label="Knapsack home">
          knapsack<span>.</span>
        </Link>
        <span className="landing-masthead-note landing-masthead-right">
          A LITTLE ORDER
          <br />
          FOR THE ROAD
        </span>
      </div>
      <nav aria-label="Main navigation">
        <div>
          <Link href="/#about">About</Link>
          <Link href="/faq">FAQ</Link>
        </div>
        <Link href="/#waitlist" className="landing-header-link">
          Join the waitlist <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </nav>
    </header>
  );
}
