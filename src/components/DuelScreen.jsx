import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useImageDb } from '../context/ImageDbContext';
import { playCorrect, playWrong, playTick, stopTick, playWinDuel } from '../sound/soundManager';

const IS_PROD = import.meta.env.PROD;

function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Loads a single image URL into browser memory.
// Resolves to the URL on success, null on error or timeout.
function loadImage(url, timeoutMs = 4000) {
  return new Promise(resolve => {
    const img = new window.Image();
    const timer = setTimeout(() => resolve(null), timeoutMs);
    img.onload  = () => { clearTimeout(timer); resolve(url); };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = url;
  });
}

export default function DuelScreen() {
  const { state, dispatch, cancelDuel } = useGame();
  const { players, currentAttacker, currentDefender, duelState, categorySources } = state;
  const { getImagesForCategory } = useImageDb();

  const playerMap = Object.fromEntries(players.map(p => [p.id, p]));
  const attacker  = playerMap[currentAttacker];
  const defender  = playerMap[currentDefender];

  // ── Timer & duel state ───────────────────────────────────────────────────────
  const [attackerTimeMs, setAttackerTimeMs] = useState(45000);
  const [defenderTimeMs, setDefenderTimeMs] = useState(45000);
  const [activePlayer, setActivePlayer]     = useState('attacker');
  const [attackerSkipUsed, setAttackerSkipUsed] = useState(false);
  const [defenderSkipUsed, setDefenderSkipUsed] = useState(false);
  const [imageIndex, setImageIndex]         = useState(0);
  const [skipWarning, setSkipWarning]       = useState('');
  const [localResult, setLocalResult]       = useState(null);
  const [penaltyFlash, setPenaltyFlash]     = useState(null); // 'attacker' | 'defender' | null
  const [isPaused, setIsPaused]             = useState(false);

  // ── Task 6.4: Image preloading ───────────────────────────────────────────────
  const [preloadedImages, setPreloadedImages] = useState([]);
  const [isPreloading, setIsPreloading]       = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function preload() {
      try {
        const topic      = duelState?.topic ?? '';
        const explicitSource = categorySources?.[topic]; // 'api' | 'local' | undefined

        let urls = [];

        // In production, the local-images route is unavailable — always use the
        // bundled image DB.
        if (IS_PROD) {
          urls = shuffleArray(getImagesForCategory(topic));
        } else if (explicitSource === 'local') {
          const res  = await fetch(`/api/local-images?category=${encodeURIComponent(topic)}`);
          const data = res.ok ? await res.json() : [];
          urls = shuffleArray(data.filter(Boolean));
        } else if (explicitSource === 'api') {
          urls = shuffleArray(getImagesForCategory(topic));
        } else {
          // Dev auto-detect: try local first, fall back to bundled DB
          const localRes  = await fetch(`/api/local-images?category=${encodeURIComponent(topic)}`);
          const localData = localRes.ok ? await localRes.json() : [];
          if (localData.length > 0) {
            urls = shuffleArray(localData.filter(Boolean));
          } else {
            urls = shuffleArray(getImagesForCategory(topic));
          }
        }

        if (urls.length === 0) throw new Error('no images for this category');


        // Preload all images into browser memory in parallel
        const results = await Promise.all(urls.map(url => loadImage(url)));
        const loaded  = results.filter(Boolean);

        if (!cancelled) setPreloadedImages(loaded);
      } catch {
        // Fall through to placeholder mode — no images available
      } finally {
        if (!cancelled) setIsPreloading(false);
      }
    }

    preload();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Task 4.2: Precision timer — starts AFTER preloading ─────────────────────
  useEffect(() => {
    if (isPreloading || localResult || isPaused) return;

    const id = setInterval(() => {
      if (activePlayer === 'attacker') {
        setAttackerTimeMs(prev => Math.max(0, prev - 100));
      } else {
        setDefenderTimeMs(prev => Math.max(0, prev - 100));
      }
    }, 100);

    return () => clearInterval(id);
  }, [activePlayer, localResult, isPreloading, isPaused]);

  // ── Task 4.5: Detect timer reaching zero ────────────────────────────────────
  useEffect(() => {
    if (!localResult && attackerTimeMs === 0) {
      playWinDuel();
      setLocalResult({ winner: defender, loser: attacker });
    }
  }, [attackerTimeMs]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!localResult && defenderTimeMs === 0) {
      playWinDuel();
      setLocalResult({ winner: attacker, loser: defender });
    }
  }, [defenderTimeMs]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Tick sound: only for current player's last 10s; stop on turn switch / end ──
  const tickPlayingForRef = useRef(null); // 'attacker' | 'defender' | null
  useEffect(() => {
    const activeMs = activePlayer === 'attacker' ? attackerTimeMs : defenderTimeMs;
    const shouldTick =
      !localResult && !isPreloading && !isPaused && activeMs > 0 && activeMs <= 10000;

    if (shouldTick) {
      if (tickPlayingForRef.current !== activePlayer) {
        stopTick();
        playTick();
        tickPlayingForRef.current = activePlayer;
      }
    } else if (tickPlayingForRef.current !== null) {
      stopTick();
      tickPlayingForRef.current = null;
    }
  }, [attackerTimeMs, defenderTimeMs, activePlayer, localResult, isPreloading, isPaused]);

  useEffect(() => {
    return () => stopTick();
  }, []);

  // ── Task 4.3: Correct answer — spacebar ─────────────────────────────────────
  function handleCorrectAnswer() {
    if (localResult || isPreloading || isPaused) return;
    playCorrect();
    setActivePlayer(prev => (prev === 'attacker' ? 'defender' : 'attacker'));
    setImageIndex(prev => prev + 1);
  }

  // ── Task 4.4: Skip — arrow keys (once per player) ───────────────────────────
  function handleSkip() {
    if (localResult || isPreloading || isPaused) return;

    if (activePlayer === 'attacker') {
      if (attackerSkipUsed) {
        setSkipWarning(`${attacker?.name}'s skip is already used!`);
        setTimeout(() => setSkipWarning(''), 2000);
        return;
      }
      setAttackerSkipUsed(true);
    } else {
      if (defenderSkipUsed) {
        setSkipWarning(`${defender?.name}'s skip is already used!`);
        setTimeout(() => setSkipWarning(''), 2000);
        return;
      }
      setDefenderSkipUsed(true);
    }

    playWrong();
    setActivePlayer(prev => (prev === 'attacker' ? 'defender' : 'attacker'));
    setImageIndex(prev => prev + 1);
  }

  // ── Task 10.2: Penalty — X key (−2 s from active player) ────────────────────
  function handlePenalty() {
    if (localResult || isPreloading || isPaused) return;

    const penalized = activePlayer; // 'attacker' or 'defender'

    if (penalized === 'attacker') {
      setAttackerTimeMs(prev => Math.max(0, prev - 2000));
    } else {
      setDefenderTimeMs(prev => Math.max(0, prev - 2000));
    }

    playWrong();
    // Switch turn and advance image (same as correct answer / skip)
    setActivePlayer(prev => (prev === 'attacker' ? 'defender' : 'attacker'));
    setImageIndex(prev => prev + 1);

    // Task 10.3: Flash the penalized panel
    setPenaltyFlash(penalized);
    setTimeout(() => setPenaltyFlash(null), 600);
  }

  // ── Pause / Resume toggle ────────────────────────────────────────────────────
  function handlePauseToggle() {
    if (localResult || isPreloading) return;
    setIsPaused(prev => !prev);
  }

  // Keep keyboard handlers fresh via ref (avoids stale closures)
  const handlersRef = useRef({});
  handlersRef.current = { handleCorrectAnswer, handleSkip, handlePenalty, handlePauseToggle };

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handlersRef.current.handleCorrectAnswer();
      } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        handlersRef.current.handleSkip();
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        handlersRef.current.handlePenalty();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handlersRef.current.handlePauseToggle();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function handleContinue() {
    dispatch({
      type: 'DUEL_END',
      payload: { winnerId: localResult.winner.id, loserId: localResult.loser.id },
    });
  }

  if (!attacker || !defender || !duelState) return null;

  // ── Task 6.5: Current image URL (cycles through preloaded array) ─────────────
  const currentImageUrl = preloadedImages.length > 0
    ? preloadedImages[imageIndex % preloadedImages.length]
    : null;

  return (
    <div className="min-h-screen bg-floor-bg flex flex-col items-center justify-between px-2 py-4 gap-4">

      {/* ── Topic header ── */}
      <div className="w-full text-center pt-2">
        <p className="text-floor-text/40 text-xs uppercase tracking-widest mb-1">Topic</p>
        <h2 className="font-display text-4xl md:text-9xl text-floor-gold tracking-widest uppercase">
          {duelState.topic}
        </h2>
      </div>

      {/* ── Main duel row ── */}
      <div className="w-full grid gap-3 md:gap-4 flex-1 items-stretch
                      grid-cols-2 grid-rows-[auto_1fr]
                      md:grid-cols-[auto_1fr_auto] md:grid-rows-1">

        <PlayerPanel
          player={attacker}
          timeMs={attackerTimeMs}
          isActive={activePlayer === 'attacker'}
          label="Attacker"
          skipUsed={attackerSkipUsed}
          isPreloading={isPreloading}
          isPenalized={penaltyFlash === 'attacker'}
        />

        {/* ── Centre image area ── */}
        <div className="col-span-2 row-start-2 md:col-span-1 md:col-start-2 md:row-start-1
                        flex flex-col items-center justify-center gap-4 min-w-0">

          {/* Task 6.4: Preloading overlay */}
          {isPreloading ? (
            <div
              className="w-full rounded-2xl border-2 border-white/10 bg-floor-surface
                         flex flex-col items-center justify-center gap-4 p-6"
              style={{ aspectRatio: '4 / 3', maxHeight: '65vh' }}
            >
              <div className="w-10 h-10 rounded-full border-2 border-floor-gold/30
                              border-t-floor-gold animate-spin" />
              <p className="text-floor-text/40 text-sm uppercase tracking-widest">
                Loading images…
              </p>
              <p className="text-floor-text/20 text-xs">{duelState.topic}</p>
            </div>
          ) : (
            /* Task 6.5: Render preloaded image */
            <div
              className="w-full rounded-2xl border-2 border-white/10 bg-floor-surface
                         overflow-hidden flex items-center justify-center"
              style={{ aspectRatio: '4 / 3', maxHeight: '65vh' }}
            >
              {currentImageUrl ? (
                <img
                  key={currentImageUrl}        /* remounts on URL change for clean transition */
                  src={currentImageUrl}
                  alt={duelState.topic}
                  className="w-full h-full object-contain"
                />
              ) : (
                /* Fallback placeholder when no images are available */
                <div className="flex flex-col items-center gap-3 p-6">
                  <svg
                    className="w-20 h-20 text-white/10"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586
                         a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2
                         0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-white/20 text-sm uppercase tracking-widest">
                    {duelState.topic}
                  </p>
                  <p className="text-white/10 text-xs">Image #{imageIndex + 1}</p>
                </div>
              )}
            </div>
          )}

          {/* Skip warning flash */}
          {skipWarning && (
            <p className="text-floor-accent text-sm text-center animate-pulse font-medium">
              {skipWarning}
            </p>
          )}
        </div>

        <PlayerPanel
          player={defender}
          timeMs={defenderTimeMs}
          isActive={activePlayer === 'defender'}
          label="Defender"
          skipUsed={defenderSkipUsed}
          isPreloading={isPreloading}
          isPenalized={penaltyFlash === 'defender'}
        />
      </div>

      {/* ── Keyboard hint bar + Cancel Duel ── */}
      <div className="flex items-center gap-8 pb-2 flex-wrap justify-center">
        <div className="hidden md:flex gap-8 text-floor-text/25 text-xs uppercase tracking-widest">
          <span>
            <kbd className="font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded text-floor-text/40">
              Space
            </kbd>
            {' '}Correct Answer
          </span>
          <span>
            <kbd className="font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded text-floor-text/40">
              ← →
            </kbd>
            {' '}Skip (once per player)
          </span>
          <span>
            <kbd className="font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded text-floor-text/40">
              X
            </kbd>
            {' '}Penalty (−2s)
          </span>
          <span>
            <kbd className="font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded text-floor-text/40">
              P
            </kbd>
            {' '}Pause / Resume
          </span>
        </div>

        {!localResult && (
          <>
            <button
              onClick={handlePauseToggle}
              className="px-4 py-1.5 rounded-lg border border-white/10 text-floor-text/30
                         hover:border-floor-gold/50 hover:text-floor-gold text-xs
                         uppercase tracking-widest transition-colors"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={cancelDuel}
              className="px-4 py-1.5 rounded-lg border border-white/10 text-floor-text/30
                         hover:border-floor-accent/50 hover:text-floor-accent text-xs
                         uppercase tracking-widest transition-colors"
            >
              Cancel Duel
            </button>
          </>
        )}
      </div>

      {/* ── Pause overlay ── */}
      {isPaused && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-floor-surface rounded-2xl shadow-2xl p-10 text-center space-y-6">
            <h2 className="font-display text-6xl tracking-widest text-floor-gold uppercase">
              Paused
            </h2>
            <p className="text-floor-text/50 text-sm uppercase tracking-widest">
              Timers are frozen
            </p>
            <button
              onClick={handlePauseToggle}
              className="w-full py-4 rounded-xl bg-floor-gold/20 hover:bg-floor-gold/30
                         text-floor-gold font-display text-2xl tracking-widest uppercase
                         transition-colors border border-floor-gold/30"
            >
              Resume
            </button>
          </div>
        </div>
      )}

      {/* ── Result overlay ── */}
      {localResult && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-floor-surface rounded-2xl shadow-2xl p-8 w-full max-w-md text-center space-y-6">
            <div className="space-y-1">
              <p className="text-floor-text/40 text-xs uppercase tracking-widest">Time's Up!</p>
              <h2
                className="font-display text-7xl tracking-widest"
                style={{ color: localResult.winner.color }}
              >
                {localResult.winner.name}
              </h2>
              <p className="text-floor-text/70 text-xl">wins the duel!</p>
            </div>
            <div className="rounded-xl bg-floor-bg px-5 py-3">
              <p className="text-floor-text/50 text-sm">
                <span style={{ color: localResult.loser.color }}>{localResult.loser.name}</span>
                {' '}is eliminated from the floor.
              </p>
            </div>
            <button
              onClick={handleContinue}
              className="w-full py-4 rounded-xl bg-floor-accent hover:bg-floor-accent/80
                         text-white font-display text-2xl tracking-widest uppercase
                         transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerPanel({ player, timeMs, isActive, label, skipUsed, isPreloading, isPenalized }) {
  const isLow = timeMs > 0 && timeMs <= 10000;

  return (
    <div
      className={`
        flex flex-col items-center justify-center gap-2 md:gap-3 p-3 md:p-5 rounded-2xl border-2
        transition-all duration-300 w-full md:w-44 md:flex-shrink-0 relative overflow-hidden
        ${isPenalized
          ? 'border-floor-accent bg-floor-accent/10 shadow-[0_0_32px_6px] shadow-floor-accent/30'
          : isActive && !isPreloading
            ? 'border-floor-gold bg-floor-gold/5 shadow-[0_0_32px_6px] shadow-floor-gold/25'
            : 'border-white/10 bg-floor-surface opacity-50'}
      `}
    >
      {/* −2s flash badge */}
      {isPenalized && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <span className="font-display text-4xl text-floor-accent font-bold drop-shadow-lg animate-bounce">
            −2s
          </span>
        </div>
      )}

      <p className="text-floor-text/50 text-xs uppercase tracking-widest">{label}</p>

      <span className="w-5 h-5 rounded-full flex-shrink-0"
            style={{ backgroundColor: player.color }} />

      <p className="font-display text-xl md:text-3xl tracking-wide text-center leading-tight"
         style={{ color: player.color }}>
        {player.name}
      </p>

      <p className={`
        font-display text-4xl md:text-5xl tracking-wider transition-colors leading-none
        ${isPreloading
          ? 'text-floor-text/20'
          : isActive
            ? isLow ? 'text-floor-accent animate-pulse' : 'text-floor-gold'
            : 'text-floor-text/30'}
      `}>
        {formatTime(timeMs)}
      </p>

      <div className="flex items-center gap-1.5 mt-1">
        <span className={`w-2 h-2 rounded-full transition-colors ${
          skipUsed ? 'bg-white/20' : 'bg-floor-accent'
        }`} />
        <span className="text-floor-text/30 text-xs whitespace-nowrap">
          {skipUsed ? 'Skip used' : 'Skip ready'}
        </span>
      </div>
    </div>
  );
}
