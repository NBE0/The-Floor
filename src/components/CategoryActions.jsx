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

export default function CategoryActions() {
  const {
    categoryList,
    addCategory,
    setItems,
    setImage,
    getItemsNeedingImages,
    isFetching,
    setIsFetching,
    geminiApiKey,
    serperApiKey,
  } = useImageDb();

  const [newName, setNewName]         = useState('');
  const [addError, setAddError]       = useState('');
  const [fetchStatus, setFetchStatus] = useState(null);
  const [log, setLog]                 = useState([]);
  const cancelRef                     = useRef(false);
  const logEndRef                     = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log, fetchStatus]);

  const hasKeys = Boolean(geminiApiKey.trim() && serperApiKey.trim());
  const keysTooltip = hasKeys ? undefined : 'Click ⚙️ to add your API keys.';

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
      setLog(prev => [...prev, '❌ Both Gemini and Serper API keys are required (open ⚙️ Settings).']);
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

  return (
    <div className="w-full bg-floor-surface rounded-2xl shadow-2xl p-6 space-y-4">
      <h2 className="text-floor-text/70 text-sm uppercase tracking-widest font-semibold">
        Add a new category
      </h2>

      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Pokémon, Disney villains…"
            value={newName}
            onChange={e => { setNewName(e.target.value); setAddError(''); }}
            onKeyDown={e => e.key === 'Enter' && hasKeys && !isFetching && handleAdd()}
            disabled={!hasKeys || isFetching}
            title={keysTooltip}
            maxLength={40}
            className="flex-1 px-3 py-2 rounded-lg bg-floor-bg border border-white/10
                       text-floor-text text-sm placeholder-white/30 focus:outline-none
                       focus:border-floor-gold/60 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleAdd}
            disabled={!hasKeys || !newName.trim() || isFetching}
            title={keysTooltip}
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

      <button
        onClick={handleFetchAll}
        disabled={!hasKeys || categoryList.length === 0}
        title={keysTooltip}
        className={`w-full py-3 rounded-xl text-sm font-semibold uppercase tracking-wide
                    transition-all border
                    ${isFetching
                      ? 'border-floor-accent/50 text-floor-accent bg-floor-accent/10 hover:bg-floor-accent/20'
                      : 'border-floor-gold/50 text-floor-gold bg-floor-gold/10 hover:bg-floor-gold/20'}
                    disabled:opacity-30 disabled:cursor-not-allowed`}
      >
        {isFetching ? '⏹ Stop Fetching' : '✨ Fetch Items & Images'}
      </button>

      {(isFetching || log.length > 0) && (
        <div className="bg-floor-bg rounded-xl p-3 space-y-1 max-h-32 overflow-y-auto
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
  );
}
