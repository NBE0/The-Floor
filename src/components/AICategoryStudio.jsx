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

export default function AICategoryStudio() {
  const {
    categoryList,
    addCategory,
    setItems,
    setImage,
    getItemsNeedingImages,
    isFetching,
    setIsFetching,
  } = useImageDb();

  const [geminiApiKey, setGeminiApiKey] = useState(
    () => localStorage.getItem('geminiApiKey') ?? ''
  );
  const [serperApiKey, setSerperApiKey] = useState(
    () => localStorage.getItem('serperApiKey') ?? ''
  );

  const [newName, setNewName]         = useState('');
  const [addError, setAddError]       = useState('');
  const [fetchStatus, setFetchStatus] = useState(null);
  const [log, setLog]                 = useState([]);
  const cancelRef                     = useRef(false);
  const logEndRef                     = useRef(null);

  useEffect(() => {
    localStorage.setItem('geminiApiKey', geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    localStorage.setItem('serperApiKey', serperApiKey);
  }, [serperApiKey]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log, fetchStatus]);

  const hasKeys = geminiApiKey.trim() && serperApiKey.trim();

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

  async function handleFetchAll() {
    if (isFetching) {
      cancelRef.current = true;
      setFetchStatus('Cancelling…');
      return;
    }

    if (!hasKeys) {
      setLog(prev => [...prev, '❌ Both Gemini and Serper API keys are required.']);
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

  const disabledTooltip = hasKeys ? undefined : 'Add Gemini + Serper keys above to enable';

  return (
    <div className="w-full bg-floor-surface rounded-2xl shadow-2xl px-6 py-5 space-y-4
                    border border-floor-gold/20">

      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-floor-gold text-base font-semibold uppercase tracking-widest">
          ✨ AI Category Studio
        </h2>
        <p className="text-floor-text/40 text-xs">
          Generate new categories with AI. Requires Gemini + Serper keys (free tiers work).
        </p>
      </div>

      {/* Keys */}
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-floor-text/50 text-xs uppercase tracking-widest block">
            Gemini API Key
          </label>
          <input
            type="password"
            placeholder="Paste a Gemini key"
            value={geminiApiKey}
            onChange={e => setGeminiApiKey(e.target.value)}
            autoComplete="off"
            className="w-full px-3 py-2 rounded-lg bg-floor-bg border border-white/10
                       text-floor-text text-sm placeholder-white/30 focus:outline-none
                       focus:border-floor-gold/60 transition-colors"
          />
        </div>
        <div className="space-y-1">
          <label className="text-floor-text/50 text-xs uppercase tracking-widest block">
            Serper API Key
          </label>
          <input
            type="password"
            placeholder="Paste a Serper key"
            value={serperApiKey}
            onChange={e => setSerperApiKey(e.target.value)}
            autoComplete="off"
            className="w-full px-3 py-2 rounded-lg bg-floor-bg border border-white/10
                       text-floor-text text-sm placeholder-white/30 focus:outline-none
                       focus:border-floor-gold/60 transition-colors"
          />
        </div>
        <p className="text-floor-text/30 text-xs">
          Stored locally in your browser — never sent anywhere except directly to Google / Serper.
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-white/5 pt-4 space-y-4">

        {/* Add new category */}
        <div className="space-y-2">
          <label className="text-floor-text/50 text-xs uppercase tracking-widest block">
            Add a new category
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Pokémon, Disney villains…"
              value={newName}
              onChange={e => { setNewName(e.target.value); setAddError(''); }}
              onKeyDown={e => e.key === 'Enter' && hasKeys && !isFetching && handleAdd()}
              disabled={!hasKeys || isFetching}
              title={disabledTooltip}
              maxLength={40}
              className="flex-1 px-3 py-2 rounded-lg bg-floor-bg border border-white/10
                         text-floor-text text-sm placeholder-white/30 focus:outline-none
                         focus:border-floor-gold/60 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleAdd}
              disabled={!hasKeys || !newName.trim() || isFetching}
              title={disabledTooltip}
              className="px-4 py-2 rounded-lg bg-floor-gold/80 hover:bg-floor-gold
                         text-floor-bg text-sm font-semibold transition-colors
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
          disabled={!hasKeys || categoryList.length === 0}
          title={disabledTooltip}
          className={`w-full py-3 rounded-xl text-sm font-semibold uppercase tracking-wide
                      transition-all border
                      ${isFetching
                        ? 'border-floor-accent/50 text-floor-accent bg-floor-accent/10 hover:bg-floor-accent/20'
                        : 'border-floor-gold/50 text-floor-gold bg-floor-gold/10 hover:bg-floor-gold/20'}
                      disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          {isFetching ? '⏹ Stop Fetching' : '✨ Fetch Items & Images (40 each)'}
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
    </div>
  );
}
