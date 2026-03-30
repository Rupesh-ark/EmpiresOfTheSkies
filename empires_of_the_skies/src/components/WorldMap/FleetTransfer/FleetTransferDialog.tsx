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
import { GameButton } from "@/components/atoms/GameButton";
import { getLocationPresentation } from "@/utils/locationLabels";

import type {
  FleetTransferDialogProps,
  DialogState,
  TroopKind,
} from "./types";
import { initDialogState, countSlots } from "./stateUtils";
import { parseDragId, parseDropId } from "./dragUtils";
import { SkyshipCard, TroopChip } from "./DraggableTokens";
import { FleetSlot, ReservesZone, GarrisonZone } from "./DropZones";

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
    [open]
  );

  const [state, setState] = useState<DialogState>(initialState);

  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setState(initDialogState(fleets, reserves, garrison));
  }

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

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

        const findFleet = (id: number) => next.fleets.find((f) => f.fleetId === id);

        if ((drag.type === "reserve-skyship") && drop.type === "fleet-slot") {
          if (next.reserves.skyships <= 0) return prev;
          const fleet = findFleet(drop.fleetId);
          if (!fleet) return prev;
          const targetSlot = fleet.slots[drop.slotIndex];
          if (targetSlot.hasSkyship) return prev;
          targetSlot.hasSkyship = true;
          next.reserves.skyships--;
          return next;
        }

        if (
          (drag.type === "reserve-regiment" || drag.type === "reserve-elite" || drag.type === "reserve-levy") &&
          drop.type === "fleet-troop-slot"
        ) {
          const fleet = findFleet(drop.fleetId);
          if (!fleet) return prev;
          const targetSlot = fleet.slots[drop.slotIndex];
          if (!targetSlot.hasSkyship) return prev;
          if (targetSlot.troop !== null) return prev;
          const kind: TroopKind =
            drag.type === "reserve-regiment" ? "regiment" :
            drag.type === "reserve-elite" ? "elite" : "levy";
          targetSlot.troop = kind;
          if (kind === "regiment") next.reserves.regiments--;
          else if (kind === "elite") next.reserves.eliteRegiments--;
          else next.reserves.levies--;
          return next;
        }

        if (drag.type === "fleet-skyship" && drop.type === "reserves-skyships") {
          const fleet = findFleet(drag.fleetId);
          if (!fleet) return prev;
          const sourceSlot = fleet.slots[drag.slotIndex];
          if (!sourceSlot.hasSkyship) return prev;
          if (sourceSlot.troop === "regiment") next.reserves.regiments++;
          else if (sourceSlot.troop === "elite") next.reserves.eliteRegiments++;
          else if (sourceSlot.troop === "levy") next.reserves.levies++;
          sourceSlot.hasSkyship = false;
          sourceSlot.troop = null;
          next.reserves.skyships++;
          return next;
        }

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

        if (drag.type === "fleet-skyship" && drop.type === "fleet-slot") {
          const sourceFleet = findFleet(drag.fleetId);
          const targetFleet = findFleet(drop.fleetId);
          if (!sourceFleet || !targetFleet) return prev;
          const sourceSlot = sourceFleet.slots[drag.slotIndex];
          const targetSlot = targetFleet.slots[drop.slotIndex];
          if (!sourceSlot.hasSkyship) return prev;
          if (targetSlot.hasSkyship) return prev;
          if (drag.fleetId === drop.fleetId && drag.slotIndex === drop.slotIndex) return prev;
          targetSlot.hasSkyship = true;
          targetSlot.troop = sourceSlot.troop;
          sourceSlot.hasSkyship = false;
          sourceSlot.troop = null;
          return next;
        }

        if (drag.type === "fleet-troop" && drop.type === "fleet-troop-slot") {
          const sourceFleet = findFleet(drag.fleetId);
          const targetFleet = findFleet(drop.fleetId);
          if (!sourceFleet || !targetFleet) return prev;
          const sourceSlot = sourceFleet.slots[drag.slotIndex];
          const targetSlot = targetFleet.slots[drop.slotIndex];
          if (!sourceSlot.troop) return prev;
          if (!targetSlot.hasSkyship) return prev;
          if (targetSlot.troop !== null) return prev;
          if (drag.fleetId === drop.fleetId && drag.slotIndex === drop.slotIndex) return prev;
          targetSlot.troop = sourceSlot.troop;
          sourceSlot.troop = null;
          return next;
        }

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

  const handleConfirm = useCallback(() => {
    if (isKingdom) {
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
      const initial = initialState;
      const finalCounts = state.fleets.map((f) => ({ fleetId: f.fleetId, ...countSlots(f.slots) }));
      const initialCounts = initial.fleets.map((f) => ({ fleetId: f.fleetId, ...countSlots(f.slots) }));

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

    if (state.garrison && garrison) {
      const garrisonDelta = {
        regiments: state.garrison.regiments - garrison.regiments,
        levies: state.garrison.levies - garrison.levies,
        eliteRegiments: state.garrison.eliteRegiments - garrison.eliteRegiments,
      };
      if (garrisonDelta.regiments !== 0 || garrisonDelta.levies !== 0 || garrisonDelta.eliteRegiments !== 0) {
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

  const sectionHeaderStyle = {
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
          {isKingdom && <ReservesZone reserves={state.reserves} />}

          {state.fleets.map((fleetState) => (
            <Box key={fleetState.fleetId} sx={{ mb: 2 }}>
              <Typography sx={sectionHeaderStyle}>
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

          {state.garrison && (
            <GarrisonZone
              garrison={state.garrison}
              buildingType={garrison?.buildingType ?? "outpost"}
            />
          )}

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
