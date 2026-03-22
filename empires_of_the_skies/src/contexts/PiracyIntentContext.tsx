import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
  const [intent, setIntent] = useState<"tax" | "cut">("tax");

  useEffect(() => {
    setIntent("tax");
  }, [round]);

  return (
    <PiracyIntentContext.Provider value={{ intent, setIntent }}>
      {children}
    </PiracyIntentContext.Provider>
  );
};
