import Link from "next/link";
export default function NotFound() {
  return (
    <main style={{ maxWidth: 600, margin: "15vh auto", padding: 28 }}>
      <h1>A little off the beaten path.</h1>
      <p style={{ margin: "18px 0" }}>This page is not in your suitcase.</p>
      <Link className="primary-button" href="/pack">
        Open your suitcase
      </Link>
    </main>
  );
}
