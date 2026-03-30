import React, { lazy, Suspense, useState } from "react";

import { MyGameProps } from "@eots/game";
const ActionBoard = lazy(() => import("./ActionBoard/ActionBoard").then(m => ({ default: m.ActionBoard })));
const WorldMap = lazy(() => import("./WorldMap/WorldMap"));
const PlayerBoard = lazy(() => import("./PlayerBoard/PlayerBoard").then(m => ({ default: m.PlayerBoard })));
const Chat = lazy(() => import("./Chat/Chat"));

import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogTitle,
  Tab,
  Tabs,
  ThemeProvider,
  Tooltip,
} from "@mui/material";
import { TabPanel, TabContext } from "@mui/lab";
import ResourceTrackerBar from "./ResourceTrackerBar/ResourceTrackerBar";
import AttackOrPassDiaLog from "./AerialBattle/AttackOrPassDialog";
import AttackOrEvadeDialog from "./AerialBattle/AttackOrEvadeDialog";
import DrawOrPickCardDialog from "./AerialBattle/DrawOrPickCardDialog";
import RelocateLoserDialog from "./AerialBattle/RelocateLoserDialog";
import PlunderLegendsDialog from "./PlunderLegends/PlunderLegendsDialog";
import DefendOrYieldDialog from "./GroundBattle/DefendOrYieldDialog";
import GroundAttackOrPassDialog from "./GroundBattle/GroundAttackOrPassDialog";
import GarrisonTroopsDialog from "./GroundBattle/GarrisonTroopsDialog";
import OutpostOrColonyDialog from "./Conquests/OutpostOrColonyDialog";
import RetrieveFleetsDialog from "./Resolution/RetrieveFleetsDialog";

import PlayerTable from "./PlayerTable/PlayerTable";
import HeresyTracker from "./PlayerTable/HeresyTracker";
import { generalTheme } from "./themes";
import { Campaign, ChatBubble, Close, Dashboard, Map, Person, TableChart } from "@mui/icons-material";
import PickLegacyCardDialog from "./PickLegacyCardDialog";
import GameOverView from "./GameOverView";
import LootValueTable from "./PlayerTable/LootValueTable";

const tabSx = {
  minWidth: 48,
  p: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background-color 0.2s, transform 0.15s",
  "&:hover": {
    backgroundColor: "rgba(255,255,255,0.08)",
    transform: "scale(1.2)",
  },
  "&.Mui-selected": {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
};

export const ActionBoardsAndMap = (props: MyGameProps) => {
  const [value, setValue] = useState("0");
  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    setValue(newValue);
  };
  const [dialogOpen, setDialogOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  const kingdomColour = props.playerID
    ? props.G.playerInfo[props.playerID].colour
    : undefined;

  const isElectionTurn =
    props.ctx.phase === "election" && props.playerID === props.ctx.currentPlayer;

  return (
    <div>
      <ThemeProvider theme={generalTheme}>
        {<ResourceTrackerBar {...props} />}
        <Box sx={{ flexGrow: 1 }}>
          <TabContext value={value}>
            <Box sx={{ display: "flex" }}>
              <Box sx={{ position: "sticky", top: 64, alignSelf: "flex-start", height: "calc(100vh - 64px)", overflowY: "auto", display: "flex", flexDirection: "column", justifyContent: "center" }}>
               <Tabs
                value={value}
                onChange={handleChange}
                orientation="vertical"
                sx={{ borderLeft: 1, borderColor: "divider", width: 48, minWidth: 48 }}
              >
                <Tab icon={<Tooltip title="Action Board" placement="left"><Dashboard sx={{ color: kingdomColour }} /></Tooltip>} value={"0"} sx={tabSx} />
                <Tab icon={<Tooltip title="Player Board" placement="left"><Person sx={{ color: kingdomColour }} /></Tooltip>} value={"1"} sx={tabSx} />
                <Tab icon={<Tooltip title="World Map" placement="left"><Map sx={{ color: kingdomColour }} /></Tooltip>} value={"2"} sx={tabSx} />
                <Tab icon={<Tooltip title="Player Table" placement="left"><TableChart sx={{ color: kingdomColour }} /></Tooltip>} value={"3"} sx={tabSx} />
              </Tabs>
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Suspense fallback={null}>
                  <TabPanel value={"0"} tabIndex={0}>
                    <ActionBoard {...props} />
                  </TabPanel>
                  <TabPanel value={"1"} tabIndex={1}>
                    <PlayerBoard {...props} />
                  </TabPanel>
                  <TabPanel value={"2"} tabIndex={2}>
                    <WorldMap {...props} />
                  </TabPanel>
                  <TabPanel value={"3"} tabIndex={3} sx={{ p: 0 }}>
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: 0, px: 2, pt: 1 }}>
                      <Box sx={{ maxWidth: 1230, width: "100%", mb: 2 }}>
                        <Box
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 1,
                            background: "linear-gradient(90deg, #1a0a14 0%, #0d0d0d 50%, #1a0a00 100%)",
                            px: 2,
                            py: 0.75,
                            borderRadius: 2,
                          }}
                        >
                          <Campaign sx={{ color: "#E77B00", fontSize: 18 }} />
                          <Box component="span" sx={{ color: "rgba(255,255,255,0.6)", fontSize: "0.8rem" }}>Round</Box>
                          <Box component="span" sx={{ color: "white", fontWeight: 700, fontSize: "1rem" }}>{props.G.round}</Box>
                          <Box component="span" sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>/ {props.G.finalRound}</Box>
                        </Box>
                      </Box>
                      <HeresyTracker {...props} />
                      <PlayerTable {...props} />
                      <LootValueTable {...props} />
                    </Box>
                  </TabPanel>
                </Suspense>
              </Box>
            </Box>
          </TabContext>

          {/* Floating chat widget */}
          <Box sx={{ position: "fixed", bottom: 0, right: 24, zIndex: 1300, width: 340, display: "flex", flexDirection: "column" }}>
            {/* Messages panel — expands upward */}
            <Collapse in={chatOpen} unmountOnExit>
              <Box sx={{ height: 480, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 -4px 24px rgba(0,0,0,0.25)", border: "1px solid rgba(0,0,0,0.12)", borderBottom: "none" }}>
                <Suspense fallback={null}>
                  <Chat {...props} />
                </Suspense>
              </Box>
            </Collapse>

            {/* Tab bar — always visible */}
            <Box
              onClick={() => setChatOpen(o => !o)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 2,
                py: 1.25,
                cursor: "pointer",
                borderRadius: 0,
                background: isElectionTurn
                  ? "linear-gradient(90deg, #A74383, #E77B00)"
                  : "linear-gradient(90deg, #1a0a14 0%, #0d0d0d 50%, #1a0a00 100%)",
                color: "white",
                userSelect: "none",
                animation: isElectionTurn && !chatOpen ? "pulse 1.6s ease-in-out infinite" : "none",
                "@keyframes pulse": {
                  "0%, 100%": { boxShadow: "0 0 0 0 rgba(167,67,131,0.5)" },
                  "50%": { boxShadow: "0 0 0 10px rgba(167,67,131,0)" },
                },
                "&:hover": { filter: "brightness(1.3)" },
              }}
            >
              {isElectionTurn ? <Campaign fontSize="small" /> : <ChatBubble fontSize="small" />}
              <Box sx={{ flexGrow: 1, fontWeight: 700, fontSize: "0.875rem", letterSpacing: 0.5 }}>
                {isElectionTurn ? "Election — cast your vote!" : "Group Chat"}
              </Box>
              <Close sx={{ fontSize: 16, opacity: 0.7, transform: chatOpen ? "rotate(0deg)" : "rotate(45deg)", transition: "transform 0.2s" }} />
            </Box>
          </Box>

          {props.G.stage === "pick legacy card" && (
            <PickLegacyCardDialog {...props} />
          )}
          {props.G.stage === "attack or pass" && (
            <AttackOrPassDiaLog {...props} />
          )}
          {props.G.stage === "attack or evade" && (
            <AttackOrEvadeDialog {...props} />
          )}
          <DrawOrPickCardDialog {...props} />
          {props.G.stage === "relocate loser" && (
            <RelocateLoserDialog {...props} />
          )}
          {props.G.stage === "plunder legends" && (
            <PlunderLegendsDialog {...props} />
          )}
          {props.G.stage === "attack or pass" && (
            <GroundAttackOrPassDialog {...props} />
          )}
          {props.G.stage === "defend or yield" && (
            <DefendOrYieldDialog {...props} />
          )}
          {props.G.stage === "garrison troops" && (
            <GarrisonTroopsDialog {...props} />
          )}
          {props.G.stage === "conquest" && <OutpostOrColonyDialog {...props} />}
          {props.G.stage === "retrieve fleets" && (
            <RetrieveFleetsDialog {...props} />
          )}
          <GameOverView {...props} />
          <Dialog
            open={isElectionTurn && dialogOpen}
          >
            <DialogTitle>
              It is your turn to vote, head to the election tab.
            </DialogTitle>
            <DialogActions>
              <Button
                variant="contained"
                color="error"
                onClick={() => setDialogOpen(false)}
              >
                Dismiss
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </ThemeProvider>
    </div>
  );
};