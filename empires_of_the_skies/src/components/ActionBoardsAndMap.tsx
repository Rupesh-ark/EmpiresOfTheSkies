import React, { useState } from "react";

import { MyGameProps } from "@eots/game";
import { ActionBoard } from "./ActionBoard/ActionBoard";
import WorldMap from "./WorldMap/WorldMap";
import { PlayerBoard } from "./PlayerBoard/PlayerBoard";

import {
  Box,
  Button,
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
import Chat from "./Chat/Chat";
import { generalTheme } from "./themes";
import { Campaign, ChatBubble, Dashboard, Map, Person, TableChart } from "@mui/icons-material";
import heresyTrackerIcon from "../boards_and_assets/heresy_tracker_icon.svg";
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
  const kingdomColour = props.playerID
    ? props.G.playerInfo[props.playerID].colour
    : undefined;

  return (
    <div>
      <ThemeProvider theme={generalTheme}>
        {<ResourceTrackerBar {...props} />}
        <Box
          sx={{
            flexGrow: 1,
          }}
        >
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
                <Tab
                  icon={<Tooltip title="Heresy Tracker" placement="left"><img src={heresyTrackerIcon} width={50} height={50} /></Tooltip>}
                  value={"4"}
                  sx={tabSx}
                />
                <Tab
                  icon={
                    props.ctx.phase === "election" &&
                    props.playerID === props.ctx.currentPlayer ? (
                      <Tooltip title="Election" placement="left"><Campaign sx={{ color: kingdomColour }} /></Tooltip>
                    ) : (
                      <Tooltip title="Group Chat" placement="left"><ChatBubble sx={{ color: kingdomColour }} /></Tooltip>
                    )
                  }
                  value={"5"}
                  sx={tabSx}
                />
              </Tabs>
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <TabPanel value={"0"} tabIndex={0}>
                  <ActionBoard {...props} />
                </TabPanel>
                <TabPanel value={"1"} tabIndex={1}>
                  <PlayerBoard {...props} />
                </TabPanel>
                <TabPanel value={"2"} tabIndex={2}>
                  <WorldMap {...props} />
                </TabPanel>
                <TabPanel value={"3"} tabIndex={3}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      width: "100%",
                      flexDirection: "column",
                    }}
                  >
                    <div style={{ padding: 10 }}>
                      Round number: {props.G.round}/{props.G.finalRound}
                    </div>
                    <PlayerTable {...props} />
                    <LootValueTable {...props} />
                  </div>
                </TabPanel>
                <TabPanel value={"4"} tabIndex={4}>
                  <HeresyTracker {...props} />
                </TabPanel>
                <TabPanel value={"5"} tabIndex={5}>
                  <Chat {...props} />
                </TabPanel>
              </Box>
             
            </Box>
          </TabContext>
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
            open={
              props.ctx.phase === "election" &&
              props.playerID === props.ctx.currentPlayer &&
              dialogOpen
            }
          >
            <DialogTitle>
              It is your turn to vote, head to the election tab.
            </DialogTitle>
            <DialogActions>
              <Button
                variant="contained"
                color="error"
                onClick={() => {
                  setDialogOpen(false);
                }}
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
