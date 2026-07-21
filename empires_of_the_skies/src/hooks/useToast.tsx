/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { Alert, Box, Slide } from "@mui/material";

type Severity = "error" | "warning" | "info" | "success";

type ToastContextValue = {
  showToast: (message: string, severity?: Severity) => void;
};

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

interface ToastItem {
  id: number;
  message: string;
  severity: Severity;
}

const MAX_VISIBLE = 4;
const AUTO_HIDE_MS = 4500;

/**
 * Queued toasts — new messages stack instead of overwriting the current one.
 * Each toast dismisses itself; at most MAX_VISIBLE are shown (oldest dropped).
 */
export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((msg: string, sev: Severity = "error") => {
    setToasts((prev) => {
      // Collapse exact repeats of the newest toast instead of stacking them.
      const last = prev[prev.length - 1];
      if (last && last.message === msg && last.severity === sev) return prev;
      const id = nextId.current++;
      const next = [...prev, { id, message: msg, severity: sev }];
      return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next;
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Box
        sx={{
          position: "fixed",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          zIndex: 2000,
          alignItems: "center",
          pointerEvents: "none",
          "& > *": { pointerEvents: "auto" },
        }}
      >
        {toasts.map((toast) => (
          <ToastEntry key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </Box>
    </ToastContext.Provider>
  );
};

const ToastEntry = ({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}) => {
  // Per-toast auto-hide timer, started on mount.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (timer.current === null) {
    timer.current = setTimeout(() => onDismiss(toast.id), AUTO_HIDE_MS);
  }

  return (
    <Slide direction="up" in appear>
      <Alert
        onClose={() => {
          if (timer.current) clearTimeout(timer.current);
          onDismiss(toast.id);
        }}
        severity={toast.severity}
        variant="filled"
        sx={{ minWidth: 320, maxWidth: 560, boxShadow: "0 4px 16px rgba(0,0,0,0.35)", whiteSpace: "pre-line" }}
      >
        {toast.message}
      </Alert>
    </Slide>
  );
};
