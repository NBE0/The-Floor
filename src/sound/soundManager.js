import { Howl, Howler } from 'howler';

// Preload all sounds once at module load time
const sounds = {
  correct:  new Howl({ src: ['/sounds/right_answer.mp3'], volume: 0.7 }),
  wrong:    new Howl({ src: ['/sounds/wrong_answer.mp3'], volume: 0.7 }),
  tick:     new Howl({ src: ['/sounds/tick.mp3'],         volume: 0.5 }),
  winDuel:  new Howl({ src: ['/sounds/win_duel.mp3'],     volume: 0.8 }),
  board:    new Howl({ src: ['/sounds/deep_house.mp3'],   volume: 0.35, loop: true }),
  winner:   new Howl({ src: ['/sounds/disco-party.mp3'],  volume: 0.35, loop: true }),
};

let _muted = JSON.parse(localStorage.getItem('soundMuted') ?? 'false');
if (_muted) Howler.mute(true);

export function playCorrect()  { sounds.correct.play();  }
export function playWrong()    { sounds.wrong.play();    }
export function playTick()     { sounds.tick.play();     }
export function stopTick()     { sounds.tick.stop();     }
export function playWinDuel()  { sounds.winDuel.play();  }

let _currentMusic = null;
export function startMusic(track) {
  stopMusic();
  _currentMusic = track;
  sounds[track].play();
}
export function stopMusic() {
  if (_currentMusic) {
    sounds[_currentMusic].stop();
    _currentMusic = null;
  }
}

export function isMuted() { return _muted; }
export function toggleMute() {
  _muted = !_muted;
  Howler.mute(_muted);
  localStorage.setItem('soundMuted', JSON.stringify(_muted));
}
