set -e

GAME_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$GAME_DIR"

echo "Starting full tuning chain from: $GAME_DIR"
echo "Time: $(date)"
echo ""

# Bucket A
echo "============================================================"
echo "  BUCKET A: StateEvaluator weights (20 params)"
echo "============================================================"
.venv/bin/python scripts/cma_tuner.py --bucket A --games 20 --max-gens 80 --workers 12
A_DIR=$(ls -td tuner_results/A_2* 2>/dev/null | head -1)
if [ -z "$A_DIR" ]; then
    echo "ERROR: Bucket A produced no results"
    exit 1
fi
echo "Bucket A complete: $A_DIR"
echo ""

# Bucket B
echo "============================================================"
echo "  BUCKET B: Move preferences (24 params)"
echo "  Frozen A: $A_DIR/best_weights.json"
echo "============================================================"
.venv/bin/python scripts/cma_tuner.py --bucket B --games 20 --max-gens 80 --workers 12 \
    --freeze-a "$A_DIR/best_weights.json"
B_DIR=$(ls -td tuner_results/B_2* 2>/dev/null | head -1)
if [ -z "$B_DIR" ]; then
    echo "ERROR: Bucket B produced no results"
    exit 1
fi
echo "Bucket B complete: $B_DIR"
echo ""

# Bucket D
echo "============================================================"
echo "  BUCKET D: Guardrails (12 params)"
echo "  Frozen A: $A_DIR/best_weights.json"
echo "  Frozen B: $B_DIR/best_weights.json"
echo "============================================================"
.venv/bin/python scripts/cma_tuner.py --bucket D --games 20 --max-gens 80 --workers 12 \
    --freeze-a "$A_DIR/best_weights.json" \
    --freeze-b "$B_DIR/best_weights.json"
D_DIR=$(ls -td tuner_results/D_2* 2>/dev/null | head -1)
echo "Bucket D complete: $D_DIR"
echo ""

# Summary
echo "============================================================"
echo "  ALL TUNING COMPLETE"
echo "  Time: $(date)"
echo ""
echo "  Results:"
echo "    A: $A_DIR"
echo "    B: $B_DIR"
echo "    D: $D_DIR"
echo ""
echo "  Best weights:"
echo "    A: $(cat "$A_DIR/best_weights.json" | head -1)"
echo "    B: $(cat "$B_DIR/best_weights.json" | head -1)"
echo "    D: $(cat "$D_DIR/best_weights.json" | head -1)"
echo "============================================================"
