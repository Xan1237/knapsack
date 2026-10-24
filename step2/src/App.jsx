import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, Box, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Footprints, Headphones, Layers3, Leaf, LoaderCircle, LockKeyhole, Maximize2, PackageOpen, Pause, Play, Plus, RotateCcw, ScanLine, Shirt, Sparkles, Upload, X, Camera, BookOpen, BottleWine, BriefcaseBusiness } from 'lucide-react';
import Scene from './Scene.jsx';
import { BAGS, DEMO_ITEMS, liters, normalizeSession } from './data.js';
import { findSwaps, packItems } from './packing.js';

const STORAGE = 'knapsack-step2-v1';
const categoryIcons = { shoes: Footprints, clothing: Shirt, pouch: BriefcaseBusiness, camera: Camera, headphones: Headphones, book: BookOpen, bottle: BottleWine };
function ItemIcon({ item, small = false }) { const Icon = categoryIcons[item.category] || Box; return <span className={`item-art ${small ? 'small' : ''}`} style={{ '--item-color': item.color }}><Icon size={small ? 17 : 23} strokeWidth={1.6} /></span>; }
function initialSession() {
  try { const stored = localStorage.getItem(STORAGE); if (stored) return normalizeSession(JSON.parse(stored)); } catch { /* Invalid or old local sessions fall back to the demo. */ }
  return { schemaVersion: 1, bag: BAGS[0], items: DEMO_ITEMS };
}

export default function App() {
  const [session, setSession] = useState(initialSession);
  const { bag, items } = session;
  const plan = useMemo(() => packItems(items, bag), [items, bag]);
  const [selectedId, setSelectedId] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [count, setCount] = useState(plan.placements.length);
  const [explode, setExplode] = useState(0);
  const [view, setView] = useState('perspective');
  const [viewKey, setViewKey] = useState(0);
  const [bagMenu, setBagMenu] = useState(false);
  const [swapId, setSwapId] = useState(null);
  const [preference, setPreference] = useState('');
  const [astraStatus, setAstraStatus] = useState('checking');
  const [advice, setAdvice] = useState(null);
  const [asking, setAsking] = useState(false);
  const [astraError, setAstraError] = useState('');
  const [toast, setToast] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showLeft, setShowLeft] = useState(false);
  const uploadRef = useRef(null);
  const sessionRevision = useRef(0);
  const packedIds = useMemo(() => new Set(plan.placements.map(p => p.id)), [plan]);
  const included = items.filter(i => i.included);
  const leftBehind = items.filter(i => !i.included);
  const unplaced = items.filter(i => plan.unplaced.includes(i.id));
  const selected = items.find(i => i.id === selectedId);
  const swapItem = items.find(i => i.id === swapId);
  const swaps = useMemo(() => swapId ? findSwaps(items, bag, swapId) : [], [swapId, items, bag]);

  useEffect(() => {
    sessionRevision.current++;
    setPlaying(false); setCount(plan.placements.length); setAdvice(null); setAstraError('');
    try { localStorage.setItem(STORAGE, JSON.stringify(session)); } catch { /* Storage is optional for the MVP. */ }
  }, [session, plan.placements.length]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setCount(n => {
      if (n >= plan.placements.length) { setPlaying(false); return n; }
      return n + 1;
    }), 1050);
    return () => clearInterval(timer);
  }, [playing, plan.placements.length]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4200); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(data => setAstraStatus(data.astra ? 'connected' : 'offline')).catch(() => setAstraStatus('offline'));
    const receive = event => {
      if (event.origin !== window.location.origin || event.data?.type !== 'knapsack:inventory') return;
      loadSession(event.data.payload);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  useEffect(() => {
    const handler = event => { if (event.key === 'Escape') { setSwapId(null); setShowHelp(false); setBagMenu(false); } };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, []);

  function loadSession(raw) {
    try { const next = normalizeSession(raw); setSession(next); setSelectedId(null); setExplode(0); setSwapId(null); setToast(`Loaded ${next.items.length} items from step one.`); }
    catch (error) { setToast(error.message); }
  }
  function updateItem(id, patch) { setSession(s => ({ ...s, items: s.items.map(i => i.id === id ? { ...i, ...patch } : i) })); }
  function toggleItem(item) {
    if (item.required) { setToast('Unpin this essential before leaving it out.'); return; }
    updateItem(item.id, { included: !item.included });
  }
  function pickBag(next) { setSession(s => ({ ...s, bag: next })); setBagMenu(false); setSwapId(null); setExplode(0); }
  function resetDemo() { setSession({ schemaVersion: 1, bag: BAGS[0], items: DEMO_ITEMS.map(i => ({ ...i })) }); setSelectedId(null); setExplode(0); setSwapId(null); setPreference(''); setToast('Fresh start. Your weekend edit is ready.'); }
  function togglePlayback() {
    if (playing) { setPlaying(false); return; }
    setExplode(0);
    if (count >= plan.placements.length) setCount(0);
    setPlaying(true);
  }
  function applySwap(swap) {
    setSession(s => ({ ...s, items: s.items.map(i => ({ ...i, included: i.id === swapId || (i.included && !swap.removed.includes(i.id)), priority: i.id === swapId ? 5 : i.priority })) }));
    setSelectedId(swapId); setSwapId(null); setToast(`Made room for ${swapItem.name.toLowerCase()}.`);
  }
  async function askAstra() {
    const revision = sessionRevision.current;
    setAsking(true); setAstraError(''); setAdvice(null);
    try {
      const response = await fetch('/api/astra/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...session, preference }) });
      const result = await response.json();
      if (revision !== sessionRevision.current) return;
      if (!response.ok) throw new Error(result.error || 'Astra could not finish. Please try again.');
      setAdvice(result); setAstraStatus('connected');
    } catch (error) { if (revision === sessionRevision.current) setAstraError(error.message); }
    finally { setAsking(false); }
  }
  function exportPlan() {
    const output = { ...session, plan: { ...plan, algorithm: 'supported-maximal-spaces-v1', estimated: true } };
    const url = URL.createObjectURL(new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'knapsack-packing-plan.json'; anchor.click(); URL.revokeObjectURL(url);
    setToast('Packing plan saved.');
  }

  return <>
    <header className="site-header">
      <a className="brand" href="/" aria-label="Knapsack home"><span className="brand-mark"><BriefcaseBusiness size={23} strokeWidth={1.8} /></span>knapsack<span className="brand-dot">.</span></a>
      <nav className="project-steps" aria-label="Project steps"><span><span className="step-number">01</span> Your items</span><span className="step-line" /><span className="active"><span className="step-number">02</span> Pack your bag</span></nav>
      <button className="icon-button help-button" aria-label="How to use the packing studio" onClick={() => setShowHelp(true)}><CircleHelp size={20} /></button>
    </header>

    <main>
      <section className="page-heading">
        <div><p className="eyebrow"><span className="tiny-star">✳</span> THE PACKING STUDIO</p><h1>Make room for <em>the good stuff.</em></h1><p className="heading-caption">A little planning. A lot more possibility. See how it all fits.</p></div>
        <div className="heading-actions"><span className="demo-tag"><span /> {bag.id === 'imported' || !BAGS.some(b => b.id === bag.id) ? 'Your collection' : 'The weekend edit'}</span><button className="button button-quiet" onClick={() => uploadRef.current.click()}><Upload size={16} /> Import collection</button></div>
        <input ref={uploadRef} type="file" accept=".json,application/json" className="visually-hidden" aria-label="Import collection JSON" onChange={async event => { const file = event.target.files[0]; if (!file) return; try { loadSession(JSON.parse(await file.text())); } catch { setToast('That file could not be read. Choose a collection JSON file.'); } event.target.value = ''; }} />
      </section>

      <div className="studio-layout">
        <section className="inventory panel" aria-label="Your packing list">
          <div className="panel-heading"><div><p className="eyebrow">THE LINEUP</p><h2>Your travel companions<span className="count-pill">{items.length}</span></h2></div></div>
          <div className="inventory-note"><CheckCheck size={15} /><span>Choose what comes along.</span><button className="text-icon" onClick={resetDemo} aria-label="Reset demo collection" title="Reset demo"><RotateCcw size={14} /></button></div>
          <div className="inventory-list">
            {items.map(item => <div key={item.id} className={`inventory-item ${!item.included ? 'excluded' : ''} ${selectedId === item.id ? 'selected' : ''}`} data-testid={`item-${item.id}`}>
              <input type="checkbox" aria-label={`Include ${item.name}`} checked={item.included} onChange={() => toggleItem(item)} />
              <button className="item-select" onClick={() => setSelectedId(selectedId === item.id ? null : item.id)} aria-label={`Inspect ${item.name}`}><ItemIcon item={item} /><span className="item-info"><strong>{item.name}</strong><span>{liters(item.dimensions)} L <span className="subtle-dot">·</span> {item.required ? 'Essential' : item.category === 'clothing' ? 'Clothing' : 'Little extras'}</span></span></button>
              <button className={`pin-button ${item.required ? 'pinned' : ''}`} aria-label={`${item.required ? 'Unpin' : 'Pin'} ${item.name} as essential`} title={item.required ? 'Always pack this item' : 'Pin as essential'} onClick={() => updateItem(item.id, { required: !item.required, included: item.required ? item.included : true })}><LockKeyhole size={13} /></button>
              <span className={`fit-dot ${item.included ? packedIds.has(item.id) ? 'fit' : 'not-fit' : ''}`} title={!item.included ? 'Left behind' : packedIds.has(item.id) ? 'Fits in bag' : 'Needs room'} />
            </div>)}
            {!items.length && <div className="empty-inventory"><PackageOpen size={28} /><p>Your collection is empty.</p><button className="button button-quiet" onClick={resetDemo}>Try the demo items</button></div>}
          </div>
          <div className="inventory-footer"><LockKeyhole size={13} /><span>Pin your must-haves. We’ll prioritize them.</span></div>
        </section>

        <section className="viewport-panel" aria-label="Packing visualization">
          <div className="viewport-topbar">
            <div className="bag-picker"><button aria-label="Choose bag" aria-expanded={bagMenu} onClick={() => setBagMenu(!bagMenu)}><BriefcaseBusiness size={19} /><span><strong>{bag.name}</strong><small>{liters(bag.dimensions)} L <span>·</span> {bag.dimensions[0]} × {bag.dimensions[2]} × {bag.dimensions[1]} cm</small></span><ChevronDown size={15} /></button>
              {bagMenu && <div className="bag-menu">{BAGS.map(b => <button key={b.id} onClick={() => pickBag(b)}><span className="bag-swatch" style={{ background: b.color }} /><span><strong>{b.name}</strong><small>{liters(b.dimensions)} L interior</small></span>{b.id === bag.id && <Check size={16} />}</button>)}</div>}
            </div>
            <div className="view-toggle" aria-label="View controls"><button className={view === 'perspective' ? 'active' : ''} onClick={() => { setView('perspective'); setViewKey(k => k + 1); }} aria-label="3D view"><Box size={15} />3D</button><button className={view === 'top' ? 'active' : ''} onClick={() => { setView('top'); setViewKey(k => k + 1); }} aria-label="Top view"><ScanLine size={15} />Top</button></div>
          </div>
          <div className="scene-container">
            <Scene bag={bag} items={items} plan={plan} count={count} explode={explode} selectedId={selectedId} view={`${view}:${viewKey}`} onSelect={setSelectedId} onModelIssue={setToast} />
            <div className="scene-label"><span className="live-dot" /><span>{explode > 0 ? 'EXPLODED VIEW' : playing ? 'PACKING IN PROGRESS' : 'YOUR BEST FIT, VISUALIZED'}</span></div>
            <div className="scene-toolbar"><button className="scene-tool" aria-label="Reset camera" title="Reset camera" onClick={() => { setView('perspective'); setViewKey(k => k + 1); }}><Maximize2 size={17} /></button><button className={`scene-tool ${explode > 0 ? 'active' : ''}`} aria-label="Toggle exploded layers" aria-pressed={explode > 0} title="Peek between layers" onClick={() => { setPlaying(false); setCount(plan.placements.length); setExplode(explode > 0 ? 0 : 1); }}><Layers3 size={17} /></button></div>
            {selected && <div className="selected-label"><span style={{ background: selected.color }} /><strong>{selected.name}</strong><small>{packedIds.has(selected.id) ? 'In your bag' : selected.included ? 'Waiting for room' : 'Left behind'}</small><button className="text-icon" onClick={() => setSelectedId(null)} aria-label="Clear item selection"><X size={14} /></button></div>}
            <span className="orbit-hint">Drag to orbit <span>·</span> Scroll to zoom</span>
            <span className="scene-scale">3D PREVIEW / ESTIMATED FIT</span>
          </div>
          <div className="playback">
            <button className="play-button" onClick={togglePlayback} disabled={!plan.placements.length} aria-label={playing ? 'Pause packing animation' : 'Play packing animation'}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button>
            <div className="playback-info"><strong>{playing ? 'Putting it all together…' : 'Watch it come together'}</strong><span>{count === 0 ? 'Ready when you are' : `${count} of ${plan.placements.length} items placed`}</span></div>
            <div className="timeline"><input type="range" min="0" max={plan.placements.length} value={count} aria-label="Packing animation step" onChange={e => { setPlaying(false); setExplode(0); setCount(Number(e.target.value)); }} /><span>{count.toString().padStart(2, '0')} <span>/ {plan.placements.length.toString().padStart(2, '0')}</span></span></div>
            <div className="step-buttons"><button className="icon-button" aria-label="Previous packing step" disabled={count === 0} onClick={() => { setPlaying(false); setExplode(0); setCount(Math.max(0, count - 1)); }}><ChevronLeft size={18} /></button><button className="icon-button" aria-label="Next packing step" disabled={count >= plan.placements.length} onClick={() => { setPlaying(false); setCount(Math.min(plan.placements.length, count + 1)); }}><ChevronRight size={18} /></button></div>
          </div>
          <div className="scene-footer"><span><span className="legend-dot" />Packed</span><span><span className="legend-dot amber" />Needs a little room</span><span className="auto-save"><Check size={12} />Saved on this device</span></div>
        </section>

        <aside className="insights" aria-label="Fit results and suggestions">
          <section className="fit-card">
            <div className="fit-card-top"><span className="eyebrow">THE FIT CHECK</span><span className="leaf-badge"><Leaf size={16} /></span></div>
            <div className="fit-numbers" data-testid="fit-summary"><strong>{plan.placements.length}<span>/{included.length}</span></strong><span>items found<br />their place.</span></div>
            <div className="space-meter"><span style={{ width: `${Math.min(100, plan.utilization)}%` }} /></div>
            <div className="space-caption"><span>{plan.utilization}% of space used</span><strong>{(plan.usedVolume / 1000).toFixed(1)} / {liters(bag.dimensions)} L</strong></div>
            <p className="validation-status">{plan.validation.valid ? <Check size={14} /> : <X size={14} />}{plan.validation.valid ? 'Layout checked · no overlaps' : 'Layout needs attention'}</p>
          </section>

          <section className="overflow-section">
            <div className="overflow-heading"><h2>{unplaced.length ? 'A little overpacked' : included.length ? 'Looking good in there.' : 'Start with a few favorites.'}</h2>{unplaced.length > 0 && <span className="overflow-count">{unplaced.length}</span>}</div>
            <p className="section-caption">{unplaced.length ? 'You get the final say. Make room or leave a little behind.' : included.length ? 'Every selected item has a place in this layout. Ready for the next adventure.' : 'Choose items from your list to see them in the bag.'}</p>
            <div className="overflow-list">{unplaced.map(item => <div className="overflow-item" key={item.id} data-testid={`unplaced-${item.id}`}><div><ItemIcon item={item} small /><span><strong>{item.name}</strong><small>{liters(item.dimensions)} L{item.required ? ' · Essential' : ''}</small></span></div><div className="overflow-actions"><button onClick={() => { setSwapId(item.id); setSelectedId(item.id); }}>Make room <ArrowRight size={12} /></button>{!item.required && <button onClick={() => { updateItem(item.id, { included: false }); setToast(`${item.name} left behind. You can add it back anytime.`); }}>Leave out</button>}</div></div>)}</div>
            {unplaced.length === 0 && included.length > 0 && <div className="all-fit"><CheckCheck size={26} /><span>One bag. All your favorites.</span></div>}
            {leftBehind.length > 0 && <div className="left-behind"><button onClick={() => setShowLeft(!showLeft)}>{leftBehind.length} left behind <ChevronDown size={13} /></button>{showLeft && leftBehind.map(i => <div key={i.id}><span>{i.name}</span><button aria-label={`Add back ${i.name}`} onClick={() => updateItem(i.id, { included: true })}><Plus size={13} /></button></div>)}</div>}
          </section>

          <section className="astra-card">
            <div className="astra-brand"><span><Sparkles size={17} /> A little help from Astra</span><span className={`astra-status ${astraStatus === 'connected' ? 'connected' : ''}`} title={astraStatus === 'connected' ? 'Astra is connected' : 'Astra is not connected'} /></div>
            <h2>Pack for <em>your kind</em><br />of getaway.</h2><p>Tell Astra what’s on the itinerary. Get a thoughtful edit of what to bring.</p>
            <label className="visually-hidden" htmlFor="trip-preference">Tell Astra about your trip</label><textarea id="trip-preference" value={preference} onChange={e => { setPreference(e.target.value); setAdvice(null); }} placeholder="A long weekend, city walks & one nice dinner…" rows="2" maxLength={1500} />
            <button className="astra-button" disabled={asking || !included.length} onClick={askAstra}>{asking ? <LoaderCircle size={15} className="spin" /> : <Sparkles size={15} />}{asking ? 'Thinking it through…' : 'Ask Astra'}<ArrowRight size={15} /></button>
            {astraStatus === 'offline' && !astraError && <small className="astra-disclosure">Astra isn’t connected yet. Packing and item swaps work independently.</small>}
            {astraError && <p className="astra-error" role="alert">{astraError}</p>}
            {advice && <div className="astra-advice"><span className="eyebrow">ASTRA’S SUGGESTION</span><p>{advice.summary}</p><p className="advice-selection">Leave behind: {advice.leaveIds.length ? advice.leaveIds.map(id => items.find(i => i.id === id)?.name).join(', ') : 'nothing'}.</p><small>Preview: {advice.preview.placed} placed{advice.preview.unplaced.length ? ` · ${advice.preview.unplaced.length} still need room` : ' · all selected items fit'}.</small><button className="astra-button" onClick={() => { setSession(s => ({ ...s, items: s.items.map(i => ({ ...i, included: i.required || advice.keepIds.includes(i.id) })) })); setToast('Astra’s selection applied. Fit recalculated.'); }}>Apply this selection<Check size={15} /></button></div>}
          </section>
        </aside>
      </div>

      <footer className="page-footer"><span><Leaf size={14} /> Less second-guessing. More getting out there.</span><div><span className="estimate-note">Fit is an estimate. Real items have a little more personality.</span><button className="button button-quiet export-button" onClick={exportPlan}><ArrowDownToLine size={15} /> Save packing plan</button></div></footer>
    </main>

    {swapItem && <div className="modal-backdrop" onClick={() => setSwapId(null)}><section className="modal swap-modal" role="dialog" aria-modal="true" aria-labelledby="swap-title" onClick={e => e.stopPropagation()}><button className="modal-close icon-button" onClick={() => setSwapId(null)} aria-label="Close item swaps"><X size={20} /></button><span className="modal-illustration"><PackageOpen size={28} /></span><p className="eyebrow">A LITTLE GIVE AND TAKE</p><h2 id="swap-title">Make room for<br /><em>{swapItem.name.toLowerCase()}.</em></h2><p>Choose what stays home. These options keep your essentials and the rest of your packed items in place.</p><div className="swap-options">{swaps.map((swap, i) => <div className="swap-option" key={swap.removed.join(',')}><span className="eyebrow">OPTION {i + 1}</span><strong>Leave {swap.removed.map(id => items.find(item => item.id === id).name.toLowerCase()).join(' + ')} behind</strong><span className="swap-fit"><Check size={14} />{swap.plan.placements.length} items fit after this swap</span><button className="button button-primary" onClick={() => applySwap(swap)}>Choose this swap <ArrowRight size={15} /></button></div>)}</div>{!swaps.length && <div className="no-swaps"><p>There isn’t a simple swap that fits while keeping your essentials. Try a larger bag or unpin an item you can travel without.</p></div>}<button className="button button-quiet full-width" onClick={() => pickBag(BAGS[2])}><BriefcaseBusiness size={16} />Try the long-haul bag instead</button></section></div>}

    {showHelp && <div className="modal-backdrop" onClick={() => setShowHelp(false)}><section className="modal help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={e => e.stopPropagation()}><button className="modal-close icon-button" onClick={() => setShowHelp(false)} aria-label="Close help"><X size={20} /></button><p className="eyebrow">WELCOME TO STEP TWO</p><h2 id="help-title">A better kind of<br /><em>packing puzzle.</em></h2><ol><li><strong>Choose your travel companions.</strong> Check items to include them. Pin essentials to pack them first.</li><li><strong>See your best fit.</strong> Orbit the 3D bag, switch to a top view, or separate layers. Press play to see the packing order.</li><li><strong>Make the tradeoffs yours.</strong> For items needing room, preview a swap, leave them out, or choose a bigger bag.</li><li><strong>Bring in step one.</strong> Import a collection JSON containing your bag and items, with optional GLB model URLs.</li></ol><p className="help-footnote">This MVP searches several layouts using approximate item envelopes. It shows the best result found, rather than proving the mathematically optimal pack.</p><a href="/example-collection.json" download className="button button-primary">Download an example collection <ArrowDownToLine size={15} /></a></section></div>}
    {toast && <div className="toast" role="status"><Check size={17} /><span>{toast}</span><button className="text-icon" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={15} /></button></div>}
  </>;
}
