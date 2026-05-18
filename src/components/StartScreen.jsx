import React, { useState, useEffect, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { useImageDb } from '../context/ImageDbContext';
import CategoryList from './CategoryList';
import AICategoryStudio from './AICategoryStudio';

const IS_PROD = import.meta.env.PROD;

export default function StartScreen() {
  const { state, addPlayer, removePlayer, generateBoard, setCategorySource } = useGame();
  const { players, categorySources } = state;
  const { categoryList } = useImageDb();

  const categories = useMemo(() => categoryList.map(c => c.name), [categoryList]);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');

  // Pre-select the first available category whenever the catalog changes
  useEffect(() => {
    if (!category && categories.length > 0) {
      const firstFree = categories.find(n => !players.some(p => p.category === n));
      if (firstFree) setCategory(firstFree);
    }
  }, [categories]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the selected category valid whenever the player list changes
  useEffect(() => {
    if (category && players.some(p => p.category === category)) {
      const nextFree = categories.find(c => !players.some(p => p.category === c));
      setCategory(nextFree ?? '');
    }
  }, [players]); // eslint-disable-line react-hooks/exhaustive-deps

  const canGenerate = players.length >= 4;

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

  return (
    <div className="min-h-screen bg-floor-bg flex flex-col items-center justify-center px-6 py-10">

      <h1 className="font-display text-6xl md:text-8xl text-floor-accent tracking-widest mb-2 uppercase">
        The Floor
      </h1>
      <p className="text-floor-text/60 text-lg mb-8 tracking-wide">
        Family Edition
      </p>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Player form — first on mobile, right column on desktop (spans both rows) */}
        <div className="order-1 lg:order-none lg:col-start-2 lg:row-start-1 lg:row-span-2 w-full bg-floor-surface rounded-2xl shadow-2xl p-8 space-y-6">

        <div className="space-y-3">
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
          <div className="flex gap-2">
            <select
              value={category}
              onChange={e => { setCategory(e.target.value); setError(''); }}
              disabled={categories.length === 0}
              className="flex-1 px-4 py-3 rounded-lg bg-floor-bg border border-white/10
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
              disabled={categories.filter(c => !players.some(p => p.category === c)).length === 0}
              title="Pick a random available category"
              className="px-3 py-2 rounded-lg bg-floor-bg border border-white/10
                         text-floor-text/50 hover:text-floor-gold hover:border-floor-gold/40
                         transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-lg"
            >
              🎲
            </button>
          </div>

          {/* Image source toggle — dev-only; in production all images come from the bundled DB */}
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

        {players.length > 0 && (
          <div className="space-y-2">
            <p className="text-floor-text/50 text-xs uppercase tracking-widest">
              Players added ({players.length} / 10)
            </p>
            <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {players.map(player => (
                <li
                  key={player.id}
                  className="flex items-center gap-3 bg-floor-bg rounded-lg px-3 py-2"
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: player.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-floor-text font-medium truncate block">
                      {player.name}
                    </span>
                    <span className="text-floor-text/50 text-xs truncate block">
                      {player.category}
                    </span>
                  </div>
                  <button
                    onClick={() => removePlayer(player.id)}
                    aria-label={`Remove ${player.name}`}
                    className="text-white/30 hover:text-floor-accent transition-colors
                               text-lg leading-none flex-shrink-0"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <div className="w-full bg-floor-bg rounded-full h-1.5">
            <div
              className="bg-floor-gold h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((players.length / 4) * 100, 100)}%` }}
            />
          </div>
          <p className="text-center text-floor-text/50 text-sm">
            {canGenerate
              ? `${players.length} players ready — let's play!`
              : `${players.length} / 4 minimum players`}
          </p>

          <button
            onClick={generateBoard}
            disabled={!canGenerate}
            className="w-full py-4 rounded-xl font-display text-2xl tracking-widest
                       uppercase transition-all duration-200
                       bg-floor-gold text-floor-bg hover:bg-floor-gold/80
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Generate Board
          </button>
        </div>
        </div>{/* end player form */}

        {/* Categories list — middle on mobile, bottom-left on desktop */}
        <div className="order-2 lg:order-none lg:col-start-1 lg:row-start-2 w-full">
          <CategoryList />
        </div>

        {/* AI Studio (keys + add + fetch + log) — last on mobile, top-left on desktop */}
        <div className="order-3 lg:order-none lg:col-start-1 lg:row-start-1 w-full">
          <AICategoryStudio />
        </div>

      </div>{/* end grid */}
    </div>
  );
}
