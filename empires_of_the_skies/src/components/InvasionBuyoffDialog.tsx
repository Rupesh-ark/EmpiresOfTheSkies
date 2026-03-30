import { useState } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Chip,
  Typography,
  Slider,
  Box,
} from "@mui/material";
import { MyGameProps } from "@eots/game";

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

  // Show what others have offered
  const otherOffers = Object.entries(offered).map(([id, gold]) => ({
    kingdom: props.G.playerInfo[id].kingdomName,
    gold,
  }));

  return (
    <Dialog open maxWidth="sm" fullWidth>
      <DialogTitle>Infidel Buy-off</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          The Grand Army has been defeated. The Infidels demand gold to leave.
          Each player offers what they can. Any shortfall is paid in VP.
        </Typography>

        <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
          <Chip
            label={`Buy-off cost: ${cost} Gold`}
            color="error"
            variant="outlined"
            sx={{ fontWeight: "bold" }}
          />
          <Chip
            label={`Offered so far: ${totalOffered} Gold`}
            color="warning"
            variant="outlined"
            sx={{ fontWeight: "bold" }}
          />
          <Chip
            label={`Remaining: ${remaining} Gold`}
            color={remaining > 0 ? "error" : "success"}
            variant="outlined"
            sx={{ fontWeight: "bold" }}
          />
        </Box>

        {otherOffers.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5, color: "text.secondary" }}>
              Already offered:
            </Typography>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {otherOffers.map(({ kingdom, gold }) => (
                <Chip
                  key={kingdom}
                  label={`${kingdom}: ${gold}G`}
                  size="small"
                  variant="outlined"
                />
              ))}
            </div>
          </Box>
        )}

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Your offer ({amount} of {maxOffer} Gold available)
        </Typography>
        <Slider
          value={amount}
          onChange={(_, v) => setAmount(v as number)}
          min={0}
          max={maxOffer}
          step={1}
          marks
          valueLabelDisplay="auto"
          disabled={maxOffer === 0}
          sx={{ mb: 2 }}
        />

        {amount === 0 && remaining > 0 && (
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            Offering nothing risks VP penalties if the total falls short!
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          variant="outlined"
          color="error"
          onClick={() => props.moves.offerBuyoffGold(0)}
        >
          Offer Nothing
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => props.moves.offerBuyoffGold(amount)}
        >
          Offer {amount} Gold
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvasionBuyoffDialog;
