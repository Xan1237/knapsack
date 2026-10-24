"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CirclePlay,
  MoveUpRight,
  ScanLine,
  SlidersHorizontal,
  Sparkles,
  X,
  Menu,
  Plus,
  Luggage,
  Globe2,
  Mouse,
} from "lucide-react";
import "./landing.css";
import {
  landingPackedCount,
  landingReadyToClose,
} from "@/lib/landing-timeline";

const PackingScene = dynamic(() => import("./PackingScene"), {
  ssr: false,
  loading: () => (
    <div className="lp-scene-loading">
      <Luggage size={30} strokeWidth={1} />
      <span>Making a little room…</span>
    </div>
  ),
});
const chapters = [
  {
    eyebrow: "A LITTLE ROOM FOR EVERYTHING",
    line1: "Less baggage.",
    line2: "More possibility.",
    description:
      "Your whole trip. One perfectly packed suitcase.\nMake room for the things that matter.",
  },
  {
    eyebrow: "01 / BRING YOUR WHOLE WORLD",
    line1: "All your favorites.",
    line2: "All coming along.",
    description:
      "The extra layer. Your favorite sneakers. That book.\nThere’s a place for every part of your trip.",
  },
  {
    eyebrow: "02 / A PLACE FOR EVERYTHING",
    line1: "A perfect fit.",
    line2: "Before you zip.",
    description:
      "See your essentials find their place in 3D.\nA little planning. A lot more breathing room.",
  },
  {
    eyebrow: "03 / AND YOU’RE OFF",
    line1: "Packed with care.",
    line2: "Ready for anywhere.",
    description:
      "Less second-guessing. More getting out there.\nYour next adventure is looking a little lighter.",
  },
];
const faqs = [
  [
    "How does Knapsack work?",
    "Choose your suitcase, add photos of your belongings or start with our sample essentials, then explore your packing plan in 3D. You can resize items, move through the packing order, and make adjustments before you pack.",
  ],
  [
    "Do I need to measure all my things?",
    "No tape measure required. Knapsack starts with estimated item sizes. You can make each item bigger or smaller visually, with optional controls for a more precise fit.",
  ],
  [
    "Can I use my own suitcase?",
    "Start with our personal bag, cabin suitcase, or checked suitcase presets. Choose the closest usable interior size for your bag and adjust your items as needed.",
  ],
  [
    "Will everything definitely fit?",
    "Knapsack gives you an estimated packing layout based on simplified shapes and sizes. Actual fit depends on your bag and belongings. If the planner can’t fit something, it stays visible so you can decide what to change.",
  ],
];

function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`lp-brand${light ? " lp-brand-light" : ""}`}
      aria-label="Knapsack home"
    >
      <span className="lp-brand-icon">
        <Luggage size={23} strokeWidth={1.8} />
      </span>
      knapsack<span className="lp-brand-reg">®</span>
    </Link>
  );
}

export default function LandingPage() {
  const story = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const reducedMotion = useRef(false);
  const meter = useRef<HTMLDivElement>(null);
  const [chapter, setChapter] = useState(0);
  const [packed, setPacked] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [color, setColor] = useState("Sage");

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      reducedMotion.current = motion.matches;
    };
    updateMotion();
    motion.addEventListener("change", updateMotion);
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!story.current) return;
      const bounds = story.current.getBoundingClientRect();
      const p = Math.max(
        0,
        Math.min(1, -bounds.top / (bounds.height - window.innerHeight)),
      );
      progress.current = p;
      if (meter.current)
        meter.current.style.setProperty("--packing-progress", `${p * 100}%`);
      setChapter(p < 0.17 ? 0 : p < 0.46 ? 1 : landingReadyToClose(p) ? 3 : 2);
      setPacked(landingPackedCount(p));
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      motion.removeEventListener("change", updateMotion);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const goToStory = () => {
    if (!story.current) return;
    const top = story.current.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: top + (story.current.offsetHeight - window.innerHeight) * 0.25,
      behavior: reducedMotion.current ? "instant" : "smooth",
    });
    setMenuOpen(false);
  };

  return (
    <main className="lp">
      <a className="lp-skip" href="#how-it-works">
        Skip the animation
      </a>
      <header className="lp-header">
        <Brand />
        <nav
          className={menuOpen ? "lp-nav lp-nav-open" : "lp-nav"}
          aria-label="Main navigation"
        >
          <button onClick={goToStory}>
            The experience <ChevronDown size={12} />
          </button>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
            How it works
          </a>
          <a href="#little-details" onClick={() => setMenuOpen(false)}>
            The little details
          </a>
        </nav>
        <Link href="/pack" className="lp-nav-cta">
          Let’s get packing <ArrowUpRight size={15} />
        </Link>
        <button
          className="lp-menu-button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <section
        ref={story}
        className="lp-story"
        aria-label="A suitcase packing story"
      >
        <div className="lp-story-sticky">
          <div className="lp-story-inner">
            <div className="lp-hero-copy" key={chapter}>
              <span className="lp-eyebrow">
                <span className="lp-status-dot" />
                {chapters[chapter].eyebrow}
              </span>
              {chapter === 0 ? (
                <h1>
                  {chapters[chapter].line1}
                  <br />
                  <span>{chapters[chapter].line2}</span>
                  <svg
                    className="lp-heading-flourish"
                    viewBox="0 0 210 18"
                    aria-hidden="true"
                  >
                    <path d="M3 12 Q90 -1 206 7 M23 16 Q110 6 179 11" />
                  </svg>
                </h1>
              ) : (
                <h2 className="lp-chapter-heading">
                  {chapters[chapter].line1}
                  <br />
                  <span>{chapters[chapter].line2}</span>
                </h2>
              )}
              <p className="lp-hero-description">
                {chapters[chapter].description}
              </p>
              <div className="lp-hero-actions">
                <Link href="/pack" className="lp-button">
                  Find your perfect fit <ArrowUpRight size={18} />
                </Link>
                <button className="lp-watch-button" onClick={goToStory}>
                  <CirclePlay size={21} strokeWidth={1.4} /> See it come
                  together
                </button>
              </div>
              <div className="lp-hero-footnote">
                <span className="lp-small-check">
                  <Check size={11} />
                </span>{" "}
                No overthinking. No sitting on your suitcase.
              </div>
              <div className="lp-scroll-invitation">
                <span className="lp-mouse">
                  <Mouse size={19} strokeWidth={1.3} />
                </span>
                <span>SCROLL TO MAKE ROOM</span>
                <ArrowDown size={13} />
              </div>
            </div>

            <div className="lp-visual">
              <div className="lp-orbit lp-orbit-one" />
              <div className="lp-orbit lp-orbit-two" />
              <span className="lp-scene-label">
                <span /> YOUR TRIP, COMING TOGETHER
              </span>
              <div className="lp-three-scene">
                <PackingScene
                  progress={progress}
                  reducedMotion={reducedMotion}
                />
              </div>
              <div
                className={`lp-item-note lp-item-note-top${chapter > 1 ? " lp-note-packed" : ""}`}
              >
                <span className="lp-note-point" />
                <div>
                  <span>
                    {chapter > 1
                      ? "EVERYTHING IN ITS PLACE"
                      : "THE EVERYDAY ESSENTIALS"}
                  </span>
                  <strong>
                    {chapter > 1
                      ? "Fits like it was meant to."
                      : "Yes, that can come too."}
                  </strong>
                </div>
              </div>
              <div className="lp-bag-label">
                <span className="lp-bag-line" />
                <div>
                  <strong>The weekender</strong>
                  <span>CABIN SIZE · ENDLESS POSSIBILITIES</span>
                </div>
              </div>
              <div className="lp-scene-stamp">
                <span>THOUGHTFULLY</span>
                <Sparkles size={20} strokeWidth={1} />
                <span>PACKED, ALWAYS.</span>
              </div>
              <div className="lp-packing-meter" ref={meter}>
                <div className="lp-meter-top">
                  <span>
                    <span className="lp-status-dot" />
                    {packed === 8
                      ? "EVERYTHING, RIGHT WHERE IT BELONGS"
                      : "A LITTLE ORDER. A LOT MORE ROOM."}
                  </span>
                  <strong>
                    {String(packed).padStart(2, "0")} <span>/ 08</span>
                  </strong>
                </div>
                <div className="lp-meter-track">
                  <span />
                </div>
                <div className="lp-meter-bottom">
                  <span>YOUR ESSENTIALS</span>
                  <span>
                    {packed === 8 ? "READY FOR TAKEOFF" : "SCROLL TO PACK"}{" "}
                    <ArrowDownRight size={11} />
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="lp-story-footer">
            <span>LESS STUFF TO WORRY ABOUT. MORE WORLD TO SEE.</span>
            <div>
              <span className={chapter === 0 ? "is-active" : ""}>01</span>
              <i />
              <span
                className={chapter === 1 || chapter === 2 ? "is-active" : ""}
              >
                02
              </span>
              <i />
              <span className={chapter === 3 ? "is-active" : ""}>03</span>
            </div>
            <span>
              MADE FOR THE WAY YOU GO <MoveUpRight size={12} />
            </span>
          </div>
        </div>
      </section>

      <div className="lp-belief-strip">
        <span>A LIGHTER WAY TO LEAVE.</span>
        <span>
          <Check size={14} /> Everything accounted for
        </span>
        <span>
          <Check size={14} /> A little space to spare
        </span>
        <span>
          <Check size={14} /> One less thing on your mind
        </span>
        <Globe2 size={24} strokeWidth={1} />
      </div>

      <section className="lp-how lp-section" id="how-it-works">
        <div className="lp-section-heading">
          <div>
            <span className="lp-eyebrow">GOOD TRIPS START HERE</span>
            <h2>
              A little planning.
              <br />
              <em>A lot more possibility.</em>
            </h2>
          </div>
          <p>
            From “will it all fit?” to “where to next?”
            <br />
            Your perfectly packed trip, in three little steps.
          </p>
        </div>
        <div className="lp-step-grid">
          <article className="lp-step">
            <div className="lp-step-art lp-art-scan">
              <span className="lp-art-corner lp-corner-a" />
              <span className="lp-art-corner lp-corner-b" />
              <span className="lp-art-corner lp-corner-c" />
              <span className="lp-art-corner lp-corner-d" />
              <div className="lp-mini-shirt">
                <span />
                <i />
              </div>
              <div className="lp-scan-tag">
                <ScanLine size={12} /> A favorite. Coming along.
              </div>
              <span className="lp-scan-line" />
            </div>
            <div className="lp-step-top">
              <span>01</span>
              <ScanLine size={20} strokeWidth={1.3} />
            </div>
            <h3>Bring your things.</h3>
            <p>
              A photo of your essentials is all it takes. We turn your pile into
              a little packing inventory.
            </p>
            <Link href="/pack">
              Meet your essentials <ArrowUpRight size={15} />
            </Link>
          </article>
          <article className="lp-step">
            <div className="lp-step-art lp-art-fit">
              <div className="lp-mini-tray">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="lp-fit-check">
                <Check size={16} />
              </div>
              <span className="lp-art-coordinate">EVERYTHING HAS A PLACE.</span>
            </div>
            <div className="lp-step-top">
              <span>02</span>
              <SlidersHorizontal size={20} strokeWidth={1.3} />
            </div>
            <h3>Find their happy place.</h3>
            <p>
              Pick your suitcase. Explore your 3D packing plan. Tweak a little
              until it feels just right.
            </p>
            <button onClick={goToStory}>
              See the perfect fit <ArrowUpRight size={15} />
            </button>
          </article>
          <article className="lp-step">
            <div className="lp-step-art lp-art-go">
              <div className="lp-ticket">
                <div>
                  <span>YOUR NEXT ADVENTURE</span>
                  <Globe2 size={18} strokeWidth={1} />
                </div>
                <strong>
                  ANYWHERE <ArrowUpRight size={28} />
                </strong>
                <footer>
                  <span>ONE BAG. ALL SET.</span>
                  <span className="lp-barcode">▎▏▌▎▎▏▌▌▏▎▌▏</span>
                </footer>
              </div>
              <span className="lp-ticket-spark">✳</span>
            </div>
            <div className="lp-step-top">
              <span>03</span>
              <Luggage size={20} strokeWidth={1.3} />
            </div>
            <h3>Zip up. Head out.</h3>
            <p>
              Follow your packing order, find a home for everything, and get to
              the good part: going.
            </p>
            <Link href="/pack">
              Your adventure starts here <ArrowUpRight size={15} />
            </Link>
          </article>
        </div>
      </section>

      <section className="lp-details" id="little-details">
        <div className="lp-details-inner">
          <div className="lp-detail-illustration">
            <div className="lp-detail-grid" />
            <div className={`lp-large-case lp-case-${color.toLowerCase()}`}>
              <div className="lp-case-handle" />
              <div className="lp-case-ribs">
                {Array.from({ length: 7 }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
              <span className="lp-case-logo">knapsack</span>
              <span className="lp-case-wheel lp-wheel-left" />
              <span className="lp-case-wheel lp-wheel-right" />
            </div>
            <span className="lp-detail-caption">
              A LITTLE SPACE GOES A LONG WAY.
            </span>
            <div
              className="lp-color-picker"
              aria-label="Suitcase color preview"
            >
              {["Sage", "Clay", "Sand"].map((c) => (
                <button
                  className={`lp-swatch lp-swatch-${c.toLowerCase()}${color === c ? " lp-swatch-active" : ""}`}
                  key={c}
                  aria-label={`Preview ${c.toLowerCase()} suitcase`}
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                />
              ))}
              <span>{color}</span>
            </div>
          </div>
          <div className="lp-detail-copy">
            <span className="lp-eyebrow">IT’S THE LITTLE DETAILS</span>
            <h2>
              More thoughtful.
              <br />
              <em>Less “just in case.”</em>
            </h2>
            <p>
              For the weekend wanderers. The overpackers.
              <br />
              The “I might need this” people. We get you.
            </p>
            <div className="lp-detail-feature">
              <span>
                <Luggage size={20} strokeWidth={1.3} />
              </span>
              <div>
                <h3>Your bag. Your kind of trip.</h3>
                <p>
                  From a quick escape to the long way round.
                  <br />
                  Find the suitcase that fits your plans.
                </p>
              </div>
            </div>
            <div className="lp-detail-feature">
              <span>
                <SlidersHorizontal size={20} strokeWidth={1.3} />
              </span>
              <div>
                <h3>A plan with room to change.</h3>
                <p>
                  Add it. Resize it. Leave it behind.
                  <br />
                  Make little adjustments until it’s yours.
                </p>
              </div>
            </div>
            <Link href="/pack" className="lp-text-link">
              Make a little room <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="lp-faq lp-section">
        <div>
          <span className="lp-eyebrow">A FEW THINGS, UNPACKED</span>
          <h2>
            Good questions.
            <br />
            <em>Room for answers.</em>
          </h2>
          <p>
            Travel’s full of unknowns.
            <br />
            Your packing plan doesn’t have to be.
          </p>
        </div>
        <div className="lp-faq-list">
          {faqs.map(([question, answer], i) => (
            <article
              key={question}
              className={
                openFaq === i ? "lp-faq-item lp-faq-open" : "lp-faq-item"
              }
            >
              <h3>
                <button
                  aria-expanded={openFaq === i}
                  aria-controls={`faq-answer-${i}`}
                  id={`faq-question-${i}`}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {question}
                  <Plus size={18} strokeWidth={1.3} />
                </button>
              </h3>
              <div
                id={`faq-answer-${i}`}
                role="region"
                aria-labelledby={`faq-question-${i}`}
                hidden={openFaq !== i}
              >
                <p>{answer}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-final-cta">
        <span className="lp-eyebrow">THE WORLD IS WAITING</span>
        <h2>
          Make room
          <br />
          for <em>what’s next.</em>
          <span className="lp-cta-spark">✳</span>
        </h2>
        <p>A little less packing. A little more living.</p>
        <Link href="/pack" className="lp-button lp-button-light">
          Let’s get packing <ArrowUpRight size={18} />
        </Link>
        <span className="lp-cta-footnote">
          NO SIGN-UP. JUST GOOD THINGS AHEAD.
        </span>
        <span className="lp-cta-orbit lp-cta-orbit-one" />
        <span className="lp-cta-orbit lp-cta-orbit-two" />
      </section>

      <footer className="lp-footer">
        <div>
          <Brand />
          <span>A little room for everything.</span>
        </div>
        <nav aria-label="Footer navigation">
          <button onClick={goToStory}>
            The experience <ArrowUpRight size={12} />
          </button>
          <a href="#how-it-works">
            How it works <ArrowUpRight size={12} />
          </a>
          <Link href="/pack">
            Start packing <ArrowUpRight size={12} />
          </Link>
        </nav>
        <div className="lp-footer-bottom">
          <span>© {new Date().getFullYear()} KNAPSACK</span>
          <span>THOUGHTFULLY MADE. ADVENTURE READY.</span>
          <a href="#" aria-label="Back to top">
            BACK TO THE TOP <ArrowRight size={12} />
          </a>
        </div>
      </footer>
    </main>
  );
}
