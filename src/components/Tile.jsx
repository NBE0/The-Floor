import React from 'react';

export default function Tile({ tile, player, isAttacker, isNeighbor, onClick }) {
  // Neutral tile (no player assigned)
  if (!player) {
    return (
      <div
        className="rounded-xl border-2 border-white/5 bg-floor-bg/40
                   flex items-center justify-center"
        style={{ aspectRatio: '1 / 1' }}
      >
        <span className="text-white/10 text-xs uppercase tracking-widest">Empty</span>
      </div>
    );
  }

  return (
    <div
      onClick={isNeighbor ? onClick : undefined}
      className={`
        relative rounded-xl border-2 flex flex-col items-center justify-center
        p-2 transition-all duration-300 select-none
        ${isAttacker
          ? 'border-floor-gold shadow-[0_0_24px_4px] shadow-floor-gold/50 scale-105 z-10'
          : isNeighbor
            ? 'border-floor-accent shadow-[0_0_16px_2px] shadow-floor-accent/40 cursor-pointer scale-100 hover:scale-105 animate-pulse'
            : 'border-white/10'}
      `}
      style={{
        aspectRatio: '1 / 1',
        backgroundColor: player.color + '22',
        borderColor: isAttacker ? '#f5a623' : isNeighbor ? '#e94560' : player.color + '66',
      }}
    >
      {/* Attacker badge */}
      {isAttacker && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2
                     bg-floor-gold text-floor-bg text-xs font-bold
                     px-2 py-0.5 rounded-full tracking-widest uppercase whitespace-nowrap"
        >
          Attacker
        </span>
      )}

      {/* Neighbor badge */}
      {isNeighbor && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2
                     bg-floor-accent text-white text-xs font-bold
                     px-2 py-0.5 rounded-full tracking-widest uppercase whitespace-nowrap"
        >
          Challenge?
        </span>
      )}

      {/* Player name */}
      <p
        className="font-display text-6xl md:text-7xl tracking-wide text-center leading-tight"
        style={{ color: player.color }}
      >
        {player.name}
      </p>

      {/* Category */}
      <p className="text-floor-text/60 text-2xl text-center mt-1 leading-snug px-1">
        {tile.currentCategory}
      </p>
    </div>
  );
}
