import { Chip, Typography, Box } from "@mui/material";
import { MyGameProps } from "@eots/game";
import { DecisionPanel } from "@/components/atoms/DecisionPanel";
import { GameButton } from "@/components/atoms/GameButton";

/**
 * The rebellion defender decides whether to accept offered rival help —
 * eots42:79: "The selected player may refuse help." One collective decision
 * covers all defender-side contributions.
 */
const RebellionAcceptSupportDialog = (props: MyGameProps) => {
  const rebellion = props.G.currentRebellion;
  if (
    !rebellion ||
    props.G.step !== "rebellion_accept_support" ||
    rebellion.event.targetPlayerID !== props.playerID ||
    props.ctx.currentPlayer !== props.playerID
  ) {
    return null;
  }

  const defenderSupport = Object.entries(rebellion.rivalContributions ?? {}).filter(
    ([, c]) => c.side === "defender"
  );
  const supportSummary = defenderSupport.map(([id, c]) => {
    const parts = [
      c.regiments > 0 ? `${c.regiments} regiment${c.regiments > 1 ? "s" : ""}` : "",
      c.eliteRegiments > 0 ? `${c.eliteRegiments} elite` : "",
      c.levies > 0 ? `${c.levies} lev${c.levies > 1 ? "ies" : "y"}` : "",
      c.skyships > 0 ? `${c.skyships} skyship${c.skyships > 1 ? "s" : ""}` : "",
    ].filter(Boolean);
    return {
      kingdom: props.G.playerInfo[id]?.kingdomName ?? id,
      force: parts.join(", "),
    };
  });

  return (
    <DecisionPanel
      open
      title="Rival Aid Offered"
      subtitle="Accepting shares the battle — and the glory. Refusing means fighting alone."
      mood="crisis"
      actions={
        <>
          <GameButton variant="ghost" onClick={() => props.moves.acceptRebellionSupport(false)}>
            Refuse — we fight alone
          </GameButton>
          <GameButton variant="primary" onClick={() => props.moves.acceptRebellionSupport(true)}>
            Accept the aid
          </GameButton>
        </>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {supportSummary.map(({ kingdom, force }) => (
          <Chip
            key={kingdom}
            label={`${kingdom}: ${force}`}
            color="info"
            variant="outlined"
            sx={{ fontWeight: "bold", justifyContent: "flex-start" }}
          />
        ))}
        {supportSummary.length === 0 && (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No rival forces were committed.
          </Typography>
        )}
      </Box>
    </DecisionPanel>
  );
};

export default RebellionAcceptSupportDialog;
