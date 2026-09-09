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
  {
    id: "cat-purr-sparkle",
    name: "Purr & Star Polish",
    description: "Gentle 24Hz vibrating cat purr rumble gliding into a pristine star sparkle ping",
    tag: "Cozy",
    play: (ctx, now) => {
      // 1. Cat Purr Layer (Low oscillator AM modulated)
      const purrOsc = ctx.createOscillator();
      const purrGain = ctx.createGain();
      const purrMod = ctx.createOscillator();
      const purrModGain = ctx.createGain();

      purrOsc.type = "sawtooth";
      purrOsc.frequency.setValueAtTime(75, now);
      purrOsc.frequency.exponentialRampToValueAtTime(85, now + 0.35);

      // Lowpass filter for deep muffled purr warmth
      const purrFilter = ctx.createBiquadFilter();
      purrFilter.type = "lowpass";
      purrFilter.frequency.setValueAtTime(140, now);

      // LFO modulation at 24 Hz for purr flutter
      purrMod.frequency.setValueAtTime(24, now);
      purrModGain.gain.setValueAtTime(0.08, now);

      purrGain.gain.setValueAtTime(0.0001, now);
      purrGain.gain.exponentialRampToValueAtTime(0.18, now + 0.15);
      purrGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      purrMod.connect(purrGain.gain);
      purrOsc.connect(purrFilter);
      purrFilter.connect(purrGain);
      purrGain.connect(ctx.destination);

      purrOsc.start(now);
      purrMod.start(now);
      purrOsc.stop(now + 0.52);
      purrMod.stop(now + 0.52);

      // 2. Star Polish Chime Finish
      const tSparkle = now + 0.38;
      [1174.66, 1479.98, 1760.0, 2349.32].forEach((freq, idx) => {
        const nt = tSparkle + idx * 0.05;
        const o = ctx.createOscillator();
        const gn = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(freq, nt);
        gn.gain.setValueAtTime(0.0001, nt);
        gn.gain.exponentialRampToValueAtTime(0.12, nt + 0.008);
        gn.gain.exponentialRampToValueAtTime(0.0001, nt + 0.32);
        o.connect(gn);
        gn.connect(ctx.destination);
        o.start(nt);
        o.stop(nt + 0.34);
      });
    },
  },
  {
    id: "paper-tidy",
    name: "Crisp Paper Slide & Snap",
    description: "Satisfying friction slide of organizing fresh parchment with a tactile wooden box snap",
    tag: "Tactile",
    play: (ctx, now) => {
      const bufferSize = Math.floor(ctx.sampleRate * 0.8);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

      // 1. Paper Sliding Friction
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.Q.setValueAtTime(4.0, now);
      f.frequency.setValueAtTime(1200, now);
      f.frequency.exponentialRampToValueAtTime(3200, now + 0.18);
      f.frequency.exponentialRampToValueAtTime(900, now + 0.32);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.14, now + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
      src.connect(f);
      f.connect(g);
      g.connect(ctx.destination);
      src.start(now);
      src.stop(now + 0.35);

      // 2. Neat Box Snap Thud
      const tSnap = now + 0.28;
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();
      snapOsc.type = "triangle";
      snapOsc.frequency.setValueAtTime(340, tSnap);
      snapOsc.frequency.exponentialRampToValueAtTime(110, tSnap + 0.04);
      snapGain.gain.setValueAtTime(0.0001, tSnap);
      snapGain.gain.exponentialRampToValueAtTime(0.24, tSnap + 0.003);
      snapGain.gain.exponentialRampToValueAtTime(0.0001, tSnap + 0.07);
      snapOsc.connect(snapGain);
      snapGain.connect(ctx.destination);
      snapOsc.start(tSnap);
      snapOsc.stop(tSnap + 0.08);

      // 3. High crisp tick
      const tickOsc = ctx.createOscillator();
      const tickGain = ctx.createGain();
      tickOsc.type = "sine";
      tickOsc.frequency.setValueAtTime(1864, tSnap + 0.02);
      tickGain.gain.setValueAtTime(0.0001, tSnap + 0.02);
      tickGain.gain.exponentialRampToValueAtTime(0.16, tSnap + 0.024);
      tickGain.gain.exponentialRampToValueAtTime(0.0001, tSnap + 0.12);
      tickOsc.connect(tickGain);
      tickGain.connect(ctx.destination);
      tickOsc.start(tSnap + 0.02);
      tickOsc.stop(tSnap + 0.13);
    },
  },
  {
    id: "zen-singing-bowl",
    name: "Zen Singing Bowl",
    description: "Resonant Tibetan singing bowl harmonics (432Hz) with long meditative decay",
    tag: "Mindful",
    play: (ctx, now) => {
      // Tibetan Bowl Harmonics: Fundamental 432Hz + 864Hz + 1296Hz + 2160Hz
      const partials = [
        { freq: 432.0, gain: 0.18, decay: 0.85 },
        { freq: 864.0, gain: 0.12, decay: 0.65 },
        { freq: 1296.0, gain: 0.08, decay: 0.45 },
        { freq: 2160.0, gain: 0.04, decay: 0.35 },
      ];

      partials.forEach(({ freq, gain, decay }) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(gain, now + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + decay + 0.02);
      });
    },
  },
  {
    id: "cosmic-stardust",
    name: "Cosmic Stardust Glissando",
    description: "Luminous celestial synth arpeggio ascending into starry harmonic rings",
    tag: "Celestial",
    play: (ctx, now) => {
      // Rising starry arpeggios
      const notes = [659.25, 830.61, 987.77, 1318.51, 1661.22, 1975.53, 2637.02];
      notes.forEach((freq, idx) => {
        const nt = now + idx * 0.055;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const g = ctx.createGain();

        osc1.type = "sine";
        osc2.type = "triangle";
        osc1.frequency.setValueAtTime(freq, nt);
        osc2.frequency.setValueAtTime(freq * 1.003, nt); // Detuned chorus sheen

        g.gain.setValueAtTime(0.0001, nt);
        g.gain.exponentialRampToValueAtTime(0.12, nt + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, nt + 0.4);

        osc1.connect(g);
        osc2.connect(g);
        g.connect(ctx.destination);

        osc1.start(nt);
        osc2.start(nt);
        osc1.stop(nt + 0.42);
        osc2.stop(nt + 0.42);
      });
    },
  },
  {
    id: "bamboo-cascade",
    name: "Bamboo Windchimes",
    description: "Organic pentatonic bamboo chimes rustling peacefully in a garden breeze",
    tag: "Organic",
    play: (ctx, now) => {
      // Natural Japanese pentatonic scale (Insen/Hirajoshi inspired)
      const chimes = [587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];
      chimes.forEach((freq, idx) => {
        const jitter = (Math.random() - 0.5) * 0.03;
        const nt = now + idx * 0.065 + jitter;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();

        osc.type = idx % 2 === 0 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq, nt);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.99, nt + 0.2);

        g.gain.setValueAtTime(0.0001, nt);
        g.gain.exponentialRampToValueAtTime(0.14, nt + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, nt + 0.35);

        osc.connect(g);
        g.connect(ctx.destination);

        osc.start(nt);
        osc.stop(nt + 0.36);
      });
    },
  },
  {
    id: "crystal-cavern",
    name: "Crystal Cavern Shimmer",
    description: "Delicate glass droplet reverberations inside an ambient cavern",
    tag: "Ethereal",
    play: (ctx, now) => {
      // Droplet hits followed by crystalline shimmer echoes
      const drops = [
        { f: 1200, t: now },
        { f: 1600, t: now + 0.1 },
        { f: 2100, t: now + 0.22 },
        { f: 2800, t: now + 0.34 },
      ];

      drops.forEach(({ f, t }) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.exponentialRampToValueAtTime(f * 0.85, t + 0.06);

        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.15, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);

        osc.connect(g);
        g.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.4);
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

/* ═══════════════════════════════════════════════════════════════════════════
   3. DEDICATED FOCUS & POMODORO ALARM SOUNDSCAPES (8 Options)
   ═══════════════════════════════════════════════════════════════════════════ */

export interface FocusAlarmDef {
  id: string;
  name: string;
  description: string;
  tag: string;
  play: (ctx: AudioContext, now: number) => void;
}

export const FOCUS_ALARM_PROFILES: FocusAlarmDef[] = [
  {
    id: "temple-gong",
    name: "Tibetan Temple Gong & Om",
    description: "Deep 108Hz resonant bronze gong with shimmering sub-bass and 2.5s meditative decay",
    tag: "Zen",
    play: (ctx, now) => {
      // 1. Deep fundamental gong strike (108Hz + 216Hz + 324Hz)
      const partials = [
        { freq: 108, gain: 0.35, decay: 2.4 },
        { freq: 216, gain: 0.22, decay: 1.8 },
        { freq: 324, gain: 0.15, decay: 1.4 },
        { freq: 540, gain: 0.08, decay: 0.9 },
      ];

      partials.forEach(({ freq, gain, decay }) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.985, now + decay);

        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(gain, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + decay);

        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + decay + 0.05);
      });

      // 2. Shimmering high bronze strike overtone
      const highOsc = ctx.createOscillator();
      const highGain = ctx.createGain();
      highOsc.type = "triangle";
      highOsc.frequency.setValueAtTime(840, now);
      highGain.gain.setValueAtTime(0.0001, now);
      highGain.gain.exponentialRampToValueAtTime(0.12, now + 0.005);
      highGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      highOsc.connect(highGain);
      highGain.connect(ctx.destination);
      highOsc.start(now);
      highOsc.stop(now + 0.48);
    },
  },
  {
    id: "sanctuary-bells",
    name: "Forest Sanctuary Bells",
    description: "Triple-harmonic monastery bells in major harmony (528Hz, 660Hz, 792Hz)",
    tag: "Sacred",
    play: (ctx, now) => {
      const bells = [
        { freq: 528.0, delay: 0 },
        { freq: 660.0, delay: 0.12 },
        { freq: 792.0, delay: 0.26 },
        { freq: 1056.0, delay: 0.42 },
      ];

      bells.forEach(({ freq, delay }) => {
        const t = now + delay;
        const o1 = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        const g = ctx.createGain();

        o1.type = "sine";
        o2.type = "sine";
        o1.frequency.setValueAtTime(freq, t);
        o2.frequency.setValueAtTime(freq * 2.004, t); // Bell sparkle partial

        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.16, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);

        o1.connect(g);
        o2.connect(g);
        g.connect(ctx.destination);

        o1.start(t);
        o2.start(t);
        o1.stop(t + 0.95);
        o2.stop(t + 0.95);
      });
    },
  },
  {
    id: "celestial-harp",
    name: "Celestial Harp Arpeggio",
    description: "Lush 7-note ascending Celtic harp glissando with sparkling acoustic resonance",
    tag: "Ethereal",
    play: (ctx, now) => {
      const notes = [293.66, 369.99, 440.0, 554.37, 659.25, 880.0, 1108.73];
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.15, t + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.68);
      });
    },
  },
  {
    id: "westminster-chime",
    name: "Vintage Westminster Chime",
    description: "Classic 4-tone clock tower chime melody ringing in peaceful harmony",
    tag: "Classic",
    play: (ctx, now) => {
      // Westminster 4-note motif: G#4, F#4, E4, B3
      const notes = [
        { f: 415.3, delay: 0 },
        { f: 369.99, delay: 0.32 },
        { f: 329.63, delay: 0.64 },
        { f: 246.94, delay: 0.96 },
      ];

      notes.forEach(({ f, delay }) => {
        const t = now + delay;
        const o = ctx.createOscillator();
        const overtone = ctx.createOscillator();
        const g = ctx.createGain();

        o.type = "sine";
        overtone.type = "triangle";
        o.frequency.setValueAtTime(f, t);
        overtone.frequency.setValueAtTime(f * 2.76, t);

        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.18, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);

        o.connect(g);
        overtone.connect(g);
        g.connect(ctx.destination);

        o.start(t);
        overtone.start(t);
        o.stop(t + 0.88);
        overtone.stop(t + 0.88);
      });
    },
  },
  {
    id: "lofi-rhodes",
    name: "Lo-Fi Ambient Rhodes",
    description: "Warm vintage electric piano major 9th chord with nostalgic vinyl softness",
    tag: "Warm",
    play: (ctx, now) => {
      // F Major 9th Chord: F3, A3, C4, E4, G4
      const chord = [174.61, 220.0, 261.63, 329.63, 392.0];
      chord.forEach((freq, idx) => {
        const t = now + idx * 0.025; // Gentle strum spread
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.998, t + 1.2);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.11, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 1.25);
      });
    },
  },
  {
    id: "solfeggio-528",
    name: "528Hz Solfeggio Golden Tone",
    description: "Pure harmonic healing frequency (528Hz) with golden ratio octave aura",
    tag: "Healing",
    play: (ctx, now) => {
      [
        { f: 528.0, g: 0.22, d: 1.8 },
        { f: 1056.0, g: 0.12, d: 1.4 },
        { f: 1584.0, g: 0.06, d: 0.9 },
      ].forEach(({ f, g, d }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(g, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + d + 0.05);
      });
    },
  },
  {
    id: "shakuhachi-chime",
    name: "Zen Shakuhachi Breath",
    description: "Airy bamboo flute breath swell followed by resonant crystal dew-drops",
    tag: "Organic",
    play: (ctx, now) => {
      // 1. Airy breath swell
      const bufferSize = Math.floor(ctx.sampleRate * 0.7);
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.Q.setValueAtTime(6.0, now);
      f.frequency.setValueAtTime(440, now);
      f.frequency.exponentialRampToValueAtTime(880, now + 0.3);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.12, now + 0.2);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
      src.connect(f);
      f.connect(g);
      g.connect(ctx.destination);
      src.start(now);
      src.stop(now + 0.58);

      // 2. Flute melodic note + dew drop
      const tChime = now + 0.25;
      [587.33, 880.0, 1174.66].forEach((freq, idx) => {
        const nt = tChime + idx * 0.09;
        const o = ctx.createOscillator();
        const gn = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(freq, nt);
        gn.gain.setValueAtTime(0.0001, nt);
        gn.gain.exponentialRampToValueAtTime(0.14, nt + 0.01);
        gn.gain.exponentialRampToValueAtTime(0.0001, nt + 0.45);
        o.connect(gn);
        gn.connect(ctx.destination);
        o.start(nt);
        o.stop(nt + 0.48);
      });
    },
  },
  {
    id: "sunrise-marimba",
    name: "Sunrise Acoustic Marimba",
    description: "Warm, uplifting 4-note acoustic wooden marimba motif (C5, E5, G5, C6)",
    tag: "Joyful",
    play: (ctx, now) => {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const t = now + idx * 0.08;
        const o1 = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        const g = ctx.createGain();

        o1.type = "triangle";
        o2.type = "sine";
        o1.frequency.setValueAtTime(freq, t);
        o2.frequency.setValueAtTime(freq * 3, t); // Marimba harmonic

        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.18, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

        o1.connect(g);
        o2.connect(g);
        g.connect(ctx.destination);

        o1.start(t);
        o2.start(t);
        o1.stop(t + 0.38);
        o2.stop(t + 0.38);
      });
    },
  },
];

/**
 * Plays the chosen focus completion alarm soundscape.
 */
export function playFocusAlarmSound(alarmId?: string) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const targetId = alarmId || "temple-gong";
    const profile = FOCUS_ALARM_PROFILES.find((p) => p.id === targetId) || FOCUS_ALARM_PROFILES[0];
    profile.play(ctx, ctx.currentTime);
  } catch (err) {
    console.debug("Focus alarm audio playback ignored:", err);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. PROCEDURAL AMBIENT BACKGROUND SOUND GENERATOR (Offline Web Audio)
   ═══════════════════════════════════════════════════════════════════════════ */

export type AmbientSoundType = "none" | "rain" | "fire" | "forest" | "brown-noise";

class AmbientSoundEngine {
  private currentType: AmbientSoundType = "none";
  private isPlaying = false;
  private volume = 0.35;
  private gainNode: GainNode | null = null;
  private sourceNodes: (AudioNode | number)[] = [];

  public start(type: AmbientSoundType, volume = 0.35) {
    this.stop();
    if (type === "none") return;

    const ctx = getAudioContext();
    if (!ctx) return;

    this.currentType = type;
    this.volume = volume;
    this.isPlaying = true;

    this.gainNode = ctx.createGain();
    this.gainNode.gain.setValueAtTime(volume * 0.35, ctx.currentTime);
    this.gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === "brown-noise") {
      // 5-second seamless Brownian noise buffer loop
      const bufferSize = ctx.sampleRate * 5;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // Gain compensation
      }
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      src.loop = true;
      src.connect(this.gainNode);
      src.start(now);
      this.sourceNodes.push(src);
    } else if (type === "rain") {
      // Rain: filtered pink noise with dynamic lowpass modulation
      const bufferSize = ctx.sampleRate * 4;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.15;
      }
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1400, now);

      src.connect(filter);
      filter.connect(this.gainNode);
      src.start(now);
      this.sourceNodes.push(src);
    } else if (type === "fire") {
      // Fire: warm low-frequency rumble + random crackle generator
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(55, now);
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.12, now);
      osc.connect(oscGain);
      oscGain.connect(this.gainNode);
      osc.start(now);
      this.sourceNodes.push(osc);

      // Periodic gentle ember pops
      const intervalId = window.setInterval(() => {
        if (!this.isPlaying || !this.gainNode) return;
        const actx = getAudioContext();
        if (!actx) return;
        const t = actx.currentTime;
        const pop = actx.createOscillator();
        const pGain = actx.createGain();
        pop.type = "sine";
        pop.frequency.setValueAtTime(1200 + Math.random() * 800, t);
        pGain.gain.setValueAtTime(0.0001, t);
        pGain.gain.exponentialRampToValueAtTime(0.06 + Math.random() * 0.05, t + 0.003);
        pGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
        pop.connect(pGain);
        pGain.connect(this.gainNode);
        pop.start(t);
        pop.stop(t + 0.04);
      }, 350);
      this.sourceNodes.push(intervalId as unknown as AudioNode);
    } else if (type === "forest") {
      // Forest Breeze: two detuned wind oscillators with gentle resonant filtering
      const bufferSize = ctx.sampleRate * 4;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.setValueAtTime(1.8, now);
      filter.frequency.setValueAtTime(520, now);

      src.connect(filter);
      filter.connect(this.gainNode);
      src.start(now);
      this.sourceNodes.push(src);
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    const ctx = getAudioContext();
    if (ctx && this.gainNode) {
      this.gainNode.gain.setValueAtTime(this.volume * 0.35, ctx.currentTime);
    }
  }

  public stop() {
    this.isPlaying = false;
    this.currentType = "none";
    this.sourceNodes.forEach((node) => {
      if (typeof node === "number") {
        clearInterval(node);
      } else if ("stop" in node && typeof node.stop === "function") {
        try {
          node.stop();
        } catch {
          // Ignored
        }
      }
    });
    this.sourceNodes = [];
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
  }

  public getCurrentType(): AmbientSoundType {
    return this.currentType;
  }
}

export const ambientSound = new AmbientSoundEngine();

/* ═══════════════════════════════════════════════════════════════════════════
   5. MULTI-TRACK AMBIENT SOUNDSCAPE STUDIO (Concurrent procedural layers)
   ═══════════════════════════════════════════════════════════════════════════ */

export type SoundscapeTrackId =
  | "rain"
  | "binaural-gamma"
  | "brown-noise"
  | "surf"
  | "fire"
  | "forest";

export interface SoundscapeTrackMeta {
  id: SoundscapeTrackId;
  name: string;
  tag: string;
  defaultVolume: number;
}

export const SOUNDSCAPE_TRACKS: SoundscapeTrackMeta[] = [
  { id: "rain", name: "Rain & Drizzle", tag: "Water", defaultVolume: 0.5 },
  { id: "binaural-gamma", name: "40Hz Gamma Beat", tag: "Focus", defaultVolume: 0.35 },
  { id: "brown-noise", name: "Deep Brown Noise", tag: "Masking", defaultVolume: 0.4 },
  { id: "surf", name: "Ocean Waves", tag: "Rhythm", defaultVolume: 0.45 },
  { id: "fire", name: "Campfire Embers", tag: "Warmth", defaultVolume: 0.3 },
  { id: "forest", name: "Forest Breeze", tag: "Nature", defaultVolume: 0.35 },
];

interface ActiveTrackRecord {
  id: SoundscapeTrackId;
  gainNode: GainNode;
  sourceNodes: (AudioNode | number)[];
  volume: number;
}

export class MultiTrackSoundStudio {
  private activeTracks: Map<SoundscapeTrackId, ActiveTrackRecord> = new Map();
  private masterVolume = 0.5;
  private masterGain: GainNode | null = null;
  private trackVolumes: Record<SoundscapeTrackId, number> = {
    rain: 0.5,
    "binaural-gamma": 0.35,
    "brown-noise": 0.4,
    surf: 0.45,
    fire: 0.3,
    forest: 0.35,
  };

  constructor() {
    if (typeof window !== "undefined") {
      const savedMaster = localStorage.getItem("laya-soundscape-master-vol");
      if (savedMaster !== null) {
        const val = parseFloat(savedMaster);
        if (!isNaN(val)) this.masterVolume = Math.max(0, Math.min(1, val));
      }
      const savedVols = localStorage.getItem("laya-soundscape-track-vols");
      if (savedVols) {
        try {
          this.trackVolumes = { ...this.trackVolumes, ...JSON.parse(savedVols) };
        } catch {
          // fallback
        }
      }
    }
  }

  private getOrCreateMasterGain(ctx: AudioContext): GainNode {
    if (!this.masterGain) {
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, ctx.currentTime);
      this.masterGain.connect(ctx.destination);
    }
    return this.masterGain;
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (typeof window !== "undefined") {
      localStorage.setItem("laya-soundscape-master-vol", String(this.masterVolume));
    }
    const ctx = getAudioContext();
    if (ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, ctx.currentTime);
    }
  }

  public getTrackVolume(trackId: SoundscapeTrackId): number {
    return this.trackVolumes[trackId] ?? 0.4;
  }

  public setTrackVolume(trackId: SoundscapeTrackId, vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.trackVolumes[trackId] = clamped;
    if (typeof window !== "undefined") {
      localStorage.setItem("laya-soundscape-track-vols", JSON.stringify(this.trackVolumes));
    }
    const active = this.activeTracks.get(trackId);
    if (active) {
      active.volume = clamped;
      const ctx = getAudioContext();
      if (ctx) {
        active.gainNode.gain.setValueAtTime(clamped * 0.4, ctx.currentTime);
      }
    }
  }

  public isTrackActive(trackId: SoundscapeTrackId): boolean {
    return this.activeTracks.has(trackId);
  }

  public getActiveTracks(): SoundscapeTrackId[] {
    return Array.from(this.activeTracks.keys());
  }

  public isAnyPlaying(): boolean {
    return this.activeTracks.size > 0;
  }

  public startTrack(trackId: SoundscapeTrackId): void {
    if (this.activeTracks.has(trackId)) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const master = this.getOrCreateMasterGain(ctx);
    const trackGain = ctx.createGain();
    const vol = this.getTrackVolume(trackId);
    trackGain.gain.setValueAtTime(vol * 0.4, ctx.currentTime);
    trackGain.connect(master);

    const nodes: (AudioNode | number)[] = [];
    const now = ctx.currentTime;

    switch (trackId) {
      case "rain": {
        const bufferSize = ctx.sampleRate * 4;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.15;
        }
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        src.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1400, now);

        src.connect(filter);
        filter.connect(trackGain);
        src.start(now);
        nodes.push(src);
        break;
      }

      case "binaural-gamma": {
        // 40Hz Gamma perceptual binaural beat: Left = 200 Hz, Right = 240 Hz
        const merger = ctx.createChannelMerger(2);

        const oscL = ctx.createOscillator();
        oscL.type = "sine";
        oscL.frequency.setValueAtTime(200, now);
        oscL.connect(merger, 0, 0);

        const oscR = ctx.createOscillator();
        oscR.type = "sine";
        oscR.frequency.setValueAtTime(240, now);
        oscR.connect(merger, 0, 1);

        merger.connect(trackGain);
        oscL.start(now);
        oscR.start(now);
        nodes.push(oscL, oscR);
        break;
      }

      case "brown-noise": {
        const bufferSize = ctx.sampleRate * 5;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5;
        }
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        src.loop = true;
        src.connect(trackGain);
        src.start(now);
        nodes.push(src);
        break;
      }

      case "surf": {
        const bufferSize = ctx.sampleRate * 5;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.997 * b0 + white * 0.06;
          b1 = 0.985 * b1 + white * 0.12;
          data[i] = (b0 + b1) * 0.5;
        }
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        src.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(800, now);

        const swellGain = ctx.createGain();
        swellGain.gain.setValueAtTime(0.3, now);

        const lfo = ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.setValueAtTime(0.1, now);

        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(0.25, now);
        lfo.connect(lfoGain);
        lfoGain.connect(swellGain.gain);

        src.connect(filter);
        filter.connect(swellGain);
        swellGain.connect(trackGain);

        src.start(now);
        lfo.start(now);
        nodes.push(src, lfo);
        break;
      }

      case "fire": {
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(55, now);
        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.12, now);
        osc.connect(oscGain);
        oscGain.connect(trackGain);
        osc.start(now);
        nodes.push(osc);

        const intervalId = window.setInterval(() => {
          if (!this.activeTracks.has(trackId)) return;
          const actx = getAudioContext();
          if (!actx) return;
          const t = actx.currentTime;
          const pop = actx.createOscillator();
          const pGain = actx.createGain();
          pop.type = "sine";
          pop.frequency.setValueAtTime(1200 + Math.random() * 800, t);
          pGain.gain.setValueAtTime(0.0001, t);
          pGain.gain.exponentialRampToValueAtTime(0.06 + Math.random() * 0.05, t + 0.003);
          pGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
          pop.connect(pGain);
          pGain.connect(trackGain);
          pop.start(t);
          pop.stop(t + 0.04);
        }, 320);
        nodes.push(intervalId as unknown as AudioNode);
        break;
      }

      case "forest": {
        const bufferSize = ctx.sampleRate * 4;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        src.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.setValueAtTime(1.8, now);
        filter.frequency.setValueAtTime(520, now);

        src.connect(filter);
        filter.connect(trackGain);
        src.start(now);
        nodes.push(src);
        break;
      }
    }

    this.activeTracks.set(trackId, {
      id: trackId,
      gainNode: trackGain,
      sourceNodes: nodes,
      volume: vol,
    });
  }

  public stopTrack(trackId: SoundscapeTrackId): void {
    const active = this.activeTracks.get(trackId);
    if (!active) return;
    active.sourceNodes.forEach((node) => {
      if (typeof node === "number") {
        clearInterval(node);
      } else if ("stop" in node && typeof (node as AudioScheduledSourceNode).stop === "function") {
        try {
          (node as AudioScheduledSourceNode).stop();
        } catch {
          // Ignored
        }
      }
    });
    try {
      active.gainNode.disconnect();
    } catch {
      // Ignored
    }
    this.activeTracks.delete(trackId);
  }

  public toggleTrack(trackId: SoundscapeTrackId): boolean {
    if (this.activeTracks.has(trackId)) {
      this.stopTrack(trackId);
      return false;
    } else {
      this.startTrack(trackId);
      return true;
    }
  }

  public stopAll(): void {
    const trackIds = Array.from(this.activeTracks.keys());
    trackIds.forEach((id) => this.stopTrack(id));
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // Ignored
      }
      this.masterGain = null;
    }
  }

  public applyMix(mixId: string): void {
    const mix = SOUNDSCAPE_MIXES.find((m) => m.id === mixId);
    if (!mix) return;
    this.stopAll();
    mix.tracks.forEach((t) => {
      if (t.volume !== undefined) {
        this.setTrackVolume(t.trackId, t.volume);
      }
      this.startTrack(t.trackId);
    });
  }
}

export interface SoundscapeMix {
  id: string;
  name: string;
  description: string;
  tracks: { trackId: SoundscapeTrackId; volume?: number }[];
}

export const SOUNDSCAPE_MIXES: SoundscapeMix[] = [
  {
    id: "deep-flow",
    name: "Deep Flow",
    description: "40Hz Gamma beat layered with deep brown noise for sustained focus",
    tracks: [
      { trackId: "binaural-gamma", volume: 0.4 },
      { trackId: "brown-noise", volume: 0.35 },
    ],
  },
  {
    id: "rainy-cabin",
    name: "Rainy Cabin",
    description: "Gentle window raindrops crackling with warm fireplace embers",
    tracks: [
      { trackId: "rain", volume: 0.5 },
      { trackId: "fire", volume: 0.3 },
    ],
  },
  {
    id: "coastal-woods",
    name: "Coastal Breeze",
    description: "Rhythmic rolling ocean surf blended with fresh forest breeze",
    tracks: [
      { trackId: "surf", volume: 0.45 },
      { trackId: "forest", volume: 0.35 },
    ],
  },
];

export const soundscapeStudio = new MultiTrackSoundStudio();

/**
 * Dispatches a lightweight native/browser notification on timer completion.
 */
export function sendFocusNotification(title: string, body: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, { body, silent: true });
    } catch {
      // Ignore background or sandbox issues
    }
  } else if (Notification.permission !== "denied") {
    void Notification.requestPermission().then((perm) => {
      if (perm === "granted") {
        try {
          new Notification(title, { body, silent: true });
        } catch {
          // Ignore
        }
      }
    });
  }
}


