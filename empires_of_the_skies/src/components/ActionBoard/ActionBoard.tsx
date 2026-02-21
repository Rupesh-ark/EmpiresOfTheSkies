import { useState } from "react";
import "../../App.css";
// import { ReactComponent as ActionBoardSvg } from "../boards_and_assets/action_board.svg";
import { ActionBoardButton, ActionBoardButtonLarge } from "./ActionBoardButton";
import { ButtonRow } from "./ActionBoardButtonRow";
import playerOrderTile from "../../boards_and_assets/player_order_tile.svg";
import recuitCounsillor1 from "../../boards_and_assets/recruit_counsillor1.svg";
import recuitCounsillor2 from "../../boards_and_assets/recruit_counsillor2.svg";
import recuitCounsillor3 from "../../boards_and_assets/recruit_counsillor3.svg";
import trainTroops1 from "../../boards_and_assets/train_troops1.svg";
import trainTroops2 from "../../boards_and_assets/train_troops2.svg";
import recruitRegiments1 from "../../boards_and_assets/recruit_regiments1.svg";
import recruitRegiments2 from "../../boards_and_assets/recruit_regiments2.svg";
import recruitRegiments3 from "../../boards_and_assets/recruit_regiments3.svg";
import recruitRegiments4 from "../../boards_and_assets/recruit_regiments4.svg";
import recruitRegiments5 from "../../boards_and_assets/recruit_regiments5.svg";
import recruitRegiments6 from "../../boards_and_assets/recruit_regiments6.svg";
import purchaseSkyships1 from "../../boards_and_assets/build_skyships_zeeland1.svg";
import purchaseSkyships2 from "../../boards_and_assets/build_skyships_zeeland2.svg";
import purchaseSkyships3 from "../../boards_and_assets/build_skyships_zeeland3.svg";
import purchaseSkyships4 from "../../boards_and_assets/build_skyships_venoa1.svg";
import purchaseSkyships5 from "../../boards_and_assets/build_skyships_venoa2.svg";
import purchaseSkyships6 from "../../boards_and_assets/build_skyships_venoa3.svg";
import buildCathedral from "../../boards_and_assets/build_cathedral.svg";
import buildPalace from "../../boards_and_assets/build_palace.svg";
import buildShipyard from "../../boards_and_assets/build_shipyards.svg";
import buildForts from "../../boards_and_assets/build_forts.svg";
import InfluencePrelatesExplanation from "../../boards_and_assets/influence_prelates_explination.svg";
import PunishDissenters from "../../boards_and_assets/punish_dissenters_explination.svg";
import punishDissenters1 from "../../boards_and_assets/punish_dissenters1.svg";
import punishDissenters2 from "../../boards_and_assets/punish_dissenters2.svg";
import punishDissenters3 from "../../boards_and_assets/punish_dissenters3.svg";
import punishDissenters4 from "../../boards_and_assets/punish_dissenters4.svg";
import punishDissenters5 from "../../boards_and_assets/punish_dissenters5.svg";
import punishDissenters6 from "../../boards_and_assets/punish_dissenters6.svg";
import ConvertMonarchExplanation from "../../boards_and_assets/convert_monarch_explination.svg";
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
import { Button, Tooltip } from "@mui/material";
import HolyDecreeDialog from "./HolyDecreeDialog";
import CounsellorIcon from "../Icons/CounsellorIcon";
import { InfoOutlined } from "@mui/icons-material";

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
            maxWidth: 1225,
            // minWidth: 1220,
          }}
        >
          {/* button row with the player order buttons */}
          <ButtonRow key={"player order buttons"}>
            {"Alter Player \n Order"}
            <Tooltip
              title={`Players are awarded taxes depending 
on their position in the order of play.
            
Taxation is awarded as follows:
1st: \t\t4 gold
2nd: \t5 gold
3rd: \t\t6 gold
4th: \t\t7 gold
5th: \t\t8 gold
6th: \t\t9 gold
            `}
            >
              <InfoOutlined />
            </Tooltip>
            {generateButtonsList(
              6,
              props.moves.alterPlayerOrder,
              Array(6).fill(playerOrderTile),
              "98px",
              props,
              props.G.boardState.alterPlayerOrder,
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
          </ButtonRow>
          {/* button row with the recruit counsellor buttons */}
          <ButtonRow key={"recruit counsellor buttons"}>
            Recruit Counsellors
            {generateButtonsList(
              3,
              props.moves.recruitCounsellors,
              [recuitCounsillor1, recuitCounsillor2, recuitCounsillor3],
              "98px",
              props,
              props.G.boardState.recruitCounsellors
            )}
            Train Troops
            {generateButtonsList(
              2,
              props.moves.trainTroops,
              [trainTroops1, trainTroops2],
              "98px",
              props,
              props.G.boardState.trainTroops
            )}
          </ButtonRow>
          {/* button row with the recruit regiments buttons  */}
          <ButtonRow key={"recruit regiments buttons"}>
            Recruit Regiments
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
          </ButtonRow>
          {/* button row with the purchase skyships buttons   */}
          <ButtonRow key={"purchase skyships buttons"}>
            Purchase Skyships
            {generateButtonsList(
              6,
              props.moves.purchaseSkyships,

              [
                purchaseSkyships1,
                purchaseSkyships2,
                purchaseSkyships3,
                purchaseSkyships4,
                purchaseSkyships5,
                purchaseSkyships6,
              ],
              "98px",
              props,
              props.G.boardState.purchaseSkyships,
              undefined,
              ["#FE9F10", "#FE9F10", "#FE9F10", "#FE9ACC", "#FE9ACC", "#FE9ACC"]
            )}
          </ButtonRow>
          {/* button row with the found buildings buttons   */}
          <ButtonRow key={"found buildings buttons"}>
            Found Buildings
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
          </ButtonRow>
          {/* button row with the influence prelates buttons */}
          <ButtonRow key={"influence prelates buttons"}>
            <ThemeProvider theme={influencePrelatesTheme}>
              <img src={InfluencePrelatesExplanation}></img>
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
          </ButtonRow>
          {/* button row with the punish dissenters buttons  */}
          <ButtonRow key={"punish dissenters buttons"}>
            <img src={PunishDissenters}></img>
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
          </ButtonRow>
          {/* button row with the convert monarch buttons   */}
          <ButtonRow key={"convert monarch buttons"}>
            <img src={ConvertMonarchExplanation}></img>
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
          </ButtonRow>
          {/* button row with the issue holy decree button    */}
          <ButtonRow key={"issue holy decree button"}>
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
                fontFamily: "dauphinn",
                fontSize: "18px",
                cursor: "pointer",
                justifyContent: "right",
              }}
            >
              {props.G.boardState.issueHolyDecree ? (
                <CounsellorIcon colour="#AD4482" />
              ) : null}
            </Button>
          </ButtonRow>
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
