set -e

GAME_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$GAME_DIR"

A_DIR="${1:?ERROR: Provide Bucket A results dir as arg 1}"
B_DIR="${2:?ERROR: Provide Bucket B results dir as arg 2}"
D_DIR="${3:?ERROR: Provide Bucket D results dir as arg 3}"

for d in "$A_DIR" "$B_DIR" "$D_DIR"; do
    if [ ! -f "$d/best_weights.json" ]; then
        echo "ERROR: $d/best_weights.json not found"
        exit 1
    fi
done

FREEZE_A="$A_DIR/best_weights.json"
FREEZE_B="$B_DIR/best_weights.json"
FREEZE_D="$D_DIR/best_weights.json"

echo "============================================================"
echo "  EFGHI Tuning Chain"
echo "  Frozen A: $FREEZE_A"
echo "  Frozen B: $FREEZE_B"
echo "  Frozen D: $FREEZE_D"
echo "  Time: $(date)"
echo "============================================================"
echo ""

for BUCKET in E F G H I; do
    echo "============================================================"
    echo "  BUCKET $BUCKET"
    echo "============================================================"
    .venv/bin/python scripts/cma_tuner.py --bucket "$BUCKET" --games 20 --max-gens 80 --workers 12 \
        --freeze-a "$FREEZE_A" \
        --freeze-b "$FREEZE_B" \
        --freeze-d "$FREEZE_D"
    RESULT_DIR=$(ls -td tuner_results/${BUCKET}_2* 2>/dev/null | head -1)
    if [ ! -f "$RESULT_DIR/best_weights.json" ]; then
        echo "ERROR: Bucket $BUCKET produced no results"
        exit 1
    fi
    echo "Bucket $BUCKET complete: $RESULT_DIR"
    echo ""
done

echo "============================================================"
echo "  EFGHI TUNING COMPLETE — $(date)"
echo ""
echo "  Results:"
for BUCKET in E F G H I; do
    DIR=$(ls -td tuner_results/${BUCKET}_2* 2>/dev/null | head -1)
    echo "    $BUCKET: $DIR"
done
echo "============================================================"
