import { FleetInfo, MyGameState } from "@eots/game";

export interface Reserves {
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
  tileArray: MyGameState["mapState"]["currentTileArray"];
  moves: Record<string, (...args: unknown[]) => void>;
}

export type TroopKind = "regiment" | "elite" | "levy";

export interface SlotState {
  hasSkyship: boolean;
  troop: TroopKind | null;
}

export interface FleetLocalState {
  fleetId: number;
  slots: SlotState[];
}

export interface ReservesLocalState {
  skyships: number;
  regiments: number;
  eliteRegiments: number;
  levies: number;
}

export interface GarrisonLocalState {
  regiments: number;
  levies: number;
  eliteRegiments: number;
}

export interface DialogState {
  fleets: FleetLocalState[];
  reserves: ReservesLocalState;
  garrison: GarrisonLocalState | null;
}

export type DragItemKind =
  | { type: "reserve-skyship"; index: number }
  | { type: "reserve-regiment"; index: number }
  | { type: "reserve-elite"; index: number }
  | { type: "reserve-levy"; index: number }
  | { type: "garrison-regiment"; index: number }
  | { type: "garrison-elite"; index: number }
  | { type: "garrison-levy"; index: number }
  | { type: "fleet-skyship"; fleetId: number; slotIndex: number }
  | { type: "fleet-troop"; fleetId: number; slotIndex: number };

export type DropZoneKind =
  | { type: "fleet-slot"; fleetId: number; slotIndex: number }
  | { type: "fleet-troop-slot"; fleetId: number; slotIndex: number }
  | { type: "reserves-skyships" }
  | { type: "reserves-troops" }
  | { type: "garrison-troops" };
