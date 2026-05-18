import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import Tile from './Tile';
import { getValidDefenderTileIds } from './Board';

export default function PostDuelScreen() {
  const { state, continueAttacking, passTurn } = useGame();
  const { players, boardTiles, duelResult, gridCols } = state;
  const [showFloor, setShowFloor] = useState(false);

  if (!duelResult) return null;

  const playerMap = Object.fromEntries(players.map(p => [p.id, p]));
  const winner = playerMap[duelResult.winnerId];
  const loser  = playerMap[duelResult.loserId];

  const winnerTileCount = boardTiles.filter(t => t.playerId === duelResult.winnerId).length;

  // Remaining active players (for context in the UI)
  const activeCount = new Set(
    boardTiles.filter(t => t.playerId !== null).map(t => t.playerId)
  ).size;

  if (!winner || !loser) return null;

  // ── Floor preview view ──────────────────────────────────────────────────────
  if (showFloor) {
    const sortedTiles = [...boardTiles].sort((a, b) =>
      a.position.row !== b.position.row
        ? a.position.row - b.position.row
        : a.position.col - b.position.col
    );
    const validDefenderIds = getValidDefenderTileIds(winner.id, boardTiles);

    return (
      <div className="min-h-screen bg-floor-bg flex flex-col items-center px-4 py-8">

        {/* Header */}
        <div className="w-full max-w-3xl mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl md:text-4xl text-floor-accent tracking-widest uppercase">
              Floor Preview
            </h1>
            <p className="text-floor-text/50 text-xs mt-1 uppercase tracking-widest">
              Read-only — no moves yet
            </p>
          </div>
          <button
            onClick={() => setShowFloor(false)}
            className="px-4 py-2 rounded-lg bg-floor-accent hover:bg-floor-accent/80
                       text-white text-sm font-semibold uppercase tracking-wide
                       transition-colors"
          >
            ← Back to Decision
          </button>
        </div>

        {/* Status banner */}
        <div className="w-full max-w-3xl mb-6 rounded-xl px-5 py-3
                        border border-floor-gold/30 bg-floor-gold/10
                        flex items-center gap-3">
          <span
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: winner.color }}
          />
          <p className="text-floor-text text-sm">
            <span className="text-floor-gold font-semibold">{winner.name}</span>
            {' '}is in <span className="text-floor-gold font-semibold">gold</span>;{' '}
            possible next targets are highlighted in{' '}
            <span className="text-floor-accent font-semibold">red</span>.
          </p>
        </div>

        {/* Board grid (read-only) */}
        <div
          className="w-full max-w-3xl grid gap-4"
          style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
        >
          {sortedTiles.map(tile => (
            <Tile
              key={tile.id}
              tile={tile}
              player={tile.playerId ? playerMap[tile.playerId] : null}
              isAttacker={tile.playerId === winner.id}
              isNeighbor={validDefenderIds.has(tile.id)}
            />
          ))}
        </div>

        {/* Player legend */}
        <div className="w-full max-w-3xl mt-8 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {players.map(player => (
            <div
              key={player.id}
              className="flex items-center gap-2 bg-floor-surface rounded-lg px-3 py-2"
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: player.color }}
              />
              <div className="min-w-0">
                <p className="text-floor-text text-sm font-medium truncate">{player.name}</p>
                <p className="text-floor-text/40 text-xs truncate">{player.category}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Decision card view ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-floor-bg flex flex-col items-center justify-center px-4 py-8 gap-6">

      {/* Title */}
      <h1 className="font-display text-4xl text-floor-accent tracking-widest uppercase">
        The Floor
      </h1>

      {/* Conquest result card */}
      <div className="w-full max-w-md bg-floor-surface rounded-2xl shadow-2xl p-8 space-y-6">

        {/* Winner announcement */}
        <div className="text-center space-y-2">
          <p className="text-floor-text/40 text-xs uppercase tracking-widest mb-3">
            Territory Conquered!
          </p>

          {/* VS row */}
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <span
                className="inline-block w-5 h-5 rounded-full mb-1"
                style={{ backgroundColor: winner.color }}
              />
              <p className="font-display text-3xl tracking-wide" style={{ color: winner.color }}>
                {winner.name}
              </p>
              <p className="text-floor-text/40 text-xs uppercase tracking-widest">Winner</p>
            </div>

            <span className="font-display text-2xl text-floor-text/20">VS</span>

            <div className="text-center opacity-50">
              <span
                className="inline-block w-5 h-5 rounded-full mb-1"
                style={{ backgroundColor: loser.color }}
              />
              <p className="font-display text-3xl tracking-wide line-through" style={{ color: loser.color }}>
                {loser.name}
              </p>
              <p className="text-floor-text/40 text-xs uppercase tracking-widest">Eliminated</p>
            </div>
          </div>
        </div>

        <hr className="border-white/10" />

        {/* Territory stats */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-floor-text/50 text-sm">Territory category</span>
            <span className="text-floor-gold font-semibold">{duelResult.newCategory}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-floor-text/50 text-sm">Tiles controlled</span>
            <span className="text-floor-text font-semibold">{winnerTileCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-floor-text/50 text-sm">Players remaining</span>
            <span className="text-floor-text font-semibold">{activeCount}</span>
          </div>
        </div>

        <hr className="border-white/10" />

        {/* Decision buttons */}
        <div className="space-y-3">
          <p className="text-center text-floor-text/50 text-sm">
            <span style={{ color: winner.color }} className="font-semibold">{winner.name}</span>
            , what will you do?
          </p>

          <button
            onClick={() => setShowFloor(true)}
            className="w-full py-3 rounded-xl border border-floor-gold/40
                       text-floor-gold hover:bg-floor-gold/10
                       text-sm font-semibold uppercase tracking-wide
                       transition-colors"
          >
            👁 View the Floor First
          </button>

          <button
            onClick={continueAttacking}
            className="w-full py-4 rounded-xl bg-floor-accent hover:bg-floor-accent/80
                       text-white font-display text-2xl tracking-widest uppercase
                       transition-colors"
          >
            Continue Attacking
          </button>

          <button
            onClick={passTurn}
            className="w-full py-3 rounded-xl border border-white/10 hover:border-white/30
                       text-floor-text/50 hover:text-floor-text text-sm uppercase
                       tracking-widest transition-colors"
          >
            Pass Turn
          </button>
        </div>
      </div>
    </div>
  );
}
