"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main style={{ maxWidth: 600, margin: "15vh auto", padding: 28 }}>
      <h1>Let’s give that another try.</h1>
      <p style={{ margin: "18px 0" }}>
        The workspace could not finish loading. Your saved trip stays in this
        browser.
      </p>
      <button className="primary-button" onClick={reset}>
        Retry workspace
      </button>
    </main>
  );
}
