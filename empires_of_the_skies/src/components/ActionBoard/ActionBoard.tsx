import { ReactNode, useState } from "react";
import { fonts } from "../../designTokens";
// import { ReactComponent as ActionBoardSvg } from "../boards_and_assets/action_board.svg";
import { ActionBoardButton, ActionBoardButtonLarge } from "./ActionBoardButton";
import playerOrderTile from "../../boards_and_assets/player_order_tile.svg";
import recuitCounsillor1 from "../../boards_and_assets/recruit_counsillor1.svg";
import recuitCounsillor2 from "../../boards_and_assets/recruit_counsillor2.svg";
import recuitCounsillor3 from "../../boards_and_assets/recruit_counsillor3.svg";
import recruitRegiments1 from "../../boards_and_assets/recruit_regiments1.svg";
import recruitRegiments2 from "../../boards_and_assets/recruit_regiments2.svg";
import recruitRegiments3 from "../../boards_and_assets/recruit_regiments3.svg";
import recruitRegiments4 from "../../boards_and_assets/recruit_regiments4.svg";
import recruitRegiments5 from "../../boards_and_assets/recruit_regiments5.svg";
import recruitRegiments6 from "../../boards_and_assets/recruit_regiments6.svg";
import purchaseSkyshipsZeeland1 from "../../boards_and_assets/build_skyships_zeeland1.svg";
import purchaseSkyshipsZeeland2 from "../../boards_and_assets/build_skyships_zeeland2.svg";
import purchaseSkyshipsVenoa1 from "../../boards_and_assets/build_skyships_venoa1.svg";
import purchaseSkyshipsVenoa2 from "../../boards_and_assets/build_skyships_venoa2.svg";
import buildCathedral from "../../boards_and_assets/build_cathedral.svg";
import buildPalace from "../../boards_and_assets/build_palace.svg";
import buildShipyard from "../../boards_and_assets/build_shipyards.svg";
import buildForts from "../../boards_and_assets/build_forts.svg";
import punishDissenters1 from "../../boards_and_assets/punish_dissenters1.svg";
import punishDissenters2 from "../../boards_and_assets/punish_dissenters2.svg";
import punishDissenters3 from "../../boards_and_assets/punish_dissenters3.svg";
import punishDissenters4 from "../../boards_and_assets/punish_dissenters4.svg";
import punishDissenters5 from "../../boards_and_assets/punish_dissenters5.svg";
import punishDissenters6 from "../../boards_and_assets/punish_dissenters6.svg";
import convertMonarch1 from "../../boards_and_assets/convert_monarch1.svg";
import convertMonarch2 from "../../boards_and_assets/convert_monarch2.svg";
import convertMonarch3 from "../../boards_and_assets/convert_monarch3.svg";
import convertMonarch4 from "../../boards_and_assets/convert_monarch4.svg";
import convertMonarch5 from "../../boards_and_assets/convert_monarch5.svg";
import convertMonarch6 from "../../boards_and_assets/convert_monarch6.svg";
import issueHolyDecree from "../../boards_and_assets/issue_holy_decree.svg";
import { MyGameProps, PlayerColour } from "@eots/game";
import { ThemeProvider } from "@emotion/react";
import { generalTheme, influencePrelatesTheme } from "../themes";
import { Box, Button, Typography } from "@mui/material";
import HolyDecreeDialog from "./HolyDecreeDialog";
import CounsellorIcon from "../Icons/CounsellorIcon";

const rowBadgeStyle = {
  fontSize: "11px",
  border: "1px solid rgba(32,58,84,0.2)",
  borderRadius: "999px",
  padding: "2px 9px",
  backgroundColor: "rgba(225, 236, 246, 0.78)",
  color: "#1f3b58",
  lineHeight: 1.3,
};

const RowHeader = ({
  label,
  meta,
  badges,
  accent,
}: {
  label: string;
  meta?: Array<{ label: string; value: string }>;
  badges?: string[];
  accent?: string;
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.75,
        maxWidth: "100%",
        borderLeft: `4px solid ${accent ?? "#386fa4"}`,
        pl: 1,
      }}
    >
      <Typography
        sx={{
          fontFamily: fonts.system,
          fontWeight: 800,
          whiteSpace: "pre-line",
          lineHeight: 1.1,
          fontSize: "1.02rem",
          color: "#1a2733",
        }}
      >
        {label}
      </Typography>
      {meta && meta.length > 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.2 }}>
          {meta.map((item) => (
            <Typography
              key={`${item.label}-${item.value}`}
              sx={{
                fontFamily: fonts.system,
                fontSize: "0.9rem",
                lineHeight: 1.25,
                color: "rgba(0,0,0,0.74)",
              }}
            >
              <Box
                component="span"
                sx={{ fontWeight: 700, color: "#2b445e", mr: 0.5 }}
              >
                {item.label}:
              </Box>
              {item.value}
            </Typography>
          ))}
        </Box>
      ) : null}
      {badges && badges.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "2px" }}>
          {badges.map((badge, index) => (
            <span key={`${badge}-${index}`} style={rowBadgeStyle}>
              {badge}
            </span>
          ))}
        </div>
      ) : null}
    </Box>
  );
};

const ActionRow = ({
  header,
  children,
}: {
  header: ReactNode;
  children: ReactNode;
}) => {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "360px minmax(0, 1fr)" },
        columnGap: 1.5,
        rowGap: 1,
        alignItems: "center",
        mb: 1.5,
        p: { xs: 1.1, lg: 1.3 },
        borderRadius: 2,
        border: "1px solid rgba(15,23,42,0.12)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(246,248,251,0.95) 100%)",
        boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
      }}
    >
      <Box sx={{ minWidth: 0 }}>{header}</Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "flex-start" }}>
        {children}
      </Box>
    </Box>
  );
};

//method which returns the complete action board

export const ActionBoard = (props: ActionBoardProps) => {
  const [holyDegreeOpen, setHolyDegreeOpen] = useState(false);
  let isArchPrelate = false;
  if (props.playerID) {
    isArchPrelate = props.G.playerInfo[props.playerID].isArchprelate;
  }
  return (
    <ThemeProvider theme={generalTheme}>
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          marginLeft: "20px",
          marginRight: "20px",
        }}
      >
        {/* establishing a column for the different classes of moves to be displayed in */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: 1600,
            // minWidth: 1220,
          }}
        >
          {/* button row with the player order buttons */}
          <ActionRow
            header={
              <RowHeader
                label={"Alter Player\nOrder"}
                meta={[
                  { label: "Timing", value: "Applies at Reset" },
                  { label: "Taxes", value: "1st 4g -> 6th 9g" },
                ]}
                accent="#2a7fa5"
              />
            }
          >
            {generateButtonsList(
              6,
              props.moves.alterPlayerOrder,
              Array(6).fill(playerOrderTile),
              "98px",
              props,
              props.G.boardState.pendingPlayerOrder,
              undefined,
              [
                "#9EE8FF",
                "#9EE8FF",
                "#9EE8FF",
                "#9EE8FF",
                "#9EE8FF",
                "#9EE8FF",
              ],
              false,
              ["1st\t", "2nd\t", "3rd\t", "4th\t", "5th\t", "6th\t"]
            )}
          </ActionRow>
          {/* button row with the recruit counsellor buttons */}
          <ActionRow
            header={
              <RowHeader
                label="Recruit Counsellors"
                meta={[
                  { label: "Cost", value: "1g + row count" },
                  { label: "Gain", value: "+1 counsellor" },
                  { label: "Max", value: "7" },
                ]}
                accent="#6b7280"
              />
            }
          >
            {generateButtonsList(
              3,
              props.moves.recruitCounsellors,
              [recuitCounsillor1, recuitCounsillor2, recuitCounsillor3],
              "98px",
              props,
              props.G.boardState.recruitCounsellors
            )}
          </ActionRow>
          {/* button row with the recruit regiments buttons  */}
          <ActionRow
            header={
              <RowHeader
                label="Recruit Regiments"
                meta={[
                  { label: "Cost", value: "1g + row count" },
                  { label: "Gain", value: "+4 regiments in kingdom" },
                  { label: "Max", value: "30" },
                ]}
                accent="#4b5563"
              />
            }
          >
            {generateButtonsList(
              6,
              props.moves.recruitRegiments,

              [
                recruitRegiments1,
                recruitRegiments2,
                recruitRegiments3,
                recruitRegiments4,
                recruitRegiments5,
                recruitRegiments6,
              ],
              "98px",
              props,
              props.G.boardState.recruitRegiments
            )}
          </ActionRow>
          {/* button row with the purchase skyships (Zeeland) buttons */}
          <ActionRow
            header={
              <RowHeader
                label="Purchase Skyships (Zeeland)"
                meta={[
                  { label: "Cost", value: "2g + row count" },
                  { label: "Gain", value: "+2 skyships from Zeeland" },
                  { label: "Max", value: "24" },
                ]}
                accent="#c77700"
              />
            }
          >
            {([0, 1] as const).map((i) => (
              <ActionBoardButton
                key={`zeeland-slot-${i + 1}`}
                onClickFunction={(slot) => props.moves.purchaseSkyships(slot, "zeeland")}
                backgroundImage={[purchaseSkyshipsZeeland1, purchaseSkyshipsZeeland2][i]}
                backgroundColour="#FE9F10"
                text=""
                width="98px"
                value={i}
                counsellor={props.G.boardState.purchaseSkyshipsZeeland[i + 1 as 1 | 2]}
                {...props}
              />
            ))}
          </ActionRow>
          {/* button row with the purchase skyships (Venoa) buttons */}
          <ActionRow
            header={
              <RowHeader
                label="Purchase Skyships (Venoa)"
                meta={[
                  { label: "Cost", value: "2g + row count" },
                  { label: "Gain", value: "+2 skyships from Venoa" },
                  { label: "Max", value: "24" },
                ]}
                accent="#b54785"
              />
            }
          >
            {([0, 1] as const).map((i) => (
              <ActionBoardButton
                key={`venoa-slot-${i + 1}`}
                onClickFunction={(slot) => props.moves.purchaseSkyships(slot, "venoa")}
                backgroundImage={[purchaseSkyshipsVenoa1, purchaseSkyshipsVenoa2][i]}
                backgroundColour="#FE9ACC"
                text=""
                width="98px"
                value={i}
                counsellor={props.G.boardState.purchaseSkyshipsVenoa[i + 1 as 1 | 2]}
                {...props}
              />
            ))}
          </ActionRow>
          {/* button row with the found buildings buttons   */}
          <ActionRow
            header={
              <RowHeader
                label="Found Buildings"
                meta={[
                  {
                    label: "Costs",
                    value: "Cathedral 5g, Palace 5g, Shipyard 3g, Fort 2g",
                  },
                  { label: "Modifier", value: "+ row count cost" },
                ]}
                badges={["Cathedral: Orthodox only"]}
                accent="#2f9a68"
              />
            }
          >
            {generateButtonsList(
              4,
              props.moves.foundBuildings,

              [buildCathedral, buildPalace, buildShipyard, buildForts],
              "180px",
              props,
              undefined,
              props.G.boardState.foundBuildings,
              [],
              true
            )}
          </ActionRow>
          {/* button row with the found factory buttons */}
          <ActionRow
            header={
              <RowHeader
                label="Found Factories"
                meta={[
                  { label: "Cost", value: "1g + row count" },
                  { label: "Gain", value: "+1 factory" },
                  { label: "Max", value: "6" },
                ]}
                accent="#8f6f34"
              />
            }
          >
            {generateButtonsList(
              4,
              props.moves.foundFactory,
              [],
              "98px",
              props,
              props.G.boardState.foundFactories,
              undefined,
              ["#C8A96E", "#C8A96E", "#C8A96E", "#C8A96E"],
              false,
              ["Slot 1", "Slot 2", "Slot 3", "Slot 4"]
            )}
          </ActionRow>
          {/* button row with the influence prelates buttons */}
          <ActionRow
            header={
              <RowHeader
                label="Influence Prelates"
                meta={[
                  { label: "Own Slot", value: "Free" },
                  { label: "Realm Slot", value: "1g" },
                  { label: "Rival Slot", value: "Pay cathedral count in gold" },
                ]}
                accent="#6f7f8e"
              />
            }
          >
            <ThemeProvider theme={influencePrelatesTheme}>
              {generateButtonsList(
                8,
                props.moves.influencePrelates,
                [],
                "10px",
                props,
                props.G.boardState.influencePrelates,
                undefined,
                [
                  PlayerColour.red,
                  PlayerColour.blue,
                  PlayerColour.yellow,
                  "#FE9F10",
                  "#FE9ACC",
                  PlayerColour.brown,
                  PlayerColour.white,
                  PlayerColour.green,
                ],
                false,
                [
                  "Angland",
                  "Gallois",
                  "Castillia",
                  "Zeeland",
                  "Venoa",
                  "Nordmark",
                  "Ostreich",
                  "Constantium",
                ]
              )}
            </ThemeProvider>
          </ActionRow>
          {/* button row with the punish dissenters buttons  */}
          <ActionRow
            header={
              <RowHeader
                label="Punish Dissenters"
                meta={[
                  { label: "Cost", value: "2g or 1 unspent counsellor" },
                  { label: "Shift", value: "Heresy up/down (up to 3)" },
                  { label: "Penalty", value: "Execution is -1 VP each" },
                ]}
                accent="#437ca0"
              />
            }
          >
            {generateButtonsList(
              6,
              props.moves.punishDissenters,

              [
                punishDissenters1,
                punishDissenters2,
                punishDissenters3,
                punishDissenters4,
                punishDissenters5,
                punishDissenters6,
              ],
              "52px",
              props,
              props.G.boardState.punishDissenters,
              undefined,
              ["#9EE8FF", "#9EE8FF", "#9EE8FF", "#9EE8FF", "#9EE8FF", "#9EE8FF"]
            )}
          </ActionRow>
          {/* button row with the convert monarch buttons   */}
          <ActionRow
            header={
              <RowHeader
                label="Convert Monarch"
                meta={[
                  { label: "Cost", value: "2g + 1 unspent counsellor" },
                  { label: "Effect", value: "Flip Orthodox/Heretic" },
                  { label: "Also", value: "Release imprisoned dissenters" },
                ]}
                accent="#3a7f95"
              />
            }
          >
            {generateButtonsList(
              6,
              props.moves.convertMonarch,

              [
                convertMonarch1,
                convertMonarch2,
                convertMonarch3,
                convertMonarch4,
                convertMonarch5,
                convertMonarch6,
              ],
              "52px",
              props,
              props.G.boardState.convertMonarch,
              undefined,
              ["#9EE8FF", "#9EE8FF", "#9EE8FF", "#9EE8FF", "#9EE8FF", "#9EE8FF"]
            )}
          </ActionRow>
          {/* button row with the issue holy decree button    */}
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
                  setHolyDegreeOpen(true);
                }
              }}
              style={{
                width: "200px",
                height: "70px",
                textAlign: "left",
                backgroundImage: `url(${issueHolyDecree})`,
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
            open={holyDegreeOpen}
            {...props}
            setOpen={setHolyDegreeOpen}
          />
        </div>
      </div>
    </ThemeProvider>
  );
};

// generic method to generate a list of buttons to be displayed on the action board
export const generateButtonsList = (
  numberOfButtons: number,
  onClickFunction: () => void,
  listOfBackgroundImages: string[],
  buttonWidth: string,
  // flag to opt for large buttons instead of regular sized buttons
  props: ActionBoardProps,
  counsellor?: { [key: string]: string | undefined },
  counsellors?: { [key: string]: string[] | undefined },
  backgroundColor?: string[],
  large?: boolean,
  listOfText?: string[]
) => {
  let buttonList = [];
  for (let i = 0; i < numberOfButtons; i++) {
    buttonList.push(
      large ? (
        <ActionBoardButtonLarge
          onClickFunction={onClickFunction}
          backgroundImage={listOfBackgroundImages[i]}
          text={listOfText ? listOfText[i] : ""}
          width={buttonWidth}
          key={`button ${i} large`}
          counsellors={counsellors ? counsellors[i + 1] : undefined}
          {...props}
          value={i}
        />
      ) : (
        <ActionBoardButton
          onClickFunction={onClickFunction}
          backgroundImage={listOfBackgroundImages[i]}
          backgroundColour={backgroundColor ? backgroundColor[i] : undefined}
          text={listOfText ? listOfText[i] : ""}
          width={buttonWidth}
          key={`button ${i} regular`}
          counsellor={counsellor ? counsellor[i + 1] : undefined}
          {...props}
          value={i}
        />
      )
    );
  }
  return buttonList;
};

interface ActionBoardProps extends MyGameProps {}
