import { ReactNode } from "react";

type ActionBoardButtonRowChildProps = {
  children?: ReactNode;
};

export const ButtonRow = ({ children }: ActionBoardButtonRowChildProps) => {
  return (
    <div
      style={{
        display: "flex",
        marginBottom: "3%",
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