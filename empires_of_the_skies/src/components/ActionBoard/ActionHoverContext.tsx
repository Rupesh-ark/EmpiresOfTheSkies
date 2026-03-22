import { createContext, useContext, useState, useMemo, ReactNode } from "react";

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
  const value = useMemo(() => ({ hoveredAction, setHoveredAction }), [hoveredAction]);
  return (
    <ActionHoverContext.Provider value={value}>
      {children}
    </ActionHoverContext.Provider>
  );
};

/** Action descriptions shown in the info panel on hover */
export const ACTION_INFO: Record<string, { title: string; cost: string; description: ReactNode; details?: string }> = {
  "change-player-order": {
    title: "Change Player Order",
    cost: "1 Counsellor",
    description: "Place a counsellor on a position to claim that turn order for next round. Takes effect at the Reset phase. Only one position per player.",
    details: "Turn order matters — earlier players get first pick of action slots (which are cheaper). Later players see what others did but pay more. Strategic choice: go early for cheap slots, or late for information.",
  },
  "recruit-counsellors": {
    title: "Recruit Counsellors",
    cost: "1 Gold + row cost",
    description: "Gain 1 counsellor. Cost increases by 1 Gold for each counsellor already placed in this row this round.",
    details: "Counsellors are your primary currency for taking actions. Each action on the board costs 1 counsellor to place. You start each round with a limited supply, so recruiting more gives you extra actions. The earlier you recruit, the cheaper it is.",
  },
  "recruit-regiments": {
    title: "Recruit Regiments",
    cost: "1 Gold + row cost",
    description: "Gain 4 regiments to your available forces. Cost increases by 1 Gold for each player already placed in this row.",
    details: "Regiments are your ground troops. They fight in ground battles and garrison conquered territories. You need regiments loaded onto fleets to project military power across the map. More regiments = stronger armies.",
  },
  "skyships-zeeland": {
    title: "Purchase Skyships (Zeeland)",
    cost: "2 Gold + row cost",
    description: "Purchase 2 skyships from Zeeland's shipyards. Cost increases by 1 Gold per player already in this row.",
    details: "Skyships fight in aerial battles and carry your fleets across the map. You need skyships in a fleet to move it. Zeeland and Venoa are two separate shipyards — you can buy from both in the same round for more skyships.",
  },
  "skyships-venoa": {
    title: "Purchase Skyships (Venoa)",
    cost: "2 Gold + row cost",
    description: "Purchase 2 skyships from Venoa's shipyards. Cost increases by 1 Gold per player already in this row.",
    details: "Skyships fight in aerial battles and carry your fleets across the map. Venoa is a second shipyard — buying from both Zeeland and Venoa lets you acquire more skyships in a single round.",
  },
  "found-factories": {
    title: "Found Factories",
    cost: "1 Gold + row cost",
    description: "Build a factory in one of your territories. Factories produce trade goods that can be sold for Gold.",
    details: "Factories are your economic engine. Each factory produces one good per round during the Trade phase. Goods have fluctuating prices — sell when prices are high for maximum profit. More factories = more income over time.",
  },
  "punish-dissenters": {
    title: "Punish Dissenters",
    cost: "2 Gold or 1 Counsellor",
    description: "Imprison a dissenter (costs 2 Gold or 1 Counsellor) or execute a prisoner (lose 1 Victory Point). Prisoners reduce heresy.",
    details: "Heresy affects your Victory Points at end of game. Imprisoning dissenters costs resources but moves you toward orthodoxy. Executing prisoners is free but costs Victory Points. Balance religious control against the Victory Point cost.",
  },
  "convert-monarch": {
    title: "Convert Monarch",
    cost: "2 Gold + 1 Counsellor",
    description: "Flip your kingdom's religious alignment between Orthodox and Heretic. Affects elections, prelate influence, and events.",
    details: "Your religious alignment determines whether heresy helps or hurts you. Orthodox kingdoms lose Victory Points from heresy; Heretic kingdoms gain Victory Points. Conversion also changes how you interact with the Archprelate election.",
  },
  "cathedral": {
    title: "Found Cathedral",
    cost: "5 Gold + row cost",
    description: "Build a cathedral in one of your territories. Cathedrals provide Victory Points and increase your influence in elections.",
    details: "Cathedrals are expensive but powerful. Each cathedral gives Victory Points and adds influence when voting for the Archprelate. They also reduce the cost of influencing prelates. A long-term investment in both scoring and political power.",
  },
  "palace": {
    title: "Found Palace",
    cost: "5 Gold + row cost",
    description: "Build a palace in one of your territories. Palaces provide Victory Points and increase your kingdom's prestige.",
    details: "Palaces are a direct Victory Point investment. They're expensive at 5+ Gold, but each one scores points at end of game. Build palaces when you have surplus Gold and want reliable scoring.",
  },
  "shipyard": {
    title: "Found Shipyard",
    cost: "3 Gold + row cost",
    description: "Build a shipyard in one of your territories. Shipyards let you build skyships without buying from Zeeland or Venoa.",
    details: "Shipyards give you an alternative way to acquire skyships via the Build Skyships kingdom action. This bypasses the shared action board slots, letting you build skyships even when Zeeland and Venoa are full.",
  },
  "fort": {
    title: "Found Fort",
    cost: "2 Gold + row cost",
    description: "Build a fort in one of your territories. Forts provide defensive bonuses during ground battles.",
    details: "Forts make your territories harder to conquer. When an enemy attacks a territory with a fort, your defending forces get a combat bonus. Cheap at 2+ Gold and effective for protecting key holdings.",
  },
  "influence-prelates": {
    title: "Influence Prelates",
    cost: "Free / 1 Gold / Cathedral count",
    description: "Place a counsellor on a kingdom's prelate to influence the upcoming Archprelate election. First placement is free, second costs 1 Gold.",
    details: "The Archprelate can issue holy decrees — blessing or cursing kingdoms for Victory Points. Influencing prelates lets you steer who becomes Archprelate. First influence is free, second costs 1 Gold, then it costs your cathedral count in Gold per additional placement.",
  },
  "issue-holy-decree": {
    title: "Issue Holy Decree",
    cost: "Free (Archprelate only)",
    description: "As Archprelate, issue a decree: Bless a kingdom (gain Victory Points), Curse a kingdom (lose Victory Points), Reform the church, or Confirm dogma.",
    details: "Only the Archprelate can do this, once per round. Bless yourself or an ally for Victory Points. Curse a rival to cost them points. Reform or Confirm dogma shifts the religious landscape. Powerful political tool.",
  },

  // ── Kingdom Actions (PlayerBoard) ──────────────────────────────

  "deploy-fleet": {
    title: "Deploy Fleet",
    cost: "Free",
    description: "Deploy a new fleet from your capital. The fleet starts with your available skyships and can carry regiments across the map.",
    details: "Fleets are how you move military forces. A fleet needs at least 1 skyship to fly. Load regiments onto a fleet, then dispatch it to a destination. You can have multiple fleets active at once.",
  },
  "build-skyships": {
    title: "Build Skyships",
    cost: "Free (requires Shipyard)",
    description: "Build skyships at your shipyards. You can build 1 skyship per Shipyard you own. Skyships are added to your available forces.",
    details: "This is a kingdom action — it doesn't cost a counsellor or action board slot. You need at least one Shipyard building to use this. Each Shipyard produces 1 skyship per use.",
  },
  "conscript-levies": {
    title: "Conscript Levies",
    cost: "Free",
    description: "Raise levy troops from your territories. Levies are weaker than regiments but free to recruit. Choose how many to conscript (3–12).",
    details: "Levies are disposable troops — they fight at half the strength of regiments but cost nothing. Good for padding your armies or defending territories you expect to lose.",
  },
  "train-troops": {
    title: "Train Troops",
    cost: "1 Counsellor",
    description: "Convert available regiments into elite regiments. Elite regiments count as 2 regiments in battle.",
    details: "Elite regiments are your strongest units — each one fights with the power of 2 regular regiments. Costs 1 counsellor but no Gold. Worth it before major battles.",
  },
  "dispatch-fleet": {
    title: "Dispatch Fleet",
    cost: "Free",
    description: "Send a deployed fleet to a new destination. Load regiments and skyships, then choose where to send them on the map.",
    details: "Select a fleet, optionally add or remove troops and skyships, then pick a destination hex on the map. The fleet will move there at the start of the Battle phase.",
  },
  "transfer-fleet": {
    title: "Transfer Between Fleets",
    cost: "Free",
    description: "Move troops and skyships between two fleets at the same location. Useful for consolidating or splitting forces.",
    details: "Both fleets must be on the same map hex. You can move skyships and regiments freely between them. Use this to merge weak fleets or split a large fleet for multiple targets.",
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
    description: "Your kingdom's core resources. Counsellors are placed on the action board to take actions. Gold pays for everything. Victory Points determine who wins.",
  },
  "forces": {
    title: "Available Forces",
    cost: "",
    description: "Military units ready to be deployed. Regiments fight on the ground, elite regiments hit harder, levies are cheap but weak, and skyships control the air.",
  },
  "holdings": {
    title: "Holdings",
    cost: "",
    description: "Buildings and territories your kingdom controls. Cathedrals and Palaces score Victory Points. Shipyards let you build skyships. Factories produce trade goods.",
  },
  "fleets": {
    title: "Fleets",
    cost: "",
    description: "Your deployed fleets on the map. Each fleet carries skyships and regiments. Fleets can be dispatched to new locations or merged together.",
  },
};
