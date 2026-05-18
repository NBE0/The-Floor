import React, { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { startMusic, stopMusic } from '../sound/soundManager';

export default function WinnerScreen() {
  const { state, resetGame } = useGame();

  useEffect(() => { startMusic('winner'); return () => stopMusic(); }, []);
  const { players, duelResult } = state;

  const playerMap = Object.fromEntries(players.map(p => [p.id, p]));
  const winner = duelResult ? playerMap[duelResult.winnerId] : null;

  return (
    <div className="min-h-screen bg-floor-bg flex flex-col items-center justify-center px-4 gap-8 text-center">

      <div className="space-y-1">
        <p className="text-floor-text/30 text-sm uppercase tracking-widest">
          The Floor — Family Edition
        </p>
      </div>

      {winner ? (
        <div className="space-y-4">
          <p className="text-floor-text/60 text-xl uppercase tracking-widest">
            The Floor belongs to
          </p>

          <h1
            className="font-display uppercase tracking-widest"
            style={{
              fontSize: 'clamp(4rem, 15vw, 9rem)',
              color: winner.color,
              textShadow: `0 0 60px ${winner.color}66`,
            }}
          >
            {winner.name}
          </h1>

          <p className="font-display text-3xl text-floor-gold tracking-widest uppercase">
            Champion of the Floor!
          </p>

          <p className="text-floor-text/40 text-sm mt-2">
            Category: {duelResult.newCategory}
          </p>
        </div>
      ) : (
        <h1 className="font-display text-6xl text-floor-gold tracking-widest uppercase">
          We Have a Winner!
        </h1>
      )}

      {/* Decorative line */}
      <div
        className="w-32 h-0.5 rounded-full"
        style={{ backgroundColor: winner?.color ?? '#f5a623' }}
      />

      <button
        onClick={resetGame}
        className="px-8 py-4 rounded-xl border border-white/10 hover:border-floor-accent/50
                   text-floor-text/50 hover:text-floor-text text-sm uppercase tracking-widest
                   transition-all hover:bg-floor-surface"
      >
        Play Again
      </button>
    </div>
  );
}
