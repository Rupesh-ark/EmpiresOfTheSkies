import React, { ReactNode, useState } from "react";

import buildSkyships from "../../boards_and_assets/player_boards/buttons/build_skyships.svg";
import conscriptLevies from "../../boards_and_assets/player_boards/buttons/conscript_levies.svg";
import dispatchSkyshipFleet from "../../boards_and_assets/player_boards/buttons/dispatch_skyship_fleet.svg";
import trainTroopsSvg from "../../boards_and_assets/train_troops1.svg";
import { findPossibleDestinations, MyGameProps } from "@eots/game";
import { PlayerBoardButton } from "./PlayerBoardButton";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ThemeProvider,
  Typography,
} from "@mui/material";
import { influencePrelatesTheme } from "../themes";
import { colors, fonts } from "../../designTokens";
import FortuneOfWarCardDisplay from "./FortuneOfWarCardDisplay";
import ShipYardDisplay from "./ShipYardDisplay";
import FleetDisplay from "./FleetDisplay";
import WorldMap from "../WorldMap/WorldMap";
import { clearMoves } from "../../utils/gameHelpers";
import svgNameToElementMap from "../WorldMap/nameToElementMap";

const counterButtonSx = (disabledState = false) =>
  ({
    backgroundColor: "transparent",
    border: "none",
    width: "30px",
    height: "100%",
    fontSize: "30px",
    cursor: disabledState ? "not-allowed" : "pointer",
    color: disabledState ? "grey" : colors.black,
  }) as const;

const rowCardSx = {
  mb: 1.5,
  p: { xs: 1.1, lg: 1.3 },
  borderRadius: 2,
  border: "1px solid rgba(15,23,42,0.12)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(246,248,251,0.95) 100%)",
  boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
} as const;

const PlayerRowCard = ({
  title,
  meta,
  accent,
  children,
}: {
  title: string;
  meta?: string;
  accent?: string;
  children: ReactNode;
}) => {
  return (
    <Box sx={rowCardSx}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "280px minmax(0, 1fr)" },
          columnGap: 1.5,
          rowGap: 1,
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            borderLeft: `4px solid ${accent ?? "#386fa4"}`,
            pl: 1,
            minWidth: 0,
          }}
        >
          <Typography
            sx={{
              fontFamily: fonts.system,
              fontWeight: 800,
              lineHeight: 1.1,
              fontSize: "1.02rem",
              color: "#1a2733",
              mb: 0.35,
            }}
          >
            {title}
          </Typography>
          {meta ? (
            <Typography
              sx={{
                fontFamily: fonts.system,
                fontSize: "0.9rem",
                lineHeight: 1.25,
                color: "rgba(0,0,0,0.74)",
              }}
            >
              {meta}
            </Typography>
          ) : null}
        </Box>
        <Box sx={{ minWidth: 0 }}>{children}</Box>
      </Box>
    </Box>
  );
};

const ControlRow = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{
      display: "flex",
      gap: 1,
      position: "relative",
      flexWrap: "wrap",
      alignItems: "center",
      whiteSpace: "pre-line",
    }}
  >
    {children}
  </Box>
);

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
      <Box sx={{ width: "100%", display: "flex", justifyContent: "center", px: { xs: 1, md: 2 } }}>
        <Box
          sx={{
            width: "100%",
            maxWidth: 1600,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", xl: "minmax(0, 3fr) minmax(280px, 1fr)" },
            gap: 1.5,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <PlayerRowCard
              title="Build Skyships"
              meta="Spend 1 counsellor to gain skyships from your shipyards."
              accent="#1d8f8d"
            >
              <ControlRow>
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
              </ControlRow>
            </PlayerRowCard>
            <PlayerRowCard
              title="Conscript Levies"
              meta="Choose levy amount in steps of 3, then conscript."
              accent="#54708f"
            >
              <ControlRow>
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
                sx={counterButtonSx()}
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
                sx={counterButtonSx()}
                disabled={levyCount === 0}
              >
                -
              </Button>
              </ControlRow>
            </PlayerRowCard>
            <PlayerRowCard
              title="Train Troops"
              meta="Convert resources into trained regiments."
              accent="#4f6e87"
            >
              <ControlRow>
              <PlayerBoardButton
                onClick={() => {
                  props.moves.trainTroops();
                }}
                backgroundImage={trainTroopsSvg}
                colour={colour}
                width="98px"
                height="59px"
                counsellor={
                  playerInfo?.playerBoardCounsellorLocations.trainTroops
                }
                {...props}
              />
              </ControlRow>
            </PlayerRowCard>
            <PlayerRowCard
              title="Dispatch Skyship Fleet"
              meta="Pick a fleet and deploy to a legal destination."
              accent="#376f96"
            >
              <ControlRow>
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
              </ControlRow>
            </PlayerRowCard>
            <PlayerRowCard
              title="Construct Skyship Fleet"
              meta="Allocate skyships, regiments, and levies before dispatch."
              accent="#6d7a39"
            >
              <ControlRow>
              <Button
                onClick={() => {
                  setSkyshipCount(skyshipCount + 1);
                }}
                sx={counterButtonSx(dispatchDisabled)}
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
                sx={counterButtonSx(dispatchDisabled)}
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
                sx={counterButtonSx(dispatchDisabled)}
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
                sx={counterButtonSx(dispatchDisabled)}
                disabled={dispatchDisabled || regimentCount <= 0}
              >
                -
              </Button>
              <Button
                onClick={() => {
                  setLevyCountForDispatch(levyCountForDispatch + 1);
                }}
                sx={counterButtonSx(dispatchDisabled)}
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
                sx={counterButtonSx(dispatchDisabled)}
                disabled={
                  dispatchDisabled ||
                  levyCountForDispatch <= 0 ||
                  currentFleetAlreadyDispatched
                }
              >
                -
              </Button>
              </ControlRow>
            </PlayerRowCard>
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
            <PlayerRowCard
              title="Fleet Overview"
              meta="Select a fleet to view and configure for dispatch."
              accent="#365c8b"
            >
              <ControlRow>{fleets}</ControlRow>
            </PlayerRowCard>
            <Box sx={rowCardSx}>
              <Box
                sx={{
                  borderLeft: "4px solid #80612e",
                  pl: 1,
                  mb: 1.2,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: fonts.system,
                    fontWeight: 800,
                    lineHeight: 1.1,
                    fontSize: "1.02rem",
                    color: "#1a2733",
                    mb: 0.35,
                  }}
                >
                  Card Holdings
                </Typography>
                <Typography
                  sx={{
                    fontFamily: fonts.system,
                    fontSize: "0.9rem",
                    lineHeight: 1.25,
                    color: "rgba(0,0,0,0.74)",
                  }}
                >
                  Fortune of War, Legacy, and kingdom advantage cards.
                </Typography>
              </Box>
              <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {fortuneOfWarCards}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
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
                {playerInfo.resources.advantageCard && (
                  <div
                    style={{
                      fontSize: "11px",
                      background: "#C8A96E",
                      borderRadius: "4px",
                      padding: "2px 6px",
                      textAlign: "center",
                      marginTop: "4px",
                    }}
                  >
                    {playerInfo.resources.advantageCard.replace(/_/g, " ")}
                  </div>
                )}
              </div>
              </div>
            </Box>
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={rowCardSx}>
              <Box
                sx={{
                  borderLeft: "4px solid #8d3f3f",
                  pl: 1,
                  mb: 1.2,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: fonts.system,
                    fontWeight: 800,
                    lineHeight: 1.1,
                    fontSize: "1.02rem",
                    color: "#1a2733",
                    mb: 0.35,
                  }}
                >
                  Prison
                </Typography>
                <Typography
                  sx={{
                    fontFamily: fonts.system,
                    fontSize: "0.9rem",
                    lineHeight: 1.25,
                    color: "rgba(0,0,0,0.74)",
                  }}
                >
                  Imprisoned dissenters are shown here (max 3).
                </Typography>
              </Box>
              <ControlRow>
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
              </ControlRow>
            </Box>
            <Box sx={rowCardSx}>
              <Box
                sx={{
                  borderLeft: "4px solid #2f9a68",
                  pl: 1,
                  mb: 1.2,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: fonts.system,
                    fontWeight: 800,
                    lineHeight: 1.1,
                    fontSize: "1.02rem",
                    color: "#1a2733",
                    mb: 0.35,
                  }}
                >
                  Shipyards
                </Typography>
                <Typography
                  sx={{
                    fontFamily: fonts.system,
                    fontSize: "0.9rem",
                    lineHeight: 1.25,
                    color: "rgba(0,0,0,0.74)",
                  }}
                >
                  Progress tracks and production output by shipyard level.
                </Typography>
              </Box>
              <ShipYardDisplay {...props} />
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

interface PlayerBoardProps extends MyGameProps {}
