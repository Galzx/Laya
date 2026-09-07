import { describe, it, expect } from "vitest";
import {
  SOUND_PROFILES,
  TIDY_SOUND_PROFILES,
  setSoundEnabled,
  isSoundEnabled,
  getSoundProfile,
  setSoundProfile,
  getTidySoundProfile,
  setTidySoundProfile,
} from "./sound";

describe("Web Audio Feedback Profiles", () => {
  it("defines exactly 8 distinct task pop profiles", () => {
    expect(SOUND_PROFILES).toHaveLength(8);
    const ids = new Set(SOUND_PROFILES.map((p) => p.id));
    expect(ids.size).toBe(8);
  });

  it("each pop profile has valid name, category, and play callback", () => {
    SOUND_PROFILES.forEach((p) => {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.category).toBeTruthy();
      expect(typeof p.play).toBe("function");
    });
  });

  it("defines curated cat tidy sweep sound profiles", () => {
    expect(TIDY_SOUND_PROFILES.length).toBeGreaterThanOrEqual(5);
    TIDY_SOUND_PROFILES.forEach((p) => {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.tag).toBeTruthy();
      expect(typeof p.play).toBe("function");
    });
  });

  it("manages sound settings state correctly", () => {
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);

    setSoundProfile("bubble-pop");
    expect(getSoundProfile()).toBe("bubble-pop");

    setTidySoundProfile("magic-wand");
    expect(getTidySoundProfile()).toBe("magic-wand");
  });
});

