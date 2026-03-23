/**
 * FleetTransferDialog — drag-and-drop fleet management (Advance Wars style).
 *
 * Lets a player move troops/skyships between their fleets at the same tile, or
 * between a fleet and their kingdom reserves (only at the kingdom home tile).
 *
 * Move signatures (from packages/game):
 *   transferBetweenFleets(sourceFleetIndex, targetFleetIndex, skyships, regiments, levies, eliteRegiments)
 *   passFleetInfoToPlayerInfo(fleetId, skyships, regiments, levies, eliteRegiments)  — takes TOTALS not deltas
 *
 * dnd-kit architecture:
 *   Draggable IDs:  "reserve-skyship-{i}", "reserve-regiment-{i}", "reserve-elite-{i}", "reserve-levy-{i}"
 *                   "fleet-{fleetId}-slot-{slotIndex}", "fleet-{fleetId}-slot-{slotIndex}-troop"
 *   Droppable IDs:  "fleet-{fleetId}-slot-{slotIndex}", "fleet-{fleetId}-slot-{slotIndex}-troop"
 *                   "reserves-skyships", "reserves-troops"
 */

import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
} from "@mui/material";
import { tokens } from "@/theme";
import {
  IconSkyship,
  IconRegiment,
  IconElite,
  IconLevy,
} from "@/theme";
import { GameButton } from "@/components/atoms/GameButton";
import { FleetInfo, MAX_SKYSHIPS_PER_FLEET, TileInfoProps } from "@eots/game";
import { getLocationPresentation } from "@/utils/locationLabels";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Reserves {
  skyships: number;
  regiments: number;
  levies: number;
  eliteRegiments: number;
}

export interface GarrisonInfo {
  buildingType: "outpost" | "colony";
  regiments: number;
  levies: number;
  eliteRegiments: number;
}

export interface FleetTransferDialogProps {
  open: boolean;
  onClose: () => void;
  location: [number, number];
  fleets: FleetInfo[];
  reserves: Reserves;
  isKingdom: boolean;
  garrison: GarrisonInfo | null;
  tileArray: TileInfoProps[][];
  moves: Record<string, (...args: any[]) => void>;
}

type TroopKind = "regiment" | "elite" | "levy";

interface SlotState {
  hasSkyship: boolean;
  troop: TroopKind | null;
}

interface FleetLocalState {
  fleetId: number;
  slots: SlotState[]; // always length MAX_SKYSHIPS_PER_FLEET
}

interface ReservesLocalState {
  skyships: number;
  regiments: number;
  eliteRegiments: number;
  levies: number;
}

interface GarrisonLocalState {
  regiments: number;
  levies: number;
  eliteRegiments: number;
}

interface DialogState {
  fleets: FleetLocalState[];
  reserves: ReservesLocalState;
  garrison: GarrisonLocalState | null;
}

// ── State initialiser ─────────────────────────────────────────────────────────

function initFleetSlots(fleet: FleetInfo): SlotState[] {
  const slots: SlotState[] = Array.from({ length: MAX_SKYSHIPS_PER_FLEET }, () => ({
    hasSkyship: false,
    troop: null,
  }));

  // Fill skyship slots left-to-right
  for (let i = 0; i < Math.min(fleet.skyships, MAX_SKYSHIPS_PER_FLEET); i++) {
    slots[i].hasSkyship = true;
  }

  // Distribute troops across occupied slots (regiments → elites → levies)
  const troops: TroopKind[] = [
    ...Array(fleet.regiments).fill("regiment" as TroopKind),
    ...Array(fleet.eliteRegiments).fill("elite" as TroopKind),
    ...Array(fleet.levies).fill("levy" as TroopKind),
  ];
  let troopIdx = 0;
  for (let i = 0; i < MAX_SKYSHIPS_PER_FLEET && troopIdx < troops.length; i++) {
    if (slots[i].hasSkyship) {
      slots[i].troop = troops[troopIdx++];
    }
  }

  return slots;
}

function initDialogState(fleets: FleetInfo[], reserves: Reserves, garrison: GarrisonInfo | null): DialogState {
  return {
    fleets: fleets.map((f) => ({
      fleetId: f.fleetId,
      slots: initFleetSlots(f),
    })),
    reserves: { ...reserves },
    garrison: garrison ? { ...garrison } : null,
  };
}

// ── Slot counts helper ─────────────────────────────────────────────────────────

function countSlots(slots: SlotState[]) {
  const skyships = slots.filter((s) => s.hasSkyship).length;
  const regiments = slots.filter((s) => s.troop === "regiment").length;
  const eliteRegiments = slots.filter((s) => s.troop === "elite").length;
  const levies = slots.filter((s) => s.troop === "levy").length;
  return { skyships, regiments, eliteRegiments, levies };
}

// ── Drag ID parsers ────────────────────────────────────────────────────────────

type DragItemKind =
  | { type: "reserve-skyship"; index: number }
  | { type: "reserve-regiment"; index: number }
  | { type: "reserve-elite"; index: number }
  | { type: "reserve-levy"; index: number }
  | { type: "garrison-regiment"; index: number }
  | { type: "garrison-elite"; index: number }
  | { type: "garrison-levy"; index: number }
  | { type: "fleet-skyship"; fleetId: number; slotIndex: number }
  | { type: "fleet-troop"; fleetId: number; slotIndex: number };

function parseDragId(id: string): DragItemKind | null {
  if (id.startsWith("reserve-skyship-"))
    return { type: "reserve-skyship", index: parseInt(id.replace("reserve-skyship-", ""), 10) };
  if (id.startsWith("reserve-regiment-"))
    return { type: "reserve-regiment", index: parseInt(id.replace("reserve-regiment-", ""), 10) };
  if (id.startsWith("reserve-elite-"))
    return { type: "reserve-elite", index: parseInt(id.replace("reserve-elite-", ""), 10) };
  if (id.startsWith("reserve-levy-"))
    return { type: "reserve-levy", index: parseInt(id.replace("reserve-levy-", ""), 10) };
  if (id.startsWith("garrison-regiment-"))
    return { type: "garrison-regiment", index: parseInt(id.replace("garrison-regiment-", ""), 10) };
  if (id.startsWith("garrison-elite-"))
    return { type: "garrison-elite", index: parseInt(id.replace("garrison-elite-", ""), 10) };
  if (id.startsWith("garrison-levy-"))
    return { type: "garrison-levy", index: parseInt(id.replace("garrison-levy-", ""), 10) };

  // fleet-{fleetId}-slot-{slotIndex}-troop
  const troopMatch = id.match(/^fleet-(\d+)-slot-(\d+)-troop$/);
  if (troopMatch)
    return { type: "fleet-troop", fleetId: parseInt(troopMatch[1], 10), slotIndex: parseInt(troopMatch[2], 10) };

  // fleet-{fleetId}-slot-{slotIndex}
  const slotMatch = id.match(/^fleet-(\d+)-slot-(\d+)$/);
  if (slotMatch)
    return { type: "fleet-skyship", fleetId: parseInt(slotMatch[1], 10), slotIndex: parseInt(slotMatch[2], 10) };

  return null;
}

type DropZoneKind =
  | { type: "fleet-slot"; fleetId: number; slotIndex: number }
  | { type: "fleet-troop-slot"; fleetId: number; slotIndex: number }
  | { type: "reserves-skyships" }
  | { type: "reserves-troops" }
  | { type: "garrison-troops" };

function parseDropId(id: string): DropZoneKind | null {
  if (id === "reserves-skyships") return { type: "reserves-skyships" };
  if (id === "reserves-troops") return { type: "reserves-troops" };
  if (id === "garrison-troops") return { type: "garrison-troops" };

  const troopSlotMatch = id.match(/^fleet-(\d+)-slot-(\d+)-troop$/);
  if (troopSlotMatch)
    return {
      type: "fleet-troop-slot",
      fleetId: parseInt(troopSlotMatch[1], 10),
      slotIndex: parseInt(troopSlotMatch[2], 10),
    };

  const slotMatch = id.match(/^fleet-(\d+)-slot-(\d+)$/);
  if (slotMatch)
    return {
      type: "fleet-slot",
      fleetId: parseInt(slotMatch[1], 10),
      slotIndex: parseInt(slotMatch[2], 10),
    };

  return null;
}

// ── Draggable token components ─────────────────────────────────────────────────

interface DraggableSkyshipProps {
  id: string;
  troop: TroopKind | null;
  overlay?: boolean;
}

function TroopIcon({ kind, size = 14 }: { kind: TroopKind; size?: number }) {
  const style = { color: tokens.ui.text };
  if (kind === "regiment") return <IconRegiment size={size} style={style} />;
  if (kind === "elite") return <IconElite size={size} style={style} />;
  return <IconLevy size={size} style={style} />;
}

function SkyshipCard({ troop, overlay = false }: { troop: TroopKind | null; overlay?: boolean }) {
  return (
    <Box
      sx={{
        width: 60,
        height: 76,
        borderRadius: `${tokens.radius.md}px`,
        border: `2px solid ${tokens.ui.gold}`,
        backgroundColor: `${tokens.ui.gold}22`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0.5,
        cursor: "grab",
        boxShadow: overlay
          ? `0 8px 20px rgba(0,0,0,0.35), 0 0 10px ${tokens.ui.gold}40`
          : tokens.shadow.sm,
        transition: `box-shadow ${tokens.transition.fast}`,
        userSelect: "none",
      }}
    >
      <IconSkyship size={26} style={{ color: tokens.ui.gold }} />
      {troop && (
        <Box
          sx={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            backgroundColor: tokens.ui.surfaceRaised,
            border: `1px solid ${tokens.ui.borderMedium}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TroopIcon kind={troop} size={12} />
        </Box>
      )}
    </Box>
  );
}

function DraggableSkyship({ id, troop, overlay = false }: DraggableSkyshipProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      sx={{ opacity: isDragging ? 0.3 : 1, transition: `opacity ${tokens.transition.fast}` }}
    >
      <SkyshipCard troop={troop} overlay={overlay} />
    </Box>
  );
}

interface DraggableTroopProps {
  id: string;
  kind: TroopKind;
  overlay?: boolean;
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

function DraggableTroop({ id, kind, overlay = false }: DraggableTroopProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      sx={{ opacity: isDragging ? 0.3 : 1, transition: `opacity ${tokens.transition.fast}` }}
    >
      <TroopChip kind={kind} overlay={overlay} />
    </Box>
  );
}

// ── Droppable slot ─────────────────────────────────────────────────────────────

interface FleetSlotProps {
  fleetId: number;
  slotIndex: number;
  slot: SlotState;
}

function FleetSlot({ fleetId, slotIndex, slot }: FleetSlotProps) {
  const slotDropId = `fleet-${fleetId}-slot-${slotIndex}`;
  const troopDropId = `fleet-${fleetId}-slot-${slotIndex}-troop`;
  const skyshipDragId = slotDropId;
  const troopDragId = troopDropId;

  const { setNodeRef: setSlotRef, isOver: isSlotOver } = useDroppable({ id: slotDropId });
  const { setNodeRef: setTroopRef, isOver: isTroopOver } = useDroppable({ id: troopDropId });

  if (!slot.hasSkyship) {
    // Empty slot — droppable for skyships only
    return (
      <Box
        ref={setSlotRef}
        sx={{
          width: 60,
          height: 76,
          borderRadius: `${tokens.radius.md}px`,
          border: `2px dashed ${isSlotOver ? tokens.ui.gold : tokens.ui.border}`,
          backgroundColor: isSlotOver ? `${tokens.ui.gold}12` : tokens.ui.background,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: `all ${tokens.transition.fast}`,
        }}
      >
        <Typography
          sx={{
            fontFamily: tokens.font.body,
            fontSize: tokens.fontSize.xs,
            color: tokens.ui.textMuted,
            opacity: 0.6,
          }}
        >
          —
        </Typography>
      </Box>
    );
  }

  // Occupied slot — skyship is draggable, troop sub-zone is droppable (if no troop yet)
  return (
    <Box sx={{ position: "relative" }}>
      <DraggableSkyship id={skyshipDragId} troop={slot.troop} />
      {/* Troop drop zone overlay — only active when no troop present */}
      {!slot.troop && (
        <Box
          ref={setTroopRef}
          sx={{
            position: "absolute",
            bottom: 4,
            left: "50%",
            transform: "translateX(-50%)",
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: `1.5px dashed ${isTroopOver ? tokens.ui.gold : tokens.ui.borderMedium}`,
            backgroundColor: isTroopOver ? `${tokens.ui.gold}20` : "transparent",
            transition: `all ${tokens.transition.fast}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none", // let dnd-kit handle it via ref
          }}
        />
      )}
      {/* If troop is present, make it draggable */}
      {slot.troop && (
        <Box
          sx={{
            position: "absolute",
            bottom: 2,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <DraggableTroop id={troopDragId} kind={slot.troop} />
        </Box>
      )}
    </Box>
  );
}

// ── Reserves zone ──────────────────────────────────────────────────────────────

interface ReservesZoneProps {
  reserves: ReservesLocalState;
}

function ReservesZone({ reserves }: ReservesZoneProps) {
  const { setNodeRef: setSkyshipRef, isOver: isSkyshipOver } = useDroppable({ id: "reserves-skyships" });
  const { setNodeRef: setTroopRef, isOver: isTroopOver } = useDroppable({ id: "reserves-troops" });

  const sectionHeader = {
    fontFamily: tokens.font.body,
    fontSize: tokens.fontSize.xs,
    color: tokens.ui.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    mb: 0.75,
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={sectionHeader}>Reserves</Typography>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          p: 1.5,
          borderRadius: `${tokens.radius.md}px`,
          border: `1px solid ${tokens.ui.borderMedium}`,
          backgroundColor: tokens.ui.surface,
        }}
      >
        {/* Skyship pool — horizontal row */}
        <Box
          ref={setSkyshipRef}
          sx={{
            borderRadius: `${tokens.radius.sm}px`,
            border: `1.5px dashed ${isSkyshipOver ? tokens.ui.gold : tokens.ui.border}`,
            backgroundColor: isSkyshipOver ? `${tokens.ui.gold}10` : "transparent",
            display: "flex",
            flexWrap: "wrap",
            gap: 0.75,
            p: 0.75,
            alignItems: "center",
            minHeight: 88,
            transition: `all ${tokens.transition.fast}`,
          }}
        >
          <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, mr: 0.5, flexShrink: 0 }}>
            Skyships
          </Typography>
          {Array.from({ length: reserves.skyships }, (_, i) => (
            <DraggableSkyship key={i} id={`reserve-skyship-${i}`} troop={null} />
          ))}
        </Box>

        {/* Troop pools — one row per type, drop zone covers all */}
        <Box
          ref={setTroopRef}
          sx={{
            borderRadius: `${tokens.radius.sm}px`,
            border: `1.5px dashed ${isTroopOver ? tokens.ui.gold : tokens.ui.border}`,
            backgroundColor: isTroopOver ? `${tokens.ui.gold}10` : "transparent",
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            p: 0.75,
            minHeight: 40,
            transition: `all ${tokens.transition.fast}`,
          }}
        >
          {/* Regiments row */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
            <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, mr: 0.5, flexShrink: 0, minWidth: 65 }}>
              Regiments
            </Typography>
            {Array.from({ length: reserves.regiments }, (_, i) => (
              <DraggableTroop key={`r-${i}`} id={`reserve-regiment-${i}`} kind="regiment" />
            ))}
          </Box>

          {/* Elites row — only shown when player has any */}
          {reserves.eliteRegiments > 0 && (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
              <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, mr: 0.5, flexShrink: 0, minWidth: 65 }}>
                Elites
              </Typography>
              {Array.from({ length: reserves.eliteRegiments }, (_, i) => (
                <DraggableTroop key={`e-${i}`} id={`reserve-elite-${i}`} kind="elite" />
              ))}
            </Box>
          )}

          {/* Levies row */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
            <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, mr: 0.5, flexShrink: 0, minWidth: 65 }}>
              Levies
            </Typography>
            {Array.from({ length: reserves.levies }, (_, i) => (
              <DraggableTroop key={`l-${i}`} id={`reserve-levy-${i}`} kind="levy" />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ── Garrison zone ─────────────────────────────────────────────────────────────

function GarrisonZone({
  garrison,
  buildingType,
}: {
  garrison: GarrisonLocalState;
  buildingType: "outpost" | "colony";
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "garrison-troops" });

  const sectionHeader = {
    fontFamily: tokens.font.body,
    fontSize: tokens.fontSize.xs,
    color: tokens.ui.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    mb: 0.75,
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={sectionHeader}>
        Garrison ({buildingType})
      </Typography>
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
        {/* Regiments row */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
          <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, mr: 0.5, flexShrink: 0, minWidth: 65 }}>
            Regiments
          </Typography>
          {Array.from({ length: garrison.regiments }, (_, i) => (
            <DraggableTroop key={`gr-${i}`} id={`garrison-regiment-${i}`} kind="regiment" />
          ))}
        </Box>

        {/* Elites row — only shown when garrison has any */}
        {garrison.eliteRegiments > 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
            <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, mr: 0.5, flexShrink: 0, minWidth: 65 }}>
              Elites
            </Typography>
            {Array.from({ length: garrison.eliteRegiments }, (_, i) => (
              <DraggableTroop key={`ge-${i}`} id={`garrison-elite-${i}`} kind="elite" />
            ))}
          </Box>
        )}

        {/* Levies row */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
          <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, mr: 0.5, flexShrink: 0, minWidth: 65 }}>
            Levies
          </Typography>
          {Array.from({ length: garrison.levies }, (_, i) => (
            <DraggableTroop key={`gl-${i}`} id={`garrison-levy-${i}`} kind="levy" />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export const FleetTransferDialog = ({
  open,
  onClose,
  location,
  fleets,
  reserves,
  isKingdom,
  garrison,
  tileArray,
  moves,
}: FleetTransferDialogProps) => {
  const locationName = getLocationPresentation(tileArray, location).name;

  const initialState = useMemo(
    () => initDialogState(fleets, reserves, garrison),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open] // Re-init only when dialog opens
  );

  const [state, setState] = useState<DialogState>(initialState);

  // Reset when dialog re-opens
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setState(initDialogState(fleets, reserves, garrison));
  }

  // Track which item is being dragged so DragOverlay can render it
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // ── Has anything changed? ────────────────────────────────────────────────

  const hasChanged = useMemo(() => {
    for (const fleetState of state.fleets) {
      const original = fleets.find((f) => f.fleetId === fleetState.fleetId);
      if (!original) continue;
      const counts = countSlots(fleetState.slots);
      if (
        counts.skyships !== original.skyships ||
        counts.regiments !== original.regiments ||
        counts.eliteRegiments !== original.eliteRegiments ||
        counts.levies !== original.levies
      ) {
        return true;
      }
    }
    if (state.garrison && garrison) {
      if (
        state.garrison.regiments !== garrison.regiments ||
        state.garrison.levies !== garrison.levies ||
        state.garrison.eliteRegiments !== garrison.eliteRegiments
      ) {
        return true;
      }
    }
    return false;
  }, [state, fleets, garrison]);

  // ── Drag start ───────────────────────────────────────────────────────────

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  // ── Drag end — enforce rules and update state ────────────────────────────

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;
      if (!over) return;

      const dragId = String(active.id);
      const dropId = String(over.id);

      const drag = parseDragId(dragId);
      const drop = parseDropId(dropId);
      if (!drag || !drop) return;

      setState((prev) => {
        const next = structuredClone(prev);

        // Helper: find a fleet in next state
        const findFleet = (id: number) => next.fleets.find((f) => f.fleetId === id);

        // ── Rule: Reserve skyship → fleet slot ─────────────────────────
        if (
          (drag.type === "reserve-skyship") &&
          drop.type === "fleet-slot"
        ) {
          if (next.reserves.skyships <= 0) return prev;
          const fleet = findFleet(drop.fleetId);
          if (!fleet) return prev;
          const targetSlot = fleet.slots[drop.slotIndex];
          if (targetSlot.hasSkyship) return prev; // slot occupied
          targetSlot.hasSkyship = true;
          next.reserves.skyships--;
          return next;
        }

        // ── Rule: Reserve troop → fleet troop slot ──────────────────────
        if (
          (drag.type === "reserve-regiment" || drag.type === "reserve-elite" || drag.type === "reserve-levy") &&
          drop.type === "fleet-troop-slot"
        ) {
          const fleet = findFleet(drop.fleetId);
          if (!fleet) return prev;
          const targetSlot = fleet.slots[drop.slotIndex];
          if (!targetSlot.hasSkyship) return prev; // need a skyship first
          if (targetSlot.troop !== null) return prev; // slot already has troop
          const kind: TroopKind =
            drag.type === "reserve-regiment" ? "regiment" :
            drag.type === "reserve-elite" ? "elite" : "levy";
          targetSlot.troop = kind;
          if (kind === "regiment") next.reserves.regiments--;
          else if (kind === "elite") next.reserves.eliteRegiments--;
          else next.reserves.levies--;
          return next;
        }

        // ── Rule: Fleet skyship → reserves ──────────────────────────────
        if (drag.type === "fleet-skyship" && drop.type === "reserves-skyships") {
          const fleet = findFleet(drag.fleetId);
          if (!fleet) return prev;
          const sourceSlot = fleet.slots[drag.slotIndex];
          if (!sourceSlot.hasSkyship) return prev;
          // Unload: return troop to reserves too
          if (sourceSlot.troop === "regiment") next.reserves.regiments++;
          else if (sourceSlot.troop === "elite") next.reserves.eliteRegiments++;
          else if (sourceSlot.troop === "levy") next.reserves.levies++;
          sourceSlot.hasSkyship = false;
          sourceSlot.troop = null;
          next.reserves.skyships++;
          return next;
        }

        // ── Rule: Fleet troop → reserves ────────────────────────────────
        if (drag.type === "fleet-troop" && drop.type === "reserves-troops") {
          const fleet = findFleet(drag.fleetId);
          if (!fleet) return prev;
          const sourceSlot = fleet.slots[drag.slotIndex];
          if (!sourceSlot.troop) return prev;
          const kind = sourceSlot.troop;
          sourceSlot.troop = null;
          if (kind === "regiment") next.reserves.regiments++;
          else if (kind === "elite") next.reserves.eliteRegiments++;
          else next.reserves.levies++;
          return next;
        }

        // ── Rule: Fleet skyship → another fleet slot ─────────────────────
        if (drag.type === "fleet-skyship" && drop.type === "fleet-slot") {
          const sourceFleet = findFleet(drag.fleetId);
          const targetFleet = findFleet(drop.fleetId);
          if (!sourceFleet || !targetFleet) return prev;
          const sourceSlot = sourceFleet.slots[drag.slotIndex];
          const targetSlot = targetFleet.slots[drop.slotIndex];
          if (!sourceSlot.hasSkyship) return prev;
          if (targetSlot.hasSkyship) return prev; // target occupied
          if (drag.fleetId === drop.fleetId && drag.slotIndex === drop.slotIndex) return prev; // same slot
          // Move skyship + its troop together
          targetSlot.hasSkyship = true;
          targetSlot.troop = sourceSlot.troop;
          sourceSlot.hasSkyship = false;
          sourceSlot.troop = null;
          return next;
        }

        // ── Rule: Fleet troop → another skyship's troop slot ─────────────
        if (drag.type === "fleet-troop" && drop.type === "fleet-troop-slot") {
          const sourceFleet = findFleet(drag.fleetId);
          const targetFleet = findFleet(drop.fleetId);
          if (!sourceFleet || !targetFleet) return prev;
          const sourceSlot = sourceFleet.slots[drag.slotIndex];
          const targetSlot = targetFleet.slots[drop.slotIndex];
          if (!sourceSlot.troop) return prev;
          if (!targetSlot.hasSkyship) return prev; // need a skyship
          if (targetSlot.troop !== null) return prev; // target already has troop
          if (drag.fleetId === drop.fleetId && drag.slotIndex === drop.slotIndex) return prev;
          targetSlot.troop = sourceSlot.troop;
          sourceSlot.troop = null;
          return next;
        }

        // ── Rule: Garrison troop → fleet troop slot ─────────────────────
        if (
          (drag.type === "garrison-regiment" || drag.type === "garrison-elite" || drag.type === "garrison-levy") &&
          drop.type === "fleet-troop-slot"
        ) {
          if (!next.garrison) return prev;
          const fleet = findFleet(drop.fleetId);
          if (!fleet) return prev;
          const targetSlot = fleet.slots[drop.slotIndex];
          if (!targetSlot.hasSkyship) return prev;
          if (targetSlot.troop !== null) return prev;
          const kind: TroopKind =
            drag.type === "garrison-regiment" ? "regiment" :
            drag.type === "garrison-elite" ? "elite" : "levy";
          targetSlot.troop = kind;
          if (kind === "regiment") next.garrison.regiments--;
          else if (kind === "elite") next.garrison.eliteRegiments--;
          else next.garrison.levies--;
          return next;
        }

        // ── Rule: Fleet troop → garrison ────────────────────────────────
        if (drag.type === "fleet-troop" && drop.type === "garrison-troops") {
          if (!next.garrison) return prev;
          const fleet = findFleet(drag.fleetId);
          if (!fleet) return prev;
          const sourceSlot = fleet.slots[drag.slotIndex];
          if (!sourceSlot.troop) return prev;
          const kind = sourceSlot.troop;
          sourceSlot.troop = null;
          if (kind === "regiment") next.garrison.regiments++;
          else if (kind === "elite") next.garrison.eliteRegiments++;
          else next.garrison.levies++;
          return next;
        }

        return prev;
      });
    },
    []
  );

  // ── Confirm handler ──────────────────────────────────────────────────────

  const handleConfirm = useCallback(() => {
    if (isKingdom) {
      // At kingdom: use passFleetInfoToPlayerInfo with TOTALS for each changed fleet
      for (const fleetState of state.fleets) {
        const original = fleets.find((f) => f.fleetId === fleetState.fleetId);
        if (!original) continue;
        const counts = countSlots(fleetState.slots);
        const changed =
          counts.skyships !== original.skyships ||
          counts.regiments !== original.regiments ||
          counts.eliteRegiments !== original.eliteRegiments ||
          counts.levies !== original.levies;
        if (changed) {
          moves.passFleetInfoToPlayerInfo(
            fleetState.fleetId,
            counts.skyships,
            counts.regiments,
            counts.levies,
            counts.eliteRegiments
          );
        }
      }
    } else {
      // Not at kingdom: use transferBetweenFleets for each pair of changed fleets
      // Strategy: compare initial vs final slot counts per fleet and compute deltas.
      // For each fleet that gained skyships, find a fleet that lost the same count.
      // Simple approach: fire one move per (source, target) pair where source lost and target gained.
      const initial = initialState;
      const finalCounts = state.fleets.map((f) => ({ fleetId: f.fleetId, ...countSlots(f.slots) }));
      const initialCounts = initial.fleets.map((f) => ({ fleetId: f.fleetId, ...countSlots(f.slots) }));

      // Build delta per fleet
      const deltas = finalCounts.map((fc) => {
        const ic = initialCounts.find((x) => x.fleetId === fc.fleetId)!;
        return {
          fleetId: fc.fleetId,
          skyships: fc.skyships - ic.skyships,
          regiments: fc.regiments - ic.regiments,
          eliteRegiments: fc.eliteRegiments - ic.eliteRegiments,
          levies: fc.levies - ic.levies,
        };
      });

      // Find pairs: source (negative delta) → target (positive delta)
      const sources = deltas.filter((d) => d.skyships < 0 || d.regiments < 0 || d.eliteRegiments < 0 || d.levies < 0);
      const targets = deltas.filter((d) => d.skyships > 0 || d.regiments > 0 || d.eliteRegiments > 0 || d.levies > 0);

      for (const source of sources) {
        for (const target of targets) {
          const skyships = Math.min(-source.skyships, target.skyships);
          const regiments = Math.min(-source.regiments, target.regiments);
          const eliteRegiments = Math.min(-source.eliteRegiments, target.eliteRegiments);
          const levies = Math.min(-source.levies, target.levies);
          if (skyships > 0 || regiments > 0 || eliteRegiments > 0 || levies > 0) {
            moves.transferBetweenFleets(
              source.fleetId,
              target.fleetId,
              skyships,
              regiments,
              levies,
              eliteRegiments
            );
          }
        }
      }
    }

    // Garrison transfers: compute delta per fleet and fire garrisonTransfer
    if (state.garrison && garrison) {
      const garrisonDelta = {
        regiments: state.garrison.regiments - garrison.regiments,
        levies: state.garrison.levies - garrison.levies,
        eliteRegiments: state.garrison.eliteRegiments - garrison.eliteRegiments,
      };
      // Positive garrison delta = garrison gained = fleet lost (fleet→garrison is positive in the move)
      if (garrisonDelta.regiments !== 0 || garrisonDelta.levies !== 0 || garrisonDelta.eliteRegiments !== 0) {
        // Find the first fleet that changed to attribute the transfer to
        // (the move requires a fleetId for validation, pick the first fleet at this location)
        const fleetId = fleets[0]?.fleetId ?? 0;
        moves.garrisonTransfer(
          fleetId,
          location,
          garrisonDelta.regiments,
          garrisonDelta.levies,
          garrisonDelta.eliteRegiments
        );
      }
    }

    onClose();
  }, [state, fleets, initialState, isKingdom, garrison, location, moves, onClose]);

  // ── Render active drag overlay ───────────────────────────────────────────

  const renderOverlay = () => {
    if (!activeDragId) return null;
    const drag = parseDragId(activeDragId);
    if (!drag) return null;

    if (drag.type === "reserve-skyship" || drag.type === "fleet-skyship") {
      let troop: TroopKind | null = null;
      if (drag.type === "fleet-skyship") {
        const fleet = state.fleets.find((f) => f.fleetId === drag.fleetId);
        troop = fleet?.slots[drag.slotIndex]?.troop ?? null;
      }
      return <SkyshipCard troop={troop} overlay />;
    }

    let kind: TroopKind;
    if (drag.type === "fleet-troop") {
      const fleet = state.fleets.find((f) => f.fleetId === drag.fleetId);
      kind = fleet?.slots[drag.slotIndex]?.troop ?? "regiment";
    } else if (drag.type === "reserve-regiment" || drag.type === "garrison-regiment") {
      kind = "regiment";
    } else if (drag.type === "reserve-elite" || drag.type === "garrison-elite") {
      kind = "elite";
    } else {
      kind = "levy";
    }
    return <TroopChip kind={kind} overlay />;
  };

  // ── Section header style ─────────────────────────────────────────────────

  const sectionHeader = {
    fontFamily: tokens.font.body,
    fontSize: tokens.fontSize.xs,
    color: tokens.ui.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    mb: 0.75,
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      PaperProps={{
        sx: {
          backgroundColor: tokens.ui.surface,
          border: `1px solid ${tokens.ui.borderMedium}`,
          borderRadius: `${tokens.radius.lg}px`,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle sx={{ fontFamily: tokens.font.display, color: tokens.ui.gold, pb: 1 }}>
        Manage Fleets — {locationName}
      </DialogTitle>

      <DialogContent sx={{ minWidth: 520 }}>
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

          {/* Reserves — only if at kingdom */}
          {isKingdom && <ReservesZone reserves={state.reserves} />}

          {/* Fleet sections */}
          {state.fleets.map((fleetState) => (
            <Box key={fleetState.fleetId} sx={{ mb: 2 }}>
              <Typography sx={sectionHeader}>
                Fleet {fleetState.fleetId + 1}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  p: 1.5,
                  borderRadius: `${tokens.radius.md}px`,
                  border: `1px solid ${tokens.ui.borderMedium}`,
                  backgroundColor: tokens.ui.surface,
                  flexWrap: "wrap",
                  minHeight: 100,
                }}
              >
                {fleetState.slots.map((slot, slotIndex) => (
                  <FleetSlot
                    key={slotIndex}
                    fleetId={fleetState.fleetId}
                    slotIndex={slotIndex}
                    slot={slot}
                  />
                ))}
              </Box>
            </Box>
          ))}

          {/* Garrison — only if tile has player's building */}
          {state.garrison && (
            <GarrisonZone
              garrison={state.garrison}
              buildingType={garrison?.buildingType ?? "outpost"}
            />
          )}

          {/* DragOverlay renders the floating preview */}
          <DragOverlay dropAnimation={null}>
            {renderOverlay()}
          </DragOverlay>
        </DndContext>
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
        <GameButton variant="ghost" size="md" onClick={onClose}>
          Cancel
        </GameButton>
        <GameButton
          variant="primary"
          size="md"
          disabled={!hasChanged}
          disabledReason="Drag tokens to rearrange fleets"
          onClick={handleConfirm}
        >
          Confirm
        </GameButton>
      </DialogActions>
    </Dialog>
  );
};

export default FleetTransferDialog;
