import React, { useState } from 'react';
import { useGame } from './context/GameContext';
import StartScreen from './components/StartScreen';
import Board from './components/Board';
import DuelScreen from './components/DuelScreen';
import PostDuelScreen from './components/PostDuelScreen';
import WinnerScreen from './components/WinnerScreen';
import { isMuted, toggleMute } from './sound/soundManager';

export default function App() {
  const { state } = useGame();
  const [muted, setMuted] = useState(isMuted());

  function handleToggleMute() {
    toggleMute();
    setMuted(isMuted());
  }

  let screen;
  switch (state.gamePhase) {
    case 'setup':     screen = <StartScreen />;    break;
    case 'board':     screen = <Board />;           break;
    case 'duel':      screen = <DuelScreen />;      break;
    case 'post-duel': screen = <PostDuelScreen />;  break;
    case 'winner':    screen = <WinnerScreen />;    break;
    default:          screen = <StartScreen />;
  }

  return (
    <>
      {screen}
      <button
        onClick={handleToggleMute}
        title={muted ? 'Unmute' : 'Mute'}
        className="fixed top-3 right-4 z-50 text-floor-text/30 hover:text-floor-text/70
                   transition-colors text-xl select-none"
      >
        {muted ? '🔇' : '🔊'}
      </button>
    </>
  );
}
