import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { tokens } from "../../../theme/tokens";
import type { GameRecord } from "@eots/game";
import { getEvalVsMCTS, getQualityDistribution, getPerMoveQuality } from "../aiTunerHelpers";

interface HeuristicsTabProps {
  gameRecord: GameRecord;
  selectedPlayer: string;
}

export default function HeuristicsTab({ gameRecord, selectedPlayer }: HeuristicsTabProps) {
  const evalVsMCTSData = getEvalVsMCTS(gameRecord, selectedPlayer);
  const qualityDistData = getQualityDistribution(gameRecord, selectedPlayer);
  const perMoveQualityData = getPerMoveQuality(gameRecord, selectedPlayer);

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Evaluator vs MCTS Top Picks
          {selectedPlayer !== "all" ? ` (P${selectedPlayer})` : " (All Players)"}
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: tokens.ui.textMuted, display: "block", textAlign: "center", mb: 1 }}>
              Evaluator Top Picks
            </Typography>
            {evalVsMCTSData.evalDist.length > 0 ? (
              <PieChart
                series={[{ data: evalVsMCTSData.evalDist, innerRadius: 40 }]}
                height={220}
              />
            ) : (
              <Typography color="textSecondary" sx={{ textAlign: "center", py: 4 }}>No data</Typography>
            )}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: tokens.ui.textMuted, display: "block", textAlign: "center", mb: 1 }}>
              MCTS Final Picks
            </Typography>
            {evalVsMCTSData.mctsDist.length > 0 ? (
              <PieChart
                series={[{ data: evalVsMCTSData.mctsDist, innerRadius: 40 }]}
                height={220}
              />
            ) : (
              <Typography color="textSecondary" sx={{ textAlign: "center", py: 4 }}>No data</Typography>
            )}
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Quality Score Distribution (All MCTS Children)
          {selectedPlayer !== "all" ? ` (P${selectedPlayer})` : " (All Players)"}
        </Typography>
        {qualityDistData.data.some((v) => v > 0) ? (
          <BarChart
            xAxis={[{ scaleType: "band", data: qualityDistData.buckets, label: "Quality Range" }]}
            series={[{ data: qualityDistData.data, label: "Move Count", color: tokens.ui.gold }]}
            height={260}
          />
        ) : (
          <Typography color="textSecondary">No MCTS children data</Typography>
        )}
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Per-Move Quality Analysis
        </Typography>
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Move Type</TableCell>
                <TableCell align="right">Avg Quality (Heuristic)</TableCell>
                <TableCell align="right">Times Evaluated</TableCell>
                <TableCell align="right">Times Chosen (MCTS)</TableCell>
                <TableCell align="right">Choose Rate</TableCell>
                <TableCell align="right">Avg MCTS Reward</TableCell>
                <TableCell align="right">Quality→Reward Delta</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {perMoveQualityData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ textAlign: "center", color: tokens.ui.textMuted, py: 3 }}>
                    No MCTS data available
                  </TableCell>
                </TableRow>
              ) : (
                perMoveQualityData.map((row) => (
                  <TableRow key={row.move}>
                    <TableCell sx={{ fontWeight: 600 }}>{row.move}</TableCell>
                    <TableCell align="right">{row.avgQuality.toFixed(3)}</TableCell>
                    <TableCell align="right">{row.timesEvaluated}</TableCell>
                    <TableCell align="right">{row.timesChosen}</TableCell>
                    <TableCell align="right">{(row.chooseRate * 100).toFixed(1)}%</TableCell>
                    <TableCell align="right">{row.avgReward.toFixed(3)}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: row.delta > 0.01
                          ? tokens.ui.success
                          : row.delta < -0.01
                          ? tokens.ui.danger
                          : "inherit",
                        fontWeight: Math.abs(row.delta) > 0.01 ? 600 : 400,
                      }}
                    >
                      {row.delta > 0 ? "+" : ""}{row.delta.toFixed(3)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
