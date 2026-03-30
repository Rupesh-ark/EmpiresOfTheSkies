import { FleetInfo, PlayerFortuneOfWarCardInfo, EventCardName } from "@eots/game";

export type CardTab = "fow" | "legacy" | "ka" | "events";

export interface BoardSectionProps {
  fleets: FleetInfo[];
  tileMap: any[][];
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
