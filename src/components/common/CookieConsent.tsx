import React, { useState, useEffect } from "react";
import { ShieldCheck, Check } from "lucide-react";

interface CookieConsentProps {
  onOpenPrivacy?: () => void;
}

export const CookieConsent: React.FC<CookieConsentProps> = ({ onOpenPrivacy }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const acknowledged = localStorage.getItem("laya-privacy-acknowledged");
      if (!acknowledged) {
        // Show after brief initial delay for smooth loading
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore localStorage restrictions
    }
  }, []);

  const handleAcknowledge = () => {
    try {
      localStorage.setItem("laya-privacy-acknowledged", "true");
    } catch {
      // Ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Privacy and Local-First Data Policy"
      className="fixed bottom-5 inset-x-4 sm:inset-x-auto sm:left-6 sm:max-w-md z-40 p-4 rounded-2xl bg-card/95 border border-border shadow-dialog backdrop-blur-md animate-dialog-in text-xs text-foreground space-y-3 no-print"
    >
      <div className="flex items-start gap-2.5">
        <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0 mt-0.5">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div className="space-y-1">
          <h2 className="font-semibold text-foreground text-xs">
            Zero-Tracking & Sovereign Storage
          </h2>
          <p className="text-muted-foreground leading-relaxed text-[11px]">
            Laya does not use tracking cookies, analytics pixels, or remote telemetry. 100% of your tasks, notes, and settings live locally in SQLite on your device.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border/50">
        {onOpenPrivacy ? (
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="text-[11px] text-muted-foreground hover:text-primary transition-colors cursor-pointer underline underline-offset-2"
          >
            Review Privacy Details
          </button>
        ) : (
          <span className="text-[11px] text-muted-foreground font-mono">
            Local SQLite Active
          </span>
        )}

        <button
          type="button"
          onClick={handleAcknowledge}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-medium hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
        >
          <Check className="h-3 w-3" />
          <span>Acknowledge</span>
        </button>
      </div>
    </aside>
  );
};
