// Sonidos generados por código (sin archivos de audio todavía)
let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    return ctx;
  } catch {
    return null;
  }
}

// Golpe de bajo tipo subwoofer. power: 1 = básico, 2 = pro
export function playBassHit(power: number, delaySeconds = 0): void {
  const audio = getContext();
  if (!audio) return;
  const t = audio.currentTime + delaySeconds;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(110, t);
  osc.frequency.exponentialRampToValueAtTime(42, t + 0.25);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.35 + 0.25 * power, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  osc.connect(gain).connect(audio.destination);
  osc.start(t);
  osc.stop(t + 0.4);
}
