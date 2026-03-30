import { ReactNode } from "react";

type ActionBoardButtonRowChildProps = {
  children?: ReactNode;
};

export const ButtonRow = ({ children }: ActionBoardButtonRowChildProps) => {
  return (
    <div
      style={{
        display: "flex",
        marginBottom: "20px",
        gap: "8px",
        position: "relative",
        whiteSpace: "pre-line",
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      {children}
    </div>
  );
};