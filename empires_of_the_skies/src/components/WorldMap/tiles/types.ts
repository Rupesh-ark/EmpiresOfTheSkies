import type { MyGameState, TileInfoProps, InfidelHostCounter } from "@eots/game";

export interface PositionedFleet {
  key: string;
  position: { top: string; left: string };
  element: JSX.Element;
}

export interface FleetDragState {
  sourceLocation: [number, number];
  fleetId: number;
  validDestinations: [number, number][];
  costMap: Map<string, number>;
}

export interface worldMapTileProps {
  location: number[];
  alternateOnClick?: (coords: number[]) => void;
  selectable?: boolean;
  battleHighlight?: boolean;
  detailRequestKey?: number;
  onDetailRequestHandled?: (requestKey: number) => void;
  fleetDragState?: FleetDragState | null;
  onFleetDragAttempt?: (reason: string) => void;
  G: MyGameState;
  ctx: { currentPlayer: string; numPlayers?: number };
  moves: Record<string, (...args: any[]) => void>;
  playerID?: string;
}

export type ThreatLevel = "critical" | "high" | "gathering" | "dormant";

export interface ThreatInfo {
  level: ThreatLevel;
  color: string;
  label: string;
  totalSwords: number;
  totalShields: number;
}

export { type TileInfoProps, type InfidelHostCounter };
