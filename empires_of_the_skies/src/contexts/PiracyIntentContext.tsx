/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";

type PiracyIntentContextType = {
  intent: "tax" | "cut";
  setIntent: (v: "tax" | "cut") => void;
};

const PiracyIntentContext = createContext<PiracyIntentContextType>({
  intent: "tax",
  setIntent: () => {},
});

export const usePiracyIntent = () => useContext(PiracyIntentContext);

export const PiracyIntentProvider = ({ round, children }: { round: number; children: ReactNode }) => {
  const [intent, setIntentState] = useState<"tax" | "cut">("tax");
  const [lastRound, setLastRound] = useState(round);

  const setIntent = useCallback((v: "tax" | "cut") => setIntentState(v), []);

  if (round !== lastRound) {
    setLastRound(round);
    setIntentState("tax");
  }

  const value = useMemo(() => ({ intent, setIntent }), [intent, setIntent]);

  return (
    <PiracyIntentContext.Provider value={value}>
      {children}
    </PiracyIntentContext.Provider>
  );
};