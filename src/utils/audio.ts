/**
 * Sound synthesis using the native Web Audio API.
 * This does not require any internet connection or static files.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  // Resume context if suspended (common in browsers due to autoplay policies)
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a beautiful, retro-satisfying "success" chime.
 * Ascending chime: C5 -> E5 -> G5 with a soft, warm decay.
 */
export function playSuccessSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Note frequencies: C5 (523.25 Hz), E5 (659.25 Hz), G5 (783.99 Hz)
  const notes = [523.25, 659.25, 783.99];
  const duration = 0.15;
  const gap = 0.08;

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Triangle/Sine wave combo for a soft, chiptune chime
    osc.type = idx === 1 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * gap);

    // Fade out volume smoothly
    gainNode.gain.setValueAtTime(0.15, now + idx * gap);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + idx * gap + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now + idx * gap);
    osc.stop(now + idx * gap + duration);
  });
}

/**
 * Play a light "send/start" sound.
 * An rising slide (whoosh) from 200Hz to 600Hz.
 */
export function playSendSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);

  gainNode.gain.setValueAtTime(0.1, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.2);
}

/**
 * Play an alert for incoming file requests.
 * A dual tone chime.
 */
export function playRequestSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  const gain2 = ctx.createGain();

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(440, now); // A4
  gain1.gain.setValueAtTime(0.08, now);
  gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(554.37, now + 0.05); // C#5
  gain2.gain.setValueAtTime(0.08, now + 0.05);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + 0.3);
  osc2.start(now + 0.05);
  osc2.stop(now + 0.35);
}

/**
 * Play a cancel/error sound.
 * A quick low-pitched pulse.
 */
export function playCancelSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(180, now);
  osc.frequency.linearRampToValueAtTime(100, now + 0.25);

  gainNode.gain.setValueAtTime(0.12, now);
  gainNode.gain.linearRampToValueAtTime(0.0001, now + 0.25);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.25);
}
