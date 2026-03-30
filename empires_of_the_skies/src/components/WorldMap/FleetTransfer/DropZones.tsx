import { Box, Typography } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import { tokens } from "@/theme";
import type { SlotState, ReservesLocalState, GarrisonLocalState } from "./types";
import { DraggableSkyship, DraggableTroop } from "./DraggableTokens";

interface FleetSlotProps {
  fleetId: number;
  slotIndex: number;
  slot: SlotState;
}

export function FleetSlot({ fleetId, slotIndex, slot }: FleetSlotProps) {
  const slotDropId = `fleet-${fleetId}-slot-${slotIndex}`;
  const troopDropId = `fleet-${fleetId}-slot-${slotIndex}-troop`;
  const skyshipDragId = slotDropId;
  const troopDragId = troopDropId;

  const { setNodeRef: setSlotRef, isOver: isSlotOver } = useDroppable({ id: slotDropId });
  const { setNodeRef: setTroopRef, isOver: isTroopOver } = useDroppable({ id: troopDropId });

  if (!slot.hasSkyship) {
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

  return (
    <Box sx={{ position: "relative" }}>
      <DraggableSkyship id={skyshipDragId} troop={slot.troop} />
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
            pointerEvents: "none",
          }}
        />
      )}
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

const sectionHeaderStyle = {
  fontFamily: tokens.font.body,
  fontSize: tokens.fontSize.xs,
  color: tokens.ui.textMuted,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  mb: 0.75,
};

interface ReservesZoneProps {
  reserves: ReservesLocalState;
}

export function ReservesZone({ reserves }: ReservesZoneProps) {
  const { setNodeRef: setSkyshipRef, isOver: isSkyshipOver } = useDroppable({ id: "reserves-skyships" });
  const { setNodeRef: setTroopRef, isOver: isTroopOver } = useDroppable({ id: "reserves-troops" });

  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={sectionHeaderStyle}>Reserves</Typography>
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
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
            <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, mr: 0.5, flexShrink: 0, minWidth: 65 }}>
              Regiments
            </Typography>
            {Array.from({ length: reserves.regiments }, (_, i) => (
              <DraggableTroop key={`r-${i}`} id={`reserve-regiment-${i}`} kind="regiment" />
            ))}
          </Box>

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

interface GarrisonZoneProps {
  garrison: GarrisonLocalState;
  buildingType: "outpost" | "colony";
}

export function GarrisonZone({ garrison, buildingType }: GarrisonZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id: "garrison-troops" });

  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={sectionHeaderStyle}>
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
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" }}>
          <Typography sx={{ fontFamily: tokens.font.body, fontSize: tokens.fontSize.xs, color: tokens.ui.textMuted, mr: 0.5, flexShrink: 0, minWidth: 65 }}>
            Regiments
          </Typography>
          {Array.from({ length: garrison.regiments }, (_, i) => (
            <DraggableTroop key={`gr-${i}`} id={`garrison-regiment-${i}`} kind="regiment" />
          ))}
        </Box>

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
