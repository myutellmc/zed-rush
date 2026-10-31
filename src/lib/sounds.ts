// Short game sounds made with the Web Audio API: no audio files, so they work offline
const SOUND_KEY = "zed-rush-sound";

let ctx: AudioContext | null = null;

export function isSoundOn(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    // Storage unavailable: the choice lasts until the page reloads
  }
}

function audio(): AudioContext | null {
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

// Call from a tap: mobile browsers only allow sound after the player touches the screen
export function unlockSound() {
  audio()?.resume().catch(() => {});
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", delay = 0, vol = 0.2) {
  if (!isSoundOn()) return;
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// Android phones vibrate; iPhones ignore this
function vibrate(pattern: number | number[]) {
  // Browsers block vibration until the player has touched the page
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not supported
  }
}

export const sounds = {
  countdown: () => tone(660, 0.12),
  go: () => {
    tone(990, 0.3);
    vibrate(80);
  },
  correct: () => {
    tone(880, 0.12);
    tone(1320, 0.18, "sine", 0.1);
    vibrate(40);
  },
  skip: () => {
    tone(240, 0.18, "triangle");
    vibrate(25);
  },
  buzz: () => {
    tone(140, 0.45, "sawtooth", 0, 0.25);
    vibrate([120, 60, 120]);
  },
  tick: () => tone(1000, 0.05, "square", 0, 0.08),
  timesUp: () => {
    tone(523, 0.2);
    tone(392, 0.4, "sine", 0.18);
    vibrate([200, 100, 200]);
  },
};
