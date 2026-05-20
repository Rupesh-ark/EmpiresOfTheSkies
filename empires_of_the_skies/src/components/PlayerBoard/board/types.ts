import { FleetInfo, PlayerFortuneOfWarCardInfo, EventCardName, MyGameState } from "@eots/game";

export type CardTab = "fow" | "legacy" | "ka" | "events";

export interface BoardSectionProps {
  fleets: FleetInfo[];
  tileMap: MyGameState["mapState"]["currentTileArray"];
  onViewLocation?: (location: number[]) => void;
}

export interface CardDrawersProps {
  fortuneCards: PlayerFortuneOfWarCardInfo[];
  legacyCard: { name: string; colour: string } | undefined;
  advantageCard: string | undefined;
  eventCards: EventCardName[];
  resolvedEvent: EventCardName | null;
  eventContributions: Record<string, EventCardName>;
  playerInfo: Record<string, { colour: string; kingdomName: string }>;
}
