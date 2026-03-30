import type { DragItemKind, DropZoneKind } from "./types";

export function parseDragId(id: string): DragItemKind | null {
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

  const troopMatch = id.match(/^fleet-(\d+)-slot-(\d+)-troop$/);
  if (troopMatch)
    return { type: "fleet-troop", fleetId: parseInt(troopMatch[1], 10), slotIndex: parseInt(troopMatch[2], 10) };

  const slotMatch = id.match(/^fleet-(\d+)-slot-(\d+)$/);
  if (slotMatch)
    return { type: "fleet-skyship", fleetId: parseInt(slotMatch[1], 10), slotIndex: parseInt(slotMatch[2], 10) };

  return null;
}

export function parseDropId(id: string): DropZoneKind | null {
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
