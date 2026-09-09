import { invoke } from "@tauri-apps/api/core";

/**
 * Desktop Window Manager
 * 
 * Interacts with Tauri native desktop window APIs for true OS fullscreen
 * and window pinning (always-on-top), with automatic web/browser fallbacks.
 */

export async function setAlwaysOnTop(alwaysOnTop: boolean): Promise<void> {
  try {
    await invoke("set_window_always_on_top", { alwaysOnTop });
  } catch {
    // Graceful fallback for web/testing preview
  }
}

export async function setNativeFullscreen(fullscreen: boolean): Promise<void> {
  try {
    await invoke("set_window_fullscreen", { fullscreen });
  } catch {
    // Web fallback using standard HTML5 Fullscreen API
    if (typeof document !== "undefined") {
      try {
        if (fullscreen) {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen().catch(() => {});
          }
        } else {
          if (document.fullscreenElement) {
            await document.exitFullscreen().catch(() => {});
          }
        }
      } catch {
        // Ignore iframe/security restriction in testing
      }
    }
  }
}

export async function isNativeFullscreen(): Promise<boolean> {
  try {
    return await invoke<boolean>("is_window_fullscreen");
  } catch {
    if (typeof document !== "undefined") {
      return !!document.fullscreenElement;
    }
    return false;
  }
}
