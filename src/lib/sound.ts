/**
 * Laya Audio Feedback Engine (Web Audio API)
 *
 * 100% offline, zero external audio dependencies, zero latency.
 * Provides curated collections of choosable task completion pop sounds
 * and cat tidying/sweeping sound effect profiles.
 */

let audioCtx: AudioContext | null = null;
let soundEnabled = true;
let currentProfileId = "wooden-pop";
let currentTidyProfileId = "broom-swish";

// Initialize sound settings from localStorage
if (typeof window !== "undefined") {
  const storedEnabled = localStorage.getItem("laya-sound-effects");
  if (storedEnabled !== null) {
    soundEnabled = storedEnabled === "true";
  }
  const storedProfile = localStorage.getItem("laya-sfx-profile");
  if (storedProfile) {
    currentProfileId = storedProfile;
  }
  const storedTidy = localStorage.getItem("laya-tidy-sfx-profile");
  if (storedTidy) {
    currentTidyProfileId = storedTidy;
  }
}

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  if (typeof window !== "undefined") {
    localStorage.setItem("laya-sound-effects", String(enabled));
  }
}

export function isSoundEnabled(): boolean {
  return soundEnabled;
}

export function getSoundProfile(): string {
  return currentProfileId;
}

export function setSoundProfile(profileId: string) {
  currentProfileId = profileId;
  if (typeof window !== "undefined") {
    localStorage.setItem("laya-sfx-profile", profileId);
  }
}

export function getTidySoundProfile(): string {
  return currentTidyProfileId;
}

export function setTidySoundProfile(profileId: string) {
  currentTidyProfileId = profileId;
  if (typeof window !== "undefined") {
    localStorage.setItem("laya-tidy-sfx-profile", profileId);
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

export interface SoundProfileDef {
  id: string;
  name: string;
  description: string;
  category: string;
  play: (ctx: AudioContext, now: number) => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. TASK COMPLETION POP PROFILES (8 Options)
   ═══════════════════════════════════════════════════════════════════════════ */

export const SOUND_PROFILES: SoundProfileDef[] = [
  {
    id: "wooden-pop",
    name: "Wooden Pop",
    description: "Warm, satisfying tactile marimba woodblock tap",
    category: "Tactile",
    play: (ctx, now) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(310, now + 0.05);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    },
  },
  {
    id: "bubble-pop",
    name: "Bubble Pop",
    description: "Light, buoyant liquid bubble pop",
    category: "Liquid",
    play: (ctx, now) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.035);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.075);
    },
  },
  {
    id: "bamboo-knock",
    name: "Bamboo Knock",
    description: "Crisp, hollow bamboo percussion tap",
    category: "Wood",
    play: (ctx, now) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(460, now);
      osc1.frequency.exponentialRampToValueAtTime(380, now + 0.04);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(920, now);
      osc2.frequency.exponentialRampToValueAtTime(740, now + 0.035);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.06);
      osc2.stop(now + 0.06);
    },
  },
  {
    id: "water-droplet",
    name: "Water Droplet",
    description: "Pure, peaceful cavern water drop",
    category: "Liquid",
    play: (ctx, now) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1450, now + 0.025);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.07);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.085);
    },
  },
  {
    id: "crystal-bell",
    name: "Crystal Bell",
    description: "Delicate high-frequency crystal chime",
    category: "Chime",
    play: (ctx, now) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(1318.5, now);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(2637, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.15, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.23);
      osc2.stop(now + 0.23);
    },
  },
  {
    id: "soft-click",
    name: "Tactile Switch",
    description: "Subtle mechanical keyboard switch click",
    category: "Tactile",
    play: (ctx, now) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.025);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.038);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    },
  },
  {
    id: "acoustic-pluck",
    name: "Acoustic Pluck",
    description: "Warm nylon acoustic guitar string pluck",
    category: "Instrument",
    play: (ctx, now) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(523.25, now);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1046.5, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.17);
      osc2.stop(now + 0.17);
    },
  },
  {
    id: "magic-twinkle",
    name: "Magic Twinkle",
    description: "Soft dual-tone fairy sparkle chime",
    category: "Chime",
    play: (ctx, now) => {
      [
        { freq: 1046.5, delay: 0 },
        { freq: 1567.98, delay: 0.028 },
      ].forEach(({ freq, delay }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + delay);

        gain.gain.setValueAtTime(0.001, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.14, now + delay + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.17);
      });
    },
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   2. CAT TIDY-UP & SWEEPING SFX PROFILES (5 Options)
   ═══════════════════════════════════════════════════════════════════════════ */

export interface TidySoundProfileDef {
  id: string;
  name: string;
  description: string;
  tag: string;
  play: (ctx: AudioContext, now: number) => void;
}

export const TIDY_SOUND_PROFILES: TidySoundProfileDef[] = [
  {
    id: "broom-swish",
    name: "Cozy Broom Swish",
    description: "Authentic bristle friction sweep with tuned crystalline sparkle finish",
    tag: "Classic",
    play: (ctx, now) => {
      const bufferSize = Math.floor(ctx.sampleRate * 1.2);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

      // Pass 1: Forward broom brush
      const src1 = ctx.createBufferSource();
      src1.buffer = noiseBuffer;
      const f1 = ctx.createBiquadFilter();
      f1.type = "bandpass";
      f1.Q.setValueAtTime(3.2, now);
      f1.frequency.setValueAtTime(420, now);
      f1.frequency.exponentialRampToValueAtTime(1500, now + 0.16);
      f1.frequency.exponentialRampToValueAtTime(500, now + 0.34);
      const g1 = ctx.createGain();
      g1.gain.setValueAtTime(0.0001, now);
      g1.gain.exponentialRampToValueAtTime(0.18, now + 0.12);
      g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      src1.connect(f1);
      f1.connect(g1);
      g1.connect(ctx.destination);
      src1.start(now);
      src1.stop(now + 0.36);

      // Pass 2: Return flick
      const t2 = now + 0.36;
      const src2 = ctx.createBufferSource();
      src2.buffer = noiseBuffer;
      const f2 = ctx.createBiquadFilter();
      f2.type = "bandpass";
      f2.Q.setValueAtTime(3.8, t2);
      f2.frequency.setValueAtTime(650, t2);
      f2.frequency.exponentialRampToValueAtTime(2100, t2 + 0.14);
      f2.frequency.exponentialRampToValueAtTime(750, t2 + 0.32);
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.0001, t2);
      g2.gain.exponentialRampToValueAtTime(0.15, t2 + 0.1);
      g2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.34);
      src2.connect(f2);
      f2.connect(g2);
      g2.connect(ctx.destination);
      src2.start(t2);
      src2.stop(t2 + 0.36);

      // Chime finish
      const t3 = now + 0.72;
      [880, 1108.73, 1318.51, 1760].forEach((freq, idx) => {
        const nt = t3 + idx * 0.055;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = idx % 2 === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, nt);
        g.gain.setValueAtTime(0.0001, nt);
        g.gain.exponentialRampToValueAtTime(0.1, nt + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, nt + 0.42);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(nt);
        osc.stop(nt + 0.44);
      });
    },
  },
  {
    id: "magic-wand",
    name: "Magic Wand Sparkle",
    description: "Soaring fairy wind glide with arpeggiated star chimes",
    tag: "Fantasy",
    play: (ctx, now) => {
      // Wind glide
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(1480, now + 0.35);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.65);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.12, now + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.72);

      // Arpeggiated star bells
      const tBells = now + 0.45;
      [1318.51, 1661.22, 1975.53, 2637.02].forEach((freq, idx) => {
        const nt = tBells + idx * 0.06;
        const o = ctx.createOscillator();
        const gn = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(freq, nt);
        gn.gain.setValueAtTime(0.0001, nt);
        gn.gain.exponentialRampToValueAtTime(0.12, nt + 0.01);
        gn.gain.exponentialRampToValueAtTime(0.0001, nt + 0.38);
        o.connect(gn);
        gn.connect(ctx.destination);
        o.start(nt);
        o.stop(nt + 0.4);
      });
    },
  },
  {
    id: "leaf-breeze",
    name: "Gentle Leaf Breeze",
    description: "Soft organic wind swell with pentatonic wooden windchimes",
    tag: "Nature",
    play: (ctx, now) => {
      const bufferSize = Math.floor(ctx.sampleRate * 1.0);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

      // Soft wind swell
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(320, now);
      f.frequency.exponentialRampToValueAtTime(950, now + 0.35);
      f.frequency.exponentialRampToValueAtTime(260, now + 0.75);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.14, now + 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      src.connect(f);
      f.connect(g);
      g.connect(ctx.destination);
      src.start(now);
      src.stop(now + 0.82);

      // Wooden pentatonic chimes
      const tChimes = now + 0.4;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const nt = tChimes + idx * 0.075;
        const o = ctx.createOscillator();
        const gn = ctx.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(freq, nt);
        gn.gain.setValueAtTime(0.0001, nt);
        gn.gain.exponentialRampToValueAtTime(0.12, nt + 0.01);
        gn.gain.exponentialRampToValueAtTime(0.0001, nt + 0.32);
        o.connect(gn);
        gn.connect(ctx.destination);
        o.start(nt);
        o.stop(nt + 0.34);
      });
    },
  },
  {
    id: "ocean-wash",
    name: "Ocean Ripple",
    description: "Soothing ambient water wave with cavern drop resonance",
    tag: "Ambient",
    play: (ctx, now) => {
      // Wave swell
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.3);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.7);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.15, now + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.76);

      // Water droplet accents
      const tDrops = now + 0.45;
      [1100, 1450, 1800].forEach((freq, idx) => {
        const nt = tDrops + idx * 0.08;
        const o = ctx.createOscillator();
        const gn = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(freq, nt);
        o.frequency.exponentialRampToValueAtTime(freq * 0.75, nt + 0.05);
        gn.gain.setValueAtTime(0.0001, nt);
        gn.gain.exponentialRampToValueAtTime(0.14, nt + 0.008);
        gn.gain.exponentialRampToValueAtTime(0.0001, nt + 0.18);
        o.connect(gn);
        gn.connect(ctx.destination);
        o.start(nt);
        o.stop(nt + 0.2);
      });
    },
  },
  {
    id: "bubble-cascade",
    name: "Bubble Cascade",
    description: "Rapid ascending bubbly water pops with a buoyant pop finish",
    tag: "Playful",
    play: (ctx, now) => {
      // 6 rapid bubbly pops
      const freqs = [380, 480, 580, 720, 920, 1200];
      freqs.forEach((baseFreq, idx) => {
        const nt = now + idx * 0.09;
        const o = ctx.createOscillator();
        const gn = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(baseFreq, nt);
        o.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, nt + 0.04);
        gn.gain.setValueAtTime(0.0001, nt);
        gn.gain.exponentialRampToValueAtTime(0.16, nt + 0.006);
        gn.gain.exponentialRampToValueAtTime(0.0001, nt + 0.075);
        o.connect(gn);
        gn.connect(ctx.destination);
        o.start(nt);
        o.stop(nt + 0.08);
      });
    },
  },
];

/**
 * Plays the currently selected task completion sound profile.
 */
export function playTaskPopSound(customProfileId?: string) {
  if (!soundEnabled && !customProfileId) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const targetId = customProfileId || currentProfileId;
    const profile = SOUND_PROFILES.find((p) => p.id === targetId) || SOUND_PROFILES[0];
    profile.play(ctx, ctx.currentTime);
  } catch (err) {
    console.debug("Audio playback ignored:", err);
  }
}

/**
 * Plays a soft 3-note melodic chime when unlocking a milestone achievement.
 */
export function playAchievementSound() {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.075;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.14, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.34);
    });
  } catch (err) {
    console.debug("Audio playback ignored:", err);
  }
}

/**
 * Plays the selected cat tidying / sweeping sound effect.
 */
export function playSweepSound(customTidyProfileId?: string) {
  if (!soundEnabled && !customTidyProfileId) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const targetId = customTidyProfileId || currentTidyProfileId;
    const profile = TIDY_SOUND_PROFILES.find((p) => p.id === targetId) || TIDY_SOUND_PROFILES[0];
    profile.play(ctx, ctx.currentTime);
  } catch (err) {
    console.debug("Audio playback ignored:", err);
  }
}
