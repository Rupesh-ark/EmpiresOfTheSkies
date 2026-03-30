import { useState } from "react";
import { Chip, Typography, Slider, Box } from "@mui/material";
import { MyGameProps } from "@eots/game";
import { DialogShell } from "@/components/atoms/DialogShell";

const InvasionContributeDialog = (props: MyGameProps) => {
  const invasion = props.G.currentInvasion;
  if (!invasion || invasion.phase !== "contribute") return null;
  if (props.ctx.currentPlayer !== props.playerID) return null;
  const player = props.G.playerInfo[props.playerID ?? ""];
  if (!player) return null;

  const maxRegiments = player.resources.regiments;
  const maxLevies = player.resources.levies;
  const [regiments, setRegiments] = useState(maxRegiments);
  const [levies, setLevies] = useState(maxLevies);
  const totalSwords = regiments * 2 + levies;

  const otherContributions = Object.entries(invasion.contributions).map(
    ([id, c]) => ({ kingdom: props.G.playerInfo[id].kingdomName, swords: c.regiments * 2 + c.levies })
  );
  const captainGeneral = Object.values(props.G.playerInfo).find((p) => p.isCaptainGeneral);

  return (
    <DialogShell
      open
      title="Grand Army — Contribute Troops"
      mood="crisis"
      size="sm"
      confirmLabel="Contribute Troops"
      onConfirm={() => props.moves.contributeToGrandArmy(regiments, levies)}
      cancelLabel="Contribute Nothing"
      onCancel={() => props.moves.contributeToGrandArmy(0, 0)}
    >
      <Box sx={{ display: "flex", gap: 2, mb: 2, p: 2, backgroundColor: "rgba(255, 112, 67, 0.08)", borderRadius: 1, flexWrap: "wrap" }}>
        <Chip label={`Infidel Host: ${invasion.totalHostSwords} Swords`} color="error" variant="outlined" sx={{ fontWeight: "bold" }} />
        {captainGeneral && <Chip label={`Captain-General: ${captainGeneral.kingdomName}`} color="warning" variant="outlined" sx={{ fontWeight: "bold" }} />}
      </Box>
      {otherContributions.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5, color: "text.secondary" }}>Already committed:</Typography>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {otherContributions.map(({ kingdom, swords }) => (<Chip key={kingdom} label={`${kingdom}: ${swords}S`} size="small" variant="outlined" />))}
          </div>
        </Box>
      )}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Commit Regiments ({regiments} of {maxRegiments})</Typography>
      <Slider value={regiments} onChange={(_, v) => setRegiments(v as number)} min={0} max={maxRegiments} step={1} marks valueLabelDisplay="auto" disabled={maxRegiments === 0} sx={{ mb: 2 }} />
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Commit Levies ({levies} of {maxLevies})</Typography>
      <Slider value={levies} onChange={(_, v) => setLevies(v as number)} min={0} max={maxLevies} step={1} marks valueLabelDisplay="auto" disabled={maxLevies === 0} sx={{ mb: 2 }} />
      <Chip label={`Your contribution: ${totalSwords} Swords`} color="primary" variant="outlined" sx={{ fontWeight: "bold" }} />
      {totalSwords === 0 && <Typography variant="body2" color="error" sx={{ mt: 1 }}>Contributing nothing shames your realm — heresy penalty applies!</Typography>}
    </DialogShell>
  );
};

export default InvasionContributeDialog;
