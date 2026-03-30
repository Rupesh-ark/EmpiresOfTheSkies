import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";
import { tokens } from "../../../theme/tokens";
import type { GameRecord } from "@eots/game";
import { PLAYER_COLORS, getFilteredDecisions } from "../aiTunerHelpers";

interface DecisionsTabProps {
  gameRecord: GameRecord;
  selectedPlayer: string;
  onPlayerChange: (player: string) => void;
}

export default function DecisionsTab({ gameRecord, selectedPlayer, onPlayerChange }: DecisionsTabProps) {
  const [selectedRound, setSelectedRound] = useState<number | "all">("all");
  const [selectedPhase, setSelectedPhase] = useState<string>("all");

  const maxRound = gameRecord.result?.rounds ?? 10;
  const filteredDecisions = getFilteredDecisions(gameRecord, selectedRound, selectedPlayer, selectedPhase);

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Round</InputLabel>
          <Select
            value={selectedRound}
            label="Round"
            onChange={(e) => setSelectedRound(e.target.value as number | "all")}
          >
            <MenuItem value="all">All Rounds</MenuItem>
            {Array.from({ length: maxRound }, (_, i) => i + 1).map((r) => (
              <MenuItem key={r} value={r}>Round {r}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Player</InputLabel>
          <Select
            value={selectedPlayer}
            label="Player"
            onChange={(e) => onPlayerChange(e.target.value)}
          >
            <MenuItem value="all">All Players</MenuItem>
            {Object.keys(gameRecord.players).map((pid) => (
              <MenuItem key={pid} value={pid}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: PLAYER_COLORS[parseInt(pid)] ?? "#888" }} />
                  P{pid}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Phase</InputLabel>
          <Select
            value={selectedPhase}
            label="Phase"
            onChange={(e) => setSelectedPhase(e.target.value)}
          >
            <MenuItem value="all">All Phases</MenuItem>
            <MenuItem value="actions">actions</MenuItem>
            <MenuItem value="resolution">resolution</MenuItem>
            <MenuItem value="discovery">discovery</MenuItem>
            <MenuItem value="events">events</MenuItem>
          </Select>
        </FormControl>

        <Typography variant="caption" sx={{ color: tokens.ui.textMuted }}>
          {filteredDecisions.length} decisions
        </Typography>
      </Box>

      <Paper sx={{ p: 2 }}>
        <TableContainer sx={{ maxHeight: 650 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Round</TableCell>
                <TableCell>Player</TableCell>
                <TableCell>Phase/Stage</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Chosen Move</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Alt 1</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Alt 2</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Alt 3</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Gold</TableCell>
                <TableCell>VP</TableCell>
                <TableCell>Routes</TableCell>
                <TableCell>Troops</TableCell>
                <TableCell>Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDecisions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={16} sx={{ textAlign: "center", color: tokens.ui.textMuted, py: 3 }}>
                    No decisions match the current filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredDecisions.map((d, i) => {
                  const alts = d.topScoredMoves
                    .filter((m) => m.move !== d.chosenMove)
                    .slice(0, 3);
                  const hasBattle = d.battleContext != null;
                  const battleTip = hasBattle
                    ? `${d.battleContext!.myStrength} vs ${d.battleContext!.enemyStrength} → ${d.battleContext!.decision}${d.battleContext!.outcome ? ` (${d.battleContext!.outcome})` : ""}`
                    : undefined;

                  return (
                    <TableRow
                      key={i}
                      sx={{
                        bgcolor: hasBattle
                          ? tokens.ui.danger + "22"
                          : PLAYER_COLORS[parseInt(d.playerID)] + "11",
                      }}
                    >
                      <TableCell sx={{ fontSize: 11 }}>{d.round}</TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              bgcolor: PLAYER_COLORS[parseInt(d.playerID)] ?? "#888",
                            }}
                          />
                          P{d.playerID}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{d.stage}</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>{d.chosenMove}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>
                        {d.chosenScore !== undefined ? d.chosenScore.toFixed(3) : "—"}
                      </TableCell>
                      {[0, 1, 2].map((altIdx) => {
                        const alt = alts[altIdx];
                        return [
                          <TableCell key={`alt-${altIdx}`} sx={{ fontSize: 11 }}>
                            {alt ? alt.move : "—"}
                          </TableCell>,
                          <TableCell key={`alt-score-${altIdx}`} sx={{ fontSize: 11, color: tokens.ui.textMuted }}>
                            {alt ? alt.score.toFixed(3) : "—"}
                          </TableCell>,
                        ];
                      })}
                      <TableCell sx={{ fontSize: 11 }}>{d.snapshot.resources.gold}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{d.snapshot.resources.victoryPoints}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{d.snapshot.economy.activeRoutes}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>
                        {d.snapshot.resources.regiments}r {d.snapshot.resources.levies}l {d.snapshot.resources.skyships}s
                      </TableCell>
                      <TableCell>
                        {hasBattle ? (
                          <Tooltip title={battleTip ?? ""}>
                            <Chip label={d.reason} size="small" color="error" sx={{ fontSize: 10 }} />
                          </Tooltip>
                        ) : (
                          <Chip label={d.reason} size="small" sx={{ fontSize: 10 }} />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
