import { MAX_SKYSHIPS_PER_FLEET } from "@eots/game";
import type {
  FleetInfo,
  Reserves,
  GarrisonInfo,
  SlotState,
  FleetLocalState,
  ReservesLocalState,
  GarrisonLocalState,
  DialogState,
  TroopKind,
} from "./types";

export function initFleetSlots(fleet: FleetInfo): SlotState[] {
  const slots: SlotState[] = Array.from({ length: MAX_SKYSHIPS_PER_FLEET }, () => ({
    hasSkyship: false,
    troop: null,
  }));

  for (let i = 0; i < Math.min(fleet.skyships, MAX_SKYSHIPS_PER_FLEET); i++) {
    slots[i].hasSkyship = true;
  }

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

export function initDialogState(
  fleets: FleetInfo[],
  reserves: Reserves,
  garrison: GarrisonInfo | null
): DialogState {
  return {
    fleets: fleets.map((f) => ({
      fleetId: f.fleetId,
      slots: initFleetSlots(f),
    })),
    reserves: { ...reserves },
    garrison: garrison ? { ...garrison } : null,
  };
}

export function countSlots(slots: SlotState[]) {
  const skyships = slots.filter((s) => s.hasSkyship).length;
  const regiments = slots.filter((s) => s.troop === "regiment").length;
  const eliteRegiments = slots.filter((s) => s.troop === "elite").length;
  const levies = slots.filter((s) => s.troop === "levy").length;
  return { skyships, regiments, eliteRegiments, levies };
}
