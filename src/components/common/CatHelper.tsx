/**
 * CatHelper - Animated SVG cat character with broom for the tidy-up sequence.
 *
 * Replaces the static Lucide Cat icon with a hand-crafted multi-part SVG:
 * - Geometric cat silhouette (body, ears, tail, whiskers, eyes)
 * - Small broom held in paw
 * - Circular progress arc that fills during sweeping
 * - Orbiting sparkle particles during victory phase
 *
 * Uses currentColor and CSS custom properties to adapt to all themes.
 */

import { cn } from "../../lib/utils";

interface CatHelperProps {
  sweeping: boolean;
  className?: string;
}

export const CatHelper = ({ sweeping, className }: CatHelperProps) => {
  return (
    <div
      className={cn(
        "relative mx-auto w-36 h-32 flex items-center justify-center",
        className
      )}
    >
      {/* Soft floor shadow */}
      <div
        className={cn(
          "absolute bottom-1 inset-x-6 h-5 rounded-full bg-primary/8 transition-all duration-700 blur-sm",
          sweeping && "bg-primary/20 scale-x-125"
        )}
      />

      {/* Circular progress arc (draws during sweep) */}
      <svg
        className={cn(
          "absolute inset-0 w-full h-full -rotate-90 opacity-0 transition-opacity duration-300",
          sweeping && "opacity-100"
        )}
        viewBox="0 0 120 120"
        fill="none"
      >
        {/* Track */}
        <circle
          cx="60"
          cy="60"
          r="52"
          stroke="currentColor"
          strokeWidth="2"
          className="text-border opacity-40"
        />
        {/* Progress fill */}
        <circle
          cx="60"
          cy="60"
          r="52"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className={cn(
            "text-primary",
            sweeping && "animate-progress-arc"
          )}
          strokeDasharray="327"
          strokeDashoffset="327"
        />
      </svg>

      {/* Orbiting sparkle particles */}
      {sweeping && (
        <div className="absolute inset-0 pointer-events-none">
          {[0, 60, 120, 180, 240, 300].map((deg, i) => (
            <span
              key={deg}
              className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full animate-sparkle-orbit"
              style={{
                backgroundColor: [
                  "var(--color-primary)",
                  "oklch(0.8 0.15 80)",
                  "oklch(0.75 0.15 340)",
                  "var(--color-primary)",
                  "oklch(0.75 0.15 160)",
                  "oklch(0.8 0.12 60)",
                ][i],
                animationDelay: `${i * 0.08}s`,
                opacity: 0,
                transform: `rotate(${deg}deg) translateY(-8px)`,
              }}
            />
          ))}
        </div>
      )}

      {/* Cat + Broom SVG */}
      <div
        className={cn(
          "relative z-10 transition-transform duration-300",
          sweeping ? "animate-cat-sweep" : "animate-cat-idle"
        )}
      >
        <svg
          width="72"
          height="80"
          viewBox="0 0 72 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-sm"
        >
          {/* Tail */}
          <path
            d="M54 58 C60 52, 66 44, 62 36 C58 28, 52 32, 54 38"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className={cn(
              "text-primary transition-all duration-700",
              sweeping && "animate-tail-sway"
            )}
            fill="none"
          />

          {/* Body */}
          <ellipse
            cx="36"
            cy="58"
            rx="16"
            ry="14"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary"
            fill="none"
          />

          {/* Head */}
          <circle
            cx="36"
            cy="34"
            r="14"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary"
            fill="none"
          />

          {/* Left ear */}
          <path
            d="M24 24 L20 10 L30 20"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            className="text-primary"
            fill="none"
          />

          {/* Right ear */}
          <path
            d="M48 24 L52 10 L42 20"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            className="text-primary"
            fill="none"
          />

          {/* Inner ear detail - left */}
          <path
            d="M24 22 L22 14 L28 20"
            stroke="currentColor"
            strokeWidth="1"
            className="text-primary/40"
            fill="none"
          />

          {/* Inner ear detail - right */}
          <path
            d="M48 22 L50 14 L44 20"
            stroke="currentColor"
            strokeWidth="1"
            className="text-primary/40"
            fill="none"
          />

          {/* Eyes */}
          <circle cx="30" cy="32" r="2" className="fill-primary" />
          <circle cx="42" cy="32" r="2" className="fill-primary" />

          {/* Eye glints */}
          <circle cx="31" cy="31" r="0.7" className="fill-background" />
          <circle cx="43" cy="31" r="0.7" className="fill-background" />

          {/* Nose */}
          <path
            d="M35 37 L36 38.5 L37 37"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
            className="text-primary"
            fill="none"
          />

          {/* Whiskers - left */}
          <line x1="28" y1="36" x2="16" y2="34" stroke="currentColor" strokeWidth="1" className="text-primary/50" />
          <line x1="28" y1="38" x2="16" y2="38" stroke="currentColor" strokeWidth="1" className="text-primary/50" />

          {/* Whiskers - right */}
          <line x1="44" y1="36" x2="56" y2="34" stroke="currentColor" strokeWidth="1" className="text-primary/50" />
          <line x1="44" y1="38" x2="56" y2="38" stroke="currentColor" strokeWidth="1" className="text-primary/50" />

          {/* Front paws */}
          <ellipse cx="28" cy="70" rx="4" ry="3" stroke="currentColor" strokeWidth="1.5" className="text-primary" fill="none" />
          <ellipse cx="44" cy="70" rx="4" ry="3" stroke="currentColor" strokeWidth="1.5" className="text-primary" fill="none" />

          {/* Broom handle */}
          <line
            x1="14"
            y1="48"
            x2="14"
            y2="76"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-primary/70"
          />

          {/* Broom head - bristles */}
          <path
            d="M8 72 Q10 78, 14 80 Q18 78, 20 72"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-primary/60"
            fill="none"
          />
          <line x1="10" y1="73" x2="11" y2="78" stroke="currentColor" strokeWidth="1" className="text-primary/40" />
          <line x1="14" y1="72" x2="14" y2="79" stroke="currentColor" strokeWidth="1" className="text-primary/40" />
          <line x1="18" y1="73" x2="17" y2="78" stroke="currentColor" strokeWidth="1" className="text-primary/40" />

          {/* Broom binding */}
          <rect x="11" y="71" width="6" height="2.5" rx="0.5" stroke="currentColor" strokeWidth="1" className="text-primary/50" fill="none" />

          {/* Paw holding broom */}
          <circle cx="14" cy="50" r="3.5" stroke="currentColor" strokeWidth="1.5" className="text-primary" fill="none" />
        </svg>
      </div>

      {/* Victory burst sparkles (appear at ~1000ms into animation) */}
      {sweeping && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center animate-victory-burst">
          <span className="absolute -top-2 left-1/4 w-1 h-1 rounded-full bg-amber-400" />
          <span className="absolute -top-1 right-1/4 w-1.5 h-1.5 rounded-full bg-pink-400" />
          <span className="absolute top-1/4 -left-1 w-1 h-1 rounded-full bg-emerald-400" />
          <span className="absolute top-1/4 -right-1 w-1.5 h-1.5 rounded-full bg-amber-300" />
          <span className="absolute -bottom-1 left-1/3 w-1 h-1 rounded-full bg-primary" />
          <span className="absolute -bottom-2 right-1/3 w-1 h-1 rounded-full bg-pink-300" />
        </div>
      )}
    </div>
  );
};
