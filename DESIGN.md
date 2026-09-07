# Design System: Laya Workspace

## Design Philosophy & Mode
- **Surface Mode**: `Operate` (Desktop Workspace / Productivity)
- **Aesthetic Direction**: Calm, tactile, ergonomic, and cozy. Clean typography with subtle warm paper/linen undertones in light mode, and deep slate/mist tones in dark mode.
- **Craft Floor**: Impeccable standard. Zero nested cards, zero un-tinted pure blacks/grays, zero emojis, zero rubberband bouncing, and 100% themed browser surfaces (caret, selection, scrollbars).

## Color & Theming Architecture

### Built-in Theme Presets
1. **Light & Warm**:
   - `linen` (Warm Linen, default light): Soft oatmeal cream with warm rosewood accents (`349 28% 52%`).
   - `matcha` (Matcha Sage): Herbal sage tones with soothing forest green accents (`138 28% 40%`).
   - `sakura` (Sakura Blossom): Delicate blush pink with blooming petal accents (`341 50% 56%`).
   - `latte` (Warm Latte): Creamy cappuccino background with rich caramel amber (`28 55% 46%`).
   - `nordic` (Nordic Mist): Cool glacial slate with tranquil fjord blue accents (`205 48% 45%`).
2. **Dark & Ambient**:
   - `midnight` (Midnight Slate, default dark): Deep charcoal darkness with soft violet luminous glow (`258 70% 66%`).
   - `pine` (Pine Forest): Moody evergreen woods with crisp mint highlights (`156 60% 48%`).
   - `amber-night` (Cozy Hearth): Warm fireplace dark palette with golden candle glow (`38 90% 50%`).

### Theme Studio & Custom Theme Engine
- Mathematical HSL token generator from custom Base Atmosphere Canvas & Primary Accent Glow.
- Card & Container Styles: `clean` (pure surface), `tinted` (chroma-matched), `contrast` (high contrast).
- Navigation Sidebar Depth: `matching` (seamless), `contrast` (subtle separation), `deep` (deep tone).
- Local storage library persistence with instant live preview.

### Custom Accent Tint Highlights (12 Pre-Configured)
- `berry`: Warm Berry (`#a7636e`)
- `emerald`: Forest Emerald (`#4a8258`)
- `ocean`: Nordic Blue (`#3c7fa8`)
- `amber`: Golden Honey (`#b56835`)
- `violet`: Lavender Violet (`#8b5cf6`)
- `rose`: Sakura Rose (`#cb537a`)
- `mint`: Crisp Mint (`#31c48d`)
- `gold`: Warm Amber (`#f59e0b`)
- `cyan`: Arctic Cyan (`#06b6d4`)
- `coral`: Sunset Coral (`#f97316`)
- `ruby`: Crimson Ruby (`#e11d48`)
- `lime`: Neon Lime (`#84cc16`)

## Typography
- **Primary Stack**: `Geist`, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif.
- **Monospace Stack**: `Geist Mono`, monospace for dates, counters, timers, and metrics.
- **Font Feature Settings**: `'cv02', 'cv03', 'cv04', 'cv11'`.
- **Tracking**: `-0.02em` to `-0.03em` for headings.
- **Scale**:
  - Display/Greeting: `text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground`
  - Section Titles: `text-xl font-bold tracking-tight text-foreground`
  - Card Headings: `text-sm font-semibold text-foreground`
  - Body Text: `text-xs font-medium` or `text-sm text-foreground`
  - Helper & Secondary: `text-[11px] text-muted-foreground`
  - Badges & Chips: `text-[10px] font-mono font-semibold`

## Border Radius Hierarchy
| Token | Pixel Value | Intended Usage |
|:---|:---|:---|
| `rounded-3xl` | 24px | Hero banners, Focus timer hero card, Theme Studio full modal |
| `rounded-2xl` | 16px | View-level cards, modal dialogs, side panels, container sections |
| `rounded-xl` | 12px | Interactive items, task cards, navigation tabs, buttons, inputs |
| `rounded-lg` | 8px | Badges, date indicators, small controls, dropdown items |
| `rounded-full` | 9999px | Status pills, notification badges, avatar dots, checkmark icons |

## Z-Index Scale
- `z-overlay` (40): Background dimming scrims.
- `z-modal` (50): Standard modals, drawers, and full-screen dialogs.
- `z-popover` (60): Popover menus, context pickers, and color selectors.
- `z-tooltip` (70): Quick tooltips and instant float labels.

## Elevation & Shadow Scale
- `shadow-card`: `0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)` (resting surface)
- `shadow-card-hover`: `0 4px 12px 0 rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)` (interactive hover)
- `shadow-dialog`: `0 16px 48px -8px rgb(0 0 0 / 0.16), 0 4px 12px -4px rgb(0 0 0 / 0.08)` (modal elevation)
- `shadow-float`: `0 8px 24px -4px rgb(0 0 0 / 0.12), 0 2px 6px -2px rgb(0 0 0 / 0.06)` (popovers and menus)

## Modal & Dialog Standard
- **Backdrop**: `fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-backdrop-in p-4 select-none`
- **Dialog Container**: `w-full max-w-[size] bg-card border border-border rounded-2xl p-6 shadow-dialog space-y-5 animate-dialog-in`
- **Popover Menu**: `absolute z-60 bg-popover border border-border rounded-xl shadow-float p-1.5 animate-scale-in`

## Motion & Micro-Interactions
- **Deceleration Curve**: `cubic-bezier(0.16, 1, 0.3, 1)` (`ease-smooth` / `ease-out`)
- **Interactive Feedback**:
  - Active button press: `active:scale-[0.98]`
  - Card hover elevation: `hover:-translate-y-0.5 hover:shadow-card-hover`
  - Smooth collapsible drawers: CSS Grid `grid-template-rows: 1fr` $\rightarrow$ `0fr`
  - Dialog entrance: `animate-dialog-in`
  - Popover entrance: `animate-scale-in`
  - Backdrop entrance: `animate-backdrop-in`

## Audio Feedback Architecture (Offline Web Audio API)
- **Task Pop Profiles (8)**: Wooden Pop, Bubble Pop, Bamboo Knock, Water Droplet, Crystal Bell, Tactile Switch, Acoustic Pluck, Magic Twinkle.
- **Cat Tidy-Up SFX Styles (5)**: Cozy Broom Swish, Magic Wand Sparkle, Gentle Leaf Breeze, Ocean Ripple, Bubble Cascade.

