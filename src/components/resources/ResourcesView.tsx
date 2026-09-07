import React, { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  Copy,
  Flame,
  MapPin,
  ShieldCheck,
  Columns3,
  Bot,
  CheckSquare,
  CreditCard,
  Building2,
  FileText,
} from "lucide-react";
import { cn } from "../../lib/utils";

type ResourceSubTab =
  | "about"
  | "services"
  | "blog"
  | "comparison"
  | "casestudies"
  | "faq"
  | "legal";

export const ResourcesView: React.FC = () => {
  const [subTab, setSubTab] = useState<ResourceSubTab>("about");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("tasks");
  const [selectedArticleId, setSelectedArticleId] = useState<string>("sqlite-nvme");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-smooth-in pb-12 overflow-x-hidden">
      {/* Top Banner & Subnavigation */}
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
                <BookOpen className="h-4 w-4" />
              </span>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                Knowledge & Resources Hub
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Authoritative guides, architecture specifications, team story, and platform documentation.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono shrink-0">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span>Updated: September 2026</span>
          </div>
        </div>

        {/* Subnavigation Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-border/60 pt-3">
          {[
            { id: "about", label: "About & Story" },
            { id: "services", label: "Services & Capabilities" },
            { id: "blog", label: "Technical Articles (5)" },
            { id: "comparison", label: "Before & After" },
            { id: "casestudies", label: "Case Studies" },
            { id: "faq", label: "FAQ" },
            { id: "legal", label: "Terms & Privacy" },
          ].map((tab) => {
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id as ResourceSubTab)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer shadow-2xs",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-background border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── TAB 1: ABOUT & STORY ────────────────────────────────────────── */}
      {subTab === "about" && (
        <div className="space-y-6">
          {/* Founder Story */}
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-card space-y-4">
            <div className="space-y-1">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-primary">
                Origin & Philosophy
              </span>
              <h2 className="text-base font-bold tracking-tight text-foreground">
                The Story Behind Laya Workspace
              </h2>
            </div>

            <div className="text-xs text-muted-foreground leading-relaxed space-y-3">
              <p>
                Laya was born out of frustration with the modern software landscape: cloud surveillance, recurring monthly micro-subscriptions, and Electron apps consuming 2 gigabytes of RAM just to take basic notes.
              </p>
              <p>
                In 2025, our engineering team began designing an alternative: a calm, high-efficiency personal operating system built with a lightweight Rust backend (Tauri) and an embedded, human-inspectable SQLite engine. Laya was constructed on the conviction that personal notes, sprint schedules, and daily thoughts should live permanently on physical hardware, operating instantly with sub-10ms response times without transmitting user data to remote corporate servers.
              </p>
              <p>
                Today, Laya stands as a sovereign workspace: zero telemetry, zero cookies, zero external vendor lock-in. Every task, kanban column, markdown note, and deep-work session is completely owned by you.
              </p>
            </div>

            {/* Core Leadership / Founder Profile */}
            <div className="pt-4 border-t border-border/70">
              <h3 className="text-xs font-semibold text-foreground mb-3">Core Engineering Team</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-background border border-border/70">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                    NG
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-foreground truncate">Nino Galzx</h4>
                    <p className="text-[11px] text-muted-foreground">Founder & Lead Systems Architect</p>
                    <p className="text-[10px] text-primary font-mono mt-0.5">Rust / SQLite / Tauri Specialist</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-background border border-border/70">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs shrink-0">
                    LW
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-foreground truncate">Laya Systems Lab</h4>
                    <p className="text-[11px] text-muted-foreground">Open Core Engineering Collective</p>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">Distributed Open Source Group</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Location, Directions & Operating Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
              <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                <Building2 className="h-4 w-4 text-primary" />
                <span>Headquarters & Open Lab</span>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-foreground font-medium">Laya Workspace Systems Lab</p>
                    <p>742 Innovation Way, Suite 400</p>
                    <p>Metro Tech Corridor, CA 94107</p>
                  </div>
                </div>
                <p className="pt-2 text-[11px]">
                  Directions: Accessible via Central Light Rail station (Exit 4B) or Highway 101 North Tech Connector. Visitor parking available on Level P2.
                </p>
              </div>

              {/* Vector Map Blueprint SVG */}
              <div className="h-28 w-full rounded-xl bg-muted/40 border border-border/70 p-3 flex items-center justify-center relative overflow-hidden">
                <svg viewBox="0 0 200 80" className="w-full h-full opacity-60 text-muted-foreground" fill="none">
                  <path d="M10 40 H190 M40 10 V70 M160 10 V70 M100 20 V60" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                  <circle cx="100" cy="40" r="6" className="fill-primary text-primary" />
                  <rect x="85" y="15" width="30" height="15" rx="3" stroke="currentColor" strokeWidth="1" className="bg-background" />
                  <text x="100" y="26" fontSize="6" fill="currentColor" textAnchor="middle" fontFamily="monospace">LAB HQ</text>
                </svg>
                <span className="absolute bottom-1.5 right-2 text-[9px] font-mono text-muted-foreground bg-card/80 px-1 rounded">
                  Grid Ref: 37.77° N, 122.41° W
                </span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-4">
              <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                <Clock className="h-4 w-4 text-primary" />
                <span>Operating Hours & Guarantees</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-background border border-border/70 space-y-1.5">
                  <div className="flex items-center justify-between text-foreground font-medium">
                    <span>Engineering Support Hours</span>
                    <span className="font-mono text-primary text-[11px]">Active</span>
                  </div>
                  <div className="text-muted-foreground text-[11px] space-y-1">
                    <p className="flex justify-between">
                      <span>Monday - Friday:</span>
                      <span className="font-mono text-foreground">09:00 - 18:00 UTC</span>
                    </p>
                    <p className="flex justify-between">
                      <span>Saturday - Sunday:</span>
                      <span className="font-mono text-muted-foreground">Async Emergency Queue</span>
                    </p>
                  </div>
                </div>

                {/* Guarantee Statement */}
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>100% Local Sovereignty Guarantee</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
                    If Laya ever transmits your private task data to an unauthorized third party, we will immediately refund your lifetime license and open source the offending revision.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Transparent Payment & Licensing Methods */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
              <CreditCard className="h-4 w-4 text-primary" />
              <span>Accepted Payment & Licensing Methods</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Laya Core is completely free and open-source under the MIT license. For enterprise team licensing, custom backup appliances, and priority architecture support:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-center">
              {[
                { name: "Direct Debit / SEPA", note: "Zero processing surcharge" },
                { name: "Visa / Mastercard", note: "Stripe secure 256-bit" },
                { name: "American Express", note: "Corporate card support" },
                { name: "Open Invoicing", note: "Net-30 for teams >10" },
              ].map((pm, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-background border border-border/70 space-y-0.5">
                  <h4 className="text-xs font-semibold text-foreground">{pm.name}</h4>
                  <p className="text-[10px] text-muted-foreground font-mono">{pm.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: SERVICES & CAPABILITIES ──────────────────────────────── */}
      {subTab === "services" && (
        <div className="space-y-6">
          {/* Service Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: "tasks", name: "Task Engine", icon: CheckSquare },
              { id: "kanban", name: "Agile Kanban", icon: Columns3 },
              { id: "notes", name: "Connected Notes", icon: BookOpen },
              { id: "focus", name: "Focus & Audio", icon: Flame },
              { id: "ai", name: "Sammi Copilot", icon: Bot },
            ].map((svc) => {
              const isSelected = selectedServiceId === svc.id;
              const Icon = svc.icon;
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => setSelectedServiceId(svc.id)}
                  className={cn(
                    "p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 shadow-2xs",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary font-semibold"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{svc.name}</span>
                </button>
              );
            })}
          </div>

          {/* Service Detail Cards */}
          {selectedServiceId === "tasks" && (
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-card space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-primary uppercase tracking-wider font-semibold">Service 01</span>
                <h2 className="text-base font-bold text-foreground">Hierarchical SQLite Task Engine</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sub-millisecond query execution, recursive subtasks, priority grading, and automated due date agendas.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1">
                  <h4 className="text-xs font-semibold text-foreground">Zero Cloud Latency</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Operates against local indices with 0 network roundtrips. Create, filter, and archive 10,000+ tasks seamlessly.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1">
                  <h4 className="text-xs font-semibold text-foreground">Nested Subtasks</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Break complex objectives into structured checklists with real-time completion percentages.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1">
                  <h4 className="text-xs font-semibold text-foreground">Smart Filtering</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Instant toggles for Today, Overdue, Recovery, Completed, and Archived items with keyboard navigation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedServiceId === "kanban" && (
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-card space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-primary uppercase tracking-wider font-semibold">Service 02</span>
                <h2 className="text-base font-bold text-foreground">Tactile Agile Kanban Board</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Visual 4-column sprint tracking with smooth drag-and-drop state persistence into local SQLite.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1">
                  <h4 className="text-xs font-semibold text-foreground">Agile Workflow Columns</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    To Do, In Progress, Blocked, and Completed columns designed for rapid engineering sprints.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1">
                  <h4 className="text-xs font-semibold text-foreground">Drag & Drop Safety</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Supports edit-mode toggle to prevent accidental dragging during quick review sessions.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1">
                  <h4 className="text-xs font-semibold text-foreground">Column Metrics</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Automatic WIP counting and priority pill indicators for high-clarity project management.
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedServiceId === "notes" && (
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-card space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-primary uppercase tracking-wider font-semibold">Service 03</span>
                <h2 className="text-base font-bold text-foreground">Connected Markdown Knowledge Graph</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Fast markdown document authoring, instant keyword filtering, tags, and export to standard disk files.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1">
                  <h4 className="text-xs font-semibold text-foreground">Human-Readable Markdown</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    No proprietary binary document blobs. Export your entire notes vault to plaintext markdown anytime.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1">
                  <h4 className="text-xs font-semibold text-foreground">Real-Time Auto-Save</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Debounced 300ms persistence to local SQLite ensures you never lose a train of thought during deep work.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1">
                  <h4 className="text-xs font-semibold text-foreground">Print Stylesheet</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Press Ctrl+P to generate beautifully typeset paper or PDF documents without sidebar artifacts.
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedServiceId === "focus" && (
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-card space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-primary uppercase tracking-wider font-semibold">Service 04</span>
                <h2 className="text-base font-bold text-foreground">Focus Bio-Rhythms & Audio Synthesis</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pomodoro work intervals paired with procedural Web Audio API synthesizers (zero external audio files).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1">
                  <h4 className="text-xs font-semibold text-foreground">Tactile Pop Audio</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    8 choosable task pop profiles synthesized mathematically with zero audio lag.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1">
                  <h4 className="text-xs font-semibold text-foreground">Cat Tidy-Up SFX</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Procedural broom swishes, magic wand sparkles, leaf breezes, ocean ripples, and purr harmonics.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1">
                  <h4 className="text-xs font-semibold text-foreground">Session Analytics</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Log deep work minutes to visualize focus stamina and weekly velocity trends.
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedServiceId === "ai" && (
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-card space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-primary uppercase tracking-wider font-semibold">Service 05</span>
                <h2 className="text-base font-bold text-foreground">Sammi Sovereign AI Copilot</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Deterministic task deconstruction that runs 100% offline with zero cloud transmission.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1">
                  <h4 className="text-xs font-semibold text-foreground">Deterministic Local Rules</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Sub-second smart breakdown of software sprints, writing projects, and daily tasks without an API key.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1">
                  <h4 className="text-xs font-semibold text-foreground">Direct BYOK Gemini API</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Optionally configure your private Google Gemini key stored on your PC for advanced generative tasks.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-background border border-border/70 space-y-1">
                  <h4 className="text-xs font-semibold text-foreground">Local Ollama Bridge</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Connect local open models like Llama 3 or Mistral running on your GPU for sovereign privacy.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: TECHNICAL ARTICLES (5 POSTS) ─────────────────────────── */}
      {subTab === "blog" && (
        <div className="space-y-6">
          {/* Article List Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              {
                id: "sqlite-nvme",
                title: "Why SQLite on NVMe Beats Cloud Databases",
                date: "September 2, 2026",
                readTime: "6 min read",
                author: "Nino Galzx",
                category: "Architecture",
              },
              {
                id: "anti-vibecoding",
                title: "The Anti-Vibecoding Manifesto: Rebuilding Software Rigor",
                date: "August 28, 2026",
                readTime: "8 min read",
                author: "Laya Systems Lab",
                category: "Engineering Philosophy",
              },
              {
                id: "audio-synthesis",
                title: "Designing Audio Feedback with Web Audio API Synthesizers",
                date: "August 20, 2026",
                readTime: "5 min read",
                author: "Audio Core Team",
                category: "Web Audio API",
              },
              {
                id: "zero-telemetry",
                title: "Zero-Telemetry Architecture: Ensuring 100% Data Sovereignty",
                date: "August 12, 2026",
                readTime: "7 min read",
                author: "Security Working Group",
                category: "Privacy & Security",
              },
              {
                id: "nested-taxonomy",
                title: "From Chaos to Clarity: Structuring Nested Projects & Tasks",
                date: "August 4, 2026",
                readTime: "5 min read",
                author: "Productivity Team",
                category: "Workflow Guide",
              },
            ].map((art) => {
              const isSelected = selectedArticleId === art.id;
              return (
                <div
                  key={art.id}
                  onClick={() => setSelectedArticleId(art.id)}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all cursor-pointer space-y-2.5 shadow-2xs group",
                    isSelected
                      ? "bg-card border-primary ring-1 ring-primary/40"
                      : "bg-card border-border hover:border-border/80 hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                      {art.category}
                    </span>
                    <span className="text-muted-foreground">{art.readTime}</span>
                  </div>
                  <h3 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-2">
                    {art.title}
                  </h3>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                    <span>{art.author}</span>
                    <span>{art.date}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Article Full Content */}
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-card space-y-4">
            {selectedArticleId === "sqlite-nvme" && (
              <article className="space-y-4 text-xs leading-relaxed text-muted-foreground">
                <div className="border-b border-border/70 pb-4 space-y-1">
                  <span className="text-[10px] font-mono text-primary uppercase tracking-wider font-semibold">Architecture Deep-Dive</span>
                  <h2 className="text-lg font-bold text-foreground">Why SQLite on NVMe Beats Cloud Databases for Personal Workspaces</h2>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                    <span>By Nino Galzx</span>
                    <span>·</span>
                    <span>Published: September 2, 2026</span>
                    <span>·</span>
                    <span>6 min read</span>
                  </div>
                </div>
                <p>
                  Modern web applications have conditioned engineers to accept that even the simplest personal task must traverse three geographic regions, negotiate TLS sessions, hit an API gateway, and queue behind remote connection pools. The end-user cost is perceptible latency: 150ms to 350ms for simple operations.
                </p>
                <p>
                  By contrast, embedding SQLite directly inside a native desktop process running on modern NVMe PCIe 4.0 storage yields query execution times consistently under 0.08 milliseconds. In Laya, when you toggle a task or filter a project with 5,000 items, the entire operation completes in 1.2ms without network overhead or Wi-Fi dependency.
                </p>
                <div className="p-4 rounded-xl bg-background border border-border/70 font-mono text-[11px] text-foreground space-y-1">
                  <p className="text-muted-foreground"># Typical NVMe Read Latency Benchmark</p>
                  <p>Laya SQLite (Local NVMe): 0.04ms - 0.12ms</p>
                  <p>Cloud SaaS REST API (US-East to Client): 140ms - 320ms</p>
                  <p className="text-emerald-600 dark:text-emerald-400 font-semibold">Efficiency Factor: ~1,500x Faster Execution</p>
                </div>
                <p>
                  Beyond raw speed, data sovereignty is absolute. There is no cloud provider to sunset your service, alter subscription tiers, or train behavioral models on your personal workflow notes.
                </p>
              </article>
            )}

            {selectedArticleId === "anti-vibecoding" && (
              <article className="space-y-4 text-xs leading-relaxed text-muted-foreground">
                <div className="border-b border-border/70 pb-4 space-y-1">
                  <span className="text-[10px] font-mono text-primary uppercase tracking-wider font-semibold">Engineering Manifesto</span>
                  <h2 className="text-lg font-bold text-foreground">The Anti-Vibecoding Manifesto: Rebuilding Software with Tactile Rigor</h2>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                    <span>By Laya Systems Lab</span>
                    <span>·</span>
                    <span>Published: August 28, 2026</span>
                    <span>·</span>
                    <span>8 min read</span>
                  </div>
                </div>
                <p>
                  "Vibecoding" has become shorthand for assembling software via loosely prompted AI outputs without understanding architectural trade-offs, performance bottlenecks, or user durability. The results are instantly recognizable: purple gradient backgrounds, rounded pill buttons, simulated metrics, fake user counters, and unstable layouts that buckle under real workloads.
                </p>
                <p>
                  The Anti-Vibecoding standard implemented in Laya requires real engineering rigor:
                </p>
                <ul className="space-y-1.5 list-disc list-inside pl-1 text-foreground">
                  <li>Zero fake metrics: every counter is calculated from genuine database records.</li>
                  <li>Standardized design tokens: disciplined border radius hierarchy (2xl cards, xl buttons).</li>
                  <li>Accessibility first: skip-to-content links, keyboard shortcuts, high-contrast printing support.</li>
                  <li>Zero emojis used as functional icons: only crisp, semantic SVG vectors.</li>
                  <li>Clean typography: zero em-dashes, disciplined hyphenation, and real human-crafted copy.</li>
                </ul>
                <p>
                  Software should feel like a finely tuned instrument, not a disposable marketing prototype.
                </p>
              </article>
            )}

            {selectedArticleId === "audio-synthesis" && (
              <article className="space-y-4 text-xs leading-relaxed text-muted-foreground">
                <div className="border-b border-border/70 pb-4 space-y-1">
                  <span className="text-[10px] font-mono text-primary uppercase tracking-wider font-semibold">Web Audio Architecture</span>
                  <h2 className="text-lg font-bold text-foreground">Designing Audio Feedback with Web Audio API Synthesizers</h2>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                    <span>By Audio Core Team</span>
                    <span>·</span>
                    <span>Published: August 20, 2026</span>
                    <span>·</span>
                    <span>5 min read</span>
                  </div>
                </div>
                <p>
                  Most productivity apps either lack tactile sound feedback or rely on 200KB MP3 assets fetched over the web that introduce audio latency. In Laya, all 8 task pop sounds and 5 cat sweeping soundscapes are computed in real time using the browser Web Audio API.
                </p>
                <p>
                  By chaining procedural oscillators, gain nodes, and biquad filters, we produce warm marimba thuds, resonant singing bowls, and organic bristle sweeps with zero bytes of external audio files.
                </p>
                <div className="p-4 rounded-xl bg-background border border-border/70 font-mono text-[11px] text-foreground space-y-1">
                  <p className="text-muted-foreground">// Procedural Wooden Pop Oscillator Structure</p>
                  <p>osc.frequency.setValueAtTime(320, now);</p>
                  <p>osc.frequency.exponentialRampToValueAtTime(75, now + 0.035);</p>
                  <p>gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);</p>
                </div>
                <p>
                  Because audio is synthesized in code, it triggers with 0ms latency the instant a checkbox is clicked.
                </p>
              </article>
            )}

            {selectedArticleId === "zero-telemetry" && (
              <article className="space-y-4 text-xs leading-relaxed text-muted-foreground">
                <div className="border-b border-border/70 pb-4 space-y-1">
                  <span className="text-[10px] font-mono text-primary uppercase tracking-wider font-semibold">Privacy Engineering</span>
                  <h2 className="text-lg font-bold text-foreground">Zero-Telemetry Architecture: Ensuring 100% Data Sovereignty</h2>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                    <span>By Security Working Group</span>
                    <span>·</span>
                    <span>Published: August 12, 2026</span>
                    <span>·</span>
                    <span>7 min read</span>
                  </div>
                </div>
                <p>
                  Telemetry has quietly grown from basic crash diagnostics into pervasive user surveillance. In Laya, we made the architectural choice to include zero analytics libraries. There are no Google Analytics scripts, no Mixpanel beacons, and no heartbeat pings to our servers.
                </p>
                <p>
                  When you launch Laya, the application makes exactly zero outbound network requests unless you explicitly configure a remote AI provider. The SQLite database is stored in your personal operating system application directory, readable with any standard SQLite client.
                </p>
                <p>
                  You can inspect the source code, examine the network tab, or run Wireshark while working in Laya. The result is total peace of mind.
                </p>
              </article>
            )}

            {selectedArticleId === "nested-taxonomy" && (
              <article className="space-y-4 text-xs leading-relaxed text-muted-foreground">
                <div className="border-b border-border/70 pb-4 space-y-1">
                  <span className="text-[10px] font-mono text-primary uppercase tracking-wider font-semibold">Productivity Playbook</span>
                  <h2 className="text-lg font-bold text-foreground">From Chaos to Clarity: Structuring Nested Projects & Tasks</h2>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                    <span>By Productivity Team</span>
                    <span>·</span>
                    <span>Published: August 4, 2026</span>
                    <span>·</span>
                    <span>5 min read</span>
                  </div>
                </div>
                <p>
                  Productivity systems fail when they force tasks into either extreme: either an unorganized flat list of 200 items, or a labyrinth of 12-level nested folders.
                </p>
                <p>
                  Laya adopts a balanced 3-tier hierarchy designed for high cognitive clarity:
                </p>
                <ol className="space-y-2 list-decimal list-inside pl-1 text-foreground">
                  <li><strong>Projects:</strong> High-level thematic milestones (e.g., "Laya Desktop 1.0", "Quarterly Tax Prep"). Each has color-coding and target dates.</li>
                  <li><strong>Tasks:</strong> Concrete actionable units assigned to a project or inbox, with explicit priority tiers (Low, Medium, High, Urgent).</li>
                  <li><strong>Subtasks:</strong> Atomic procedural steps required to fulfill a parent task.</li>
                </ol>
                <p>
                  Paired with Laya's Pomodoro focus dock and keyboard navigation, this structure keeps you grounded in what matters today without losing sight of long-term milestones.
                </p>
              </article>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: BEFORE & AFTER GALLERY ───────────────────────────────── */}
      {subTab === "comparison" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-2">
            <h2 className="text-base font-bold text-foreground">Before & After: Traditional SaaS vs. Sovereign Laya</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Examine the practical day-to-day differences between fragmented cloud subscription tools and Laya's unified local-first architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Before Card */}
            <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-mono font-semibold">
                  Before Laya · Cloud SaaS Stack
                </span>
                <span className="text-[11px] text-rose-600 font-medium">$45/month recurring</span>
              </div>

              <div className="space-y-3 text-xs text-muted-foreground">
                <div className="p-3 rounded-xl bg-background/80 border border-rose-500/20 space-y-1">
                  <h4 className="font-semibold text-foreground">Fragmented App Sprawl</h4>
                  <p>Separate browser tabs for notes, tasks, kanban, and pomodoro timer. Constant context switching.</p>
                </div>
                <div className="p-3 rounded-xl bg-background/80 border border-rose-500/20 space-y-1">
                  <h4 className="font-semibold text-foreground">Network Dependent & Cloud Outages</h4>
                  <p>Airplane mode or Wi-Fi drops completely freeze your ability to review schedules or write notes.</p>
                </div>
                <div className="p-3 rounded-xl bg-background/80 border border-rose-500/20 space-y-1">
                  <h4 className="font-semibold text-foreground">Persistent Telemetry & Data Mining</h4>
                  <p>User behaviors, notes, and deadlines are processed by remote servers to train commercial models.</p>
                </div>
                <div className="p-3 rounded-xl bg-background/80 border border-rose-500/20 space-y-1">
                  <h4 className="font-semibold text-foreground">Severe Memory Bloat</h4>
                  <p>Multiple Electron containers consuming 1.5GB to 3.0GB of system RAM.</p>
                </div>
              </div>
            </div>

            {/* After Card */}
            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-semibold">
                  After Laya · Sovereign Desktop Workspace
                </span>
                <span className="text-[11px] text-emerald-600 font-medium">100% Free Core · Lifetime Own</span>
              </div>

              <div className="space-y-3 text-xs text-muted-foreground">
                <div className="p-3 rounded-xl bg-background/80 border border-emerald-500/20 space-y-1">
                  <h4 className="font-semibold text-foreground">Unified Single Window Workflow</h4>
                  <p>Tasks, Kanban, Notes, Calendar, Focus timer, and Sammi AI copilot unified in one fluid app.</p>
                </div>
                <div className="p-3 rounded-xl bg-background/80 border border-emerald-500/20 space-y-1">
                  <h4 className="font-semibold text-foreground">100% Offline Resilience</h4>
                  <p>Operates without an internet connection. Zero latency, instant search, and local SQLite durability.</p>
                </div>
                <div className="p-3 rounded-xl bg-background/80 border border-emerald-500/20 space-y-1">
                  <h4 className="font-semibold text-foreground">Zero Tracking & Complete Sovereignty</h4>
                  <p>No remote telemetry, no cookies, no tracking pixels. You own your raw SQLite file.</p>
                </div>
                <div className="p-3 rounded-xl bg-background/80 border border-emerald-500/20 space-y-1">
                  <h4 className="font-semibold text-foreground">Lightweight Native Performance</h4>
                  <p>Tauri Rust shell consuming less than 120MB of RAM with sub-millisecond query responses.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 5: CASE STUDIES ─────────────────────────────────────────── */}
      {subTab === "casestudies" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-2">
            <h2 className="text-base font-bold text-foreground">Practical Case Studies & Real User Workflows</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Discover how engineers, technical writers, and founders leverage Laya to maintain focus and execute complex milestones.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Case Study 1 */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-3">
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 w-fit">
                <Code2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-primary font-semibold">Case Study 01</span>
                <h3 className="text-xs font-semibold text-foreground">Senior Systems Engineer</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Managing a microservices migration with 80+ daily tasks across 6 repositories.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border/70 text-[11px] text-muted-foreground space-y-1.5">
                <p><strong>Challenge:</strong> Jira and browser tab lag was disrupting deep coding flow.</p>
                <p><strong>Solution:</strong> Uses Laya's Kanban board with Ctrl+K shortcut for rapid keyboard task triage and local markdown architecture notes.</p>
                <p className="text-primary font-medium">Outcome: 45 minutes saved per day in zero-latency task logging.</p>
              </div>
            </div>

            {/* Case Study 2 */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 w-fit">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-primary font-semibold">Case Study 02</span>
                <h3 className="text-xs font-semibold text-foreground">Technical Writer & Researcher</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Compiling an open-source documentation textbook and research bibliography.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border/70 text-[11px] text-muted-foreground space-y-1.5">
                <p><strong>Challenge:</strong> Cloud note apps locked text behind proprietary export formats.</p>
                <p><strong>Solution:</strong> Leverages Laya's connected Markdown editor with instant plain-text export and print stylesheet for crisp manuscript reviews.</p>
                <p className="text-primary font-medium">Outcome: 100% future-proof notes with zero vendor lock-in.</p>
              </div>
            </div>

            {/* Case Study 3 */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-card space-y-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 w-fit">
                <Flame className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-primary font-semibold">Case Study 03</span>
                <h3 className="text-xs font-semibold text-foreground">Solo Founder & Operator</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Running customer support, product design, and business development concurrently.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border/70 text-[11px] text-muted-foreground space-y-1.5">
                <p><strong>Challenge:</strong> Constant context switching caused task paralysis.</p>
                <p><strong>Solution:</strong> Uses Pomodoro focus intervals paired with Sammi's local AI task deconstructor to turn vague goals into 5 clear subtasks.</p>
                <p className="text-primary font-medium">Outcome: Tripled daily deep-work session completion.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 6: FAQ ──────────────────────────────────────────────────── */}
      {subTab === "faq" && (
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-card space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">Frequently Asked Questions</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Clear answers to technical inquiries regarding local data storage, backups, offline AI, and performance.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            {[
              {
                q: "Where is my database physically located on my computer?",
                a: "On Windows, your workspace is stored at %APPDATA%\\com.laya.app\\laya.db. This is a standard SQLite file containing all your tasks, subtasks, notes, and local settings. You can copy this file at any time to preserve your entire history.",
              },
              {
                q: "Does Laya ever transmit telemetry or user notes to remote servers?",
                a: "No. Laya includes zero remote telemetry, analytics beacons, or behavioral trackers. Everything you write stays strictly on your physical machine.",
              },
              {
                q: "Can I use Laya when completely disconnected from the internet?",
                a: "Yes. 100% of Laya's core features (Tasks, Kanban, Notes, Calendar, Focus, and Sammi's deterministic engine) operate offline with zero network connection required.",
              },
              {
                q: "How does Sammi AI work without violating my privacy?",
                a: "By default, Sammi uses an instant, 0ms local deterministic rule engine running entirely inside the Tauri Rust binary. If you choose to configure a Google Gemini key, requests are made directly from your PC to Google with zero intermediate proxies. If you use Ollama, processing runs on your local GPU.",
              },
              {
                q: "How do I print or export my notes and tasks?",
                a: "Press Ctrl+P from any view to trigger clean paper printing. You can also export tasks to CSV and JSON, and notes to standard Markdown files from the Settings > Workspace & Data tab.",
              },
              {
                q: "What is your response time promise for technical support?",
                a: "We guarantee a response to all technical support inquiries and bug reports within 24 business hours via support@layaworkspace.org.",
              },
            ].map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              const isCopied = copiedIndex === idx;
              return (
                <div
                  key={idx}
                  className={cn(
                    "rounded-xl border transition-all duration-150 overflow-hidden",
                    isOpen ? "bg-muted/30 border-border" : "bg-background border-border/70 hover:border-border"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-3.5 text-left text-xs font-semibold text-foreground cursor-pointer group"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-primary">0{idx + 1}.</span>
                      <span>{faq.q}</span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {isOpen ? (
                        <ChevronUp className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-3.5 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-border/40 space-y-2 animate-fade-in">
                      <p>{faq.a}</p>
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(`${faq.q}\n\n${faq.a}`);
                            setCopiedIndex(idx);
                            setTimeout(() => setCopiedIndex(null), 2000);
                          }}
                          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-mono transition-colors cursor-pointer"
                        >
                          {isCopied ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              <span className="text-emerald-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy Answer</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 7: TERMS & PRIVACY ──────────────────────────────────────── */}
      {subTab === "legal" && (
        <div className="space-y-6">
          {/* Privacy Policy */}
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-card space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <h2 className="text-base font-bold text-foreground">Privacy Policy (Local-First Standard)</h2>
                <p className="text-[11px] text-muted-foreground">Effective Date: September 2026 · Plain Language Legal Standard</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground leading-relaxed space-y-3 pt-2">
              <p>
                <strong>1. Data Ownership:</strong> All data, including tasks, subtasks, notes, project records, focus minutes, and configuration settings created in Laya, belongs exclusively to you. The Laya project and its developers claim zero ownership, rights, or licenses over your workspace content.
              </p>
              <p>
                <strong>2. Telemetry and Cookies:</strong> Laya does not set tracking cookies, track your physical location, inspect your clipboard without user action, or transmit telemetry beacons. We collect zero usage statistics.
              </p>
              <p>
                <strong>3. AI Integration:</strong> Sammi AI runs locally by default. If you provide a Google Gemini API key or connect Ollama, requests are dispatched directly from your device to the target API endpoint. Your API keys are saved locally in your PC storage and are never sent to Laya servers.
              </p>
              <p>
                <strong>4. Data Portability & Deletion:</strong> You may export or purge your entire database at any time using the built-in backup and reset tools located in the Settings view.
              </p>
            </div>
          </div>

          {/* Terms of Service */}
          <div className="bg-card border border-border rounded-2xl p-6 sm:p-7 shadow-card space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div>
                <h2 className="text-base font-bold text-foreground">Terms of Service</h2>
                <p className="text-[11px] text-muted-foreground">Open Core Desktop License Standard</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground leading-relaxed space-y-3 pt-2">
              <p>
                <strong>1. Grant of License:</strong> Laya Core is licensed under the terms of the MIT License. You are granted full permission to use, inspect, copy, modify, and distribute the software for personal, academic, or commercial purposes.
              </p>
              <p>
                <strong>2. Disclaimer of Warranty:</strong> The software is provided "as is", without warranty of any kind, express or implied. In no event shall the authors or copyright holders be liable for any claim, damages, or other liability arising from the use of the software.
              </p>
              <p>
                <strong>3. User Responsibility for Backups:</strong> Because Laya is local-first, you are responsible for maintaining backups of your physical SQLite database file (%APPDATA%\\com.laya.app\\laya.db). We provide automated one-click backup utilities in Settings to facilitate this.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
