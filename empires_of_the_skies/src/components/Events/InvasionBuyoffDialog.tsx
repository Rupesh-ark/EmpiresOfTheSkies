import { useState } from "react";
import { Chip, Typography, Slider, Box } from "@mui/material";
import { MyGameProps } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";

const InvasionBuyoffDialog = (props: MyGameProps) => {
  const invasion = props.G.currentInvasion;
  if (!invasion || invasion.phase !== "buyoff") return null;
  if (props.ctx.currentPlayer !== props.playerID) return null;
  const player = props.G.playerInfo[props.playerID ?? ""];
  if (!player) return null;

  const cost = invasion.buyoffCost ?? 0;
  const offered = invasion.buyoffOffered ?? {};
  const totalOffered = Object.values(offered).reduce((a, b) => a + b, 0);
  const remaining = Math.max(0, cost - totalOffered);
  const maxOffer = Math.max(0, player.resources.gold);
  const [amount, setAmount] = useState(Math.min(remaining, maxOffer));

  const otherOffers = Object.entries(offered).map(([id, gold]) => ({
    kingdom: props.G.playerInfo[id].kingdomName, gold,
  }));

  return (
    <DialogShell
      open
      title="Infidel Buy-off"
      mood="crisis"
      size="sm"
      confirmLabel={`Offer ${amount} Gold`}
      onConfirm={() => props.moves.offerBuyoffGold(amount)}
      cancelLabel="Offer Nothing"
      onCancel={() => props.moves.offerBuyoffGold(0)}
    >
      <Typography variant="body2" sx={{ mb: 2 }}>
        The Grand Army has been defeated. The Infidels demand gold to leave. Any shortfall is paid in Victory Points.
      </Typography>
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <Chip label={`Buy-off cost: ${cost} Gold`} color="error" variant="outlined" sx={{ fontWeight: "bold" }} />
        <Chip label={`Offered so far: ${totalOffered} Gold`} color="warning" variant="outlined" sx={{ fontWeight: "bold" }} />
        <Chip label={`Remaining: ${remaining} Gold`} color={remaining > 0 ? "error" : "success"} variant="outlined" sx={{ fontWeight: "bold" }} />
      </Box>
      {otherOffers.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5, color: "text.secondary" }}>Already offered:</Typography>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {otherOffers.map(({ kingdom, gold }) => (<Chip key={kingdom} label={`${kingdom}: ${gold}G`} size="small" variant="outlined" />))}
          </div>
        </Box>
      )}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Your offer ({amount} of {maxOffer} Gold available)</Typography>
      <Slider value={amount} onChange={(_, v) => setAmount(v as number)} min={0} max={maxOffer} step={1} marks valueLabelDisplay="auto" disabled={maxOffer === 0} sx={{ mb: 2 }} />
      {amount === 0 && remaining > 0 && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>Offering nothing risks Victory Point penalties if the total falls short!</Typography>
      )}
    </DialogShell>
  );
};

export default InvasionBuyoffDialog;
