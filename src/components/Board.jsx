import React, { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import Tile from './Tile';
import { startMusic, stopMusic } from '../sound/soundManager';

// Returns the set of tile IDs that are valid defender targets for the current attacker.
// Walks all tiles owned by the attacker, collects their grid-adjacent neighbours,
// and returns those that belong to a different (non-eliminated) player.
export function getValidDefenderTileIds(attackerPlayerId, boardTiles) {
  const attackerTiles = boardTiles.filter(
    t => t.playerId === attackerPlayerId && !t.isEliminated
  );

  const adjacentKeys = new Set();
  for (const t of attackerTiles) {
    const { row, col } = t.position;
    adjacentKeys.add(`${row - 1},${col}`);
    adjacentKeys.add(`${row + 1},${col}`);
    adjacentKeys.add(`${row},${col - 1}`);
    adjacentKeys.add(`${row},${col + 1}`);
  }

  return new Set(
    boardTiles
      .filter(
        t =>
          t.playerId !== null &&
          t.playerId !== attackerPlayerId &&
          !t.isEliminated &&
          adjacentKeys.has(`${t.position.row},${t.position.col}`)
      )
      .map(t => t.id)
  );
}

export default function Board() {
  const { state, selectDefender, cancelDefender, startDuel, resetGame } = useGame();

  useEffect(() => { startMusic('board'); return () => stopMusic(); }, []);
  const { players, boardTiles, gridCols, currentAttacker, currentDefender, duelState } = state;

  const playerMap = Object.fromEntries(players.map(p => [p.id, p]));

  const sortedTiles = [...boardTiles].sort((a, b) =>
    a.position.row !== b.position.row
      ? a.position.row - b.position.row
      : a.position.col - b.position.col
  );

  const attacker = playerMap[currentAttacker];
  const defender = currentDefender ? playerMap[currentDefender] : null;

  // Compute which tiles are valid neighbours — only when no defender is chosen yet
  const validDefenderIds = currentDefender
    ? new Set()
    : getValidDefenderTileIds(currentAttacker, boardTiles);

  return (
    <div className="min-h-screen bg-floor-bg flex flex-col items-center px-4 py-8">

      {/* Header */}
      <div className="w-full max-w-3xl mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-4xl md:text-5xl text-floor-accent tracking-widest uppercase">
            The Floor
          </h1>
          <p className="text-floor-text/50 text-sm mt-1">Family Edition</p>
        </div>

        <button
          onClick={resetGame}
          className="text-sm text-floor-text/40 hover:text-floor-accent
                     border border-white/10 hover:border-floor-accent/50
                     px-3 py-1.5 rounded-lg transition-colors"
        >
          Reset Game
        </button>
      </div>

      {/* Status banner */}
      {attacker && !currentDefender && (
        <div className="w-full max-w-3xl mb-6 rounded-xl px-5 py-3
                        border border-floor-gold/30 bg-floor-gold/10
                        flex items-center gap-3">
          <span
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: attacker.color }}
          />
          <p className="text-floor-text text-sm">
            <span className="text-floor-gold font-semibold">{attacker.name}</span>
            {' '}is the attacker — click a{' '}
            <span className="text-floor-accent font-semibold">highlighted neighbour</span>
            {' '}to start the duel.
          </p>
        </div>
      )}

      {/* Board grid */}
      <div
        className="w-full max-w-3xl grid gap-4"
        style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
      >
        {sortedTiles.map(tile => (
          <Tile
            key={tile.id}
            tile={tile}
            player={tile.playerId ? playerMap[tile.playerId] : null}
            isAttacker={tile.playerId === currentAttacker}
            isNeighbor={validDefenderIds.has(tile.id)}
            onClick={() => selectDefender(tile.playerId)}
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

      {/* Duel Declaration Overlay */}
      {currentDefender && duelState && attacker && defender && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-floor-surface rounded-2xl shadow-2xl p-8 w-full max-w-md text-center space-y-6">

            <h2 className="font-display text-5xl text-floor-accent tracking-widest uppercase">
              Duel!
            </h2>

            {/* Attacker vs Defender */}
            <div className="flex items-center justify-center gap-4">
              <div className="flex-1 text-center">
                <span
                  className="inline-block w-5 h-5 rounded-full mb-2"
                  style={{ backgroundColor: attacker.color }}
                />
                <p className="font-display text-2xl tracking-wide" style={{ color: attacker.color }}>
                  {attacker.name}
                </p>
                <p className="text-floor-text/40 text-xs uppercase tracking-widest mt-1">Attacker</p>
              </div>

              <span className="font-display text-3xl text-floor-text/30">VS</span>

              <div className="flex-1 text-center">
                <span
                  className="inline-block w-5 h-5 rounded-full mb-2"
                  style={{ backgroundColor: defender.color }}
                />
                <p className="font-display text-2xl tracking-wide" style={{ color: defender.color }}>
                  {defender.name}
                </p>
                <p className="text-floor-text/40 text-xs uppercase tracking-widest mt-1">Defender</p>
              </div>
            </div>

            {/* Duel topic */}
            <div className="rounded-xl bg-floor-bg px-5 py-4">
              <p className="text-floor-text/50 text-xs uppercase tracking-widest mb-1">Topic</p>
              <p className="font-display text-3xl text-floor-gold tracking-wide">
                {duelState.topic}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={cancelDefender}
                className="flex-1 py-3 rounded-xl border border-white/10 text-floor-text/50
                           hover:border-white/30 hover:text-floor-text transition-colors text-sm"
              >
                Go Back
              </button>
              <button
                onClick={startDuel}
                className="flex-1 py-3 rounded-xl bg-floor-accent hover:bg-floor-accent/80
                           text-white font-semibold uppercase tracking-wide transition-colors"
              >
                Start Duel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
