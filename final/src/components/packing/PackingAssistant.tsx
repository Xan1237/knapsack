"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCheck,
  LoaderCircle,
  LockKeyhole,
  PackageOpen,
  Sparkles,
  X,
} from "lucide-react";
import type { Item, Suitcase } from "@/lib/domain";
import type { AstraAdvice } from "@/lib/astra";
import type { PackingChoice } from "@/lib/choices";
import styles from "./PackingAssistant.module.css";

type Props = {
  open: boolean;
  wantedId: string | null;
  items: Item[];
  bag: Suitcase;
  revision: string;
  onClose: () => void;
  onApply: (includeIds: string[], priorityId?: string) => void;
  onLargerBag: () => void;
};

export default function PackingAssistant({
  open,
  wantedId,
  items,
  bag,
  revision,
  onClose,
  onApply,
  onLargerBag,
}: Props) {
  const [preference, setPreference] = useState("");
  const [adviceState, setAdviceState] = useState<AstraAdvice | null>(null);
  const [errorState, setErrorState] = useState<{
    revision: string;
    message: string;
  } | null>(null);
  const [askingRevision, setAskingRevision] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [choicesState, setChoicesState] = useState<{
    revision: string;
    wantedId: string;
    options: PackingChoice[];
    error?: string;
  } | null>(null);
  const request = useRef<AbortController | null>(null);
  const requestNumber = useRef(0);
  const latest = useRef({ revision, open, wantedId });
  const visible = open || !!wantedId;
  const wanted = items.find((i) => i.id === wantedId);
  const advice = adviceState?.revision === revision ? adviceState : null;
  const error = errorState?.revision === revision ? errorState.message : "";
  const asking = askingRevision === revision;
  const choices =
    choicesState?.revision === revision && choicesState.wantedId === wantedId
      ? choicesState
      : null;

  useEffect(() => {
    latest.current = { revision, open, wantedId };
    return () => request.current?.abort();
  }, [revision, open, wantedId]);
  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/astra/status", { signal: abort.signal })
      .then((r) => r.json())
      .then((data) => setConnected(data.configured))
      .catch(() => {});
    return () => abort.abort();
  }, []);
  useEffect(() => {
    if (!wantedId) return;
    const abort = new AbortController();
    fetch("/api/packing/choices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, bag, wantedId }),
      signal: abort.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "A swap could not be calculated.");
        if (!abort.signal.aborted)
          setChoicesState({
            revision: data.revision,
            wantedId,
            options: data.options,
          });
      })
      .catch((error) => {
        if (!abort.signal.aborted)
          setChoicesState({
            revision,
            wantedId,
            options: [],
            error: error.message,
          });
      });
    return () => abort.abort();
  }, [wantedId, items, bag, revision]);
  useEffect(() => {
    if (!visible) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [visible, onClose]);

  async function askAstra() {
    request.current?.abort();
    const abort = new AbortController();
    request.current = abort;
    const number = ++requestNumber.current;
    setAskingRevision(revision);
    setErrorState(null);
    setAdviceState(null);
    try {
      const response = await fetch("/api/astra/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, bag, preference }),
        signal: abort.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "Astra could not finish that suggestion.",
        );
      if (
        !abort.signal.aborted &&
        latest.current.revision === revision &&
        latest.current.open
      ) {
        setAdviceState(data);
        setConnected(true);
      }
    } catch (error) {
      if (!abort.signal.aborted && latest.current.revision === revision)
        setErrorState({
          revision,
          message:
            error instanceof Error
              ? error.message
              : "Astra is unavailable. Please try again.",
        });
    } finally {
      if (number === requestNumber.current) setAskingRevision(null);
    }
  }

  if (!visible) return null;
  const name = (id: string) => items.find((i) => i.id === id)?.label || id;
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="packing-assistant-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className={styles.close}
          onClick={onClose}
          aria-label="Close packing assistant"
        >
          <X size={20} />
        </button>
        {wanted ? (
          <>
            <div className={styles.lightHeader}>
              <span className={styles.symbol}>
                <PackageOpen size={26} />
              </span>
              <span className={styles.eyebrow}>A LITTLE GIVE AND TAKE</span>
              <h2 id="packing-assistant-title">
                Make room for
                <br />
                <em>{wanted.label.toLowerCase()}.</em>
              </h2>
              <p>
                Choose what stays home. These swaps protect your essentials and
                keep the rest of your packed items in the bag.
              </p>
            </div>
            <div className={styles.body}>
              {!choices && (
                <p className={styles.loading} role="status">
                  <LoaderCircle size={17} className="spin" />
                  Looking for a little breathing room…
                </p>
              )}
              {choices?.error && (
                <p className={styles.error} role="alert">
                  {choices.error}
                </p>
              )}
              {choices && !choices.options.length && !choices.error && (
                <p className={styles.message}>
                  No simple swap was found while protecting your essentials. Try
                  a larger bag or unpin an item you can leave behind. This
                  search does not prove that another arrangement is impossible.
                </p>
              )}
              <div className={styles.options}>
                {choices?.options.map((option, index) => (
                  <article
                    className={styles.option}
                    key={option.removeIds.join(",")}
                  >
                    <span className={styles.eyebrow}>OPTION {index + 1}</span>
                    <strong>
                      Leave{" "}
                      {option.removeIds
                        .map((id) => name(id).toLowerCase())
                        .join(" + ")}{" "}
                      behind
                    </strong>
                    <span className={styles.previewStatus}>
                      <Check size={14} />
                      {option.placed} items fit after this swap
                      {option.unplaced
                        ? ` · ${option.unplaced} still need room`
                        : ""}
                    </span>
                    <button
                      className={styles.primary}
                      onClick={() => onApply(option.includeIds, wanted.id)}
                    >
                      Choose this swap <ArrowRight size={15} />
                    </button>
                  </article>
                ))}
              </div>
              <div className={styles.footer}>
                <button className={styles.quiet} onClick={onLargerBag}>
                  Choose the checked bag
                </button>
                {!wanted.required && (
                  <button
                    className={styles.quiet}
                    onClick={() =>
                      onApply(
                        items
                          .filter((i) => i.included && i.id !== wanted.id)
                          .map((i) => i.id),
                      )
                    }
                  >
                    Leave this item out
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className={styles.astraHeader}>
              <span className={styles.eyebrow}>
                <Sparkles size={16} /> A LITTLE HELP FROM ASTRA
              </span>
              <h2 id="packing-assistant-title">
                Pack for <em>your kind</em>
                <br />
                of getaway.
              </h2>
              <p>Your plans set the priorities. You get the final say.</p>
            </div>
            <div className={styles.body}>
              <label className={styles.label} htmlFor="trip-preference">
                WHAT’S ON THE ITINERARY?
              </label>
              <textarea
                id="trip-preference"
                value={preference}
                disabled={asking}
                onChange={(event) => {
                  setPreference(event.target.value);
                  setAdviceState(null);
                }}
                maxLength={1500}
                placeholder="A weekend of city walks, a camera, and one nice dinner…"
                rows={3}
              />
              <button
                className={styles.primary}
                disabled={asking || !items.some((i) => i.included)}
                onClick={askAstra}
              >
                {asking ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                {asking ? "Thinking it through…" : "Ask Astra"}
                <ArrowRight size={15} />
              </button>
              {connected === false && !error && (
                <p className={styles.message}>
                  Astra isn’t connected yet. The packing controls and item swaps
                  are ready to use.
                </p>
              )}
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
              {adviceState && !advice && (
                <p className={styles.message}>
                  Your belongings changed. Ask Astra again for a suggestion that
                  matches your latest list.
                </p>
              )}
              {advice && (
                <div className={styles.advice}>
                  <span className={styles.eyebrow}>ASTRA’S SUGGESTION</span>
                  <p>{advice.summary}</p>
                  <div className={styles.selectionGrid}>
                    <div>
                      <h3>
                        <Check size={14} />
                        Bring along · {advice.keepIds.length}
                      </h3>
                      <ul>
                        {advice.keepIds.map((id) => (
                          <li key={id}>
                            <span
                              style={{
                                background: items.find((i) => i.id === id)
                                  ?.color,
                              }}
                            />
                            {name(id)}
                            {items.find((i) => i.id === id)?.required && (
                              <LockKeyhole size={11} aria-label="Essential" />
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3>Leave behind · {advice.leaveIds.length}</h3>
                      <ul>
                        {advice.leaveIds.length ? (
                          advice.leaveIds.map((id) => (
                            <li key={id}>{name(id)}</li>
                          ))
                        ) : (
                          <li>Nothing this time.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                  <p className={styles.previewStatus}>
                    <CheckCheck size={16} />
                    Fit preview: {advice.preview.placed} of{" "}
                    {advice.keepIds.length} chosen items packed
                    {advice.preview.unplaced.length
                      ? ` · ${advice.preview.unplaced.length} still need room`
                      : " · all chosen items fit"}
                    .
                  </p>
                  <div className={styles.footer}>
                    <button className={styles.quiet} onClick={onClose}>
                      Keep my current list
                    </button>
                    <button
                      className={styles.primary}
                      onClick={() => onApply(advice.keepIds)}
                    >
                      Apply selection <Check size={15} />
                    </button>
                  </div>
                </div>
              )}
              <p className={styles.footnote}>
                <LockKeyhole size={12} />
                Your essentials stay protected. Fit is checked by the packing
                engine.
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
