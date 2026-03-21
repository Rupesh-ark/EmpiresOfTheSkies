import { createContext, useContext, useState, ReactNode } from "react";

interface ActionHoverState {
  hoveredAction: string | null;
  setHoveredAction: (action: string | null) => void;
}

const ActionHoverContext = createContext<ActionHoverState>({
  hoveredAction: null,
  setHoveredAction: () => {},
});

export const useActionHover = () => useContext(ActionHoverContext);

export const ActionHoverProvider = ({ children }: { children: ReactNode }) => {
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  return (
    <ActionHoverContext.Provider value={{ hoveredAction, setHoveredAction }}>
      {children}
    </ActionHoverContext.Provider>
  );
};

/** Action descriptions shown in the info panel on hover */
export const ACTION_INFO: Record<string, { title: string; cost: string; description: string }> = {
  "change-player-order": {
    title: "Change Player Order",
    cost: "1 Counsellor",
    description: "Place a counsellor on a position slot to claim that turn order for next round. Takes effect at the Reset phase. Only one position per player.",
  },
  "recruit-counsellors": {
    title: "Recruit Counsellors",
    cost: "1g + row count",
    description: "Gain 1 counsellor. Cost increases by 1g for each counsellor already placed in this row this round.",
  },
  "recruit-regiments": {
    title: "Recruit Regiments",
    cost: "1g + row count",
    description: "Gain 4 regiments to your available forces. Cost increases by 1g for each player already placed in this row.",
  },
  "skyships-zeeland": {
    title: "Purchase Skyships (Zeeland)",
    cost: "2g + row count",
    description: "Purchase 2 skyships from Zeeland's shipyards. Cost increases by 1g per player already in this row.",
  },
  "skyships-venoa": {
    title: "Purchase Skyships (Venoa)",
    cost: "2g + row count",
    description: "Purchase 2 skyships from Venoa's shipyards. Cost increases by 1g per player already in this row.",
  },
  "found-factories": {
    title: "Found Factories",
    cost: "1g + row count",
    description: "Build a factory in one of your territories. Factories produce goods that can be sold during the Trade phase for gold.",
  },
  "punish-dissenters": {
    title: "Punish Dissenters",
    cost: "2g or 1 Counsellor",
    description: "Imprison a dissenter (costs 2g or 1 counsellor) or execute a prisoner (-1 VP). Prisoners reduce heresy but cost you reputation.",
  },
  "convert-monarch": {
    title: "Convert Monarch",
    cost: "2g + 1 Counsellor",
    description: "Flip your kingdom's religious alignment between Orthodox and Heretic. This affects election voting, prelate influence, and event interactions.",
  },
  "cathedral": {
    title: "Found Cathedral",
    cost: "5g + row count",
    description: "Build a cathedral in one of your territories. Cathedrals provide victory points and increase your influence in elections.",
  },
  "palace": {
    title: "Found Palace",
    cost: "5g + row count",
    description: "Build a palace in one of your territories. Palaces provide victory points and increase your kingdom's prestige.",
  },
  "shipyard": {
    title: "Found Shipyard",
    cost: "3g + row count",
    description: "Build a shipyard in one of your territories. Shipyards allow you to purchase skyships and project aerial power.",
  },
  "fort": {
    title: "Found Fort",
    cost: "2g + row count",
    description: "Build a fort in one of your territories. Forts provide defensive bonuses during ground battles.",
  },
  "influence-prelates": {
    title: "Influence Prelates",
    cost: "Free / 1g / Cathedral count",
    description: "Place a counsellor on a kingdom's prelate to influence the upcoming election. First placement is free, second costs 1g, and subsequent placements cost your cathedral count in gold.",
  },
  "issue-holy-decree": {
    title: "Issue Holy Decree",
    cost: "Free (Archprelate only)",
    description: "As Archprelate, issue a decree: Bless a kingdom (+VP), Curse a kingdom (-VP), Reform the church, or Confirm current dogma. Once per round.",
  },

  // ── Kingdom Actions (PlayerBoard) ──────────────────────────────

  "deploy-fleet": {
    title: "Deploy Fleet",
    cost: "Free",
    description: "Deploy a new fleet from your capital. The fleet starts with your available skyships and can carry regiments to project power across the map.",
  },
  "build-skyships": {
    title: "Build Skyships",
    cost: "Free (requires shipyard)",
    description: "Build skyships at your shipyards. You can build 1 skyship per shipyard you own. Skyships are added to your available forces.",
  },
  "conscript-levies": {
    title: "Conscript Levies",
    cost: "Free",
    description: "Raise levy troops from your territories. Levies are weaker than regiments but free to recruit. Choose how many to conscript (3-12).",
  },
  "train-troops": {
    title: "Train Troops",
    cost: "1 Counsellor",
    description: "Convert available regiments into elite regiments. Elite regiments are stronger in battle and count as 2 regiments when fighting.",
  },
  "dispatch-fleet": {
    title: "Dispatch Fleet",
    cost: "Free",
    description: "Send a deployed fleet to a new destination. Load regiments and skyships, then choose where to send them on the map.",
  },
  "transfer-fleet": {
    title: "Transfer Between Fleets",
    cost: "Free",
    description: "Move troops and skyships between two fleets that share the same location. Useful for consolidating or splitting forces.",
  },

  // ── Map Overlay Buttons ────────────────────────────────────────

  "clear-moves": {
    title: "Clear Moves",
    cost: "",
    description: "Undo all moves made this turn. Resets your board state to the beginning of the turn so you can try a different strategy.",
  },
  "pass-turn": {
    title: "Pass",
    cost: "",
    description: "End your turn without making any more moves. You will not be able to act again until the next phase begins.",
  },
  "confirm-end-turn": {
    title: "Confirm & End Turn",
    cost: "",
    description: "Finalize all your actions and end your turn. Your counsellor placements and kingdom actions will be locked in.",
  },

  // ── Player Board Info ──────────────────────────────────────────

  "treasury": {
    title: "Treasury",
    cost: "",
    description: "Your kingdom's core resources. Counsellors are placed on the action board to take actions. Gold pays for everything. Victory points determine who wins.",
  },
  "forces": {
    title: "Available Forces",
    cost: "",
    description: "Military units ready to be deployed. Regiments fight on the ground, elite regiments hit harder, levies are cheap but weak, and skyships control the air.",
  },
  "holdings": {
    title: "Holdings",
    cost: "",
    description: "Buildings and territories your kingdom controls. Cathedrals and palaces score victory points. Shipyards let you build skyships. Factories produce trade goods.",
  },
  "fleets": {
    title: "Fleets",
    cost: "",
    description: "Your deployed fleets on the map. Each fleet carries skyships and regiments. Fleets can be dispatched to new locations or merged together.",
  },
};
