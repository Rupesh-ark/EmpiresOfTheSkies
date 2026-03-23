/**
 * FoundBuildingsRow — 4 individual building cells in a single horizontal row.
 */
import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Tooltip,
  Typography,
} from "@mui/material";
import { tokens } from "@/theme";
import { BTN_BG } from "@/assets/actionBoard";
import { clearMoves } from "@/utils/gameHelpers";
import { PlayerDot } from "@/components/atoms/PlayerDot";
import { ActionBoardProps, ActionTooltipContent, TOOLTIP_DELAY } from "../shared";
import { useActionHover } from "../../ActionHoverContext";
import WorldMap from "@/components/WorldMap/WorldMap";

const THUMB_W = 40;

const BUILDINGS = [
  { label: "Cathedral", index: 0, key: 1, bg: BTN_BG.cathedral, actionId: "cathedral", baseCost: 5 },
  { label: "Palace",    index: 1, key: 2, bg: BTN_BG.palace,    actionId: "palace",    baseCost: 5 },
  { label: "Shipyard",  index: 2, key: 3, bg: BTN_BG.shipyard,  actionId: "shipyard",  baseCost: 3 },
  { label: "Fort",      index: 3, key: 4, bg: BTN_BG.fort,      actionId: "fort",      baseCost: 2 },
] as const;

const BuildingCell = ({
  label,
  cost,
  counsellors,
  playerInfo,
  onClick,
  bg,
  actionId,
}: {
  label: string;
  cost: number;
  counsellors: string[];
  playerInfo: Record<string, { colour: string; kingdomName: string }>;
  onClick: () => void;
  bg?: string;
  actionId: string;
}) => {
  const { setHoveredAction } = useActionHover();

  return (
    <Tooltip title={<ActionTooltipContent actionId={actionId} />} placement="top" arrow enterDelay={TOOLTIP_DELAY.enter} enterNextDelay={TOOLTIP_DELAY.enterNext}>
    <Box
      onClick={onClick}
      onMouseEnter={() => setHoveredAction(actionId)}
      onMouseLeave={() => setHoveredAction(null)}
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minWidth: 0,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(180deg, ${tokens.ui.surfaceRaised} 0%, ${tokens.ui.surface} 100%)`,
        borderRadius: `${tokens.radius.md}px`,
        border: `1px solid ${tokens.ui.border}`,
        borderLeft: "3px solid transparent",
        borderTop: `1px solid ${tokens.ui.gold}12`,
        "&::before": {
          content: '""',
          position: "absolute",
          left: -3,
          top: 0,
          bottom: 0,
          width: 3,
          borderRadius: `${tokens.radius.md}px 0 0 ${tokens.radius.md}px`,
          background: `linear-gradient(180deg, ${tokens.ui.gold} 0%, ${tokens.ui.gold}55 60%, transparent 100%)`,
          transition: `background ${tokens.transition.fast}`,
        },
        cursor: "pointer",
        transition: `all ${tokens.transition.fast}`,
        "&:hover": {
          borderColor: `${tokens.ui.gold}33`,
          backgroundColor: tokens.ui.surfaceHover,
          boxShadow: `0 0 6px ${tokens.ui.gold}10`,
          "&::before": {
            background: `linear-gradient(180deg, ${tokens.ui.gold} 0%, ${tokens.ui.gold}88 60%, ${tokens.ui.gold}22 100%)`,
          },
        },
        "&:active": { transform: "scale(0.998)" },
      }}
    >
      {/* Top: thumbnail + label */}
      <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
        {bg && (
          <Box
            sx={{
              width: THUMB_W,
              alignSelf: "stretch",
              flexShrink: 0,
              overflow: "hidden",
              ml: "3px",
            }}
          >
            <Box
              component="img"
              src={bg}
              alt=""
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                display: "block",
                maskImage: "linear-gradient(to right, black 50%, transparent 100%)",
                WebkitMaskImage: "linear-gradient(to right, black 50%, transparent 100%)",
              }}
            />
          </Box>
        )}
        <Box sx={{ flex: 1, minWidth: 0, pl: bg ? 0 : `${tokens.spacing.sm}px`, pr: `${tokens.spacing.xs}px` }}>
          <Typography
            noWrap
            sx={{
              fontFamily: tokens.font.display,
              fontSize: tokens.fontSize.sm,
              color: tokens.ui.text,
              lineHeight: 1.2,
            }}
          >
            {label}
          </Typography>
          <Typography
            sx={{
              fontFamily: tokens.font.body,
              fontSize: tokens.fontSize.xs,
              color: tokens.ui.gold,
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {cost}g
          </Typography>
        </Box>
      </Box>

      {/* Bottom: counsellor dots */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "2px",
          px: `${tokens.spacing.xs}px`,
          pb: "3px",
          minHeight: 14,
        }}
      >
        {counsellors.length > 0 && (
          <Typography
            sx={{
              fontFamily: tokens.font.body,
              fontSize: 9,
              color: tokens.ui.textMuted,
              fontWeight: 600,
            }}
          >
            {counsellors.length}
          </Typography>
        )}
        {counsellors.map((pid, i) => {
          const info = playerInfo[pid];
          return info ? (
            <PlayerDot
              key={i}
              colour={info.colour}
              size="xs"
            />
          ) : null;
        })}
      </Box>
    </Box>
    </Tooltip>
  );
};

const FoundBuildingsRow = (props: ActionBoardProps) => {
  const [palaceDialogOpen, setPalaceDialogOpen] = useState(false);
  const [fortDialogOpen, setFortDialogOpen] = useState(false);
  const [selectedFortTile, setSelectedFortTile] = useState([4, 0]);

  const possibleFortTiles: number[][] = [];
  props.G.mapState.buildings.forEach((tileRow, yIndex) => {
    tileRow.forEach((tile, xIndex) => {
      if (
        tile.player?.id === props.playerID &&
        tile.buildings &&
        (tile.garrisonedRegiments > 0 || tile.garrisonedLevies > 0) &&
        !tile.fort
      ) {
        possibleFortTiles.push([xIndex, yIndex]);
      }
    });
  });

  const handleClick = (index: number) => {
    if (index === 1) {
      // Palace: open heresy direction dialog first, move fires after choice
      clearMoves(props);
      setPalaceDialogOpen(true);
    } else if (index === 3) {
      // Fort: call foundBuildings then open map selection dialog
      clearMoves(props);
      props.moves.foundBuildings(3);
      setFortDialogOpen(true);
    } else {
      // Cathedral (0) and Shipyard (2): fire immediately
      clearMoves(props);
      props.moves.foundBuildings(index);
    }
  };

  return (
    <>
      <Box sx={{ display: "flex", gap: "6px" }}>
        {BUILDINGS.map((b) => {
          const counsellors = (props.G.boardState.foundBuildings[
            b.key as keyof typeof props.G.boardState.foundBuildings
          ] as string[]) ?? [];
          const cost = b.baseCost + counsellors.length + 1;
          return (
            <BuildingCell
              key={b.label}
              label={b.label}
              cost={cost}
              counsellors={counsellors}
              playerInfo={props.G.playerInfo}
              bg={b.bg}
              actionId={b.actionId}
              onClick={() => handleClick(b.index)}
            />
          );
        })}
      </Box>

      {/* Palace: heresy direction dialog */}
      <Dialog open={palaceDialogOpen}>
        <DialogTitle sx={{ fontFamily: tokens.font.display }}>
          Select direction to move heresy tracker
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontFamily: tokens.font.display, color: "black" }}>
            The direction you pick will advance your heresy tracker by 1 in your chosen direction, this affects the victory points you will earn at the end of the game.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              clearMoves(props);
              setPalaceDialogOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            sx={{ backgroundColor: "#E77B00" }}
            onClick={() => {
              props.moves.foundBuildings(1, "advance");
              setPalaceDialogOpen(false);
            }}
          >
            Heresy
          </Button>
          <Button
            variant="contained"
            sx={{ backgroundColor: "#A74383" }}
            onClick={() => {
              props.moves.foundBuildings(1, "retreat");
              setPalaceDialogOpen(false);
            }}
          >
            Orthodoxy
          </Button>
        </DialogActions>
      </Dialog>

      {/* Fort: map tile selection dialog */}
      <Dialog maxWidth={false} open={fortDialogOpen}>
        <DialogTitle sx={{ fontFamily: tokens.font.display }}>
          {`Select location for your fort. Current selection: [${selectedFortTile[0] + 1}, ${4 - selectedFortTile[1]}]`}
        </DialogTitle>
        <DialogContent>
          <WorldMap
            {...props}
            alternateOnClick={(coords: number[]) => setSelectedFortTile(coords)}
            selectableTiles={possibleFortTiles}
          />
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              clearMoves(props);
              setFortDialogOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            disabled={selectedFortTile[0] === 4 && selectedFortTile[1] === 0}
            onClick={() => {
              props.moves.checkAndPlaceFort(selectedFortTile);
              setFortDialogOpen(false);
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FoundBuildingsRow;
