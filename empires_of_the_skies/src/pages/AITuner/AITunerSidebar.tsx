import { useState } from "react";
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
  Alert,
  IconButton,
  Tooltip,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import HomeIcon from "@mui/icons-material/Home";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useNavigate } from "react-router-dom";
import { tokens } from "../../theme/tokens";
import type { GameRecord } from "@eots/game";
import { getV2Config, setV2Config, resetV2Config } from "@eots/game";
import { PLAYER_COLORS } from "./aiTunerHelpers";

const DEFAULT_MCTS_CONFIG = {
  simulationsPerMove: 20,
  rolloutDepth: 1,
  explorationConstant: 1.4,
};

type MCTSConfigKey = keyof typeof DEFAULT_MCTS_CONFIG;

interface AITunerSidebarProps {
  gameRecord: GameRecord | null;
  error: string | null;
  selectedPlayer: string;
  onPlayerChange: (player: string) => void;
  onLoadRecord: (file: File) => void;
  onExportRecord: () => void;
}

export default function AITunerSidebar({
  gameRecord,
  error,
  selectedPlayer,
  onPlayerChange,
  onLoadRecord,
  onExportRecord,
}: AITunerSidebarProps) {
  const navigate = useNavigate();

  const [mctsConfig, setMctsConfig] = useState({ ...DEFAULT_MCTS_CONFIG });
  const [v2Config, setV2ConfigState] = useState(() => getV2Config());

  const handleMctsChange = (key: MCTSConfigKey, value: number) => {
    setMctsConfig((prev) => ({ ...prev, [key]: value }));
  };

  const resetMctsConfig = () => {
    setMctsConfig({ ...DEFAULT_MCTS_CONFIG });
  };

  const handleV2Change = (path: string, value: number) => {
    const parts = path.split(".");
    const override: Record<string, any> = {};
    if (parts.length === 1) {
      override[parts[0]] = value;
    } else {
      override[parts[0]] = { [parts[1]]: value };
    }
    setV2Config(override);
    setV2ConfigState(getV2Config());
  };

  const resetV2 = () => {
    resetV2Config();
    setV2ConfigState(getV2Config());
  };

  const exportV2Config = () => {
    const blob = new Blob([JSON.stringify(getV2Config(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "v2_config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importV2Config = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string);
        setV2Config(config);
        setV2ConfigState(getV2Config());
      } catch {
        // silently ignore invalid config
      }
    };
    reader.readAsText(file);
  };

  return (
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

      <Button
        variant="contained"
        component="label"
        startIcon={<UploadFileIcon />}
        fullWidth
        size="large"
        sx={{
          bgcolor: tokens.ui.gold,
          color: "#fff",
          "&:hover": { bgcolor: "#9A7209" },
          textTransform: "none",
          fontSize: 14,
          py: 1.5,
        }}
      >
        Import Game Record
        <input
          type="file"
          accept=".json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onLoadRecord(file);
            e.target.value = "";
          }}
        />
      </Button>

      <Paper sx={{ p: 1.5, bgcolor: "background.default", fontSize: 11 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, display: "block", mb: 0.5 }}>
          Generate a game record via CLI:
        </Typography>
        <Box component="code" sx={{ display: "block", fontSize: 10, color: tokens.ui.textMuted, whiteSpace: "pre-wrap" }}>
          cd packages/game{"\n"}npx vitest run src/ai/runGame.test.ts
        </Box>
        <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: tokens.ui.textMuted }}>
          Then import from src/ai/analytics/
        </Typography>
      </Paper>

      {error && <Alert severity="error" sx={{ fontSize: 12 }}>{error}</Alert>}

      <Divider />

      <FormControl size="small" fullWidth>
        <InputLabel>Player Focus</InputLabel>
        <Select
          value={selectedPlayer}
          label="Player Focus"
          onChange={(e) => onPlayerChange(e.target.value)}
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

      <Typography variant="subtitle2">MCTS Configuration</Typography>
      <Box sx={{ px: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>Simulations per Move</Typography>
        <Typography variant="caption" sx={{ display: "block", color: tokens.ui.textMuted, fontSize: 10, mb: 0.5 }}>
          How many rollouts per candidate move. More = better decisions, slower turns.
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Slider
            size="small"
            value={mctsConfig.simulationsPerMove}
            min={5}
            max={200}
            step={5}
            onChange={(_, v) => handleMctsChange("simulationsPerMove", v as number)}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            type="number"
            value={mctsConfig.simulationsPerMove}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (!isNaN(v) && v >= 1 && v <= 500) handleMctsChange("simulationsPerMove", v);
            }}
            slotProps={{ htmlInput: { step: 5, min: 1, max: 500 } }}
            sx={{ width: 72, "& input": { py: 0.5, px: 0.5, fontSize: 12, textAlign: "right" } }}
          />
        </Box>
      </Box>
      <Box sx={{ px: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>Rollout Depth</Typography>
        <Typography variant="caption" sx={{ display: "block", color: tokens.ui.textMuted, fontSize: 10, mb: 0.5 }}>
          How many future rounds each simulation plays out. Higher = more foresight, much slower.
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Slider
            size="small"
            value={mctsConfig.rolloutDepth}
            min={1}
            max={6}
            step={1}
            onChange={(_, v) => handleMctsChange("rolloutDepth", v as number)}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            type="number"
            value={mctsConfig.rolloutDepth}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (!isNaN(v) && v >= 1 && v <= 10) handleMctsChange("rolloutDepth", v);
            }}
            slotProps={{ htmlInput: { step: 1, min: 1, max: 10 } }}
            sx={{ width: 72, "& input": { py: 0.5, px: 0.5, fontSize: 12, textAlign: "right" } }}
          />
        </Box>
      </Box>
      <Box sx={{ px: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>Exploration Constant (C)</Typography>
        <Typography variant="caption" sx={{ display: "block", color: tokens.ui.textMuted, fontSize: 10, mb: 0.5 }}>
          UCB1 exploration vs exploitation. Higher = tries more moves, lower = exploits best known.
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Slider
            size="small"
            value={mctsConfig.explorationConstant}
            min={0.1}
            max={3.0}
            step={0.1}
            onChange={(_, v) => handleMctsChange("explorationConstant", v as number)}
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            type="number"
            value={mctsConfig.explorationConstant}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v) && v >= 0.1 && v <= 5) handleMctsChange("explorationConstant", v);
            }}
            slotProps={{ htmlInput: { step: 0.1, min: 0.1, max: 5 } }}
            sx={{ width: 72, "& input": { py: 0.5, px: 0.5, fontSize: 12, textAlign: "right" } }}
          />
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button size="small" startIcon={<RestartAltIcon />} onClick={resetMctsConfig}>
          Reset
        </Button>
        <Button
          size="small"
          startIcon={<DownloadIcon />}
          onClick={onExportRecord}
          disabled={!gameRecord}
        >
          Export
        </Button>
      </Box>

      <Divider />

      <Typography variant="subtitle2">V2 Evaluator Config</Typography>

      <Accordion defaultExpanded disableGutters elevation={0} sx={{ border: `1px solid ${tokens.ui.borderMedium}`, "&:before": { display: "none" } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />} sx={{ minHeight: 32, "& .MuiAccordionSummary-content": { my: 0.5 } }}>
          <Typography variant="subtitle2" sx={{ fontSize: 11 }}>Global</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 1, pb: 1 }}>
          <Box sx={{ px: 1, mb: 0.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 11 }}>Quality Threshold</Typography>
              <Typography variant="caption" sx={{ color: tokens.ui.textMuted, fontSize: 10 }}>{v2Config.qualityThreshold.toFixed(2)}</Typography>
            </Box>
            <Slider size="small" value={v2Config.qualityThreshold} min={0.0} max={0.50} step={0.01} onChange={(_, v) => handleV2Change("qualityThreshold", v as number)} sx={{ py: 0.5 }} />
          </Box>
          <Box sx={{ px: 1, mb: 0.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 11 }}>Penalty Scale</Typography>
              <Typography variant="caption" sx={{ color: tokens.ui.textMuted, fontSize: 10 }}>{v2Config.penaltyScale.toFixed(2)}</Typography>
            </Box>
            <Slider size="small" value={v2Config.penaltyScale} min={0.0} max={1.0} step={0.05} onChange={(_, v) => handleV2Change("penaltyScale", v as number)} sx={{ py: 0.5 }} />
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters elevation={0} sx={{ border: `1px solid ${tokens.ui.borderMedium}`, "&:before": { display: "none" } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />} sx={{ minHeight: 32, "& .MuiAccordionSummary-content": { my: 0.5 } }}>
          <Typography variant="subtitle2" sx={{ fontSize: 11 }}>Base Qualities</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 1, pb: 1 }}>
          {(
            [
              ["deployFleet", "Deploy Fleet"],
              ["foundBuildings", "Found Buildings"],
              ["foundFactory", "Found Factory"],
              ["purchaseSkyships", "Purchase Skyships"],
              ["recruitRegiments", "Recruit Regiments"],
              ["recruitCounsellors", "Recruit Counsellors"],
              ["trainTroops", "Train Troops"],
              ["buildSkyships", "Build Skyships"],
              ["moveFleet", "Move Fleet"],
              ["pass", "Pass"],
              ["influencePrelates", "Influence Prelates"],
              ["punishDissenters", "Punish Dissenters"],
              ["confirmAction", "Confirm Action"],
            ] as [keyof typeof v2Config.baseQuality, string][]
          ).map(([key, label]) => (
            <Box key={key} sx={{ px: 1, mb: 0.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 11 }}>{label}</Typography>
                <Typography variant="caption" sx={{ color: tokens.ui.textMuted, fontSize: 10 }}>{(v2Config.baseQuality[key] as number).toFixed(2)}</Typography>
              </Box>
              <Slider size="small" value={v2Config.baseQuality[key] as number} min={0.0} max={1.0} step={0.05} onChange={(_, v) => handleV2Change(`baseQuality.${key}`, v as number)} sx={{ py: 0.5 }} />
            </Box>
          ))}
        </AccordionDetails>
      </Accordion>

      <Accordion disableGutters elevation={0} sx={{ border: `1px solid ${tokens.ui.borderMedium}`, "&:before": { display: "none" } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />} sx={{ minHeight: 32, "& .MuiAccordionSummary-content": { my: 0.5 } }}>
          <Typography variant="subtitle2" sx={{ fontSize: 11 }}>Key Bonuses</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 1, pb: 1 }}>
          {(
            [
              ["tradeRoutePotential", "Trade Route Potential"],
              ["noRoutesUrgency", "No Routes Urgency"],
              ["unengagedFactoryPenalty", "Unengaged Factory Penalty"],
              ["engagedFactory", "Engaged Factory"],
              ["lowSkyships", "Low Skyships"],
              ["unclaimedLand", "Unclaimed Land"],
              ["brokePassBonus", "Broke Pass Bonus"],
              ["noTerritoryFortPenalty", "No Territory Fort Penalty"],
            ] as [keyof typeof v2Config.bonuses, string][]
          ).map(([key, label]) => (
            <Box key={key} sx={{ px: 1, mb: 0.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 11 }}>{label}</Typography>
                <Typography variant="caption" sx={{ color: tokens.ui.textMuted, fontSize: 10 }}>{(v2Config.bonuses[key] as number).toFixed(2)}</Typography>
              </Box>
              <Slider size="small" value={v2Config.bonuses[key] as number} min={0.0} max={0.5} step={0.01} onChange={(_, v) => handleV2Change(`bonuses.${key}`, v as number)} sx={{ py: 0.5 }} />
            </Box>
          ))}
        </AccordionDetails>
      </Accordion>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button size="small" startIcon={<RestartAltIcon />} onClick={resetV2}>
          Reset V2
        </Button>
        <Button size="small" startIcon={<DownloadIcon />} onClick={exportV2Config}>
          Export V2
        </Button>
        <Button size="small" startIcon={<UploadFileIcon />} component="label">
          Import V2
          <input
            type="file"
            accept=".json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importV2Config(file);
              e.target.value = "";
            }}
          />
        </Button>
      </Box>

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
  );
}
