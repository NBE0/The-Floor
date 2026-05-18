import React, { useState, useEffect, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { useImageDb } from '../context/ImageDbContext';

const IS_PROD = import.meta.env.PROD;

export default function PlayerForm() {
  const { state, addPlayer, setCategorySource } = useGame();
  const { players, categorySources } = state;
  const { categoryList } = useImageDb();

  const categories = useMemo(() => categoryList.map(c => c.name), [categoryList]);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!category && categories.length > 0) {
      const firstFree = categories.find(n => !players.some(p => p.category === n));
      if (firstFree) setCategory(firstFree);
    }
  }, [categories]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (category && players.some(p => p.category === category)) {
      const nextFree = categories.find(c => !players.some(p => p.category === c));
      setCategory(nextFree ?? '');
    }
  }, [players]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAdd() {
    const trimmedName = name.trim();
    const trimmedCategory = category.trim();

    if (!trimmedName) {
      setError('Player name is required.');
      return;
    }
    if (!trimmedCategory) {
      setError('Please select a category.');
      return;
    }
    if (players.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError(`A player named "${trimmedName}" already exists.`);
      return;
    }
    if (players.some(p => p.category === trimmedCategory)) {
      setError(`"${trimmedCategory}" is already taken by another player.`);
      return;
    }
    if (players.length >= 10) {
      setError('Maximum 10 players allowed.');
      return;
    }

    addPlayer(trimmedName, trimmedCategory);
    setName('');
    setCategory('');
    setError('');
  }

  function handleRandom() {
    const available = categories.filter(c => !players.some(p => p.category === c));
    if (available.length === 0) return;
    const pick = available[Math.floor(Math.random() * available.length)];
    setCategory(pick);
    setError('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleAdd();
  }

  const hasAvailableCategory =
    categories.filter(c => !players.some(p => p.category === c)).length > 0;

  return (
    <div className="w-full bg-floor-surface rounded-2xl shadow-2xl p-6 space-y-4">
      <h2 className="text-floor-text/70 text-sm uppercase tracking-widest font-semibold">
        Add a player
      </h2>

      <input
        type="text"
        placeholder="Player name"
        value={name}
        onChange={e => { setName(e.target.value); setError(''); }}
        onKeyDown={handleKeyDown}
        maxLength={30}
        className="w-full px-4 py-3 rounded-lg bg-floor-bg border border-white/10
                   text-floor-text placeholder-white/30 focus:outline-none
                   focus:border-floor-accent transition-colors"
      />

      <select
        value={category}
        onChange={e => { setCategory(e.target.value); setError(''); }}
        disabled={categories.length === 0}
        className="w-full px-4 py-3 rounded-lg bg-floor-bg border border-white/10
                   text-floor-text focus:outline-none focus:border-floor-accent
                   transition-colors appearance-none cursor-pointer
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {categories.length === 0 && (
          <option value="">Loading categories…</option>
        )}
        {categories.map(cat => {
          const taken = players.some(p => p.category === cat);
          return (
            <option key={cat} value={cat} disabled={taken}>
              {cat}{taken ? ' (taken)' : ''}
            </option>
          );
        })}
      </select>

      <button
        onClick={handleRandom}
        disabled={!hasAvailableCategory}
        title="Pick a random available category"
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5
                   rounded-lg bg-floor-bg border border-floor-gold/30
                   text-floor-gold/80 hover:text-floor-gold hover:border-floor-gold/60
                   transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                   text-sm uppercase tracking-wider"
      >
        <span className="text-lg">🎲</span> Random category
      </button>

      {!IS_PROD && category && (
        <div className="flex items-center gap-2">
          <span className="text-floor-text/40 text-xs uppercase tracking-widest flex-shrink-0">
            Images:
          </span>
          <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs">
            {['api', 'local'].map(type => {
              const current = categorySources[category] ?? 'api';
              return (
                <button
                  key={type}
                  onClick={() => setCategorySource(category, type)}
                  className={`px-3 py-1.5 uppercase tracking-wider transition-colors
                    ${current === type
                      ? 'bg-floor-accent text-white'
                      : 'bg-floor-bg text-floor-text/40 hover:text-floor-text/70'}`}
                >
                  {type === 'api' ? 'API (Auto)' : 'Local Folder'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <p className="text-floor-accent text-sm">{error}</p>
      )}

      <button
        onClick={handleAdd}
        disabled={players.length >= 10}
        className="w-full py-3 rounded-lg bg-floor-accent hover:bg-floor-accent/80
                   text-white font-semibold tracking-wide uppercase transition-colors
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Add Player
      </button>
    </div>
  );
}
