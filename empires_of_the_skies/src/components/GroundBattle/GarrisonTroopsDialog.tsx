import { useState, useCallback } from "react";
import { MyGameProps, createLogger } from "@eots/game";
import {
  DndContext,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { Box, Typography } from "@mui/material";
import { DialogShell } from "@/components/atoms/DialogShell";
import { tokens } from "@/theme";
import { IconRegiment, IconElite, IconLevy } from "@/theme";

const log = createLogger("battle");

// ── Troop types & icons (same pattern as FleetTransferDialog) ──────────────

type TroopKind = "regiment" | "elite" | "levy";

function TroopIcon({ kind, size = 16 }: { kind: TroopKind; size?: number }) {
  const style = { color: tokens.ui.text };
  if (kind === "regiment") return <IconRegiment size={size} style={style} />;
  if (kind === "elite") return <IconElite size={size} style={style} />;
  return <IconLevy size={size} style={style} />;
}

function TroopChip({ kind, overlay = false }: { kind: TroopKind; overlay?: boolean }) {
  return (
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        border: `2px solid ${tokens.ui.borderMedium}`,
        backgroundColor: tokens.ui.surfaceRaised,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "grab",
        boxShadow: overlay
          ? `0 6px 16px rgba(0,0,0,0.30)`
          : tokens.shadow.sm,
        userSelect: "none",
      }}
    >
      <TroopIcon kind={kind} size={16} />
    </Box>
  );
}

function DraggableTroop({ id, kind }: { id: string; kind: TroopKind }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      sx={{ opacity: isDragging ? 0.3 : 1, transition: `opacity ${tokens.transition.fast}` }}
    >
      <TroopChip kind={kind} />
    </Box>
  );
}

// ── Drag ID parsing ────────────────────────────────────────────────────────

type DragSource =
  | { zone: "fleet"; kind: TroopKind }
  | { zone: "garrison"; kind: TroopKind };

function parseDragId(id: string): DragSource | null {
  if (id.startsWith("fleet-regiment-")) return { zone: "fleet", kind: "regiment" };
  if (id.startsWith("fleet-elite-")) return { zone: "fleet", kind: "elite" };
  if (id.startsWith("fleet-levy-")) return { zone: "fleet", kind: "levy" };
  if (id.startsWith("garrison-regiment-")) return { zone: "garrison", kind: "regiment" };
  if (id.startsWith("garrison-elite-")) return { zone: "garrison", kind: "elite" };
  if (id.startsWith("garrison-levy-")) return { zone: "garrison", kind: "levy" };
  return null;
}

// ── Drop zones ─────────────────────────────────────────────────────────────

const sectionHeader = {
  fontFamily: tokens.font.body,
  fontSize: tokens.fontSize.xs,
  color: tokens.ui.textMuted,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  mb: 0.75,
};

function TroopRow({ label, prefix, kind, count }: { label: string; prefix: string; kind: TroopKind; count: number }) {
  if (count === 0) return null;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
      <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, mr: 0.5, flexShrink: 0, minWidth: 65 }}>
        {label}
      </Typography>
      {Array.from({ length: count }, (_, i) => (
        <DraggableTroop key={`${prefix}-${i}`} id={`${prefix}-${i}`} kind={kind} />
      ))}
    </Box>
  );
}

function FleetZone({ regiments, elites, levies }: { regiments: number; elites: number; levies: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: "fleet-zone" });
  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={sectionHeader}>Fleet Troops</Typography>
      <Box
        ref={setNodeRef}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
          p: 1.5,
          borderRadius: `${tokens.radius.md}px`,
          border: `1.5px dashed ${isOver ? tokens.ui.gold : tokens.ui.borderMedium}`,
          backgroundColor: isOver ? `${tokens.ui.gold}10` : tokens.ui.surface,
          minHeight: 40,
          transition: `all ${tokens.transition.fast}`,
        }}
      >
        <TroopRow label="Regiments" prefix="fleet-regiment" kind="regiment" count={regiments} />
        <TroopRow label="Elites" prefix="fleet-elite" kind="elite" count={elites} />
        <TroopRow label="Levies" prefix="fleet-levy" kind="levy" count={levies} />
        {regiments === 0 && elites === 0 && levies === 0 && (
          <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, fontStyle: "italic", textAlign: "center", py: 1 }}>
            All troops garrisoned
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function GarrisonZone({ regiments, elites, levies }: { regiments: number; elites: number; levies: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: "garrison-zone" });
  const isEmpty = regiments === 0 && elites === 0 && levies === 0;
  return (
    <Box>
      <Typography sx={sectionHeader}>Garrison</Typography>
      <Box
        ref={setNodeRef}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
          p: 1.5,
          borderRadius: `${tokens.radius.md}px`,
          border: `1.5px dashed ${isOver ? tokens.ui.gold : tokens.ui.borderMedium}`,
          backgroundColor: isOver ? `${tokens.ui.gold}10` : tokens.ui.surface,
          minHeight: 40,
          transition: `all ${tokens.transition.fast}`,
        }}
      >
        <TroopRow label="Regiments" prefix="garrison-regiment" kind="regiment" count={regiments} />
        <TroopRow label="Elites" prefix="garrison-elite" kind="elite" count={elites} />
        <TroopRow label="Levies" prefix="garrison-levy" kind="levy" count={levies} />
        {isEmpty && (
          <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, fontStyle: "italic", textAlign: "center", py: 1 }}>
            Drag troops here to garrison
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// ── Local state ────────────────────────────────────────────────────────────

interface GarrisonState {
  fleet: { regiments: number; elites: number; levies: number };
  garrison: { regiments: number; elites: number; levies: number };
}

// ── Main dialog ────────────────────────────────────────────────────────────

const GarrisonTroopsDialog = (props: MyGameProps) => {
  const [x, y] = props.G.mapState.currentBattle;

  const inCurrentBattle =
    props.G.mapState.battleMap[y] &&
    props.G.mapState.battleMap[y][x].includes(
      props.playerID ?? props.ctx.currentPlayer
    );

  // Troops available for garrisoning are pre-computed by the backend
  const troops = props.G.troopsAvailableForGarrison ?? { regiments: 0, elites: 0, levies: 0 };
  const playerRegiments = troops.regiments;
  const playerElites = troops.elites;
  const playerLevies = troops.levies;

  const hasTroopsToGarrison = playerRegiments > 0 || playerElites > 0 || playerLevies > 0;

  // Auto-skip if no troops to garrison
  if (
    (props.G.stage.sub === "ground_garrison" || props.G.stage.sub === "conquest_garrison") &&
    props.ctx.currentPlayer === props.playerID &&
    !(
      props.G.stage.sub === "ground_garrison" &&
      inCurrentBattle &&
      props.G.battleState?.attacker.id === props.playerID &&
      props.G.battleState.attacker.victorious === true &&
      hasTroopsToGarrison
    ) &&
    !(props.G.stage.sub === "conquest_garrison" && inCurrentBattle && hasTroopsToGarrison)
  ) {
    log.info("garrison dialog", { phase: props.ctx.phase });
    props.G.stage.sub === "ground_garrison"
      ? props.moves.doNotGroundAttack()
      : props.moves.doNothing();
  }

  const [state, setState] = useState<GarrisonState>({
    fleet: { regiments: playerRegiments, elites: playerElites, levies: playerLevies },
    garrison: { regiments: 0, elites: 0, levies: 0 },
  });

  const [activeDrag, setActiveDrag] = useState<TroopKind | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const parsed = parseDragId(String(event.active.id));
    if (parsed) setActiveDrag(parsed.kind);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;

    const drag = parseDragId(String(active.id));
    const dropZone = String(over.id);
    if (!drag) return;

    setState((prev) => {
      const next = {
        fleet: { ...prev.fleet },
        garrison: { ...prev.garrison },
      };

      // Fleet → Garrison
      if (drag.zone === "fleet" && dropZone === "garrison-zone") {
        if (drag.kind === "regiment" && next.fleet.regiments > 0) {
          next.fleet.regiments--;
          next.garrison.regiments++;
        } else if (drag.kind === "elite" && next.fleet.elites > 0) {
          next.fleet.elites--;
          next.garrison.elites++;
        } else if (drag.kind === "levy" && next.fleet.levies > 0) {
          next.fleet.levies--;
          next.garrison.levies++;
        }
        return next;
      }

      // Garrison → Fleet
      if (drag.zone === "garrison" && dropZone === "fleet-zone") {
        if (drag.kind === "regiment" && next.garrison.regiments > 0) {
          next.garrison.regiments--;
          next.fleet.regiments++;
        } else if (drag.kind === "elite" && next.garrison.elites > 0) {
          next.garrison.elites--;
          next.fleet.elites++;
        } else if (drag.kind === "levy" && next.garrison.levies > 0) {
          next.garrison.levies--;
          next.fleet.levies++;
        }
        return next;
      }

      return prev;
    });
  }, []);

  const isOpen =
    props.ctx.currentPlayer === props.playerID &&
    (props.G.stage.sub === "ground_garrison" || props.G.stage.sub === "conquest_garrison") &&
    ((props.G.stage.sub === "ground_garrison" &&
      inCurrentBattle &&
      props.G.battleState?.attacker.id === props.playerID &&
      props.G.battleState.attacker.victorious === true &&
      hasTroopsToGarrison) ||
      (props.G.stage.sub === "conquest_garrison" &&
        inCurrentBattle &&
        hasTroopsToGarrison));

  const hasGarrisoned =
    state.garrison.regiments > 0 ||
    state.garrison.elites > 0 ||
    state.garrison.levies > 0;

  return (
    <DialogShell
      open={isOpen}
      title="Garrison Troops"
      subtitle="Drag troops from your fleet into the garrison to defend this region."
      mood="discovery"
      size="sm"
      confirmLabel="Garrison"
      confirmColor="success"
      confirmDisabled={!hasGarrisoned}
      onConfirm={() =>
        props.moves.garrisonTroops([
          state.garrison.regiments,
          state.garrison.levies,
          state.garrison.elites,
        ])
      }
      cancelLabel="Pass"
      cancelColor="error"
      onCancel={() => {
        props.G.stage.sub === "ground_garrison"
          ? props.moves.doNotGroundAttack()
          : props.moves.doNothing();
      }}
    >
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <FleetZone
          regiments={state.fleet.regiments}
          elites={state.fleet.elites}
          levies={state.fleet.levies}
        />
        <GarrisonZone
          regiments={state.garrison.regiments}
          elites={state.garrison.elites}
          levies={state.garrison.levies}
        />
        <DragOverlay>
          {activeDrag && <TroopChip kind={activeDrag} overlay />}
        </DragOverlay>
      </DndContext>
    </DialogShell>
  );
};

export default GarrisonTroopsDialog;
