import { useRef, useState } from "react";
import { MyGameProps, GAME_PHASES } from "@eots/game";
import {
  AppBar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Toolbar,
  Tooltip,
} from "@mui/material";
import { IoMdCube } from "react-icons/io";
import { GiTrumpetFlag } from "react-icons/gi";
import { checkPlayerIDAndReturnPlayerInfo, clearMoves } from "@/utils/gameHelpers";
import { Factory, Person4Sharp } from "@mui/icons-material";
import { PRISON_ICON as prisonSvg } from "@/assets/icons";
import ArchprelateIcon from "../Icons/ArchprelateIcon";
import CounsellorIcon from "../Icons/CounsellorIcon";
import VictoryPointIcon from "../Icons/VictoryPointIcon";
import RegimentIcon from "../Icons/RegimentIcon";
import {
  CardHoldingsInlineControls,
  CardHoldingsPanels,
} from "./CardHoldingsBarTabs";

const chipSx = {
  backgroundColor: "rgba(255,255,255,1)",
  color: "black",
  height: 36,
  border: "1px solid rgba(255,255,255,0.22)",
  "& .MuiChip-icon": { fontSize: 26 },
  "& .MuiChip-label": { fontWeight: 600 },
};

const ResourceTrackerBar = (props: ResourceTrackerBarProps) => {
  const [passDialogOpen, setPassDialogOpen] = useState(false);
  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false);
  const [legacyCardOpen, setLegacyCardOpen] = useState(false);
  const [advantageCardOpen, setAdvantageCardOpen] = useState(false);
  const cardHoldingsAnchorRef = useRef<HTMLDivElement | null>(null);
  if (!props.playerID) {
    return <></>;
  }
  const currentPlayer = checkPlayerIDAndReturnPlayerInfo(props);
  const counsellors = currentPlayer.resources.counsellors;
  const gold = currentPlayer.resources.gold;
  const prisoners = currentPlayer.prisoners;
  const colour = currentPlayer.colour;
  const victoryPoints = currentPlayer.resources.victoryPoints;
  const factories = currentPlayer.factories;
  const eliteRegiments = currentPlayer.resources.eliteRegiments ?? 0;
  const legacyCardName = currentPlayer.resources.legacyCard?.name ?? "the builder";
  const advantageCard = currentPlayer.resources.advantageCard;
  const turnComplete =
    props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer].turnComplete;
  const isMyTurn = props.ctx.currentPlayer === props.playerID;
  const showConfirmEndTurn = turnComplete && props.ctx.phase === "actions" && isMyTurn;

  return (
    <AppBar
      position={"sticky"}
      sx={{
        background: "linear-gradient(90deg, #1a0a14 0%, #0d0d0d 50%, #1a0a00 100%)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.6)",
        overflow: "visible",
      }}
    >
      <Toolbar
        sx={{
          justifyContent: "space-between",
          flexWrap: "nowrap",
          gap: 1,
          py: 0.5,
          overflowX: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <Tooltip title="Click for game status" disableInteractive>
            <Chip
              icon={<GiTrumpetFlag style={{ fontSize: 18 }} />}
              label={(() => {
                const phase = GAME_PHASES.find((p) => p.key === props.ctx.phase);
                const phaseName = phase?.label ?? props.G.stage;
                if (props.G.stage === "events") return `${phaseName} \u2014 Choose a Card`;
                return `Round ${props.G.round} \u2014 ${phaseName}`;
              })()}
              onClick={() => setPhaseDialogOpen(true)}
              sx={{
                ...chipSx,
                cursor: "pointer",
                backgroundColor: "rgba(255,255,255,0.1)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.2)",
                "& .MuiChip-label": { fontWeight: 600, fontSize: "0.8rem" },
              }}
            />
          </Tooltip>
          <Tooltip title="Current turn" disableInteractive>
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Person4Sharp
                sx={{ color: props.G.playerInfo[props.ctx.currentPlayer].colour, fontSize: 22 }}
              />
              <span style={{ fontSize: "0.85rem" }}>
                {props.matchData?.find(
                  (p) => String(p.id) === props.ctx.currentPlayer
                )?.name ?? "Player"}
              </span>
              <Chip
                label={props.G.playerInfo[props.ctx.currentPlayer].kingdomName}
                size="small"
                sx={{
                  backgroundColor: props.G.playerInfo[props.ctx.currentPlayer].colour,
                  color: props.G.playerInfo[props.ctx.currentPlayer].colour === "#F5DE48" ? "#333" : "white",
                  height: 22,
                  fontSize: "0.7rem",
                  fontWeight: "bold",
                }}
              />
            </span>
          </Tooltip>
          {props.G.playerInfo[props.playerID ?? props.ctx.currentPlayer]
            .isArchprelate && (
            <Tooltip title="Archprelate" disableInteractive>
              <span style={{ display: "flex", alignItems: "center" }}>
                <ArchprelateIcon />
              </span>
            </Tooltip>
          )}
        </div>
        <Box
          ref={cardHoldingsAnchorRef}
          sx={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}
        >
          <CardHoldingsInlineControls
            colour={colour}
            legacyCardOpen={legacyCardOpen}
            advantageCardOpen={advantageCardOpen}
            onToggleLegacy={() => setLegacyCardOpen((open) => !open)}
            onToggleAdvantage={() => setAdvantageCardOpen((open) => !open)}
          />
        </Box>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "nowrap",
          }}
        >
          <Tooltip title="Counsellors" disableInteractive>
            <Chip
              icon={<CounsellorIcon colour={colour ?? "white"} />}
              label={counsellors}
              sx={chipSx}
            />
          </Tooltip>
          <Tooltip title="Gold" disableInteractive>
            <Chip
              icon={<IoMdCube style={{ color: "#FFD700" }} />}
              label={gold}
              sx={chipSx}
            />
          </Tooltip>
          <Tooltip title="Imprisoned Dissenters" disableInteractive>
            <Chip
              icon={
                <Box
                  component="img"
                  src={prisonSvg}
                  alt=""
                  sx={{ width: 22, height: 22, objectFit: "contain" }}
                />
              }
              label={prisoners}
              sx={chipSx}
            />
          </Tooltip>
          <Tooltip title="Factories" disableInteractive>
            <Chip
              icon={<Factory sx={{ color: "#8B6914" }} />}
              label={factories ?? 0}
              sx={chipSx}
            />
          </Tooltip>
          {eliteRegiments > 0 && (
            <Tooltip title="Elite Regiments (3 swords each — cannot be re-recruited)" disableInteractive>
              <Chip
                icon={<RegimentIcon colour="#A74383" />}
                label={`${eliteRegiments} Elite`}
                sx={{
                  ...chipSx,
                  border: "1px solid rgba(167,67,131,0.45)",
                }}
              />
            </Tooltip>
          )}
          <Tooltip title="Victory Points" disableInteractive>
            <Chip
              icon={<VictoryPointIcon colour={colour} />}
              label={victoryPoints}
              sx={chipSx}
            />
          </Tooltip>
          {isMyTurn && props.ctx.numMoves > 0 && props.ctx.phase === "actions" && (
            <Button
              size="small"
              variant="contained"
              color="error"
              onClick={() => clearMoves(props)}
            >
              Clear Move
            </Button>
          )}
          {showConfirmEndTurn ? (
            <Button
              size="small"
              variant="contained"
              color="success"
              onClick={() => props.moves.confirmAction()}
            >
              Confirm & End Turn
            </Button>
          ) : (
            <Button
              size="small"
              variant="contained"
              color="warning"
              onClick={() => {
                setPassDialogOpen(true);
              }}
              disabled={!isMyTurn}
            >
              Pass
            </Button>
          )}
        </div>
      </Toolbar>
      <CardHoldingsPanels
        anchorEl={cardHoldingsAnchorRef.current}
        colour={colour}
        legacyCardName={legacyCardName}
        advantageCard={advantageCard}
        legacyCardOpen={legacyCardOpen}
        advantageCardOpen={advantageCardOpen}
      />
      <Box
        sx={{
          height: 3,
          background: currentPlayer.hereticOrOrthodox === "heretic"
            ? "linear-gradient(90deg, #E77B00, #FFB04D, #E77B00, #FFB04D, #E77B00)"
            : "linear-gradient(90deg, #A74383, #D06AAD, #A74383, #D06AAD, #A74383)",
          backgroundSize: "300% 100%",
          animation: "shimmer 8s linear infinite",
          "@keyframes shimmer": {
            "0%": { backgroundPosition: "0% 0%" },
            "100%": { backgroundPosition: "300% 0%" },
          },
        }}
      />
      <Dialog open={phaseDialogOpen} onClose={() => setPhaseDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Game Status</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <List dense>
            <ListItem sx={{ backgroundColor: "rgba(0,0,0,0.06)" }}>
              <ListItemText primary={`Round ${props.G.round} of ${props.G.finalRound}`} slotProps={{ primary: { fontWeight: "bold" } }} />
            </ListItem>
          </List>
          <Box sx={{ px: 2, pt: 1, pb: 0.5 }}>
            <span style={{ fontWeight: 600, fontSize: "0.8rem", textTransform: "uppercase", color: "#888" }}>Phases</span>
          </Box>
          <List dense>
            {GAME_PHASES.map((phase) => (
              <ListItem
                key={phase.key}
                sx={
                  props.ctx.phase === phase.key
                    ? { backgroundColor: "action.selected" }
                    : {}
                }
              >
                <ListItemText
                  primary={phase.label}
                  slotProps={
                    props.ctx.phase === phase.key
                      ? { primary: { fontWeight: "bold" } }
                      : {}
                  }
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPhaseDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={passDialogOpen}>
        <DialogTitle>Are you sure you want to pass?</DialogTitle>
        <DialogContent>
          You will not be able to make any further moves until the next phase of
          play.
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setPassDialogOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            color="warning"
            variant="contained"
            onClick={() => {
              setPassDialogOpen(false);
              props.moves.pass();
            }}
          >
            Confirm Pass
          </Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  );
};

interface ResourceTrackerBarProps extends MyGameProps {}
export default ResourceTrackerBar;
