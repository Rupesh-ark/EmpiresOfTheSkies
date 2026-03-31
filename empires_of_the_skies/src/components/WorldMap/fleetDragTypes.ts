export interface FleetDragState {
  fleetId: number;
  playerId: string;
  fleetIndex: number;
  sourceLocation: [number, number];
  validDestinations: [number, number][];
  costMap: Map<string, number>;
  isLaden: boolean;
}
