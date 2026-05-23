import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useImageDb } from '../context/ImageDbContext';
import CategoryActions from './CategoryActions';
import CategoryList from './CategoryList';
import PlayerForm from './PlayerForm';
import PlayerList from './PlayerList';
import SettingsDrawer from './SettingsDrawer';

const MIN_PLAYERS = 4;

export default function StartScreen() {
  const { state, generateBoard } = useGame();
  const { players } = state;
  const {
    geminiApiKey,
    serperApiKey,
    setGeminiApiKey,
    setSerperApiKey,
  } = useImageDb();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const canGenerate = players.length >= MIN_PLAYERS;

  return (
    <div className="min-h-screen bg-floor-bg flex flex-col items-center px-6 py-6">

      <button
        onClick={() => setSettingsOpen(true)}
        aria-label="Open settings"
        title="Settings (API keys)"
        className="fixed top-3 right-16 z-50 text-floor-text/30 hover:text-floor-text/70
                   transition-colors text-xl select-none"
      >
        ⚙️
      </button>

      <h1 className="font-display text-6xl md:text-8xl text-floor-accent tracking-widest mb-2 uppercase">
        The Floor
      </h1>
      <p className="text-floor-text/60 text-lg mb-6 tracking-wide">
        Family Edition
      </p>

      <button
        onClick={generateBoard}
        disabled={!canGenerate}
        className="mt-2 mb-6 w-full max-w-2xl py-5 rounded-2xl font-display text-3xl
                   tracking-widest uppercase transition-all duration-200
                   bg-floor-gold text-floor-bg hover:bg-floor-gold/80
                   shadow-[0_0_32px_4px] shadow-floor-gold/30
                   disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
      >
        ✨ Generate Board ✨
      </button>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Right column on desktop / first on mobile — Players */}
        <div className="order-1 lg:order-none lg:col-start-2 space-y-6">
          <PlayerForm />
          <PlayerList />
        </div>

        {/* Left column on desktop / second on mobile — Categories */}
        <div className="order-2 lg:order-none lg:col-start-1 lg:row-start-1 space-y-6">
          <CategoryActions />
          <CategoryList />
        </div>

      </div>

      <SettingsDrawer isOpen={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <div className="space-y-2">
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
        <div className="space-y-2">
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
          Both keys are needed to add new categories with AI-generated items and images.
          Stored locally in your browser — never sent anywhere except directly to Google / Serper.
        </p>
      </SettingsDrawer>
    </div>
  );
}
