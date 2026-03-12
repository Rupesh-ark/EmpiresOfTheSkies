import React, { useState } from "react";

import buildSkyships from "../../boards_and_assets/player_boards/buttons/build_skyships.svg";
import conscriptLevies from "../../boards_and_assets/player_boards/buttons/conscript_levies.svg";
import trainTroopsSvg from "../../boards_and_assets/train_troops1.svg";
import { FleetInfo, findPossibleDestinations, MyGameProps } from "@eots/game";
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
import { alpha, darken, getContrastRatio } from "@mui/material/styles";
import { influencePrelatesTheme } from "../themes";
import { fonts } from "../../designTokens";
import FortuneOfWarCardDisplay from "./FortuneOfWarCardDisplay";
import ShipYardDisplay from "./ShipYardDisplay";
import WorldMap from "../WorldMap/WorldMap";
import { clearMoves } from "../../utils/gameHelpers";
import svgNameToElementMap from "../WorldMap/nameToElementMap";
import SkyshipIcon from "../Icons/SkyshipIcon";
import RegimentIcon from "../Icons/RegimentIcon";
import LevyIcon from "../Icons/LevyIcon";

const rowCardSx = {
  mb: 1.5,
  p: { xs: 1.1, lg: 1.3 },
  borderRadius: 2,
  border: "1px solid rgba(15,23,42,0.12)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(246,248,251,0.95) 100%)",
  boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
} as const;

type FleetAllocation = {
  skyships: number;
  regiments: number;
  levies: number;
};

const emptyFleetAllocation = (): FleetAllocation => ({
  skyships: 0,
  regiments: 0,
  levies: 0,
});

type FleetResourceKey = keyof FleetAllocation;

const compactActionCardSx = {
  p: 1,
  borderRadius: 1.5,
  border: "1px solid rgba(15,23,42,0.13)",
  backgroundColor: "rgba(255,255,255,0.88)",
  minHeight: 98,
} as const;

const resourceCounterButtonSx = (disabledState = false) =>
  ({
    minWidth: "24px",
    width: "24px",
    height: "24px",
    p: 0,
    borderRadius: "6px",
    border: "1px solid rgba(15,23,42,0.25)",
    color: disabledState ? "rgba(0,0,0,0.34)" : "#112236",
    backgroundColor: disabledState ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.9)",
    fontSize: "1rem",
    lineHeight: 1,
  }) as const;

const FleetManagementCard = ({
  fleet,
  playerColour,
  allocation,
  availableResources,
  selected,
  isDispatchDisabled,
  onSelect,
  onDispatch,
  onAdjustAllocation,
}: FleetManagementCardProps) => {
  const resourceRows: { key: FleetResourceKey; label: string }[] = [
    { key: "skyships", label: "Skyships" },
    { key: "regiments", label: "Regiments" },
    { key: "levies", label: "Levies" },
  ];
  const dispatchBase = darken(playerColour, 0.12);
  const dispatchHover = darken(playerColour, 0.22);
  const dispatchText =
    getContrastRatio(dispatchBase, "#ffffff") >= 4.5 ? "#ffffff" : "#0f172a";
  const fleetStats = [
    {
      key: "skyships",
      value: fleet.skyships + allocation.skyships,
      icon: <SkyshipIcon colour={playerColour} />,
    },
    {
      key: "regiments",
      value: fleet.regiments + allocation.regiments,
      icon: <RegimentIcon colour={playerColour} />,
    },
    {
      key: "levies",
      value: fleet.levies + allocation.levies,
      icon: <LevyIcon colour={playerColour} />,
    },
  ];

  return (
    <Box
      sx={{
        p: 0.85,
        borderRadius: 1.5,
        border: selected
          ? "2px solid rgba(41,121,255,0.8)"
          : "1px solid rgba(15,23,42,0.2)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,249,255,0.96) 100%)",
        boxShadow: selected
          ? "0 10px 18px rgba(34,94,168,0.16)"
          : "0 4px 10px rgba(15,23,42,0.08)",
      }}
    >
      <Box
        onClick={() => onSelect(fleet.fleetId)}
        sx={{
          cursor: "pointer",
          pb: 0.62,
          mb: 0.62,
          borderBottom: "1px solid rgba(15,23,42,0.12)",
        }}
      >
        <Typography
          sx={{ fontFamily: fonts.system, fontWeight: 800, fontSize: "0.9rem" }}
        >
          {`Fleet ${fleet.fleetId + 1}`}
        </Typography>
        <Typography
          sx={{
            fontFamily: fonts.system,
            fontSize: "0.78rem",
            color: "rgba(0,0,0,0.72)",
          }}
        >
          {`Location: [${fleet.location[0] + 1}, ${4 - fleet.location[1]}]`}
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 0.35,
            mt: 0.35,
          }}
        >
          {fleetStats.map((stat) => (
            <Box
              key={`${fleet.fleetId}-${stat.key}-summary`}
              sx={{
                py: 0.25,
                borderRadius: 1,
                border: "1px solid rgba(15,23,42,0.1)",
                backgroundColor: "rgba(255,255,255,0.74)",
                display: "grid",
                justifyItems: "center",
                gap: 0.1,
              }}
            >
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: "scale(0.72)",
                  transformOrigin: "center",
                  height: 16,
                }}
              >
                {stat.icon}
              </Box>
              <Typography
                sx={{
                  fontFamily: fonts.system,
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
      <Box sx={{ display: "grid", gap: 0.3 }}>
        {resourceRows.map((resource) => {
          const value = allocation[resource.key];
          return (
            <Box
              key={`${fleet.fleetId}-${resource.key}`}
              sx={{
                display: "grid",
                gridTemplateColumns: "74px auto",
                alignItems: "center",
                gap: 0.55,
              }}
            >
              <Typography
                sx={{
                  fontFamily: fonts.system,
                  fontSize: "0.72rem",
                  color: "rgba(0,0,0,0.74)",
                }}
              >
                {resource.label}
              </Typography>
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.3 }}>
                <Button
                  onClick={() => onAdjustAllocation(fleet.fleetId, resource.key, -1)}
                  sx={resourceCounterButtonSx(value <= 0)}
                  disabled={value <= 0}
                >
                  -
                </Button>
                <Typography
                  sx={{
                    fontFamily: fonts.system,
                    fontWeight: 700,
                    minWidth: "20px",
                    textAlign: "center",
                    fontSize: "0.78rem",
                  }}
                >
                  {value}
                </Typography>
                <Button
                  onClick={() => onAdjustAllocation(fleet.fleetId, resource.key, 1)}
                  sx={resourceCounterButtonSx(value >= availableResources[resource.key])}
                  disabled={value >= availableResources[resource.key]}
                >
                  +
                </Button>
              </Box>
            </Box>
          );
        })}
      </Box>
      <Button
        onClick={() => onDispatch(fleet.fleetId)}
        variant="contained"
        disabled={isDispatchDisabled}
        sx={{
          mt: 0.75,
          width: "100%",
          textTransform: "none",
          fontFamily: fonts.system,
          fontWeight: 700,
          borderRadius: "10px",
          boxShadow: "none",
          backgroundColor: dispatchBase,
          color: dispatchText,
          "&:hover": {
            backgroundColor: dispatchHover,
            boxShadow: "none",
          },
          "&.Mui-disabled": {
            backgroundColor: alpha(dispatchBase, 0.34),
            color: alpha(dispatchText, 0.52),
          },
        }}
      >
        Dispatch
      </Button>
    </Box>
  );
};

interface FleetManagementCardProps {
  fleet: FleetInfo;
  playerColour: string;
  allocation: FleetAllocation;
  availableResources: FleetAllocation;
  selected: boolean;
  isDispatchDisabled: boolean;
  onSelect: (fleetId: number) => void;
  onDispatch: (fleetId: number) => void;
  onAdjustAllocation: (
    fleetId: number,
    resource: FleetResourceKey,
    delta: -1 | 1
  ) => void;
}

const PrisonDisplay = ({
  colour,
  prisoners,
}: {
  colour: string;
  prisoners: number;
}) => {
  const barLines = [
    7.5, 14.5, 21.5, 28.5, 35.5, 42.5, 49.5, 56.5, 62.5, 69.5, 76.5, 83.5, 89.5,
    96.5, 103.5, 110.5, 116.5,
  ];

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: 130,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width="220"
        height="104"
        viewBox="0 0 124 59"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "min(88%, 260px)", height: "auto" }}
      >
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
        {barLines.map((x) => (
          <line
            key={`prison-bar-${x}`}
            x1={x}
            y1="1"
            x2={x}
            y2="58"
            stroke="black"
            strokeWidth="3"
          />
        ))}
        <rect x="0.5" y="0.5" width="123" height="58" stroke="black" />
      </svg>
    </Box>
  );
};

// displays buttons which can build cathedrals, palaces and skyships
// also displays the button to imprison dissenters and to dispatch skyship fleets
export const PlayerBoard = (props: PlayerBoardProps) => {
  const [levyCount, setLevyCount] = useState(0);
  const [selectedFleet, setSelectedFleet] = useState(0);
  const [dispatchFleetMapVisible, setDispatchFleetMapVisible] = useState(false);
  const [fleetDestination, setFleetDestination] = useState([4, 0]);
  const [fleetAllocations, setFleetAllocations] = useState<
    Record<number, FleetAllocation>
  >({
    0: emptyFleetAllocation(),
    1: emptyFleetAllocation(),
    2: emptyFleetAllocation(),
  });

  const playerInfo =
    props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer];
  const colour = playerInfo.colour;
  const prisoners = playerInfo.prisoners;
  const playerRegiments = playerInfo.resources.regiments;
  const playerSkyships = playerInfo.resources.skyships;
  const playerLevies = playerInfo.resources.levies;
  const boardSectionAccent = darken(colour, 0.28);
  const boardSectionAccentSoft = alpha(colour, 0.1);
  const dockAccent = alpha(colour, 0.28);
  const dockAccentSoft = alpha(colour, 0.2);
  const dockAccentLine = alpha(colour, 0.24);
  const dockTitleColor = darken(colour, 0.38);
  const dockBodyColor = alpha(darken(colour, 0.58), 0.9);
  const dockNoteColor = alpha(darken(colour, 0.5), 0.86);
  const currentFleet =
    playerInfo.fleetInfo[selectedFleet] ?? playerInfo.fleetInfo[0];

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

  // Dispatch eligibility is supplied by game state; frontend does not apply Rule 4.2 checks.
  const dispatchButtonDisabled =
    props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer]
      .playerBoardCounsellorLocations.dispatchSkyshipFleet;

  const getTotalAllocatedResources = (
    allocations: Record<number, FleetAllocation>
  ) =>
    Object.values(allocations).reduce(
      (totals, allocation) => ({
        skyships: totals.skyships + allocation.skyships,
        regiments: totals.regiments + allocation.regiments,
        levies: totals.levies + allocation.levies,
      }),
      emptyFleetAllocation()
    );

  const getAvailableResourcesForFleet = (
    fleetId: number,
    allocations: Record<number, FleetAllocation>
  ): FleetAllocation => {
    const currentAllocation = allocations[fleetId] ?? emptyFleetAllocation();
    const totals = getTotalAllocatedResources(allocations);
    return {
      skyships: Math.max(
        0,
        playerSkyships - (totals.skyships - currentAllocation.skyships)
      ),
      regiments: Math.max(
        0,
        playerRegiments - (totals.regiments - currentAllocation.regiments)
      ),
      levies: Math.max(0, playerLevies - (totals.levies - currentAllocation.levies)),
    };
  };

  const adjustFleetAllocation = (
    fleetId: number,
    resource: FleetResourceKey,
    delta: -1 | 1
  ) => {
    setFleetAllocations((previousAllocations) => {
      const currentAllocation =
        previousAllocations[fleetId] ?? emptyFleetAllocation();
      const availableResources = getAvailableResourcesForFleet(
        fleetId,
        previousAllocations
      );
      const nextValue = Math.max(
        0,
        Math.min(
          currentAllocation[resource] + delta,
          availableResources[resource]
        )
      );

      if (nextValue === currentAllocation[resource]) {
        return previousAllocations;
      }

      return {
        ...previousAllocations,
        [fleetId]: {
          ...currentAllocation,
          [resource]: nextValue,
        },
      };
    });
  };

  const openDispatchMapForFleet = (fleetId: number) => {
    setSelectedFleet(fleetId);
    setFleetDestination([4, 0]);
    setDispatchFleetMapVisible(true);
  };

  const fleetCards = playerInfo.fleetInfo.map((fleet) => (
    <FleetManagementCard
      key={`fleet-management-${fleet.fleetId}`}
      fleet={fleet}
      playerColour={colour}
      allocation={fleetAllocations[fleet.fleetId] ?? emptyFleetAllocation()}
      availableResources={getAvailableResourcesForFleet(
        fleet.fleetId,
        fleetAllocations
      )}
      selected={selectedFleet === fleet.fleetId}
      isDispatchDisabled={dispatchButtonDisabled}
      onSelect={setSelectedFleet}
      onDispatch={openDispatchMapForFleet}
      onAdjustAllocation={adjustFleetAllocation}
    />
  ));
  const totalAllocatedResources = getTotalAllocatedResources(fleetAllocations);
  const availableForLoading: FleetAllocation = {
    skyships: Math.max(0, playerSkyships - totalAllocatedResources.skyships),
    regiments: Math.max(0, playerRegiments - totalAllocatedResources.regiments),
    levies: Math.max(0, playerLevies - totalAllocatedResources.levies),
  };

  const selectedFleetAllocation =
    fleetAllocations[selectedFleet] ?? emptyFleetAllocation();
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
          <Box sx={{ minWidth: 0, display: "grid", gap: 1.5, alignContent: "start" }}>
            <Box sx={rowCardSx}>
              <Box
                sx={{
                  borderLeft: `4px solid ${boardSectionAccent}`,
                  pl: 1,
                  pr: 0.8,
                  py: 0.75,
                  mb: 1.15,
                  borderBottom: "1px solid rgba(15,23,42,0.14)",
                  background:
                    `linear-gradient(180deg, ${boardSectionAccentSoft} 0%, rgba(244,247,250,0.42) 100%)`,
                  borderRadius: 1,
                }}
              >
                <Box
                  sx={{
                    minWidth: 0,
                    display: "flex",
                    alignItems: "baseline",
                    gap: 0.9,
                    flexWrap: "nowrap",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: fonts.system,
                      fontWeight: 800,
                      lineHeight: 1.1,
                      fontSize: "1.02rem",
                      color: "#1a2733",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    Shipyards & Fleets
                  </Typography>
                  <Typography
                    sx={{
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontFamily: fonts.system,
                      fontSize: "0.9rem",
                      lineHeight: 1.25,
                      color: "rgba(0,0,0,0.74)",
                    }}
                  >
                    Production engines and fleet command in one command zone.
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  pt: 0.1,
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "minmax(400px, 1.28fr) minmax(0, 0.72fr)",
                    xl: "minmax(460px, 1.32fr) minmax(0, 0.68fr)",
                  },
                  gap: 1,
                  alignItems: "stretch",
                }}
              >
                <Box
                  sx={{
                    minWidth: 0,
                    display: "grid",
                    gap: 0.8,
                    order: { xs: 2, md: 2 },
                  }}
                >
                  <Box
                    sx={{
                      minWidth: 0,
                      display: "flex",
                      alignItems: "baseline",
                      gap: 0.8,
                      flexWrap: "nowrap",
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: fonts.system,
                        fontWeight: 700,
                        fontSize: "0.86rem",
                        color: boardSectionAccent,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      Shipyards
                    </Typography>
                    <Typography
                      sx={{
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontFamily: fonts.system,
                        fontSize: "0.82rem",
                        lineHeight: 1.25,
                        color: "rgba(0,0,0,0.7)",
                      }}
                    >
                      Progress tracks and production output by shipyard level.
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr",
                      alignItems: "stretch",
                      justifyContent: "flex-start",
                      rowGap: 0.85,
                    }}
                  >
                    <Box sx={{ width: "100%", display: "flex", justifyContent: "flex-start" }}>
                      <ShipYardDisplay {...props} />
                    </Box>
                    <Box
                      sx={{
                        minWidth: 0,
                        display: "flex",
                        alignItems: "stretch",
                        minHeight: { lg: 148 },
                      }}
                    >
                      <Box
                        sx={{
                          p: { xs: 0.9, lg: 1 },
                          borderRadius: 1.5,
                          background:
                            `linear-gradient(145deg, ${dockAccentSoft} 0%, rgba(255,251,246,0.72) 100%)`,
                          border: `1px solid ${dockAccent}`,
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.65,
                          width: "100%",
                          height: "100%",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            pt: 0.25,
                          }}
                        >
                          <Box component="span" sx={{ display: "inline-flex" }}>
                            <PlayerBoardButton
                              onClick={() => {
                                props.moves.enableDispatchButtons(true);
                                props.moves.buildSkyships();
                              }}
                              counsellor={
                                playerInfo?.playerBoardCounsellorLocations.buildSkyships
                              }
                              backgroundImage={buildSkyships}
                              width="146px"
                              height="146px"
                              colour={colour}
                              {...props}
                            />
                          </Box>
                        </Box>
                        <Box sx={{ display: "grid", gap: 0.55, pt: 0.2 }}>
                          <Typography
                            sx={{
                              fontFamily: fonts.system,
                              fontSize: "0.68rem",
                              fontWeight: 800,
                              letterSpacing: "0.09em",
                              textTransform: "uppercase",
                              color: dockTitleColor,
                            }}
                          >
                            Dockmaster's Order
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily: fonts.system,
                              fontSize: "0.82rem",
                              lineHeight: 1.35,
                              color: dockBodyColor,
                              fontStyle: "italic",
                            }}
                          >
                            Spend 1 counsellor to set the yards in motion, then claim
                            skyships forged from your active tracks.
                          </Typography>
                        </Box>
                        <Typography
                          sx={{
                            fontFamily: fonts.system,
                            fontSize: "0.74rem",
                            lineHeight: 1.25,
                            color: dockNoteColor,
                            borderTop: `1px solid ${dockAccentLine}`,
                            py: 0.72,
                          }}
                        >
                          More active docks, more hulls launched this turn.
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
                <Box
                  sx={{
                    minWidth: 0,
                    display: "grid",
                    gridTemplateRows: "auto 1fr",
                    alignContent: "stretch",
                    gap: 0.8,
                    order: { xs: 1, md: 1 },
                    borderRight: { xs: "none", md: "1px solid rgba(15,23,42,0.12)" },
                    pr: { xs: 0, md: 1.25 },
                  }}
                >
                  <Box
                    sx={{
                      minWidth: 0,
                      display: "flex",
                      alignItems: "baseline",
                      gap: 0.8,
                      flexWrap: "nowrap",
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: fonts.system,
                        fontWeight: 700,
                        fontSize: "0.86rem",
                        color: boardSectionAccent,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      Fleets
                    </Typography>
                    <Typography
                      sx={{
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontFamily: fonts.system,
                        fontSize: "0.82rem",
                        lineHeight: 1.25,
                        color: "rgba(0,0,0,0.7)",
                      }}
                    >
                      Configure Fleet 1-3 here and dispatch from each fleet card.
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      minWidth: 0,
                      display: "grid",
                      gridTemplateRows: {
                        xs: "auto auto auto",
                        md: "auto auto minmax(0, 1fr)",
                      },
                      gap: 0.75,
                    }}
                  >
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "repeat(2, minmax(0, 1fr))",
                          lg: "repeat(3, minmax(0, 1fr))",
                        },
                        gap: 1,
                        alignContent: "start",
                      }}
                    >
                      {fleetCards}
                    </Box>
                    <Box
                      sx={{
                        p: 0.85,
                        borderRadius: 1.35,
                        border: `1px dashed ${alpha(boardSectionAccent, 0.3)}`,
                        background: `linear-gradient(145deg, ${alpha(
                          boardSectionAccent,
                          0.06
                        )} 0%, rgba(255,255,255,0.84) 100%)`,
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          md: "minmax(0, 1fr) minmax(180px, 0.65fr) auto",
                        },
                        alignItems: "center",
                        gap: 0.9,
                      }}
                    >
                      <Box sx={{ minWidth: 0, display: "grid", gap: 0.22 }}>
                        <Typography
                          sx={{
                            fontFamily: fonts.system,
                            fontWeight: 700,
                            fontSize: "0.84rem",
                            color: boardSectionAccent,
                          }}
                        >
                          Conscript Levies
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: fonts.system,
                            fontSize: "0.8rem",
                            lineHeight: 1.28,
                            color: "rgba(0,0,0,0.7)",
                            maxWidth: 310,
                          }}
                        >
                          Raise levies in batches of 3 to reinforce your available forces.
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifySelf: "center",
                          gap: 0.5,
                        }}
                      >
                        <Button
                          onClick={() => {
                            setLevyCount(levyCount - 3);
                          }}
                          sx={resourceCounterButtonSx(levyCount === 0)}
                          disabled={levyCount === 0}
                        >
                          -
                        </Button>
                        <Typography
                          sx={{
                            fontFamily: fonts.system,
                            fontWeight: 700,
                            minWidth: "24px",
                            textAlign: "center",
                          }}
                        >
                          {levyCount}
                        </Typography>
                        <Button
                          onClick={() => {
                            setLevyCount(levyCount + 3);
                          }}
                          sx={resourceCounterButtonSx(levyCount === 12)}
                          disabled={levyCount === 12}
                        >
                          +
                        </Button>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: { xs: "flex-start", md: "center" },
                          minWidth: 130,
                        }}
                      >
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
                        />
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        alignSelf: "stretch",
                        height: "100%",
                        p: 1,
                        borderRadius: 1.35,
                        border: `1px dashed ${alpha(boardSectionAccent, 0.32)}`,
                        background: `linear-gradient(145deg, ${alpha(
                          boardSectionAccent,
                          0.08
                        )} 0%, rgba(255,255,255,0.84) 100%)`,
                        display: "grid",
                        gridTemplateRows: "auto auto 1fr",
                        alignContent: "stretch",
                        gap: 0.75,
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: fonts.system,
                          fontSize: "0.78rem",
                          fontWeight: 800,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: dockTitleColor,
                        }}
                      >
                        Available Forces
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: fonts.system,
                          fontSize: "0.84rem",
                          lineHeight: 1.3,
                          color: "rgba(0,0,0,0.72)",
                        }}
                      >
                        Reserve pool updates instantly as units are loaded into fleets.
                      </Typography>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateRows: "repeat(3, minmax(0, 1fr))",
                          gap: 0.65,
                          alignContent: "stretch",
                        }}
                      >
                        <Box
                          sx={{
                            p: 0.55,
                            borderRadius: 1.1,
                            border: "1px solid rgba(15,23,42,0.12)",
                            backgroundColor: "rgba(255,255,255,0.8)",
                            display: "grid",
                            gridTemplateColumns: "92px minmax(0, 1fr)",
                            alignItems: "center",
                            gap: 0.6,
                            minHeight: 46,
                          }}
                        >
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.3,
                              fontFamily: fonts.system,
                              fontSize: "0.78rem",
                              fontWeight: 700,
                            }}
                          >
                            <Box sx={{ display: "inline-flex", transform: "scale(0.82)" }}>
                              <SkyshipIcon colour={colour} />
                            </Box>
                            Skyships
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              alignItems: "center",
                              gap: 0.15,
                              minHeight: 26,
                            }}
                          >
                            {availableForLoading.skyships > 0 ? (
                              Array.from({ length: availableForLoading.skyships }).map(
                                (_, index) => (
                                  <Box
                                    key={`available-skyship-${index}`}
                                    sx={{
                                      display: "inline-flex",
                                      transform: "scale(0.62)",
                                      transformOrigin: "center",
                                    }}
                                  >
                                    <SkyshipIcon colour={colour} />
                                  </Box>
                                )
                              )
                            ) : (
                              <Box
                                sx={{
                                  display: "inline-flex",
                                  transform: "scale(0.66)",
                                  transformOrigin: "center",
                                  opacity: 0.3,
                                }}
                              >
                                <SkyshipIcon colour={colour} />
                              </Box>
                            )}
                          </Box>
                        </Box>
                        <Box
                          sx={{
                            p: 0.55,
                            borderRadius: 1.1,
                            border: "1px solid rgba(15,23,42,0.12)",
                            backgroundColor: "rgba(255,255,255,0.8)",
                            display: "grid",
                            gridTemplateColumns: "92px minmax(0, 1fr)",
                            alignItems: "center",
                            gap: 0.6,
                            minHeight: 46,
                          }}
                        >
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.3,
                              fontFamily: fonts.system,
                              fontSize: "0.78rem",
                              fontWeight: 700,
                            }}
                          >
                            <Box sx={{ display: "inline-flex", transform: "scale(0.82)" }}>
                              <RegimentIcon colour={colour} />
                            </Box>
                            Regiments
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              alignItems: "center",
                              gap: 0.15,
                              minHeight: 26,
                            }}
                          >
                            {availableForLoading.regiments > 0 ? (
                              Array.from({ length: availableForLoading.regiments }).map(
                                (_, index) => (
                                  <Box
                                    key={`available-regiment-${index}`}
                                    sx={{
                                      display: "inline-flex",
                                      transform: "scale(0.62)",
                                      transformOrigin: "center",
                                    }}
                                  >
                                    <RegimentIcon colour={colour} />
                                  </Box>
                                )
                              )
                            ) : (
                              <Box
                                sx={{
                                  display: "inline-flex",
                                  transform: "scale(0.66)",
                                  transformOrigin: "center",
                                  opacity: 0.3,
                                }}
                              >
                                <RegimentIcon colour={colour} />
                              </Box>
                            )}
                          </Box>
                        </Box>
                        <Box
                          sx={{
                            p: 0.55,
                            borderRadius: 1.1,
                            border: "1px solid rgba(15,23,42,0.12)",
                            backgroundColor: "rgba(255,255,255,0.8)",
                            display: "grid",
                            gridTemplateColumns: "92px minmax(0, 1fr)",
                            alignItems: "center",
                            gap: 0.6,
                            minHeight: 46,
                          }}
                        >
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.3,
                              fontFamily: fonts.system,
                              fontSize: "0.78rem",
                              fontWeight: 700,
                            }}
                          >
                            <Box sx={{ display: "inline-flex", transform: "scale(0.82)" }}>
                              <LevyIcon colour={colour} />
                            </Box>
                            Levies
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              flexWrap: "wrap",
                              alignItems: "center",
                              gap: 0.15,
                              minHeight: 26,
                            }}
                          >
                            {availableForLoading.levies > 0 ? (
                              Array.from({ length: availableForLoading.levies }).map(
                                (_, index) => (
                                  <Box
                                    key={`available-levy-${index}`}
                                    sx={{
                                      display: "inline-flex",
                                      transform: "scale(0.62)",
                                      transformOrigin: "center",
                                    }}
                                  >
                                    <LevyIcon colour={colour} />
                                  </Box>
                                )
                              )
                            ) : (
                              <Box
                                sx={{
                                  display: "inline-flex",
                                  transform: "scale(0.66)",
                                  transformOrigin: "center",
                                  opacity: 0.3,
                                }}
                              >
                                <LevyIcon colour={colour} />
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
            <Dialog open={dispatchFleetMapVisible} maxWidth={false}>
              <DialogTitle>{`Select a tile to deploy Fleet ${selectedFleet + 1} to. 
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
                    props.moves.enableDispatchButtons(true);
                    props.moves.deployFleet(
                      selectedFleet,
                      fleetDestination,
                      selectedFleetAllocation.skyships,
                      selectedFleetAllocation.regiments,
                      selectedFleetAllocation.levies
                    );
                    setFleetAllocations((previousAllocations) => ({
                      ...previousAllocations,
                      [selectedFleet]: emptyFleetAllocation(),
                    }));
                    setDispatchFleetMapVisible(false);
                  }}
                >
                  Confirm
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
          <Box sx={{ minWidth: 0, display: "grid", gap: 1.5, alignContent: "start" }}>
            <Box sx={rowCardSx}>
              <Box
                sx={{
                  borderLeft: `4px solid ${boardSectionAccent}`,
                  pl: 1,
                  pr: 0.8,
                  py: 0.75,
                  mb: 1.15,
                  borderBottom: "1px solid rgba(15,23,42,0.14)",
                  background:
                    `linear-gradient(180deg, ${boardSectionAccentSoft} 0%, rgba(244,247,250,0.42) 100%)`,
                  borderRadius: 1,
                }}
              >
                <Box
                  sx={{
                    minWidth: 0,
                    display: "flex",
                    alignItems: "baseline",
                    gap: 0.9,
                    flexWrap: "nowrap",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: fonts.system,
                      fontWeight: 800,
                      lineHeight: 1.1,
                      fontSize: "1.02rem",
                      color: "#1a2733",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    War Readiness
                  </Typography>
                  <Typography
                    sx={{
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontFamily: fonts.system,
                      fontSize: "0.9rem",
                      lineHeight: 1.25,
                      color: "rgba(0,0,0,0.74)",
                    }}
                  >
                    Train troops and generate Fortune of War card pressure from one
                    section.
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  pt: 0.1,
                  display: "grid",
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    ...compactActionCardSx,
                    border: `1px solid ${alpha(boardSectionAccent, 0.25)}`,
                    background: `linear-gradient(145deg, ${alpha(
                      boardSectionAccent,
                      0.08
                    )} 0%, rgba(255,255,255,0.85) 100%)`,
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      lg: "auto minmax(220px, 1fr)",
                    },
                    gap: 1,
                    alignItems: "stretch",
                  }}
                >
                  <Box
                    sx={{
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 1,
                      alignContent: "flex-start",
                    }}
                  >
                    {fortuneOfWarCards}
                  </Box>
                  <Box
                    sx={{
                      borderLeft: { xs: "none", lg: `1px dashed ${dockAccent}` },
                      px: { xs: 0, lg: 1 },
                      display: "flex",
                      alignItems: "stretch",
                      minHeight: { lg: 250 },
                    }}
                  >
                    <Box
                      sx={{
                        p: { xs: 1, lg: 1.1 },
                        borderRadius: 1.5,
                        background:
                          `linear-gradient(145deg, ${dockAccentSoft} 0%, rgba(255,251,246,0.72) 100%)`,
                        border: `1px solid ${dockAccent}`,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 0.7,
                        textAlign: "center",
                        width: "100%",
                        height: "100%",
                      }}
                    >
                      <PlayerBoardButton
                        onClick={() => {
                          props.moves.trainTroops();
                        }}
                        backgroundImage={trainTroopsSvg}
                        colour={colour}
                        width="132px"
                        height="78px"
                        counsellor={
                          playerInfo?.playerBoardCounsellorLocations.trainTroops
                        }
                        {...props}
                      />
                      <Box sx={{ display: "grid", gap: 0.45 }}>
                        <Typography
                          sx={{
                            fontFamily: fonts.system,
                            fontSize: "0.68rem",
                            fontWeight: 800,
                            letterSpacing: "0.09em",
                            textTransform: "uppercase",
                            color: dockTitleColor,
                          }}
                        >
                          War Captain's Order
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: fonts.system,
                            fontSize: "0.79rem",
                            lineHeight: 1.3,
                            color: dockBodyColor,
                            fontStyle: "italic",
                            maxWidth: 190,
                          }}
                        >
                          Muster troops to strengthen command and pressure your
                          Fortune of War deck.
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          fontFamily: fonts.system,
                          fontSize: "0.74rem",
                          lineHeight: 1.25,
                          color: dockNoteColor,
                          borderTop: `1px solid ${dockAccentLine}`,
                          pt: 0.68,
                          maxWidth: 190,
                        }}
                      >
                        Drilled hosts sharpen your pressure before the next clash.
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
            <Box sx={rowCardSx}>
              <Box
                sx={{
                  borderLeft: `4px solid ${boardSectionAccent}`,
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
                  Legacy and kingdom advantage cards, plus prison status.
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "auto minmax(240px, 1fr)" },
                  gap: 1.2,
                  alignItems: "stretch",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
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
                </Box>
                <Box
                  sx={{
                    minWidth: 0,
                    borderLeft: { xs: "none", md: "1px dashed rgba(15,23,42,0.16)" },
                    pl: { xs: 0, md: 1.2 },
                    display: "grid",
                    gridTemplateRows: "auto 1fr",
                    gap: 0.7,
                    alignContent: "stretch",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: 0.75,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: fonts.system,
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        color: boardSectionAccent,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Prison
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: fonts.system,
                        fontSize: "0.8rem",
                        lineHeight: 1.25,
                        color: "rgba(0,0,0,0.7)",
                      }}
                    >
                      Imprisoned dissenters (max 3).
                    </Typography>
                  </Box>
                  <PrisonDisplay colour={colour} prisoners={prisoners} />
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

interface PlayerBoardProps extends MyGameProps {}
