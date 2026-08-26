import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Sidebar, TabId } from "./components/layout/Sidebar";
import { TasksView } from "./components/tasks/TasksView";
import { ShieldCheck, Database, FolderCheck, CheckCircle2 } from "lucide-react";

interface SystemStatus {
  status: string;
  engine: string;
  timestamp: number;
  offline_ready: boolean;
  db_connected: boolean;
}

interface Workspace {
  id: string;
  name: string;
  description?: string;
  is_active: number;
  created_at: number;
  updated_at: number;
}

interface SettingItem {
  key: string;
  value: string;
  updated_at: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    async function initAppData() {
      try {
        const [statusRes, wsRes, settingsRes] = await Promise.all([
          invoke<SystemStatus>("check_system_status"),
          invoke<Workspace[]>("get_workspaces"),
          invoke<SettingItem[]>("get_settings"),
        ]);

        setSystemStatus(statusRes);
        setWorkspaces(wsRes);
        setSettings(settingsRes);
      } catch (err) {
        console.error("Database initialization check failed:", err);
        setInitializationError(String(err));
      } finally {
        setLoading(false);
      }
    }

    initAppData();
  }, []);

  const activeWorkspace = workspaces.find((w) => w.is_active === 1) || workspaces[0];

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden">
      {/* Persistent Left Navigation */}
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Top Minimal Bar */}
        <header className="h-14 border-b border-border px-8 flex items-center justify-between bg-card/40 backdrop-blur-sm sticky top-0 z-10">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
            <span>Laya</span>
            <span>/</span>
            <span className="text-foreground capitalize font-semibold">{activeTab}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-secondary text-secondary-foreground border border-border">
              <span className={`h-1.5 w-1.5 rounded-full ${systemStatus?.db_connected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              {systemStatus?.db_connected ? "SQLite Connected" : "SQLite Unavailable"}
            </span>
          </div>
        </header>

        {/* Dynamic Viewport Content */}
        <div className="p-8 max-w-5xl">
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Today's Overview</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Local-first engine initialized. SQLite persistence active.
                </p>
              </div>

              {initializationError && (
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
                  Database initialization failed: {initializationError}
                </div>
              )}

              {/* Status & SQLite Diagnostic Grid */}
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Database className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">Persistence Diagnostics</h3>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">SQLite + SQLx Migrations</span>
                </div>

                {loading ? (
                  <p className="text-xs text-muted-foreground">Reading SQLite state from Rust backend...</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground">Database Pool</p>
                      <p className="text-sm font-medium flex items-center gap-1.5 mt-0.5 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="h-4 w-4" />{" "}
                        {systemStatus?.db_connected ? "Active & Connected" : "Disconnected"}
                      </p>
                    </div>

                    <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground">Active Workspace</p>
                      <p className="text-sm font-medium flex items-center gap-1.5 mt-0.5 truncate">
                        <FolderCheck className="h-4 w-4 text-muted-foreground" />
                        {activeWorkspace?.name ?? "Personal Workspace"}
                      </p>
                    </div>

                    <div className="bg-muted/50 p-3 rounded-lg border border-border/50">
                      <p className="text-xs text-muted-foreground">Configured Settings</p>
                      <p className="text-sm font-medium flex items-center gap-1.5 mt-0.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        {settings.length} Stored Entries
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <TasksView workspaceId={activeWorkspace?.id || "ws-default-primary"} />
          )}

          {activeTab !== "dashboard" && activeTab !== "tasks" && (
            <div className="border border-dashed border-border rounded-xl p-12 text-center space-y-2">
              <h3 className="text-sm font-semibold capitalize">{activeTab} View</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                This module will connect to SQLite in upcoming milestones.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
