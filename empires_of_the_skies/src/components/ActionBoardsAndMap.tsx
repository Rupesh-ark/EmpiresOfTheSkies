import React, { lazy, Suspense, useState } from "react";

import { MyGameProps } from "@eots/game";
const ActionBoard = lazy(() => import("./ActionBoard/ActionBoard").then(m => ({ default: m.ActionBoard })));
const WorldMap = lazy(() => import("./WorldMap/WorldMap"));
const PlayerBoard = lazy(() => import("./PlayerBoard/PlayerBoard").then(m => ({ default: m.PlayerBoard })));
const RulesReference = lazy(() => import("./RulesReference"));
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
import { Campaign, ChatBubble, Close, Dashboard, Map, MenuBook, Person, TableChart, Timeline } from "@mui/icons-material";
import PickLegacyCardDialog from "./PickLegacyCardDialog";
import PickKingdomAdvantageCardDialog from "./PickKingdomAdvantageCardDialog";
import PickEventCardDialog from "./PickEventCardDialog";
import EventChoiceDialog from "./EventChoiceDialog";
import RebellionDialog from "./RebellionDialog";
import RebellionRivalSupportDialog from "./RebellionRivalSupportDialog";
import InvasionNominateDialog from "./InvasionNominateDialog";
import InvasionContributeDialog from "./InvasionContributeDialog";
import InvasionBuyoffDialog from "./InvasionBuyoffDialog";
import InfidelFleetCombatDialog from "./InfidelFleetCombatDialog";
import DeferredBattleDialog from "./DeferredBattleDialog";
import RoundSummaryDialog from "./RoundSummaryDialog";
import NprKingdomTable from "./PlayerTable/NprKingdomTable";
import GameLog from "./GameLog";
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
    transform: "scale(1.08)",
  },
};

export const ActionBoardsAndMap = (props: MyGameProps) => {
  const [value, setValue] = useState("0");
  const [mapDetailRequest, setMapDetailRequest] = useState<{
    location: number[];
    key: number;
  } | null>(null);
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

  const openMapAtLocation = (location: number[]) => {
    setMapDetailRequest((previousRequest) => ({
      location: [...location],
      key: (previousRequest?.key ?? 0) + 1,
    }));
    const mapIdx = tabs.findIndex((t) => t.key === "map");
    if (mapIdx >= 0) setValue(String(mapIdx));
  };

  // ── Tab definitions — reorder here to rearrange the sidebar ──
  const tabs: {
    key: string;
    label: string;
    icon: React.ReactNode;
    panel: React.ReactNode;
    panelSx?: object;
  }[] = [
    {
      key: "log",
      label: "Game Log",
      icon: <Timeline sx={{ color: kingdomColour }} />,
      panel: <GameLog {...props} />,
      panelSx: { p: 0 },
    },
    {
      key: "map",
      label: "World Map",
      icon: <Map sx={{ color: kingdomColour }} />,
      panel: (
        <WorldMap
          {...props}
          detailRequest={mapDetailRequest}
          onDetailRequestHandled={(requestKey) => {
            setMapDetailRequest((currentRequest) =>
              currentRequest?.key === requestKey ? null : currentRequest
            );
          }}
        />
      ),
    },
    {
      key: "action",
      label: "Action Board",
      icon: <Dashboard sx={{ color: kingdomColour }} />,
      panel: <ActionBoard {...props} />,
    },
    {
      key: "player",
      label: "Player Board",
      icon: <Person sx={{ color: kingdomColour }} />,
      panel: (
        <PlayerBoard {...props} onOpenFleetLocation={openMapAtLocation} />
      ),
    },
    {
      key: "stats",
      label: "Player Table",
      icon: <TableChart sx={{ color: kingdomColour }} />,
      panel: (
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
          <NprKingdomTable {...props} />
          <LootValueTable {...props} />
        </Box>
      ),
      panelSx: { p: 0 },
    },
    {
      key: "rules",
      label: "Rules",
      icon: <MenuBook sx={{ color: kingdomColour }} />,
      panel: <RulesReference />,
      panelSx: { p: 0 },
    },
  ];

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
                {tabs.map((tab, i) => (
                  <Tab
                    key={tab.key}
                    icon={<Tooltip title={tab.label} placement="left"><span>{tab.icon}</span></Tooltip>}
                    value={String(i)}
                    sx={tabSx}
                  />
                ))}
              </Tabs>
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Suspense fallback={null}>
                  {tabs.map((tab, i) => (
                    <TabPanel key={tab.key} value={String(i)} tabIndex={i} sx={tab.panelSx}>
                      {tab.panel}
                    </TabPanel>
                  ))}
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

          <RoundSummaryDialog {...props} />
          {props.ctx.phase === "kingdom_advantage" && (
            <PickKingdomAdvantageCardDialog {...props} />
          )}
          {props.G.stage === "events" && (
            <>
              <PickEventCardDialog {...props} />
              <EventChoiceDialog {...props} />
            </>
          )}
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
          {props.G.stage === "infidel_fleet_combat" && (
            <InfidelFleetCombatDialog {...props} />
          )}
          {props.G.stage === "deferred_battle" && (
            <DeferredBattleDialog {...props} />
          )}
          {props.G.stage === "rebellion" && (
            <RebellionDialog {...props} />
          )}
          {props.G.stage === "rebellion_rival_support" && (
            <RebellionRivalSupportDialog {...props} />
          )}
          {props.G.stage === "invasion_nominate" && (
            <InvasionNominateDialog {...props} />
          )}
          {props.G.stage === "invasion_contribute" && (
            <InvasionContributeDialog {...props} />
          )}
          {props.G.stage === "invasion_buyoff" && (
            <InvasionBuyoffDialog {...props} />
          )}
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
