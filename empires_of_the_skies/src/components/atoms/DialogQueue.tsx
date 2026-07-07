import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";

/**
 * DialogQueue — coordinates game dialogs so they never cover each other.
 *
 * Every DialogShell claims a slot while its `open` prop is true; only the
 * highest-priority claimant is actually visible. When it closes, the next
 * one in line appears. Ties are broken by claim order (first come, first
 * served). Outside a provider the hook is a no-op passthrough, so DialogShell
 * keeps working in the lobby and other non-game screens.
 *
 * Priorities (see DIALOG_PRIORITY): informational popups that report what
 * just happened (battle results) outrank summaries, which outrank the
 * default interactive stage dialogs — a prompt for your next decision should
 * never bury the outcome of your last one.
 */

type QueueEntry = { priority: number; seq: number };

type DialogQueueContextValue = {
  request: (id: string, priority: number) => void;
  release: (id: string) => void;
  activeId: string | null;
};

const DialogQueueContext = createContext<DialogQueueContextValue | null>(null);

export const DIALOG_PRIORITY = {
  battleResult: 100,
  gameOver: 90,
  roundSummary: 80,
  default: 50,
} as const;

export const DialogQueueProvider = ({ children }: { children: ReactNode }) => {
  const [entries, setEntries] = useState<Map<string, QueueEntry>>(new Map());
  const seqRef = useRef(0);

  const request = useCallback((id: string, priority: number) => {
    setEntries((prev) => {
      const existing = prev.get(id);
      if (existing && existing.priority === priority) return prev;
      const next = new Map(prev);
      next.set(id, { priority, seq: existing?.seq ?? seqRef.current++ });
      return next;
    });
  }, []);

  const release = useCallback((id: string) => {
    setEntries((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const activeId = useMemo(() => {
    let best: string | null = null;
    let bestEntry: QueueEntry | null = null;
    for (const [id, entry] of entries) {
      if (
        !bestEntry ||
        entry.priority > bestEntry.priority ||
        (entry.priority === bestEntry.priority && entry.seq < bestEntry.seq)
      ) {
        best = id;
        bestEntry = entry;
      }
    }
    return best;
  }, [entries]);

  const value = useMemo(
    () => ({ request, release, activeId }),
    [request, release, activeId]
  );

  return (
    <DialogQueueContext.Provider value={value}>
      {children}
    </DialogQueueContext.Provider>
  );
};

/**
 * Claims a queue slot while `wantsOpen` is true; returns whether this dialog
 * is the one that should be visible right now.
 */
export const useDialogSlot = (wantsOpen: boolean, priority: number): boolean => {
  const id = useId();
  const ctx = useContext(DialogQueueContext);
  const request = ctx?.request;
  const release = ctx?.release;

  useEffect(() => {
    if (!request || !release || !wantsOpen) return;
    request(id, priority);
    return () => release(id);
  }, [request, release, wantsOpen, priority, id]);

  if (!ctx) return wantsOpen;
  return wantsOpen && ctx.activeId === id;
};
