/**
 * AITunerPage — Single Bot Tuner dashboard.
 *
 * Layout: sidebar (weight editor + player selector) | main (charts + data)
 * Runs a single game in-browser via browserRunner, displays the GameRecord.
 */
import { useState, useCallback, useRef } from "react";
import {
  Box,
  Button,
  Paper,
  Typography,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  TextField,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SaveIcon from "@mui/icons-material/Save";
import HomeIcon from "@mui/icons-material/Home";
import { PieChart } from "@mui/x-charts/PieChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { useNavigate } from "react-router-dom";

import { baseTheme } from "../theme/baseTheme";
import { tokens } from "../theme/tokens";
import type { GameRecord } from "@eots/game";
import { AI_CONFIG } from "@eots/game";

// ── Kingdom colors for player lines ──────────────────────────────────────────

const PLAYER_COLORS = [
  tokens.kingdom.angland,     // P0 red
  tokens.kingdom.constantium, // P1 green
  tokens.kingdom.nordmark,    // P2 yellow
  tokens.kingdom.gallois,     // P3 blue
  tokens.kingdom.castillia,   // P4 brown
  "#7B68A0",                  // P5 purple (ostreich is too light for charts)
];

const WEIGHT_KEYS = [
  "territory", "economy", "military", "religion",
  "legacy", "positioning", "threats", "republicAccess",
] as const;

type WeightKey = typeof WEIGHT_KEYS[number];

// ── Main Component ───────────────────────────────────────────────────────────

export default function AITunerPage() {
  const navigate = useNavigate();

  const [weights, setWeights] = useState<Record<WeightKey, number>>(
    () => ({ ...AI_CONFIG.baseline }) as Record<WeightKey, number>
  );

  // Game state
  const [gameRecord, setGameRecord] = useState<GameRecord | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Player selector
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");

  // Tab state for the results area
  const [resultTab, setResultTab] = useState(0);

  // Round selector for drill-down (Tab 2)
  const [selectedRound, setSelectedRound] = useState(1);

  // Round selector for Moves tab (Tab 3) — separate so Tab 2 is unaffected
  const [selectedMovesRound, setSelectedMovesRound] = useState<number | "all">("all");

  // Keep abort ref for future use
  const abortRef = useRef(false);

  // ── Run Game ─────────────────────────────────────────────────────────────

  const runGame = useCallback(async () => {
    setRunning(true);
    setError(null);
    setProgress("Initializing game...");
    abortRef.current = false;

    try {
      // Dynamic import to avoid bundling heavy game logic on page load
      const { runGameInBrowser } = await import("@eots/game");

      setProgress("Running game loop...");

      // Run on main thread (game completes in ~1-3 seconds)
      const record = runGameInBrowser(
        undefined,
        (info) => {
          setProgress(`Round ${info.round} · ${info.phase} · iter ${info.iteration}`);
        }
      );

      setGameRecord(record);
      setProgress("");

      // Default to the winner's player view
      if (record.result) {
        setSelectedPlayer(record.result.winner);
      }
    } catch (err) {
      console.error("Game runner error:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }, []);

  // ── Weight change handler ────────────────────────────────────────────────

  const handleWeightChange = (key: WeightKey, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  const resetWeights = () => {
    setWeights({ ...AI_CONFIG.baseline } as Record<WeightKey, number>);
  };

  const exportRecord = () => {
    if (!gameRecord) return;
    const blob = new Blob([JSON.stringify(gameRecord, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${gameRecord.gameId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadRecord = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const record = JSON.parse(e.target?.result as string) as GameRecord;
        setGameRecord(record);
        setError(null);
        if (record.result) setSelectedPlayer(record.result.winner);
      } catch (err) {
        setError("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  // ── Derived data for charts ──────────────────────────────────────────────

  const moveDistData = getMoveDistribution(gameRecord, selectedPlayer);
  const vpProgressionData = getVPProgression(gameRecord);
  const resourceCurveData = getResourceCurves(gameRecord, selectedPlayer);
  const battleLog = getBattleLog(gameRecord);
  const roundDecisions = getRoundDecisions(gameRecord, selectedRound, selectedPlayer);
  const movesComparison = getMovesComparison(gameRecord, selectedMovesRound, selectedPlayer);
  const maxRound = gameRecord?.result?.rounds ?? 10;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <ThemeProvider theme={baseTheme}>
      <Box sx={{ display: "flex", height: "100vh", bgcolor: "background.default" }}>
        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <Paper
          elevation={0}
          sx={{
            width: 300,
            minWidth: 300,
            p: 2,
            borderRight: `1px solid ${tokens.ui.borderMedium}`,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip title="Back to home">
              <IconButton size="small" onClick={() => navigate("/")}>
                <HomeIcon />
              </IconButton>
            </Tooltip>
            <Typography variant="h6" sx={{ fontFamily: tokens.font.display }}>
              AI Tuner
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              startIcon={running ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />}
              onClick={runGame}
              disabled={running}
              sx={{
                flex: 1,
                bgcolor: tokens.ui.gold,
                color: "#fff",
                "&:hover": { bgcolor: "#9A7209" },
              }}
            >
              {running ? "Running..." : "Run Game"}
            </Button>
            <Button
              variant="outlined"
              component="label"
              sx={{ minWidth: 40, px: 1 }}
            >
              <UploadFileIcon fontSize="small" />
              <input
                type="file"
                accept=".json"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) loadRecord(file);
                  e.target.value = "";
                }}
              />
            </Button>
          </Box>

          {progress && (
            <Typography variant="caption" sx={{ color: tokens.ui.textMuted }}>
              {progress}
            </Typography>
          )}

          {error && <Alert severity="error" sx={{ fontSize: 12 }}>{error}</Alert>}

          <Divider />

          {/* Player Selector */}
          <FormControl size="small" fullWidth>
            <InputLabel>Player Focus</InputLabel>
            <Select
              value={selectedPlayer}
              label="Player Focus"
              onChange={(e) => setSelectedPlayer(e.target.value)}
            >
              <MenuItem value="all">All Players</MenuItem>
              {gameRecord && Object.entries(gameRecord.players).map(([pid, p]) => (
                <MenuItem key={pid} value={pid}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: PLAYER_COLORS[parseInt(pid)] ?? "#888",
                      }}
                    />
                    P{pid} — {p.personality}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider />

          {/* Weight Editor */}
          <Typography variant="subtitle2">Baseline Weights</Typography>
          {WEIGHT_KEYS.map((key) => (
            <Box key={key} sx={{ px: 1 }}>
              <Typography variant="caption">{key}</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Slider
                  size="small"
                  value={weights[key]}
                  min={0}
                  max={0.5}
                  step={0.005}
                  onChange={(_, v) => handleWeightChange(key, v as number)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  type="number"
                  value={weights[key]}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && v >= 0 && v <= 0.5) handleWeightChange(key, v);
                  }}
                  slotProps={{ htmlInput: { step: 0.005, min: 0, max: 0.5 } }}
                  sx={{ width: 72, "& input": { py: 0.5, px: 0.5, fontSize: 12, textAlign: "right" } }}
                />
              </Box>
            </Box>
          ))}

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button size="small" startIcon={<RestartAltIcon />} onClick={resetWeights}>
              Reset
            </Button>
            <Button
              size="small"
              startIcon={<SaveIcon />}
              onClick={() => {
                const json = JSON.stringify({ baseline: weights }, null, 2);
                const blob = new Blob([json], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "weightsConfig.local.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Save Weights
            </Button>
            <Button
              size="small"
              startIcon={<DownloadIcon />}
              onClick={exportRecord}
              disabled={!gameRecord}
            >
              Export
            </Button>
          </Box>

          {/* Game Result Summary */}
          {gameRecord?.result && (
            <>
              <Divider />
              <Typography variant="subtitle2">Result</Typography>
              <Box sx={{ fontSize: 12 }}>
                <Typography variant="body2">
                  Winner: P{gameRecord.result.winner} ({gameRecord.result.winnerPersonality})
                </Typography>
                <Typography variant="body2">
                  Rounds: {gameRecord.result.rounds}
                </Typography>
                <Typography variant="body2">
                  Decisions: {gameRecord.decisions.length}
                </Typography>
                {gameRecord.result.rankings.map((r) => (
                  <Chip
                    key={r.playerID}
                    label={`P${r.playerID} ${r.personality}: ${r.vp}VP`}
                    size="small"
                    sx={{
                      m: 0.25,
                      bgcolor: PLAYER_COLORS[parseInt(r.playerID)] + "33",
                      fontSize: 11,
                    }}
                  />
                ))}
              </Box>
            </>
          )}
        </Paper>

        {/* ── Main Content ─────────────────────────────────────────── */}
        <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
          {!gameRecord ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: tokens.ui.textMuted,
              }}
            >
              <Typography variant="h5" sx={{ fontFamily: tokens.font.display }}>
                Click "Run Game" to start analyzing
              </Typography>
            </Box>
          ) : (
            <>
              <Tabs value={resultTab} onChange={(_, v) => setResultTab(v)} sx={{ mb: 2 }}>
                <Tab label="Overview" />
                <Tab label="Battles" />
                <Tab label="Round Drill-Down" />
                <Tab label="Moves" />
              </Tabs>

              {/* ── Tab 0: Overview ────────────────────────────────── */}
              {resultTab === 0 && (
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  {/* Move Distribution */}
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Move Distribution
                      {selectedPlayer !== "all" ? ` (P${selectedPlayer})` : " (All)"}
                    </Typography>
                    {moveDistData.length > 0 ? (
                      <PieChart
                        series={[{
                          data: moveDistData,
                          innerRadius: 30,
                          paddingAngle: 1,
                          cornerRadius: 3,
                        }]}
                        height={300}
                        slotProps={{ legend: { direction: "vertical", position: { vertical: "middle", horizontal: "end" } } }}
                      />
                    ) : (
                      <Typography color="textSecondary">No data</Typography>
                    )}
                  </Paper>

                  {/* VP Progression */}
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      VP Progression
                    </Typography>
                    {vpProgressionData.rounds.length > 0 ? (
                      <LineChart
                        xAxis={[{ data: vpProgressionData.rounds, label: "Round" }]}
                        series={vpProgressionData.series}
                        height={300}
                        colors={PLAYER_COLORS}
                      />
                    ) : (
                      <Typography color="textSecondary">No data</Typography>
                    )}
                  </Paper>

                  {/* Resource Curves */}
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Resources Over Time
                      {selectedPlayer !== "all" ? ` (P${selectedPlayer})` : " (P0)"}
                    </Typography>
                    {resourceCurveData.rounds.length > 0 ? (
                      <LineChart
                        xAxis={[{ data: resourceCurveData.rounds, label: "Round" }]}
                        series={resourceCurveData.series}
                        height={300}
                        colors={[tokens.ui.gold, tokens.ui.danger, tokens.ui.success, tokens.ui.info]}
                      />
                    ) : (
                      <Typography color="textSecondary">No data</Typography>
                    )}
                  </Paper>

                  {/* Move Frequency Bar Chart */}
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Moves Per Round
                      {selectedPlayer !== "all" ? ` (P${selectedPlayer})` : " (All)"}
                    </Typography>
                    {moveDistData.length > 0 ? (
                      <BarChart
                        xAxis={[{
                          scaleType: "band",
                          data: moveDistData.slice(0, 12).map((d) => d.label),
                          tickLabelStyle: { angle: -45, textAnchor: "end", fontSize: 10 },
                        }]}
                        series={[{
                          data: moveDistData.slice(0, 12).map((d) => d.value),
                          color: tokens.ui.gold,
                        }]}
                        height={300}
                      />
                    ) : (
                      <Typography color="textSecondary">No data</Typography>
                    )}
                  </Paper>
                </Box>
              )}

              {/* ── Tab 1: Battles ─────────────────────────────────── */}
              {resultTab === 1 && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Battle Decisions ({battleLog.length} total)
                  </Typography>
                  {battleLog.length === 0 ? (
                    <Alert severity="info">
                      No battles occurred, bots always chose doNotAttack.
                    </Alert>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Round</TableCell>
                            <TableCell>Attacker</TableCell>
                            <TableCell>Target</TableCell>
                            <TableCell>My Strength</TableCell>
                            <TableCell>Enemy Strength</TableCell>
                            <TableCell>Ratio</TableCell>
                            <TableCell>Threshold</TableCell>
                            <TableCell>Decision</TableCell>
                            <TableCell>FoW Cards</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {battleLog.map((b, i) => (
                            <TableRow key={i}>
                              <TableCell>{b.round}</TableCell>
                              <TableCell>P{b.playerID}</TableCell>
                              <TableCell>{b.targetID ? `P${b.targetID}` : "—"}</TableCell>
                              <TableCell>{b.myStrength.toFixed(1)}</TableCell>
                              <TableCell>{b.enemyStrength.toFixed(1)}</TableCell>
                              <TableCell
                                sx={{
                                  color: b.ratio >= b.threshold ? tokens.ui.success : tokens.ui.danger,
                                  fontWeight: 600,
                                }}
                              >
                                {b.ratio === Infinity ? "∞" : b.ratio.toFixed(2)}
                              </TableCell>
                              <TableCell>{b.threshold.toFixed(2)}</TableCell>
                              <TableCell>
                                <Chip
                                  label={b.decision}
                                  size="small"
                                  sx={{
                                    bgcolor:
                                      b.decision === "attack"
                                        ? tokens.ui.danger + "33"
                                        : b.decision === "fight"
                                        ? tokens.ui.warning + "33"
                                        : tokens.ui.info + "33",
                                    fontSize: 11,
                                  }}
                                />
                              </TableCell>
                              <TableCell>{b.fowCardCount}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Paper>
              )}

              {/* ── Tab 3: Moves Comparison ────────────────────────── */}
              {resultTab === 3 && (
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2, flexWrap: "wrap" }}>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Round</InputLabel>
                      <Select
                        value={selectedMovesRound}
                        label="Round"
                        onChange={(e) => setSelectedMovesRound(e.target.value as number | "all")}
                      >
                        <MenuItem value="all">All Rounds</MenuItem>
                        {Array.from({ length: maxRound }, (_, i) => i + 1).map((r) => (
                          <MenuItem key={r} value={r}>Round {r}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Typography variant="caption" sx={{ color: tokens.ui.textMuted }}>
                      {movesComparison.length} decisions
                    </Typography>
                  </Box>
                  <Paper sx={{ p: 2 }}>
                    <TableContainer sx={{ maxHeight: 600 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Round</TableCell>
                            <TableCell>Player</TableCell>
                            <TableCell>Phase</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Chosen Move</TableCell>
                            <TableCell>Score</TableCell>
                            <TableCell>Alt 1</TableCell>
                            <TableCell>Score</TableCell>
                            <TableCell>Alt 2</TableCell>
                            <TableCell>Score</TableCell>
                            <TableCell>Alt 3</TableCell>
                            <TableCell>Score</TableCell>
                            <TableCell>Gold</TableCell>
                            <TableCell>Routes</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {movesComparison.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={13} sx={{ textAlign: "center", color: tokens.ui.textMuted, py: 3 }}>
                                No decisions match the current filters
                              </TableCell>
                            </TableRow>
                          ) : (
                            movesComparison.map((row, i) => (
                              <TableRow
                                key={i}
                                sx={{ bgcolor: PLAYER_COLORS[parseInt(row.playerID)] + "11" }}
                              >
                                <TableCell>{row.round}</TableCell>
                                <TableCell>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                    <Box
                                      sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        bgcolor: PLAYER_COLORS[parseInt(row.playerID)] ?? "#888",
                                      }}
                                    />
                                    P{row.playerID}
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ fontSize: 11 }}>{row.phase}</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>{row.chosenMove}</TableCell>
                                <TableCell>
                                  {row.chosenScore !== undefined ? row.chosenScore.toFixed(3) : "—"}
                                </TableCell>
                                {[0, 1, 2].map((altIdx) => {
                                  const alt = row.alternatives[altIdx];
                                  return [
                                    <TableCell key={`alt-${altIdx}`} sx={{ fontSize: 11 }}>
                                      {alt ? alt.move : "—"}
                                    </TableCell>,
                                    <TableCell key={`alt-score-${altIdx}`} sx={{ fontSize: 11, color: tokens.ui.textMuted }}>
                                      {alt ? alt.score.toFixed(3) : "—"}
                                    </TableCell>,
                                  ];
                                })}
                                <TableCell>{row.gold}</TableCell>
                                <TableCell>{row.routes}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Box>
              )}

              {/* ── Tab 2: Round Drill-Down ────────────────────────── */}
              {resultTab === 2 && (
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Round</InputLabel>
                      <Select
                        value={selectedRound}
                        label="Round"
                        onChange={(e) => setSelectedRound(e.target.value as number)}
                      >
                        {Array.from({ length: maxRound }, (_, i) => i + 1).map((r) => (
                          <MenuItem key={r} value={r}>Round {r}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Typography variant="caption" sx={{ color: tokens.ui.textMuted }}>
                      {roundDecisions.length} decisions
                    </Typography>
                  </Box>
                  <Paper sx={{ p: 2 }}>
                    <TableContainer sx={{ maxHeight: 600 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Player</TableCell>
                            <TableCell>Phase</TableCell>
                            <TableCell>Chosen Move</TableCell>
                            <TableCell>Score</TableCell>
                            <TableCell>Alternatives</TableCell>
                            <TableCell>Gold</TableCell>
                            <TableCell>VP</TableCell>
                            <TableCell>Troops</TableCell>
                            <TableCell>Reason</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {roundDecisions.map((d, i) => (
                            <TableRow
                              key={i}
                              sx={{
                                bgcolor: PLAYER_COLORS[parseInt(d.playerID)] + "11",
                              }}
                            >
                              <TableCell>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <Box
                                    sx={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: "50%",
                                      bgcolor: PLAYER_COLORS[parseInt(d.playerID)],
                                    }}
                                  />
                                  P{d.playerID}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ fontSize: 11 }}>{d.stage}</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{d.chosenMove}</TableCell>
                              <TableCell>
                                {d.chosenScore !== undefined ? d.chosenScore.toFixed(3) : "—"}
                              </TableCell>
                              <TableCell sx={{ fontSize: 11 }}>
                                {d.topScoredMoves
                                  .filter((m) => m.move !== d.chosenMove)
                                  .slice(0, 3)
                                  .map((m) => `${m.move}(${m.score.toFixed(2)})`)
                                  .join(", ") || "—"}
                              </TableCell>
                              <TableCell>{d.snapshot.resources.gold}</TableCell>
                              <TableCell>{d.snapshot.resources.victoryPoints}</TableCell>
                              <TableCell>
                                {d.snapshot.resources.regiments}r {d.snapshot.resources.levies}l {d.snapshot.resources.skyships}s
                              </TableCell>
                              <TableCell>
                                <Chip label={d.reason} size="small" sx={{ fontSize: 10 }} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

// ── Data transformation helpers ──────────────────────────────────────────────

function getMoveDistribution(
  record: GameRecord | null,
  playerFilter: string
): { id: number; value: number; label: string }[] {
  if (!record) return [];
  const decisions =
    playerFilter === "all"
      ? record.decisions
      : record.decisions.filter((d) => d.playerID === playerFilter);

  const dist: Record<string, number> = {};
  for (const d of decisions) {
    // Skip mechanical moves that add noise
    if (["confirmAction", "drawFoWCards", "discardFoWCard"].includes(d.chosenMove)) continue;
    dist[d.chosenMove] = (dist[d.chosenMove] ?? 0) + 1;
  }

  return Object.entries(dist)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], id) => ({ id, value, label }));
}

function getVPProgression(record: GameRecord | null) {
  if (!record || record.roundSummaries.length === 0) {
    // Fallback: derive from decisions
    if (!record) return { rounds: [], series: [] };

    const playerRounds: Record<string, Record<number, number>> = {};
    for (const d of record.decisions) {
      if (!playerRounds[d.playerID]) playerRounds[d.playerID] = {};
      playerRounds[d.playerID][d.round] = d.snapshot.vpStanding.mine;
    }

    const allRounds = [...new Set(record.decisions.map((d) => d.round))].sort((a, b) => a - b);
    if (allRounds.length === 0) return { rounds: [], series: [] };

    const series = Object.keys(playerRounds).map((pid) => ({
      label: `P${pid}`,
      data: allRounds.map((r) => playerRounds[pid][r] ?? 0),
    }));

    return { rounds: allRounds, series };
  }

  const rounds = record.roundSummaries.map((rs) => rs.round);
  const playerIDs = record.roundSummaries[0]?.standings.map((s) => s.playerID) ?? [];

  const series = playerIDs.map((pid) => ({
    label: `P${pid}`,
    data: record.roundSummaries.map(
      (rs) => rs.standings.find((s) => s.playerID === pid)?.vp ?? 0
    ),
  }));

  return { rounds, series };
}

function getResourceCurves(record: GameRecord | null, playerFilter: string) {
  if (!record) return { rounds: [], series: [] };

  const pid = playerFilter === "all" ? "0" : playerFilter;
  const decisions = record.decisions.filter((d) => d.playerID === pid);

  // Group by round, take last snapshot per round
  const roundData: Record<number, typeof decisions[0]["snapshot"]> = {};
  for (const d of decisions) {
    roundData[d.round] = d.snapshot;
  }

  const rounds = Object.keys(roundData).map(Number).sort((a, b) => a - b);
  if (rounds.length === 0) return { rounds: [], series: [] };

  return {
    rounds,
    series: [
      { label: "Gold", data: rounds.map((r) => roundData[r].resources.gold) },
      { label: "Regiments", data: rounds.map((r) => roundData[r].resources.regiments + roundData[r].resources.levies) },
      { label: "Skyships", data: rounds.map((r) => roundData[r].resources.skyships) },
      { label: "Territory", data: rounds.map((r) => roundData[r].territory.outposts + roundData[r].territory.colonies) },
    ],
  };
}

function getBattleLog(record: GameRecord | null) {
  if (!record) return [];
  return record.decisions
    .filter((d) => d.battleContext != null)
    .map((d) => ({
      round: d.round,
      playerID: d.playerID,
      ...d.battleContext!,
    }));
}

function getRoundDecisions(
  record: GameRecord | null,
  round: number,
  playerFilter: string
) {
  if (!record) return [];
  return record.decisions.filter(
    (d) =>
      d.round === round &&
      (playerFilter === "all" || d.playerID === playerFilter) &&
      !["confirmAction", "drawFoWCards"].includes(d.chosenMove)
  );
}

// ── Moves tab types and helper ────────────────────────────────────────────────

interface MoveComparisonRow {
  round: number;
  playerID: string;
  phase: string;
  chosenMove: string;
  chosenScore: number | undefined;
  alternatives: { move: string; score: number }[];
  gold: number;
  routes: number;
}

const NOISE_MOVES = new Set(["confirmAction", "drawFoWCards", "discardFoWCard"]);

function getMovesComparison(
  record: GameRecord | null,
  round: number | "all",
  playerFilter: string
): MoveComparisonRow[] {
  if (!record) return [];

  return record.decisions
    .filter((d) => !NOISE_MOVES.has(d.chosenMove))
    .filter((d) => round === "all" || d.round === round)
    .filter((d) => playerFilter === "all" || d.playerID === playerFilter)
    .map((d) => {
      const alts = d.topScoredMoves
        .filter((m) => m.move !== d.chosenMove)
        .slice(0, 3)
        .map((m) => ({ move: m.move, score: m.score }));

      return {
        round: d.round,
        playerID: d.playerID,
        phase: d.stage,
        chosenMove: d.chosenMove,
        chosenScore: d.chosenScore,
        alternatives: alts,
        gold: d.snapshot.resources.gold,
        routes: d.snapshot.economy.activeRoutes,
      };
    });
}
