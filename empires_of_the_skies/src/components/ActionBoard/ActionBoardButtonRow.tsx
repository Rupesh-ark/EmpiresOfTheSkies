import React, { ReactNode, ReactFragment, ReactPortal } from "react";

export const ButtonRow = ({ children }: ActionBoardButtonRowChildProps) => {
  return (
    <div
      style={{
        display: "flex",
        marginBottom: "3%",
        position: "relative",
        whiteSpace: "pre-line",
        flexWrap: "wrap",
        // alignContent: "center",
        alignItems: "center",
      }}
    >
      {children}
    </div>
  );
};

type ActionBoardButtonRowChildProps = {
  children:
    | ReactNode
    | ReactFragment
    | ReactPortal
    | boolean
    | null
    | undefined;
};
