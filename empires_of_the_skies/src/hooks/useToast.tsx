import React, { createContext, useContext, useState, useCallback } from "react";
import { Alert, Snackbar } from "@mui/material";

type Severity = "error" | "warning" | "info" | "success";

type ToastContextValue = {
  showToast: (message: string, severity?: Severity) => void;
};

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<Severity>("error");

  const showToast = useCallback((msg: string, sev: Severity = "error") => {
    setMessage(msg);
    setSeverity(sev);
    setOpen(true);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setOpen(false)}
          severity={severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
};
