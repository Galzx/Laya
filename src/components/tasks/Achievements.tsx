import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, X, Sprout, Flame, Zap, Trophy, InboxIcon, Sparkles, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { playAchievementSound } from '../../lib/sound';
import type { Task } from './TasksView';

/**
 * Represents a single milestone achievement.
 */
export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string; // Tailwind color class for the icon
}

/**
 * Defined milestone achievements.
 */
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-steps', title: 'First Steps', description: 'Complete your first task', icon: Sprout, color: 'text-emerald-500' },
  { id: 'getting-going', title: 'Getting Going', description: 'Complete 5 tasks', icon: Flame, color: 'text-amber-500' },
  { id: 'double-digits', title: 'Double Digits', description: 'Complete 10 tasks', icon: Zap, color: 'text-yellow-500' },
  { id: 'quarter-century', title: 'Quarter Century', description: 'Complete 25 tasks', icon: Trophy, color: 'text-primary' },
  { id: 'inbox-zero', title: 'Inbox Zero', description: 'Clear all inbox tasks', icon: InboxIcon, color: 'text-blue-500' },
  { id: 'clean-sweep', title: 'Clean Sweep', description: 'Clear all completed tasks', icon: Sparkles, color: 'text-pink-500' },
];

/**
 * A floating notification that slides in from the bottom-right for new achievements.
 */
export function AchievementToast({
  achievement,
  onDismiss,
}: {
  achievement: AchievementDef | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (achievement) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [achievement, onDismiss]);

  if (!achievement) return null;

  const Icon = achievement.icon;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-achievement-in">
      <div className="relative flex items-start gap-4 bg-card border border-border shadow-xl rounded-2xl p-4 min-w-[300px]">
        {/* Decorative sparkles */}
        <div className="absolute top-1 left-2 w-2 h-2 rounded-full bg-yellow-400 animate-sparkle" style={{ animationDelay: '0s' }} />
        <div className="absolute bottom-2 left-6 w-1.5 h-1.5 rounded-full bg-pink-400 animate-sparkle" style={{ animationDelay: '0.2s' }} />
        <div className="absolute top-3 right-10 w-2.5 h-2.5 rounded-full bg-blue-400 animate-sparkle" style={{ animationDelay: '0.4s' }} />
        <div className="absolute bottom-4 right-4 w-1.5 h-1.5 rounded-full bg-green-400 animate-sparkle" style={{ animationDelay: '0.6s' }} />

        <div className={cn("flex items-center justify-center w-10 h-10 rounded-xl bg-muted shrink-0", achievement.color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 pr-6">
          <h4 className="font-bold text-foreground">Achievement Unlocked!</h4>
          <p className="text-sm font-semibold text-foreground mt-1">{achievement.title}</p>
          <p className="text-sm text-muted-foreground">{achievement.description}</p>
        </div>

        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * A collapsible section showing earned badges.
 */
export function AchievementShelf({ unlockedIds }: { unlockedIds: Set<string> }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-6 flex flex-col items-center">
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2 px-4 rounded-full bg-muted/50 hover:bg-muted"
      >
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        Achievements ({unlockedIds.size}/{ACHIEVEMENTS.length})
      </button>

      {isExpanded && (
        <div className="flex flex-wrap gap-4 mt-4 justify-center animate-fade-in">
          {ACHIEVEMENTS.map((ach) => {
            const unlocked = unlockedIds.has(ach.id);
            const AchIcon = ach.icon;
            return (
              <div
                key={ach.id}
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-150",
                  unlocked
                    ? "bg-muted border-primary/20 hover:scale-105"
                    : "bg-muted/30 border-border/50 opacity-40"
                )}
                title={unlocked ? ach.title : "Keep going!"}
              >
                {unlocked ? (
                  <AchIcon className={cn("w-5 h-5", ach.color)} />
                ) : (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Hook to manage achievement state and calculate new unlock events.
 */
export function useAchievements(tasks: Task[], justCleared: boolean): {
  newAchievement: AchievementDef | null;
  unlockedIds: Set<string>;
  dismissAchievement: () => void;
} {
  const STORAGE_KEY = 'laya-achievements';

  const getStoredAchievements = (): Set<string> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse stored achievements', e);
    }
    return new Set();
  };

  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(getStoredAchievements);
  const [newAchievement, setNewAchievement] = useState<AchievementDef | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(unlockedIds)));
  }, [unlockedIds]);

  useEffect(() => {
    const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;
    const inboxTasksCount = tasks.filter((t) => t.status === 'inbox').length;
    const hasTasks = tasks.length > 0;

    const isInboxZero = hasTasks && inboxTasksCount === 0;

    const newlyUnlocked = new Set<string>();

    if (completedTasksCount >= 1) newlyUnlocked.add('first-steps');
    if (completedTasksCount >= 5) newlyUnlocked.add('getting-going');
    if (completedTasksCount >= 10) newlyUnlocked.add('double-digits');
    if (completedTasksCount >= 25) newlyUnlocked.add('quarter-century');
    if (isInboxZero) newlyUnlocked.add('inbox-zero');
    if (justCleared) newlyUnlocked.add('clean-sweep');

    let latestNew: AchievementDef | null = null;
    let addedAny = false;

    setUnlockedIds((prev) => {
      const next = new Set(prev);
      for (const id of newlyUnlocked) {
        if (!next.has(id)) {
          next.add(id);
          addedAny = true;
          const def = ACHIEVEMENTS.find((a) => a.id === id);
          if (def) latestNew = def;
        }
      }
      return addedAny ? next : prev;
    });

    if (latestNew) {
      playAchievementSound();
      setNewAchievement(latestNew);
    }
  }, [tasks, justCleared]);

  const dismissAchievement = useCallback(() => {
    setNewAchievement(null);
  }, []);

  return {
    newAchievement,
    unlockedIds,
    dismissAchievement
  };
}
