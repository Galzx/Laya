# Product: Laya Workspace

## Mission & Positioning
Laya is a calm, local-first personal productivity workspace designed for Windows. It provides a tactile, distraction-free environment to capture thoughts, organize tasks, break down complex projects into subtasks, schedule agendas, and track daily progress—with zero cloud dependencies and 100% offline privacy.

## Target User & Context
- **User**: Knowledge workers, developers, planners, and creators who need a fast, dependable daily operating system for their work and personal goals.
- **Usage Context**: Running natively on the desktop, always accessible with zero-latency startup and instant offline SQLite I/O.

## Core Capabilities
- **Capture & Task Management**: Inbox capturing, due date planning via cozy date picker portal, priority levels (low, medium, high, urgent), and quick-action planning ("Today").
- **Subtasks & Checklist Progress**: Dynamic task breakdown drawers with real-time percentage completion meters.
- **Tab-Aware Completion Choreography**: Instant 0ms optimistic strike-through and celebration glow, smooth CSS grid collapse in filtered views, and stable persistent display in the "All" view.
- **Tidy-Up Archive Helper**: Unboxed cozy cat cleaning stage with sweeping swish audio and spring-loaded celebration pop.
- **Calendar & Monthly Agenda**: Interactive month grid with direct task status toggling and priority indicators.
- **Customizable Palettes & Accent Tints**: 8 curated warm light and ambient dark palettes (Linen, Matcha, Sakura, Latte, Nordic Mist, Midnight, Pine, Hearth) with custom accent highlight chips.
- **Synthesized Offline Web Audio Feedback**: 8 selectable task pop profiles and 5 cat tidy-up sweeping styles synthesized 100% locally via Web Audio API.
- **Local SQLite Database**: Native Tauri 2 + Rust backend with embedded migrations and offline schema management.

## Platform & Technical Stack
- **Framework**: Tauri 2.0 (Desktop Windows Native) + React 19 + TypeScript + Vite + Tailwind CSS
- **Backend**: Rust (`rusqlite`, `serde`, `tauri-plugin-opener`)
- **Storage**: Local SQLite database stored in AppData
- **Icons**: Lucide React (SVG stroke icons only, zero emojis across the app)
- **Audio**: Offline Web Audio API synthesis (0ms latency, zero external asset dependencies)

## Non-Negotiable Constraints & Directives
1. **Always-Active Impeccable Standard**: Production-grade craft, strict typographic scale, accessible contrast, and zero-latency interaction across all UI surfaces.
2. **Local-First & Offline**: All user data, tasks, notes, and settings remain exclusively on the local machine.
3. **No Emojis**: Always use Lucide stroke icons.
4. **Smooth Natural Motion**: Use natural deceleration easing (`cubic-bezier(0.16, 1, 0.3, 1)`) without bouncy/elastic rubber-banding.

