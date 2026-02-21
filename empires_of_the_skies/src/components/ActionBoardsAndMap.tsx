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
import { Campaign } from "@mui/icons-material";
import PickLegacyCardDialog from "./PickLegacyCardDialog";
import GameOverView from "./GameOverView";
import LootValueTable from "./PlayerTable/LootValueTable";

export const ActionBoardsAndMap = (props: MyGameProps) => {
  const [value, setValue] = useState("0");
  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    setValue(newValue);
  };
  const [dialogOpen, setDialogOpen] = useState(true);

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
            <Tabs value={value} onChange={handleChange} centered>
              <Tab
                label="Action Board"
                value={"0"}
                style={{
                  fontFamily: "dauphinn",
                  fontSize: 26,
                  textTransform: "none",
                }}
              />
              <Tab
                label="Player Board"
                value={"1"}
                style={{
                  fontFamily: "dauphinn",
                  fontSize: 26,
                  textTransform: "none",
                }}
              />
              <Tab
                label="World Map"
                value={"2"}
                style={{
                  fontFamily: "dauphinn",
                  fontSize: 26,
                  textTransform: "none",
                }}
              />
              <Tab
                label="Player Table"
                value={"3"}
                style={{
                  fontFamily: "dauphinn",
                  fontSize: 26,
                  textTransform: "none",
                }}
              />{" "}
              <Tab
                label={
                  props.ctx.phase === "election" &&
                  props.playerID === props.ctx.currentPlayer
                    ? "Election"
                    : "Group Chat"
                }
                value={"4"}
                style={{
                  fontFamily: "dauphinn",
                  fontSize: 26,
                  textTransform: "none",
                }}
                icon={
                  props.ctx.phase === "election" &&
                  props.playerID === props.ctx.currentPlayer ? (
                    <Campaign />
                  ) : undefined
                }
                iconPosition="end"
              />
            </Tabs>
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
                <HeresyTracker {...props} />
                <LootValueTable {...props} />
              </div>
            </TabPanel>
            <TabPanel value={"4"} tabIndex={4}>
              <Chat {...props} />
            </TabPanel>
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
