import React from 'react';
import { useGame } from '../context/GameContext';

const MIN_PLAYERS = 4;

export default function PlayerList() {
  const { state, removePlayer } = useGame();
  const { players } = state;

  const ready = players.length >= MIN_PLAYERS;
  const progress = Math.min((players.length / MIN_PLAYERS) * 100, 100);

  return (
    <div className="w-full bg-floor-surface rounded-2xl shadow-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-floor-text/70 text-sm uppercase tracking-widest font-semibold">
          Players
        </h2>
        <span className="text-floor-text/30 text-xs">
          {players.length} / 10
        </span>
      </div>

      <div className="space-y-2">
        <div className="w-full bg-floor-bg rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-300
                        ${ready ? 'bg-floor-gold' : 'bg-floor-gold/60'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-center text-floor-text/50 text-xs">
          {ready
            ? `${players.length} players ready — let's play!`
            : `${players.length} / ${MIN_PLAYERS} minimum players`}
        </p>
      </div>

      {players.length > 0 ? (
        <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
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
      ) : (
        <p className="text-floor-text/30 text-sm text-center py-4">
          No players yet. Add one above.
        </p>
      )}
    </div>
  );
}
