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

  describe("Multi-Track Sound Studio", () => {
    it("defines 6 distinct procedural soundscape tracks", async () => {
      const { SOUNDSCAPE_TRACKS } = await import("./sound");
      expect(SOUNDSCAPE_TRACKS).toHaveLength(6);
      const ids = SOUNDSCAPE_TRACKS.map((t) => t.id);
      expect(ids).toContain("rain");
      expect(ids).toContain("binaural-gamma");
      expect(ids).toContain("brown-noise");
      expect(ids).toContain("surf");
      expect(ids).toContain("fire");
      expect(ids).toContain("forest");
    });

    it("manages master and track volumes correctly", async () => {
      const { soundscapeStudio } = await import("./sound");
      soundscapeStudio.setMasterVolume(0.75);
      expect(soundscapeStudio.getMasterVolume()).toBe(0.75);

      soundscapeStudio.setTrackVolume("rain", 0.8);
      expect(soundscapeStudio.getTrackVolume("rain")).toBe(0.8);
    });
  });
});

