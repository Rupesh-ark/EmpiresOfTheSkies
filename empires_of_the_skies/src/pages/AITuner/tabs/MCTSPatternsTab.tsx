import {
  Box,
  Paper,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";
import { BarChart } from "@mui/x-charts/BarChart";
import type { GameRecord } from "@eots/game";
import { PLAYER_COLORS, getMCTSSummary, getMovesByRound, getDecisionQuality } from "../aiTunerHelpers";
import { tokens } from "../../../theme/tokens";

interface MCTSPatternsTabProps {
  gameRecord: GameRecord;
  selectedPlayer: string;
}

export default function MCTSPatternsTab({ gameRecord, selectedPlayer }: MCTSPatternsTabProps) {
  const mcts = getMCTSSummary(gameRecord, selectedPlayer);
  const movesByRound = getMovesByRound(gameRecord, selectedPlayer);
  const decisionQuality = getDecisionQuality(gameRecord, selectedPlayer);

  return (
    <Box>
      <Paper data-chart-name="move_frequency" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Move Frequency by Round
          {selectedPlayer !== "all" ? ` (P${selectedPlayer})` : " (All)"}
        </Typography>
        {movesByRound.rounds.length > 0 ? (
          <BarChart
            xAxis={[{
              scaleType: "band",
              data: movesByRound.rounds.map((r) => `R${r}`),
            }]}
            series={movesByRound.series}
            height={280}
          />
        ) : (
          <Typography color="textSecondary">No data</Typography>
        )}
      </Paper>

      <Paper data-chart-name="decision_quality" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Decision Quality Over Time
          {selectedPlayer !== "all" ? ` (P${selectedPlayer})` : " (All Players)"}
        </Typography>
        {decisionQuality.rounds.length > 0 ? (
          <LineChart
            xAxis={[{ data: decisionQuality.rounds, label: "Round" }]}
            series={decisionQuality.series}
            height={250}
            colors={selectedPlayer === "all" ? PLAYER_COLORS : [PLAYER_COLORS[parseInt(selectedPlayer)] ?? tokens.ui.info]}
          />
        ) : (
          <Typography color="textSecondary">No data</Typography>
        )}
      </Paper>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2, mb: 2 }}>
        <Paper sx={{ p: 2, textAlign: "center" }}>
          <Typography variant="caption" sx={{ color: tokens.ui.textMuted }}>MCTS Decisions</Typography>
          <Typography variant="h5">{mcts.mctsDecisions}</Typography>
          <Typography variant="caption" sx={{ color: tokens.ui.textMuted }}>of {mcts.totalDecisions} total</Typography>
        </Paper>
        <Paper sx={{ p: 2, textAlign: "center" }}>
          <Typography variant="caption" sx={{ color: tokens.ui.textMuted }}>Override Rate</Typography>
          <Typography variant="h5" sx={{ color: mcts.overrideRate > 0.3 ? "#e67e22" : "inherit" }}>
            {(mcts.overrideRate * 100).toFixed(1)}%
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.ui.textMuted }}>{mcts.overrideCount} overrides</Typography>
        </Paper>
        <Paper sx={{ p: 2, textAlign: "center" }}>
          <Typography variant="caption" sx={{ color: tokens.ui.textMuted }}>Avg Simulations</Typography>
          <Typography variant="h5">{mcts.avgSimulations.toFixed(0)}</Typography>
        </Paper>
        <Paper sx={{ p: 2, textAlign: "center" }}>
          <Typography variant="caption" sx={{ color: tokens.ui.textMuted }}>Avg Time</Typography>
          <Typography variant="h5">{mcts.avgTimeMs.toFixed(1)}ms</Typography>
        </Paper>
      </Box>

      {mcts.moveStats.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Move Type Performance</Typography>
          <TableContainer sx={{ maxHeight: 300 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Move</TableCell>
                  <TableCell align="right">Times Chosen</TableCell>
                  <TableCell align="right">Avg Visits</TableCell>
                  <TableCell align="right">Avg Quality (Prior)</TableCell>
                  <TableCell align="right">Avg Reward (MCTS)</TableCell>
                  <TableCell align="right">Delta</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mcts.moveStats.map((m) => {
                  const delta = m.avgReward - m.avgQuality;
                  return (
                    <TableRow key={m.move}>
                      <TableCell sx={{ fontWeight: 600 }}>{m.move}</TableCell>
                      <TableCell align="right">{m.chosen}</TableCell>
                      <TableCell align="right">{m.avgVisits.toFixed(1)}</TableCell>
                      <TableCell align="right">{m.avgQuality.toFixed(3)}</TableCell>
                      <TableCell align="right">{m.avgReward.toFixed(3)}</TableCell>
                      <TableCell align="right" sx={{ color: delta > 0 ? "#27ae60" : delta < -0.05 ? "#e74c3c" : "inherit" }}>
                        {delta > 0 ? "+" : ""}{delta.toFixed(3)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>MCTS Decision Log</Typography>
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Rd</TableCell>
                <TableCell>Player</TableCell>
                <TableCell>Chosen</TableCell>
                <TableCell align="right">Reward</TableCell>
                <TableCell>Eval Top</TableCell>
                <TableCell>Override?</TableCell>
                <TableCell align="right">Time</TableCell>
                <TableCell>Visit Distribution</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mcts.details.map((d, i) => (
                <TableRow key={i} sx={{ bgcolor: d.overrode ? "#e67e2211" : undefined }}>
                  <TableCell>{d.round}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: PLAYER_COLORS[parseInt(d.playerID)] }} />
                      P{d.playerID}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{d.chosenMove}</TableCell>
                  <TableCell align="right">{d.avgReward.toFixed(3)}</TableCell>
                  <TableCell sx={{ fontSize: 11 }}>{d.evaluatorTop}</TableCell>
                  <TableCell>
                    {d.overrode ? <Chip label="Yes" size="small" color="warning" sx={{ fontSize: 10 }} /> : "—"}
                  </TableCell>
                  <TableCell align="right">{d.timeMs}ms</TableCell>
                  <TableCell sx={{ fontSize: 10 }}>
                    {d.children.slice(0, 4).map((c) =>
                      `${c.move}:${c.visits}`
                    ).join("  ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
