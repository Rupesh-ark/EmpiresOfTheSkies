import React, { useState } from "react";

import buildSkyships from "../../boards_and_assets/player_boards/buttons/build_skyships.svg";
import conscriptLevies from "../../boards_and_assets/player_boards/buttons/conscript_levies.svg";
import dispatchSkyshipFleet from "../../boards_and_assets/player_boards/buttons/dispatch_skyship_fleet.svg";
import { ButtonRow } from "../ActionBoard/ActionBoardButtonRow";
import { MyGameProps } from "../../types";
import { PlayerBoardButton } from "./PlayerBoardButton";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ThemeProvider,
} from "@mui/material";
import { influencePrelatesTheme } from "../themes";
import FortuneOfWarCardDisplay from "./FortuneOfWarCardDisplay";
import ShipYardDisplay from "./ShipYardDisplay";
import FleetDisplay from "./FleetDisplay";
import WorldMap from "../WorldMap/WorldMap";
import { clearMoves, findPossibleDestinations } from "../../helpers/helpers";
import svgNameToElementMap from "../WorldMap/nameToElementMap";

// displays buttons which can build cathedrals, palaces and skyships
// also displays the button to imprison dissenters and to dispatch skyship fleets
export const PlayerBoard = (props: PlayerBoardProps) => {
  const [skyshipCount, setSkyshipCount] = useState(0);
  const [regimentCount, setRegimentCount] = useState(0);
  const [levyCount, setLevyCount] = useState(0);
  const [levyCountForDispatch, setLevyCountForDispatch] = useState(0);
  const [selectedFleet, setSelectedFleet] = useState(0);
  const [dispatchFleetMapVisible, setDispatchFleetMapVisible] = useState(false);
  const [fleetDestination, setFleetDestination] = useState([4, 0]);

  let fleets: JSX.Element[] = [];

  const playerInfo =
    props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer];
  const colour = playerInfo.colour;
  const prisoners = playerInfo.prisoners;
  const playerRegiments = playerInfo.resources.regiments;
  const playerSkyships = playerInfo.resources.skyships;
  const playerLevies = playerInfo.resources.levies;
  playerInfo.fleetInfo.forEach((fleet) => {
    fleets.push(
      <FleetDisplay
        {...fleet}
        onClickFunction={(fleetId: number) => {
          setSelectedFleet(fleetId);
        }}
        selected={selectedFleet}
        key={`Fleet display-${fleet.fleetId}`}
      ></FleetDisplay>
    );
  });
  let currentFleet = playerInfo.fleetInfo[selectedFleet];

  const fortuneOfWarCards: JSX.Element[] = [];

  for (let i = 0; i < 4; i++) {
    fortuneOfWarCards.push(
      <FortuneOfWarCardDisplay
        {...props}
        value={i}
        key={`FoWCardDisplay-${i}`}
      ></FortuneOfWarCardDisplay>
    );
  }

  const currentFleetAlreadyDispatched =
    currentFleet.location[0] !== 4 || currentFleet.location[1] !== 0;

  if (currentFleetAlreadyDispatched) {
    if (skyshipCount > 0) {
      setSkyshipCount(0);
    }
    if (levyCountForDispatch > 0) {
      setLevyCountForDispatch(0);
    }
    if (regimentCount > 0) {
      setRegimentCount(0);
    }
  }

  const dispatchDisabled =
    props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer]
      .playerBoardCounsellorLocations.dispatchSkyshipFleet;
  return (
    <ThemeProvider theme={influencePrelatesTheme}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          marginLeft: "20px",
          marginRight: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            alignContent: "center",
            maxWidth: 1220,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: "75%",
              marginRight: 10,
            }}
          >
            <ButtonRow>
              Build Skyships
              <PlayerBoardButton
                onClick={() => {
                  props.moves.enableDispatchButtons(true);
                  props.moves.buildSkyships();
                }}
                counsellor={
                  playerInfo?.playerBoardCounsellorLocations.buildSkyships
                }
                backgroundImage={buildSkyships}
                width="59px"
                height="59px"
                colour={colour}
                {...props}
              />
            </ButtonRow>
            <ButtonRow>
              Conscript Levies
              <PlayerBoardButton
                onClick={() => {
                  props.moves.enableDispatchButtons(true);
                  props.moves.conscriptLevies(levyCount);
                }}
                backgroundImage={conscriptLevies}
                colour={colour}
                width="130px"
                height="59px"
                counsellor={
                  playerInfo?.playerBoardCounsellorLocations.conscriptLevies
                }
                {...props}
              />{" "}
              <Button
                onClick={() => {
                  setLevyCount(levyCount + 3);
                }}
                sx={{
                  backgroundColor: "transparent",
                  border: "none",
                  width: "30px",
                  height: "100%",
                  fontSize: "30px",
                  cursor: "pointer",
                  color: "#000000",
                }}
                disabled={levyCount === 12}
              >
                +
              </Button>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  color: "#000000",
                }}
              >
                {levyCount}
                <svg
                  width="28"
                  height="100%"
                  viewBox="0 0 28 31"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M14.1211 1L20.6815 4.57861L27.2424 8.1569L20.6814 12.2358L14.1814 15.7358L7.56055 11.7358L1 8.00002L7.56055 4.57861L14.1211 1Z"
                    fill="#B1B2B2"
                    stroke="#1A1A18"
                    strokeWidth="0.288"
                    strokeMiterlimit="22.9256"
                  />
                  <path
                    d="M1.54036 22.6996L1.36064 15.468L1.1814 8.23584L7.6814 11.7358L14.1812 15.7358V22.7358V30.2358L7.86088 26.4677L1.54036 22.6996Z"
                    fill="#B1B2B2"
                    stroke="#1A1A18"
                    strokeWidth="0.288"
                    strokeMiterlimit="22.9256"
                  />
                  <path
                    d="M14.1814 15.7358L20.8609 12.0039L27.1814 8.23584L27.0018 15.4681L26.8224 22.7001L20.5019 26.4677L14.1814 30.2358V23.2358V15.7358Z"
                    fill="#B1B2B2"
                    stroke="#1A1A18"
                    strokeWidth="0.288"
                    strokeMiterlimit="22.9256"
                  />
                </svg>
              </div>
              <Button
                onClick={() => {
                  setLevyCount(levyCount - 3);
                }}
                sx={{
                  backgroundColor: "transparent",
                  border: "none",
                  width: "30px",
                  height: "100%",
                  fontSize: "30px",
                  cursor: "pointer",
                  color: "#000000",
                }}
                disabled={levyCount === 0}
              >
                -
              </Button>
            </ButtonRow>
            <ButtonRow>
              Dispatch Skyship Fleet
              <PlayerBoardButton
                onClick={() => {
                  setDispatchFleetMapVisible(true);
                }}
                backgroundImage={dispatchSkyshipFleet}
                colour={colour}
                height="70px"
                width="60px"
                counsellor={
                  playerInfo?.playerBoardCounsellorLocations
                    .dispatchSkyshipFleet
                }
                {...props}
              />
            </ButtonRow>
            <ButtonRow>
              Construct Skyship Fleet
              <Button
                onClick={() => {
                  setSkyshipCount(skyshipCount + 1);
                }}
                sx={{
                  backgroundColor: "transparent",
                  border: "none",
                  width: "30px",
                  height: "100%",
                  fontSize: "30px",
                  cursor: dispatchDisabled ? "not-allowed" : "pointer",
                  color: dispatchDisabled ? "grey" : "#000000",
                }}
                disabled={
                  dispatchDisabled ||
                  currentFleetAlreadyDispatched ||
                  skyshipCount >= 5 ||
                  skyshipCount >= playerSkyships
                }
              >
                +
              </Button>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  color: dispatchDisabled ? "grey" : "#000000",
                }}
              >
                {skyshipCount}
                <svg
                  width="44"
                  height="100%"
                  viewBox="0 0 44 17"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <span>Skyships</span>
                  <path
                    d="M704.447 -37.4065V240.156H-27.5886V-37.4065H704.447Z"
                    stroke="#1A1A18"
                    strokeWidth="2.6664"
                    strokeMiterlimit="22.9256"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M21.8461 7.19031C33.4021 7.19031 42.7695 9.14218 42.7695 11.5496C42.7695 13.9572 33.4021 15.9086 21.8461 15.9086C10.2902 15.9086 0.922607 13.9572 0.922607 11.5496C0.922607 9.14218 10.2902 7.19031 21.8461 7.19031Z"
                    fill={colour}
                  />
                  <path
                    d="M21.8461 7.19031C33.4021 7.19031 42.7695 9.14217 42.7695 11.5496C42.7695 13.9572 33.4021 15.9086 21.8461 15.9086C10.2902 15.9086 0.922607 13.9572 0.922607 11.5496C0.922607 9.14217 10.2902 7.19031 21.8461 7.19031Z"
                    stroke="#1A1A18"
                    strokeWidth="0.288"
                    strokeMiterlimit="22.9256"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M0.486328 5.44613H42.4033V12.4204H0.486328V5.44613Z"
                    fill={colour}
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M22.0358 1.32971C33.5918 1.32971 42.9592 3.28117 42.9592 5.68864C42.9592 8.09624 33.5918 10.048 22.0358 10.048C10.4799 10.048 1.1123 8.09624 1.1123 5.68864C1.1123 3.28117 10.4799 1.32971 22.0358 1.32971Z"
                    fill={colour}
                  />
                  <path
                    d="M22.0358 1.32971C33.5918 1.32971 42.9592 3.28117 42.9592 5.68864C42.9592 8.09624 33.5918 10.048 22.0358 10.048C10.4799 10.048 1.1123 8.09624 1.1123 5.68864C1.1123 3.28117 10.4799 1.32971 22.0358 1.32971Z"
                    stroke="#1A1A18"
                    strokeWidth="0.288"
                    strokeMiterlimit="22.9256"
                  />
                </svg>
              </div>
              <Button
                onClick={() => {
                  if (skyshipCount === regimentCount) {
                    setSkyshipCount(skyshipCount - 1);
                    setRegimentCount(regimentCount - 1);
                  } else {
                    setSkyshipCount(skyshipCount - 1);
                  }
                }}
                sx={{
                  backgroundColor: "transparent",
                  border: "none",
                  width: "30px",
                  height: "100%",
                  fontSize: "30px",
                  cursor: dispatchDisabled ? "not-allowed" : "pointer",
                  color: dispatchDisabled ? "grey" : "#000000",
                }}
                disabled={
                  dispatchDisabled ||
                  skyshipCount <= 0 ||
                  currentFleetAlreadyDispatched
                }
              >
                -
              </Button>
              <Button
                onClick={() => {
                  setRegimentCount(regimentCount + 1);
                }}
                sx={{
                  backgroundColor: "transparent",
                  border: "none",
                  width: "30px",
                  height: "100%",
                  fontSize: "30px",
                  cursor: dispatchDisabled ? "not-allowed" : "pointer",
                  color: dispatchDisabled ? "grey" : "#000000",
                }}
                disabled={
                  dispatchDisabled ||
                  currentFleetAlreadyDispatched ||
                  regimentCount + levyCountForDispatch >= skyshipCount ||
                  regimentCount >= playerRegiments
                }
              >
                +
              </Button>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  color: dispatchDisabled ? "grey" : "#000000",
                }}
              >
                {regimentCount}
                <svg
                  width="28"
                  height="100%"
                  viewBox="0 0 28 31"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M14.1211 1L20.6815 4.57861L27.2424 8.1569L20.6814 12.2358L14.1814 15.7358L7.56055 11.7358L1 8.00002L7.56055 4.57861L14.1211 1Z"
                    fill={colour}
                    stroke="#1A1A18"
                    strokeWidth="0.288"
                    strokeMiterlimit="22.9256"
                  />
                  <path
                    d="M1.54036 22.6996L1.36064 15.468L1.1814 8.23584L7.6814 11.7358L14.1812 15.7358V22.7358V30.2358L7.86088 26.4677L1.54036 22.6996Z"
                    fill={colour}
                    stroke="#1A1A18"
                    strokeWidth="0.288"
                    strokeMiterlimit="22.9256"
                  />
                  <path
                    d="M14.1814 15.7358L20.8609 12.0039L27.1814 8.23584L27.0018 15.4681L26.8224 22.7001L20.5019 26.4677L14.1814 30.2358V23.2358V15.7358Z"
                    fill={colour}
                    stroke="#1A1A18"
                    strokeWidth="0.288"
                    strokeMiterlimit="22.9256"
                  />
                </svg>
              </div>
              <Button
                onClick={() => {
                  setRegimentCount(regimentCount - 1);
                }}
                sx={{
                  backgroundColor: "transparent",
                  border: "none",
                  width: "30px",
                  height: "100%",
                  fontSize: "30px",
                  cursor: dispatchDisabled ? "not-allowed" : "pointer",
                  color: dispatchDisabled ? "grey" : "#000000",
                }}
                disabled={dispatchDisabled || regimentCount <= 0}
              >
                -
              </Button>
              <Button
                onClick={() => {
                  setLevyCountForDispatch(levyCountForDispatch + 1);
                }}
                sx={{
                  backgroundColor: "transparent",
                  border: "none",
                  width: "30px",
                  height: "100%",
                  fontSize: "30px",
                  cursor: dispatchDisabled ? "not-allowed" : "pointer",
                  color: dispatchDisabled ? "grey" : "#000000",
                }}
                disabled={
                  dispatchDisabled ||
                  currentFleetAlreadyDispatched ||
                  regimentCount + levyCountForDispatch >= skyshipCount ||
                  levyCountForDispatch >= playerLevies
                }
              >
                +
              </Button>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  color: dispatchDisabled ? "grey" : "#000000",
                }}
              >
                {levyCountForDispatch}
                <svg
                  width="28"
                  height="100%"
                  viewBox="0 0 28 31"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M14.1211 1L20.6815 4.57861L27.2424 8.1569L20.6814 12.2358L14.1814 15.7358L7.56055 11.7358L1 8.00002L7.56055 4.57861L14.1211 1Z"
                    fill="#B1B2B2"
                    stroke="#1A1A18"
                    strokeWidth="0.288"
                    strokeMiterlimit="22.9256"
                  />
                  <path
                    d="M1.54036 22.6996L1.36064 15.468L1.1814 8.23584L7.6814 11.7358L14.1812 15.7358V22.7358V30.2358L7.86088 26.4677L1.54036 22.6996Z"
                    fill="#B1B2B2"
                    stroke="#1A1A18"
                    strokeWidth="0.288"
                    strokeMiterlimit="22.9256"
                  />
                  <path
                    d="M14.1814 15.7358L20.8609 12.0039L27.1814 8.23584L27.0018 15.4681L26.8224 22.7001L20.5019 26.4677L14.1814 30.2358V23.2358V15.7358Z"
                    fill="#B1B2B2"
                    stroke="#1A1A18"
                    strokeWidth="0.288"
                    strokeMiterlimit="22.9256"
                  />
                </svg>
              </div>
              <Button
                onClick={() => {
                  setLevyCountForDispatch(levyCountForDispatch - 1);
                }}
                sx={{
                  backgroundColor: "transparent",
                  border: "none",
                  width: "30px",
                  height: "100%",
                  fontSize: "30px",
                  cursor: dispatchDisabled ? "not-allowed" : "pointer",
                  color: dispatchDisabled ? "grey" : "#000000",
                }}
                disabled={
                  dispatchDisabled ||
                  levyCountForDispatch <= 0 ||
                  currentFleetAlreadyDispatched
                }
              >
                -
              </Button>
            </ButtonRow>
            <Dialog open={dispatchFleetMapVisible} maxWidth={false}>
              <DialogTitle>{`Select a tile to deploy your fleet to. 
Selected tile: [${fleetDestination[0] + 1}, ${
                4 - fleetDestination[1]
              }]`}</DialogTitle>
              <DialogContent>
                <WorldMap
                  {...props}
                  selectableTiles={
                    findPossibleDestinations(
                      props.G,
                      currentFleet.location,
                      currentFleet.regiments === 0 && currentFleet.levies === 0
                    )[0]
                  }
                  alternateOnClick={(coords: number[]) => {
                    setFleetDestination(coords);
                  }}
                ></WorldMap>
              </DialogContent>
              <DialogActions>
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => {
                    clearMoves(props);
                    setDispatchFleetMapVisible(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={
                    fleetDestination[0] === 4 && fleetDestination[1] === 0
                  }
                  variant="contained"
                  color="success"
                  onClick={() => {
                    setRegimentCount(0);
                    setLevyCountForDispatch(0);
                    setSkyshipCount(0);
                    props.moves.enableDispatchButtons(true);
                    props.moves.deployFleet(
                      selectedFleet,
                      fleetDestination,
                      skyshipCount,
                      regimentCount,
                      levyCountForDispatch
                    );
                    setDispatchFleetMapVisible(false);
                  }}
                >
                  Confirm
                </Button>
              </DialogActions>
            </Dialog>
            <ButtonRow>{fleets}</ButtonRow>
            <div style={{ display: "flex", flexDirection: "row" }}>
              {fortuneOfWarCards}
              <svg
                style={{
                  backgroundImage: `url(${
                    svgNameToElementMap[
                      props.G.playerInfo[
                        props.playerID ?? props.ctx.currentPlayer
                      ].resources.legacyCard ?? "the builder"
                    ]
                  })`,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "contain",
                  width: "137px",
                  height: "250px",
                  margin: "5px",
                }}
              ></svg>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: "25%",
              marginLeft: 10,
            }}
          >
            <ButtonRow>
              Prison
              <svg
                width="124"
                height="59"
                viewBox="0 0 124 59"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <line
                  x1="69.5"
                  y1="1"
                  x2="69.5"
                  y2="58"
                  stroke="black"
                  strokeWidth="3"
                />
                <line
                  x1="83.5"
                  y1="1"
                  x2="83.5"
                  y2="58"
                  stroke="black"
                  strokeWidth="3"
                />
                <path
                  d="M25.6596 15.0001C30.5371 15.0001 34.4903 19.9215 34.4903 25.9921C34.4903 32.0624 30.5371 36.9844 25.6596 36.9844C20.7831 36.9844 16.8296 32.0624 16.8296 25.9921C16.8296 19.9215 20.7831 15.0001 25.6596 15.0001Z"
                  fill={colour}
                  stroke="#1A1A18"
                  strokeWidth="0.288"
                  strokeMiterlimit="22.9256"
                  visibility={prisoners >= 1 ? "visible" : "hidden"}
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M26.0001 55.1782H8C8 44.711 16.0589 36.2265 26.0001 36.2265C35.9411 36.2265 44 44.711 44 55.1782H26.0001Z"
                  fill={colour}
                  visibility={prisoners >= 1 ? "visible" : "hidden"}
                />
                <path
                  d="M61.6596 15.0001C66.5371 15.0001 70.4903 19.9215 70.4903 25.9921C70.4903 32.0624 66.5371 36.9844 61.6596 36.9844C56.7831 36.9844 52.8296 32.0624 52.8296 25.9921C52.8296 19.9215 56.7831 15.0001 61.6596 15.0001Z"
                  fill={colour}
                  stroke="#1A1A18"
                  strokeWidth="0.288"
                  strokeMiterlimit="22.9256"
                  visibility={prisoners >= 2 ? "visible" : "hidden"}
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M62.0001 55.1782H44C44 44.711 52.0589 36.2265 62.0001 36.2265C71.9411 36.2265 80 44.711 80 55.1782H62.0001Z"
                  fill={colour}
                  visibility={prisoners >= 2 ? "visible" : "hidden"}
                />
                <path
                  d="M98.6596 15.0001C103.537 15.0001 107.49 19.9215 107.49 25.9921C107.49 32.0624 103.537 36.9844 98.6596 36.9844C93.7831 36.9844 89.8296 32.0624 89.8296 25.9921C89.8296 19.9215 93.7831 15.0001 98.6596 15.0001Z"
                  fill={colour}
                  stroke="#1A1A18"
                  strokeWidth="0.288"
                  strokeMiterlimit="22.9256"
                  visibility={prisoners >= 3 ? "visible" : "hidden"}
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M99.0001 55.1782H81C81 44.711 89.0589 36.2265 99.0001 36.2265C108.941 36.2265 117 44.711 117 55.1782H99.0001Z"
                  fill={colour}
                  visibility={prisoners >= 3 ? "visible" : "hidden"}
                />
                <line
                  x1="76.5"
                  y1="1"
                  x2="76.5"
                  y2="58"
                  stroke="black"
                  strokeWidth="3"
                />
                <line
                  x1="69.5"
                  y1="1"
                  x2="69.5"
                  y2="58"
                  stroke="black"
                  strokeWidth="3"
                />
                <line
                  x1="62.5"
                  y1="1"
                  x2="62.5"
                  y2="58"
                  stroke="black"
                  strokeWidth="3"
                />
                <line
                  x1="35.5"
                  y1="1"
                  x2="35.5"
                  y2="58"
                  stroke="black"
                  strokeWidth="3"
                />
                <line
                  x1="42.5"
                  y1="1"
                  x2="42.5"
                  y2="58"
                  stroke="black"
                  strokeWidth="3"
                />
                <line
                  x1="49.5"
                  y1="1"
                  x2="49.5"
                  y2="58"
                  stroke="black"
                  strokeWidth="3"
                />
                <line
                  x1="116.5"
                  y1="1"
                  x2="116.5"
                  y2="58"
                  stroke="black"
                  strokeWidth="3"
                />
                <line
                  x1="42.5"
                  y1="1"
                  x2="42.5"
                  y2="58"
                  stroke="black"
                  strokeWidth="3"
                />
                <line
                  x1="56.5"
                  y1="1"
                  x2="56.5"
                  y2="58"
                  stroke="black"
                  strokeWidth="3"
                />
                <line
                  x1="7.5"
                  y1="1"
                  x2="7.5"
                  y2="58"
                  stroke="black"
                  strokeWidth="3"
                />
                <line
                  x1="14.5"
                  y1="1"
                  x2="14.5"
                  y2="58"
                  stroke="black"
                  strokeWidth="3"
                />
                <line
                  x1="21.5"
                  y1="1"
                  x2="21.5"
                  y2="58"
                  stroke="black"
                  strokeWidth="3"
                />
                <line
                  x1="14.5"
                  y1="1"
                  x2="14.5"
                  y2="58"
                  stroke="black"
                  strokeWidth="3"
                />
                <line
                  x1="28.5"
                  y1="1"
                  x2="28.5"
                  y2="58"
                  stroke="black"
                  strokeWidth="3"
                />
                <rect x="0.5" y="0.5" width="123" height="58" stroke="black" />
                <line
                  x1="89.5"
                  y1="1"
                  x2="89.5"
                  y2="58"
                  stroke="black"
                  strokeWidth="3"
                />
                <line
                  x1="96.5"
                  y1="1"
                  x2="96.5"
                  y2="58"
                  stroke="black"
                  strokeWidth="3"
                />
                <line
                  x1="103.5"
                  y1="1"
                  x2="103.5"
                  y2="58"
                  stroke="black"
                  strokeWidth="3"
                />
                <line
                  x1="96.5"
                  y1="1"
                  x2="96.5"
                  y2="58"
                  stroke="black"
                  strokeWidth="3"
                />
                <line
                  x1="110.5"
                  y1="1"
                  x2="110.5"
                  y2="58"
                  stroke="black"
                  strokeWidth="3"
                />
              </svg>
            </ButtonRow>
            Shipyards
            <ShipYardDisplay {...props} />
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};

interface PlayerBoardProps extends MyGameProps {}
