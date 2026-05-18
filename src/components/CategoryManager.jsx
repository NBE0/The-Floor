import React, { useState, useEffect, useRef } from 'react';
import { useImageDb } from '../context/ImageDbContext';

const SERPER_CONCURRENCY = 5;

async function runWithConcurrency(items, limit, worker) {
  const queue = items.slice();
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      await worker(item);
    }
  });
  await Promise.all(runners);
}

export default function CategoryManager({ geminiApiKey, serperApiKey }) {
  const {
    categoryList,
    addCategory,
    deleteCategory,
    setItems,
    setImage,
    getItemsNeedingImages,
  } = useImageDb();

  const [newName, setNewName]         = useState('');
  const [addError, setAddError]       = useState('');
  const [isFetching, setIsFetching]   = useState(false);
  const [fetchStatus, setFetchStatus] = useState(null);
  const [log, setLog]                 = useState([]);
  const [isExpanded, setIsExpanded]   = useState(true);
  const cancelRef                     = useRef(false);
  const logEndRef                     = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log, fetchStatus]);

  // ── Add category (in-memory only — discarded on refresh) ─────────────────────
  function handleAdd() {
    const name = newName.trim();
    if (!name) return;

    if (categoryList.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      setAddError('Category already exists.');
      return;
    }

    addCategory(name);
    setNewName('');
    setAddError('');
  }

  function handleDelete(name) {
    deleteCategory(name);
  }

  // ── Fetch items + images for every empty / incomplete category ───────────────
  async function handleFetchAll() {
    if (isFetching) {
      cancelRef.current = true;
      setFetchStatus('Cancelling…');
      return;
    }

    if (!geminiApiKey || !serperApiKey) {
      setLog(prev => [...prev, '❌ Both Gemini and Serper API keys are required. Add them on the start screen.']);
      return;
    }

    cancelRef.current = false;
    setIsFetching(true);
    setLog([]);
    setFetchStatus('Starting…');

    try {
      const targets = categoryList.filter(c => c.imageCount < c.itemCount || c.itemCount === 0);
      if (targets.length === 0) {
        setLog(prev => [...prev, '✅ Nothing to fetch — all categories are complete.']);
        setIsFetching(false);
        setFetchStatus(null);
        return;
      }

      for (let ci = 0; ci < targets.length; ci++) {
        if (cancelRef.current) break;
        const cat = targets[ci];
        setFetchStatus(`📂 ${cat.name} (${ci + 1}/${targets.length})`);

        let itemsNeedingImages;

        if (cat.itemCount === 0) {
          // Step 1: Generate items via Gemini
          setFetchStatus(`📂 ${cat.name} — AI is generating a list…`);
          const itemsRes = await fetch(
            `/api/gemini-items?category=${encodeURIComponent(cat.name)}&geminiKey=${encodeURIComponent(geminiApiKey)}`
          );
          if (!itemsRes.ok) {
            const err = await itemsRes.json().catch(() => ({}));
            const msg = err.error || `HTTP ${itemsRes.status}`;
            throw new Error(`"${cat.name}" — ${msg}`);
          }
          const { items } = await itemsRes.json();
          if (!Array.isArray(items) || items.length === 0) {
            throw new Error(`Gemini returned no items for "${cat.name}"`);
          }
          setItems(cat.name, items);
          itemsNeedingImages = items;
          setFetchStatus(`📂 ${cat.name} — found ${items.length} items, fetching images…`);
        } else {
          itemsNeedingImages = getItemsNeedingImages(cat.name);
        }

        // Step 2: Fetch images in parallel batches
        let done = 0;
        let found = 0;
        const total = itemsNeedingImages.length;

        await runWithConcurrency(itemsNeedingImages, SERPER_CONCURRENCY, async (item) => {
          if (cancelRef.current) return;
          try {
            const url =
              `/api/serper-image?item=${encodeURIComponent(item)}` +
              `&category=${encodeURIComponent(cat.name)}` +
              `&serperKey=${encodeURIComponent(serperApiKey)}`;
            const res = await fetch(url);
            const data = res.ok ? await res.json() : {};
            const imageUrl = data?.url ?? null;
            setImage(cat.name, item, imageUrl);
            done += 1;
            if (imageUrl) found += 1;
            setFetchStatus(
              `📂 ${cat.name} — [${done}/${total}] ${imageUrl ? '✓' : '✗'} "${item}"`
            );
          } catch {
            done += 1;
            setImage(cat.name, item, null);
          }
        });

        setLog(prev => [
          ...prev,
          `✅ ${cat.name} — ${found}/${total} images`,
        ]);
      }

      if (cancelRef.current) {
        setLog(prev => [...prev, '⏹ Cancelled.']);
      } else {
        setLog(prev => [...prev, '🎉 All categories ready!']);
      }
    } catch (err) {
      setLog(prev => [...prev, `❌ Error: ${err.message}`]);
    } finally {
      setIsFetching(false);
      setFetchStatus(null);
      cancelRef.current = false;
    }
  }

  const allReady = categoryList.length > 0 &&
    categoryList.every(c => c.imageCount > 0);

  return (
    <div className="w-full max-w-md bg-floor-surface rounded-2xl shadow-2xl overflow-hidden">

      {/* Header */}
      <button
        onClick={() => setIsExpanded(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4
                   hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-floor-text/70 text-sm uppercase tracking-widest font-semibold">
            Categories
          </span>
          <span className="text-floor-text/30 text-xs">
            {categoryList.length} total
          </span>
          {allReady && (
            <span className="text-floor-accent text-xs">● ready</span>
          )}
        </div>
        <span className="text-floor-text/30 text-lg leading-none">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-4">

          {/* Category list */}
          {categoryList.length > 0 ? (
            <ul className="space-y-2">
              {categoryList.map(cat => (
                <li
                  key={cat.name}
                  className="flex items-center gap-3 bg-floor-bg rounded-lg px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-floor-text text-sm font-medium truncate block">
                      {cat.name}
                    </span>
                    <span className="text-floor-text/30 text-xs">
                      {cat.itemCount > 0
                        ? `${cat.imageCount} / ${cat.itemCount} images`
                        : 'No items yet — run Fetch'}
                    </span>
                  </div>

                  {cat.imageCount > 0 && (
                    <span className="text-floor-accent text-xs bg-floor-accent/10
                                     px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                      {cat.imageCount} imgs
                    </span>
                  )}

                  <button
                    onClick={() => handleDelete(cat.name)}
                    disabled={isFetching}
                    aria-label={`Delete ${cat.name}`}
                    className="text-white/20 hover:text-floor-accent transition-colors
                               text-lg leading-none flex-shrink-0 disabled:opacity-30"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-floor-text/30 text-sm text-center py-2">
              No categories yet. Add one below.
            </p>
          )}

          {/* Add new category */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New category name…"
                value={newName}
                onChange={e => { setNewName(e.target.value); setAddError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                disabled={isFetching}
                maxLength={40}
                className="flex-1 px-3 py-2 rounded-lg bg-floor-bg border border-white/10
                           text-floor-text text-sm placeholder-white/30 focus:outline-none
                           focus:border-floor-accent transition-colors disabled:opacity-40"
              />
              <button
                onClick={handleAdd}
                disabled={!newName.trim() || isFetching}
                className="px-4 py-2 rounded-lg bg-floor-accent/80 hover:bg-floor-accent
                           text-white text-sm font-semibold transition-colors
                           disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
            {addError && (
              <p className="text-floor-accent text-xs">{addError}</p>
            )}
          </div>

          {/* Fetch button */}
          <button
            onClick={handleFetchAll}
            disabled={categoryList.length === 0}
            className={`w-full py-3 rounded-xl text-sm font-semibold uppercase tracking-wide
                        transition-all border
                        ${isFetching
                          ? 'border-floor-accent/50 text-floor-accent bg-floor-accent/10 hover:bg-floor-accent/20'
                          : 'border-floor-gold/50 text-floor-gold bg-floor-gold/10 hover:bg-floor-gold/20'}
                        disabled:opacity-30 disabled:cursor-not-allowed`}
          >
            {isFetching ? '⏹ Stop Fetching' : '⬇ Fetch Content & Images (40 items each)'}
          </button>

          {/* Progress display */}
          {(isFetching || log.length > 0) && (
            <div className="bg-floor-bg rounded-xl p-3 space-y-1 max-h-40 overflow-y-auto
                            font-mono text-xs">
              {log.map((line, i) => (
                <p key={i} className="text-floor-text/60">{line}</p>
              ))}
              {fetchStatus && (
                <p className="text-floor-gold animate-pulse">{fetchStatus}</p>
              )}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
