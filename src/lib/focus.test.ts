import { describe, it, expect } from "vitest";
import { getTodayDateKey, TIMER_PRESETS } from "./focusContext";
import { SOUNDSCAPE_MIXES, soundscapeStudio } from "./sound";

describe("Focus Engine & Soundscapes", () => {
  it("generates correct ISO date key format YYYY-MM-DD", () => {
    const key = getTodayDateKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const today = new Date();
    const expectedMonth = String(today.getMonth() + 1).padStart(2, "0");
    expect(key).toContain(`-${expectedMonth}-`);
  });

  it("verifies standard Pomodoro and Deep Work presets", () => {
    expect(TIMER_PRESETS.pomodoro.minutes).toBe(25);
    expect(TIMER_PRESETS.deepFocus.minutes).toBe(50);
    expect(TIMER_PRESETS.shortBreak.minutes).toBe(5);
    expect(TIMER_PRESETS.longBreak.minutes).toBe(15);
  });

  it("provides curated soundscape mixes with valid track assignments", () => {
    expect(SOUNDSCAPE_MIXES.length).toBeGreaterThanOrEqual(3);
    const deepFlow = SOUNDSCAPE_MIXES.find((m) => m.id === "deep-flow");
    expect(deepFlow).toBeDefined();
    expect(deepFlow?.tracks.some((t) => t.trackId === "binaural-gamma")).toBe(true);
    expect(deepFlow?.tracks.some((t) => t.trackId === "brown-noise")).toBe(true);

    const rainyCabin = SOUNDSCAPE_MIXES.find((m) => m.id === "rainy-cabin");
    expect(rainyCabin).toBeDefined();
    expect(rainyCabin?.tracks.some((t) => t.trackId === "rain")).toBe(true);
    expect(rainyCabin?.tracks.some((t) => t.trackId === "fire")).toBe(true);

    const coastal = SOUNDSCAPE_MIXES.find((m) => m.id === "coastal-woods");
    expect(coastal).toBeDefined();
    expect(coastal?.tracks.some((t) => t.trackId === "surf")).toBe(true);
    expect(coastal?.tracks.some((t) => t.trackId === "forest")).toBe(true);
  });

  it("handles soundscape mix application gracefully", () => {
    soundscapeStudio.applyMix("deep-flow");
    expect(soundscapeStudio.getTrackVolume("binaural-gamma")).toBe(0.4);
    expect(soundscapeStudio.getTrackVolume("brown-noise")).toBe(0.35);
    soundscapeStudio.stopAll();
    expect(soundscapeStudio.getActiveTracks().length).toBe(0);
  });
});
