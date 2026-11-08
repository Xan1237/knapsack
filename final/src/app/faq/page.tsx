import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SiteHeader from "@/components/landing/SiteHeader";

export const metadata: Metadata = { title: "FAQ — Knapsack" };

const questions = [
  {
    question: "How will I add my things?",
    answer: "You’ll be able to upload photos or add items by hand.",
  },
  {
    question: "Do I need to measure everything?",
    answer:
      "No. You’ll be able to start with estimated sizes and adjust them as needed.",
  },
  {
    question: "Can I choose my suitcase?",
    answer:
      "You’ll be able to choose a personal bag, cabin suitcase, or checked suitcase preset.",
  },
  {
    question: "Will everything definitely fit?",
    answer:
      "The layout is an estimate based on simplified shapes and sizes. Actual fit can vary.",
  },
];

export default function FaqPage() {
  return (
    <div className="landing landing-page">
      <SiteHeader />
      <main className="landing-container landing-inner-page landing-faq">
        <div>
          <p className="landing-eyebrow">GOOD TO KNOW</p>
          <h1>A few quick answers.</h1>
          <Link href="/#waitlist" className="landing-text-link">
            Join the waitlist <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <div className="landing-faq-list">
          {questions.map(({ question, answer }) => (
            <article key={question}>
              <h2>{question}</h2>
              <p>{answer}</p>
            </article>
          ))}
        </div>
      </main>
      <footer className="landing-footer landing-container">
        <span>knapsack</span>
      </footer>
    </div>
  );
}
