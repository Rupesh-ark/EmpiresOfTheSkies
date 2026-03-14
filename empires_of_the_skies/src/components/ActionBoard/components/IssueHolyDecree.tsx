import { useState } from "react";
import { Button } from "@mui/material";
import { fonts } from "@/designTokens";
import { ActionRow, RowHeader, ActionBoardProps } from "./shared";
import { ISSUE_HOLY_DECREE } from "@/assets/actionBoard";
import HolyDecreeDialog from "./HolyDecreeDialog";
import CounsellorIcon from "@/components/Icons/CounsellorIcon";

const IssueHolyDecree = (props: ActionBoardProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const isArchPrelate =
    props.playerID
      ? props.G.playerInfo[props.playerID].isArchprelate
      : false;

  return (
    <>
      <ActionRow
        header={
          <RowHeader
            label="Issue Holy Decree"
            meta={[
              {
                label: "Choose",
                value: "Bless, Curse, Reform Dogma, or Confirm Dogma",
              },
            ]}
            badges={["Archprelate only", "Once per round"]}
            accent="#8b3a3a"
          />
        }
      >
        <Button
          disabled={
            !isArchPrelate ||
            props.G.boardState.issueHolyDecree ||
            props.playerID !== props.ctx.currentPlayer
          }
          onClick={() => {
            if (isArchPrelate) {
              setDialogOpen(true);
            }
          }}
          style={{
            width: "200px",
            height: "70px",
            textAlign: "left",
            backgroundImage: `url(${ISSUE_HOLY_DECREE})`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            fontFamily: fonts.primary,
            fontSize: "18px",
            cursor: "pointer",
            justifyContent: "right",
          }}
        >
          {props.G.boardState.issueHolyDecree ? (
            <CounsellorIcon colour="#AD4482" />
          ) : null}
        </Button>
      </ActionRow>
      <HolyDecreeDialog
        open={dialogOpen}
        {...props}
        setOpen={setDialogOpen}
      />
    </>
  );
};

export default IssueHolyDecree;
