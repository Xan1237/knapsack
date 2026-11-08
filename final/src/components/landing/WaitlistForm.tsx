"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRight } from "lucide-react";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");

  async function joinWaitlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error("Could not join");
      setEmail("");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="landing-waitlist" id="waitlist">
      <div className="landing-container landing-waitlist-inner">
        <div>
          <p className="landing-eyebrow">EARLY ACCESS</p>
          <h2>Be first in line.</h2>
          <p>
            Join the waitlist and we’ll let you know when Knapsack is ready.
          </p>
        </div>
        {status === "success" ? (
          <p className="waitlist-message" role="status">
            You’re on the list. See you soon.
          </p>
        ) : (
          <form className="waitlist-form" onSubmit={joinWaitlist}>
            <label htmlFor="waitlist-email">Email address</label>
            <div className="waitlist-input-row">
              <input
                id="waitlist-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                maxLength={254}
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (status === "error") setStatus("idle");
                }}
              />
              <button type="submit" disabled={status === "sending"}>
                {status === "sending" ? "Joining…" : "Join the waitlist"}{" "}
                <ArrowUpRight size={17} aria-hidden="true" />
              </button>
            </div>
            {status === "error" && (
              <p className="waitlist-error" role="alert">
                Couldn’t join just now. Please try again.
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
