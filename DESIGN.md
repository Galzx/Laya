# Design System: Laya Workspace

## Design Philosophy & Mode
- **Surface Mode**: `Operate` (Desktop Workspace / Productivity)
- **Aesthetic Direction**: Calm, tactile, ergonomic, and cozy. Clean typography with subtle warm paper/linen undertones in light mode, and deep slate/mist tones in dark mode.
- **Craft Floor**: Impeccable standard. Zero nested cards, zero un-tinted pure blacks/grays, zero emojis, zero rubberband bouncing, and 100% themed browser surfaces (caret, selection, scrollbars).

## Color & Theming Architecture

### Theme Palettes
1. **Light & Warm**:
   - `linen` (Warm Linen, default light): Creamy parchment background with warm espresso foreground.
   - `matcha` (Matcha Sage): Calming herbal tea tones with deep forest green accents.
   - `sakura` (Sakura Blossom): Soft blossom petal background with plum-rose accents.
   - `latte` (Warm Latte): Cozy café tones with roasted caramel accents.
2. **Dark & Ambient**:
   - `nordic` (Nordic Mist): Cool Scandinavian twilight with icy blue accents.
   - `midnight` (Midnight Slate, default dark): Deep midnight slate with soft emerald accents.
   - `pine` (Pine Forest): Deep nocturnal evergreen with vibrant mint accents.
   - `hearth` (Cozy Hearth): Warm charcoal with glowing amber fireplace accents.

### Custom Accent Tint Highlights
- 8 selectable accent colors: Amber, Emerald, Indigo, Rose, Violet, Cyan, Coral, Leaf.

## Typography
- **Font Stack**: System sans-serif stack (`system-ui, -apple-system, Segoe UI, Roboto, sans-serif`) with optimal readability and zero layout shifts.
- **Monospace Stack**: JetBrains Mono, Fira Code, Consolas for dates, counters, and metrics.
- **Tracking**: `-0.02em` to `-0.03em` for headings.
- **Scale**:
  - Display/Greeting: `text-2xl font-semibold tracking-tight`
  - Section Titles: `text-xl font-semibold tracking-tight`
  - Card Headings: `text-sm font-semibold`
  - Body Text: `text-xs font-medium` or `text-sm text-foreground`
  - Helper & Secondary: `text-[11px] text-muted-foreground`
  - Badges & Chips: `text-[10px] font-semibold uppercase tracking-wider`

## Motion & Micro-Interactions
- **Deceleration Curve**: `cubic-bezier(0.16, 1, 0.3, 1)` (`ease-smooth` / `ease-out`)
- **Interactive Feedback**:
  - Active button scale: `active:scale-[0.98]`
  - Card hover elevation: `hover:-translate-y-0.5 hover:shadow-card-hover`
  - Smooth collapsible drawers: CSS Grid `grid-template-rows: 1fr` $\rightarrow$ `0fr`
  - Dialog entrance: `animate-dialog-in` with full-window portal backdrop blur (`bg-black/50 backdrop-blur-sm`)

## Audio Feedback Architecture (Offline Web Audio API)
- **Task Pop Profiles (8)**: Wooden Pop, Bubble Pop, Bamboo Knock, Water Droplet, Crystal Bell, Tactile Switch, Acoustic Pluck, Magic Twinkle.
- **Cat Tidy-Up SFX Styles (5)**: Cozy Broom Swish, Magic Wand Sparkle, Gentle Leaf Breeze, Ocean Ripple, Bubble Cascade.

