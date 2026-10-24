"use client";

import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  ArrowRight,
  Backpack,
  Check,
  ChevronDown,
  Copy,
  Expand,
  Layers3,
  LoaderCircle,
  Minus,
  MousePointer2,
  PackagePlus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ScanLine,
  Shirt,
  Footprints,
  FlaskConical,
  CaseSensitive,
  Trash2,
  X,
  CheckCheck,
  ImagePlus,
  Move3D,
} from "lucide-react";
import {
  type Category,
  type Photo,
  type Plan,
  analysisSchema,
  categories,
  suitcases,
  revisionOf,
} from "@/lib/domain";
import { initialState, reducer, mergeSuggestions } from "@/lib/state";
import { loadSession, saveSession } from "@/lib/persistence";
import { validatePlan } from "@/lib/validate";

const SuitcaseScene = dynamic(() => import("./SuitcaseScene"), {
  ssr: false,
  loading: () => (
    <div className="scene-loading">
      <LoaderCircle className="spin" />
      Opening your suitcase…
    </div>
  ),
});
const categoryNames: Record<Category, string> = {
  clothing: "Clothing",
  shoes: "Shoes",
  bottle: "Bottle",
  pouch: "Pouch",
  other: "Other",
};
function ItemIcon({
  category,
  size = 22,
}: {
  category: Category;
  size?: number;
}) {
  const Icon =
    category === "clothing"
      ? Shirt
      : category === "shoes"
        ? Footprints
        : category === "bottle"
          ? FlaskConical
          : category === "pouch"
            ? Backpack
            : CaseSensitive;
  return <Icon size={size} strokeWidth={1.35} />;
}
function asDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PackingWorkspace() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [loaded, setLoaded] = useState(false),
    [notice, setNotice] = useState(""),
    [selected, setSelected] = useState<string | null>("demo-0");
  const [plan, setPlan] = useState<Plan | null>(null),
    [packingError, setPackingError] = useState("");
  const [storageStatus, setStorageStatus] = useState("Restoring session");
  const [canPersist, setCanPersist] = useState(true);
  const [layer, setLayer] = useState(100),
    [exploded, setExploded] = useState(false),
    [resetKey, setResetKey] = useState(0);
  const [playback, setPlayback] = useState({
    revision: "",
    step: 0,
    playing: false,
  });
  const [addOpen, setAddOpen] = useState(false),
    [advanced, setAdvanced] = useState(false),
    [details, setDetails] = useState(false),
    [resetConfirm, setResetConfirm] = useState(false);
  const [mergeWith, setMergeWith] = useState("");
  const worker = useRef<Worker | null>(null),
    latest = useRef({ state, revision: "" });
  const inFlight = useRef(new Map<string, AbortController>()),
    uploadGeneration = useRef(0);
  const bag = suitcases.find((b) => b.id === state.bagId) ?? suitcases[0],
    revision = revisionOf(state.items, bag);
  const current = plan?.revision === revision,
    busy = loaded && !current && !packingError;
  const active = state.items.find((i) => i.id === selected),
    included = state.items.filter((i) => i.included);
  const effectivePlayback =
    playback.revision === revision
      ? playback
      : { revision, step: plan?.placements.length ?? 0, playing: false };
  const maxStep = plan?.placements.length ?? 0,
    step = Math.min(maxStep, effectivePlayback.step);
  const placedCount = current ? plan.placements.length : 0;
  const usedVolume =
    plan?.placements.reduce(
      (sum, p) => sum + p.dimensions.reduce((v, n) => v * n, 1),
      0,
    ) ?? 0;
  const fill = current
    ? Math.round((usedVolume / bag.dimensions.reduce((v, n) => v * n, 1)) * 100)
    : 0;

  useEffect(() => {
    let mounted = true;
    loadSession()
      .then((saved) => {
        if (!mounted) return;
        if (saved) {
          dispatch({ type: "restore", state: saved });
          setSelected(null);
        }
        setLoaded(true);
      })
      .catch(() => {
        if (mounted) {
          setNotice(
            "Saved data could not be read. A fresh demo is ready; edits remain temporary until Reset trip clears the invalid session.",
          );
          setCanPersist(false);
          setStorageStatus("Saved data needs reset");
          setLoaded(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (!loaded || !canPersist) return;
    const timer = setTimeout(() => {
      setStorageStatus("Saving on your device");
      saveSession(state)
        .then(() => setStorageStatus("Saved on your device"))
        .catch(() => {
          setStorageStatus("Local saving unavailable");
          setNotice(
            "Local storage is unavailable or full. Changes work now but may not survive reload.",
          );
        });
    }, 350);
    return () => clearTimeout(timer);
  }, [state, loaded, canPersist]);
  useEffect(() => {
    latest.current = { state, revision };
  }, [state, revision]);
  useEffect(() => {
    const instance = new Worker(
      new URL("../../lib/packing.worker.ts", import.meta.url),
    );
    worker.current = instance;
    instance.onmessage = (event) => {
      const result = event.data;
      if (result.error) {
        if (result.revision === latest.current.revision)
          setPackingError(result.error);
        return;
      }
      if (result.plan?.revision !== latest.current.revision) return;
      const s = latest.current.state,
        b = suitcases.find((b) => b.id === s.bagId) ?? suitcases[0];
      const validation = validatePlan(result.plan, s.items, b);
      if (!validation.valid) {
        setPackingError(
          "This layout did not pass validation. Change an item or retry packing.",
        );
        return;
      }
      setPackingError("");
      setPlan(result.plan);
    };
    instance.onerror = () =>
      setPackingError(
        "The packing worker stopped. Reload the page to restart it; your saved inventory is safe.",
      );
    return () => {
      instance.terminate();
      worker.current = null;
    };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      setPackingError("");
      worker.current?.postMessage({ items: state.items, bag, revision });
    }, 180);
    return () => clearTimeout(timer);
  }, [revision, loaded, state.items, bag]);
  useEffect(() => {
    for (const photo of state.photos) {
      if (inFlight.current.size >= 2) break;
      if (photo.status !== "queued" || inFlight.current.has(photo.id)) continue;
      const controller = new AbortController();
      inFlight.current.set(photo.id, controller);
      dispatch({ type: "start", id: photo.id, requestId: photo.requestId });
      (async () => {
        try {
          const blob = await (await fetch(photo.url)).blob();
          const form = new FormData();
          form.append("photo", blob, photo.name);
          const response = await fetch("/api/analyze", {
            method: "POST",
            body: form,
            signal: controller.signal,
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(
              typeof result.error === "string"
                ? result.error
                : "Analysis failed. Please retry.",
            );
          const parsed = analysisSchema.parse(result);
          inFlight.current.delete(photo.id);
          dispatch({
            type: "analysis",
            id: photo.id,
            requestId: photo.requestId,
            proposals: parsed.items,
          });
        } catch (error) {
          inFlight.current.delete(photo.id);
          if (!controller.signal.aborted)
            dispatch({
              type: "failure",
              id: photo.id,
              requestId: photo.requestId,
              error:
                error instanceof Error
                  ? error.message
                  : "Analysis failed. Retry or add items manually.",
            });
        }
      })();
    }
  }, [state.photos]);
  useEffect(() => {
    const requests = inFlight.current;
    return () => {
      requests.forEach((c) => c.abort());
      requests.clear();
    };
  }, []);
  useEffect(() => {
    if (!effectivePlayback.playing) return;
    const timer = setInterval(
      () =>
        setPlayback((p) =>
          p.step >= maxStep
            ? { ...p, playing: false }
            : { ...p, step: p.step + 1 },
        ),
      900,
    );
    return () => clearInterval(timer);
  }, [effectivePlayback.playing, maxStep]);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const generation = uploadGeneration.current;
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (state.photos.length + files.length > 12) {
      setNotice(
        "You can retain up to 12 photos. Reset the session to start a new collection.",
      );
      return;
    }
    const accepted: Photo[] = [];
    const errors: string[] = [];
    for (const file of files) {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 6 * 1024 * 1024 ||
        file.size === 0
      ) {
        errors.push(`${file.name}: choose JPEG, PNG or WebP up to 6 MB.`);
        continue;
      }
      try {
        const url = await asDataUrl(file);
        accepted.push({
          id: crypto.randomUUID(),
          name: file.name,
          url,
          status: "queued",
          requestId: crypto.randomUUID(),
          accepted: false,
        });
      } catch {
        errors.push(`${file.name} could not be read.`);
      }
    }
    if (generation !== uploadGeneration.current) return;
    dispatch({ type: "photos", photos: accepted });
    setNotice(errors.join(" "));
  }
  function reset(mode: "reset" | "demo") {
    setCanPersist(true);
    uploadGeneration.current++;
    inFlight.current.forEach((c) => c.abort());
    inFlight.current.clear();
    dispatch({ type: mode });
    setSelected(null);
    setPlan(null);
    setLayer(100);
    setExploded(false);
    setPlayback({ revision: "", step: 0, playing: false });
    setResetConfirm(false);
    setNotice("");
    saveSession(reducer(state, { type: mode })).catch(() =>
      setNotice(
        "The session cleared here, but browser storage could not be updated.",
      ),
    );
  }
  const suggestions = mergeSuggestions(state.items);
  const uniform = active
    ? Math.cbrt(active.scale.reduce((v, n) => v * n, 1))
    : 1;
  const updateScale = (value: number) => {
    if (active)
      dispatch({
        type: "edit",
        id: active.id,
        patch: {
          scale: active.scale.map((n) =>
            Math.min(5, Math.max(0.1, (n * value) / uniform)),
          ) as [number, number, number],
        },
      });
  };
  const planTitle = packingError
    ? "Layout needs attention"
    : busy
      ? "Finding a little room…"
      : included.length === 0
        ? "Your next trip starts here"
        : plan?.outcome === "complete"
          ? "Everything has its place"
          : plan?.outcome === "constraint-conflict"
            ? "A little too much for this bag"
            : plan?.outcome === "search-exhausted"
              ? "Search limit reached"
              : "Some things need more room";
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="wordmark" href="/" aria-label="Knapsack home">
          <span className="brand-mark">✳</span> knapsack
          <span className="brand-dot">®</span>
        </Link>
        <span className="top-note">A LITTLE ROOM FOR EVERYTHING.</span>
        <div className="header-actions">
          <span className="local-badge">
            <span /> {storageStatus}
          </span>
          <button className="text-button" onClick={() => setResetConfirm(true)}>
            <RotateCcw size={14} />
            Reset trip
          </button>
        </div>
      </header>
      <section className="intro">
        <div>
          <div className="eyebrow">LESS GUESSWORK. MORE GOING.</div>
          <h1>
            Good things come
            <br className="mobile-break" /> <em>well packed.</em>
          </h1>
          <p>Bring what matters. We’ll help you find its place.</p>
        </div>
        <div className="trip-tag">
          <span className="tag-number">01</span>
          <div>
            YOUR NEXT ESCAPE
            <br />
            <small>One bag. So many possibilities.</small>
          </div>
          <ArrowUpRight size={24} />
        </div>
      </section>
      {notice && (
        <div role="alert" className="notice">
          {notice}
          <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
      <main className="workspace">
        <aside className="inventory-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">THE ESSENTIALS</span>
              <h2>
                Your belongings{" "}
                <span className="count">{state.items.length}</span>
              </h2>
            </div>
            <button
              className="icon-button"
              aria-label="Add item"
              title="Add item"
              disabled={state.items.length >= 80}
              onClick={() => setAddOpen((v) => !v)}
            >
              <Plus size={19} />
            </button>
          </div>
          <label className="upload-zone">
            <input
              aria-label="Upload item photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={upload}
              disabled={!loaded || state.photos.length >= 12}
            />
            <span className="upload-icon">
              <ImagePlus size={22} />
            </span>
            <strong>
              Add your photos <ArrowUpRight size={14} />
            </strong>
            <span>JPEG, PNG or WebP · up to 6 MB each</span>
          </label>
          <p className="privacy-note">
            Photos go to OpenAI for analysis and stay in this browser. No app
            server storage. Sizes are estimates.
          </p>
          {addOpen && (
            <div className="add-menu">
              <strong>Add an item manually</strong>
              <div>
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      const id = crypto.randomUUID();
                      dispatch({ type: "add", category: c, id });
                      setSelected(id);
                      setAddOpen(false);
                    }}
                  >
                    <ItemIcon category={c} size={18} />
                    {categoryNames[c]}
                    <Plus size={13} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {state.photos.length > 0 && (
            <section
              className="photo-progress"
              aria-label="Photo analysis progress"
            >
              {state.photos.map((p) => (
                <div className="photo-row" key={p.id}>
                  <Image
                    src={p.url}
                    alt={`Source: ${p.name}`}
                    width={32}
                    height={35}
                    unoptimized
                  />
                  <div>
                    <strong>{p.name}</strong>
                    <span>
                      {p.status === "analyzing"
                        ? "Analyzing photo…"
                        : p.status === "queued"
                          ? "Queued for analysis"
                          : p.status === "done"
                            ? "Photo analyzed"
                            : p.error}
                    </span>
                  </div>
                  {p.status === "analyzing" || p.status === "queued" ? (
                    <LoaderCircle size={14} className="spin" />
                  ) : p.status === "error" && !p.accepted ? (
                    <button
                      className="text-button"
                      onClick={() =>
                        dispatch({
                          type: "retry",
                          id: p.id,
                          requestId: crypto.randomUUID(),
                        })
                      }
                    >
                      Retry
                    </button>
                  ) : p.status === "done" ? (
                    <Check size={15} />
                  ) : null}
                </div>
              ))}
            </section>
          )}
          <div className="inventory-label">
            <span>{state.demo ? "DEMO INVENTORY" : "YOUR INVENTORY"}</span>
            <span>{included.length} included</span>
          </div>
          <div className="inventory-list" aria-label="Belongings inventory">
            {state.items.map((item) => {
              const p = plan?.placements.find((p) => p.id === item.id),
                photo = state.photos.find((p) => item.sourceIds.includes(p.id));
              return (
                <button
                  key={item.id}
                  className={`item-row ${selected === item.id ? "selected" : ""} ${!item.included ? "excluded" : ""}`}
                  onClick={() => {
                    setSelected(item.id);
                    setMergeWith("");
                  }}
                  aria-pressed={selected === item.id}
                  aria-label={`Select ${item.label}`}
                >
                  <span
                    className="item-thumb"
                    style={{ background: item.color + "45", color: item.color }}
                  >
                    {photo ? (
                      <Image
                        src={photo.url}
                        alt=""
                        width={39}
                        height={41}
                        unoptimized
                      />
                    ) : (
                      <ItemIcon category={item.category} />
                    )}
                  </span>
                  <span className="item-text">
                    <strong>{item.label}</strong>
                    <small>
                      {categoryNames[item.category]}
                      {item.edited ? " · adjusted" : ""}
                    </small>
                  </span>
                  <span
                    className={`item-indicator ${!item.included ? "muted" : current && !p ? "unplaced" : ""}`}
                    title={
                      !item.included
                        ? "Excluded"
                        : current && !p
                          ? "Unplaced"
                          : "Included"
                    }
                  >
                    {!item.included ? (
                      <Minus size={12} />
                    ) : current && !p ? (
                      <span>!</span>
                    ) : (
                      <Check size={12} />
                    )}
                  </span>
                </button>
              );
            })}
            {state.items.length === 0 && (
              <div className="empty-inventory">
                <PackagePlus size={28} />
                <strong>Pack a possibility.</strong>
                <p>Add photos or choose a category to begin.</p>
                <button
                  className="text-button"
                  onClick={() => setAddOpen(true)}
                >
                  Add an item <Plus size={14} />
                </button>
              </div>
            )}
          </div>
          {state.items.length >= 80 && (
            <p className="privacy-note">
              80-item limit reached. Remove an item to add another.
            </p>
          )}
          <div className="inventory-footer">
            <span>
              <ScanLine size={15} />
              Photo-to-3D, with room to adjust.
            </span>
            <button className="text-button" onClick={() => reset("demo")}>
              Load demo <ArrowRight size={14} />
            </button>
          </div>
        </aside>
        <section className="scene-panel" aria-label="Packing workspace">
          <div className="scene-header">
            <div>
              <span className="eyebrow">YOUR SUITCASE, REIMAGINED</span>
              <h2>The art of fitting it all.</h2>
            </div>
            <span className={`mode-pill ${state.demo ? "demo" : ""}`}>
              <span />
              {state.demo
                ? state.photos.length
                  ? "Demo + your photos"
                  : "Demo inventory"
                : "Your trip"}
            </span>
          </div>
          <div className="bag-selector">
            <label htmlFor="suitcase">
              <Backpack size={17} />
              <span>YOUR SUITCASE</span>
            </label>
            <div>
              <select
                id="suitcase"
                aria-label="Suitcase preset"
                value={bag.id}
                onChange={(e) => dispatch({ type: "bag", id: e.target.value })}
              >
                {suitcases.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} — {b.subtitle}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} />
            </div>
          </div>
          <div className="canvas-wrap" data-testid="suitcase-view">
            <SuitcaseScene
              items={state.items}
              bag={bag}
              plan={plan}
              selected={selected}
              onSelect={(id) => {
                setSelected(id);
                setMergeWith("");
              }}
              layer={layer}
              step={effectivePlayback.revision === revision ? step : maxStep}
              exploded={exploded}
              resetKey={resetKey}
            />
            <div className="scene-controls">
              <button
                className="icon-button"
                aria-label="Reset view"
                title="Reset view"
                onClick={() => setResetKey((k) => k + 1)}
              >
                <RotateCcw size={17} />
              </button>
              <button
                className={`icon-button ${exploded ? "active" : ""}`}
                aria-label="Exploded view"
                aria-pressed={exploded}
                title="Exploded view"
                onClick={() => setExploded((v) => !v)}
              >
                <Expand size={17} />
              </button>
            </div>
            <div className="canvas-caption">
              <MousePointer2 size={13} /> Drag to orbit <span>·</span> Scroll to
              zoom <span>·</span> Click to edit
            </div>
            {busy && (
              <div className="packing-overlay" role="status">
                <LoaderCircle className="spin" size={15} /> Updating layout…
              </div>
            )}
            {state.items.length === 0 && (
              <div className="scene-empty">
                <span>01 — A FRESH START</span>
                <strong>What’s coming with you?</strong>
                <p>Your suitcase is ready when you are.</p>
              </div>
            )}
          </div>
          <div className="scene-inspection">
            <div className="layer-control">
              <Layers3 size={16} />
              <label htmlFor="layers">Peek inside</label>
              <input
                id="layers"
                aria-label="Visible layers"
                type="range"
                min={0}
                max={100}
                value={layer}
                onChange={(e) => setLayer(Number(e.target.value))}
              />
              <span>{layer === 100 ? "All layers" : "Lower layers"}</span>
            </div>
            <button
              className="text-button"
              onClick={() => {
                setLayer(100);
                setExploded(false);
                setPlayback({ revision, step: maxStep, playing: false });
              }}
            >
              Show all
            </button>
          </div>
          <div
            className={`plan-card ${current && plan.unplaced.length ? "partial" : ""}`}
            aria-live="polite"
          >
            <div className="plan-symbol">
              {busy ? (
                <LoaderCircle className="spin" size={21} />
              ) : current && plan.outcome === "complete" ? (
                <CheckCheck size={23} />
              ) : (
                <Backpack size={23} />
              )}
            </div>
            <div>
              <h3>{planTitle}</h3>
              <p>
                {packingError ||
                  (!included.length
                    ? "Add a few belongings and make it yours."
                    : busy
                      ? "Your latest edits are being packed. The scene shows a size preview."
                      : `${placedCount} of ${included.length} included items packed · ${fill}% of interior volume`)}
              </p>
            </div>
            <button
              className="icon-button"
              aria-label="Plan diagnostics"
              aria-expanded={details}
              onClick={() => setDetails((v) => !v)}
            >
              <ChevronDown size={18} />
            </button>
          </div>
          {current && plan.unplaced.length > 0 && (
            <div className="unplaced-list">
              <strong>
                Beside the suitcase · {plan.unplaced.length} unplaced
              </strong>
              {plan.unplaced.map((u) => (
                <div key={u.id}>
                  <button
                    className="text-button"
                    onClick={() => setSelected(u.id)}
                  >
                    {state.items.find((i) => i.id === u.id)?.label}
                  </button>
                  <span>{u.reason}</span>
                </div>
              ))}
              <p>
                {plan.outcome === "constraint-conflict"
                  ? "A direct envelope or volume check found a constraint conflict. Try a larger suitcase or smaller items."
                  : "The bounded search did not find space for everything. This does not prove packing is impossible."}
              </p>
            </div>
          )}
          {details && (
            <div className="diagnostics">
              <strong>Geometric plan diagnostics</strong>
              {current && plan.conflicts.includes("total-volume") && (
                <p>
                  The included items exceed the suitcase’s usable interior
                  volume. This is a direct volume constraint.
                </p>
              )}
              {current &&
                plan.conflicts.some((id) => id !== "total-volume") && (
                  <p>
                    Oversized envelope:{" "}
                    {plan.conflicts
                      .filter((id) => id !== "total-volume")
                      .map((id) => state.items.find((i) => i.id === id)?.label)
                      .join(", ")}
                    . These items exceed the interior in every permitted
                    orientation.
                  </p>
                )}
              <p>
                {current
                  ? "Independent bounds, clearance, orientation, overlap and completeness checks passed."
                  : "Waiting for a plan that matches all current inputs."}
              </p>
              <p>
                Outcome: {current ? plan.outcome : "updating"} ·{" "}
                {plan?.attempts ?? 0} search orders · {bag.clearance} mm
                clearance
              </p>
              <p>
                All {included.length} included items accounted for as placed or
                unplaced. {state.items.length - included.length} excluded.
              </p>
              <p>
                Rectangular interior and conservative envelopes. This estimates
                fit; it does not establish insertion feasibility or cloth
                behavior.
              </p>
              {packingError && (
                <button
                  className="text-button"
                  onClick={() => {
                    setPackingError("");
                    worker.current?.postMessage({
                      items: state.items,
                      bag,
                      revision,
                    });
                  }}
                >
                  Retry packing
                </button>
              )}
            </div>
          )}
          <div className="playback">
            <button
              className="play-button"
              aria-label={
                effectivePlayback.playing
                  ? "Pause packing playback"
                  : "Play packing order"
              }
              disabled={!current || !maxStep}
              onClick={() => {
                setLayer(100);
                setExploded(false);
                setPlayback({
                  revision,
                  step: effectivePlayback.playing ? step : 0,
                  playing: !effectivePlayback.playing,
                });
              }}
            >
              {effectivePlayback.playing ? (
                <Pause size={14} fill="currentColor" />
              ) : (
                <Play size={14} fill="currentColor" />
              )}
            </button>
            <div>
              <strong>Packing, one step at a time.</strong>
              <span>
                {step === maxStep
                  ? "The full picture"
                  : `Step ${step} of ${maxStep}`}
              </span>
            </div>
            <input
              type="range"
              aria-label="Packing step"
              min={0}
              max={Math.max(1, maxStep)}
              value={step}
              disabled={!current || !maxStep}
              onChange={(e) => {
                setLayer(100);
                setPlayback({
                  revision,
                  step: Number(e.target.value),
                  playing: false,
                });
              }}
            />
            <span className="step-count">
              {step.toString().padStart(2, "0")} /{" "}
              {maxStep.toString().padStart(2, "0")}
            </span>
          </div>
        </section>
        <aside className="editor-panel" aria-label="Item editor">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">MAKE IT YOURS</span>
              <h2>A better fit.</h2>
            </div>
            <Move3D size={18} />
          </div>
          {active ? (
            <>
              <div
                className="editor-preview"
                style={{ background: active.color + "35" }}
              >
                <div
                  className={`object-preview ${active.category}`}
                  style={{
                    background: active.color,
                    transform: `rotate(-12deg) scale(${Math.min(1.4, Math.max(0.55, uniform))})`,
                  }}
                >
                  <ItemIcon category={active.category} size={46} />
                </div>
                <span>ESTIMATED 3D ITEM</span>
              </div>
              <label className="field-label" htmlFor="item-name">
                ITEM NAME
              </label>
              <input
                className="name-input"
                id="item-name"
                aria-label="Item name"
                value={active.label}
                maxLength={60}
                onChange={(e) =>
                  dispatch({
                    type: "edit",
                    id: active.id,
                    patch: { label: e.target.value || "Untitled item" },
                  })
                }
              />
              <div className="item-meta">
                <span>{categoryNames[active.category]}</span>
                <span>
                  {active.sourceIds.length
                    ? `${active.sourceIds.length} source photo${active.sourceIds.length === 1 ? "" : "s"}`
                    : "Category template"}
                </span>
              </div>
              {active.sourceIds.length > 0 && (
                <div className="source-thumbnails">
                  {state.photos
                    .filter((p) => active.sourceIds.includes(p.id))
                    .map((p) => (
                      <Image
                        key={p.id}
                        src={p.url}
                        alt={`Source photo for ${active.label}: ${p.name}`}
                        width={44}
                        height={44}
                        unoptimized
                      />
                    ))}
                </div>
              )}
              <div className="resize-control">
                <div>
                  <label htmlFor="size-slider">
                    Make room for the real thing.
                  </label>
                  <span>{Math.round(uniform * 100)}%</span>
                </div>
                <p>Adjust its size beside your suitcase.</p>
                <input
                  id="size-slider"
                  type="range"
                  aria-label="Item size"
                  min={20}
                  max={300}
                  value={Math.round(uniform * 100)}
                  onChange={(e) => updateScale(Number(e.target.value) / 100)}
                />
                <div className="range-labels">
                  <span>Smaller</span>
                  <span>Bigger</span>
                </div>
              </div>
              <button
                className="axis-toggle"
                aria-expanded={advanced}
                onClick={() => setAdvanced((v) => !v)}
              >
                Fine-tune the shape <ChevronDown size={14} />
              </button>
              {advanced && (
                <div className="axis-controls">
                  {["Width", "Length", "Height"].map((label, index) => (
                    <label key={label}>
                      {label}
                      <input
                        type="range"
                        aria-label={`Item ${label.toLowerCase()}`}
                        min={20}
                        max={300}
                        value={Math.round(active.scale[index] * 100)}
                        onChange={(e) => {
                          const scale = [...active.scale] as [
                            number,
                            number,
                            number,
                          ];
                          scale[index] = Number(e.target.value) / 100;
                          dispatch({
                            type: "edit",
                            id: active.id,
                            patch: { scale },
                          });
                        }}
                      />
                    </label>
                  ))}
                  <button
                    className="text-button"
                    onClick={() =>
                      dispatch({
                        type: "edit",
                        id: active.id,
                        patch: { scale: [1, 1, 1] },
                      })
                    }
                  >
                    Restore estimated size
                  </button>
                </div>
              )}
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={active.included}
                  onChange={(e) =>
                    dispatch({
                      type: "edit",
                      id: active.id,
                      patch: { included: e.target.checked },
                    })
                  }
                />
                Include in this trip
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={active.orientations.length === 6}
                  onChange={(e) =>
                    dispatch({
                      type: "edit",
                      id: active.id,
                      patch: {
                        orientations: e.target.checked
                          ? [0, 1, 2, 3, 4, 5]
                          : [0, 1],
                      },
                    })
                  }
                />
                Allow tipping on its side
              </label>
              <div className="edit-actions">
                <button
                  onClick={() => {
                    const id = crypto.randomUUID();
                    dispatch({ type: "duplicate", id: active.id, newId: id });
                    setSelected(id);
                  }}
                  disabled={state.items.length >= 80}
                >
                  <Copy size={15} />
                  Duplicate
                </button>
                <button
                  onClick={() => {
                    dispatch({ type: "delete", id: active.id });
                    setSelected(null);
                  }}
                >
                  <Trash2 size={15} />
                  Delete
                </button>
              </div>
              {state.items.length > 1 && (
                <div className="merge-control">
                  <label htmlFor="merge-item">
                    Same belonging in two photos?
                  </label>
                  <select
                    id="merge-item"
                    aria-label="Merge with item"
                    value={mergeWith}
                    onChange={(e) => setMergeWith(e.target.value)}
                  >
                    <option value="">Choose an item to merge…</option>
                    {state.items
                      .filter((i) => i.id !== active.id)
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.label}
                        </option>
                      ))}
                  </select>
                  <button
                    className="text-button"
                    disabled={!mergeWith}
                    onClick={() => {
                      dispatch({
                        type: "merge",
                        target: active.id,
                        source: mergeWith,
                      });
                      setMergeWith("");
                    }}
                  >
                    Merge into selected item
                  </button>
                  <p>
                    Keeps this item’s size and combines source photos. Use only
                    for multiple views of one object.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="editor-empty">
              <MousePointer2 size={26} />
              <h3>Every detail has a place.</h3>
              <p>
                Select a belonging in the suitcase or inventory to adjust it.
              </p>
              <button className="text-button" onClick={() => setAddOpen(true)}>
                Add something <Plus size={14} />
              </button>
            </div>
          )}
          {suggestions.map(([a, b]) => (
            <div className="merge-suggestion" key={`${a.id}-${b.id}`}>
              <strong>Multiple views?</strong>
              <p>
                Two photos suggest “{a.label}”. Keep both for separate
                belongings, or review a merge.
              </p>
              <button
                className="text-button"
                onClick={() => {
                  setSelected(a.id);
                  setMergeWith(b.id);
                }}
              >
                Review suggested merge <ArrowRight size={14} />
              </button>
            </div>
          ))}
          <div className="editor-note">
            <span className="tiny-star">✳</span>
            <p>
              A thoughtful approximation.
              <br />
              Your photos guide the shape.
              <br />
              Your eye makes it yours.
            </p>
          </div>
        </aside>
      </main>
      <footer className="page-footer">
        <span>PACK LIGHT. GO FAR.</span>
        <p>
          A spatial estimate, with a little perspective.{" "}
          <span>Made for the journey.</span>
        </p>
        <span>KNAPSACK / 2026</span>
      </footer>
      {resetConfirm && (
        <div className="modal-backdrop">
          <section
            className="reset-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <h2 id="reset-title">A fresh start?</h2>
            <p>
              This clears this browser’s trip inventory and retained photos.
              Your new suitcase will be empty.
            </p>
            <div>
              <button
                className="text-button"
                onClick={() => setResetConfirm(false)}
              >
                Keep my trip
              </button>
              <button className="primary-button" onClick={() => reset("reset")}>
                Clear session
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
