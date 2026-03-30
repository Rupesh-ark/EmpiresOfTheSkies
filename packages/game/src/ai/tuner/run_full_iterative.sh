set -e

GAME_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$GAME_DIR"

PREV_A="${1:?ERROR: Provide A dir}"
PREV_B="${2:?ERROR: Provide B dir}"
PREV_D="${3:?ERROR: Provide D dir}"
PREV_E="${4:?ERROR: Provide E dir}"
PREV_F="${5:?ERROR: Provide F dir}"
PREV_G="${6:?ERROR: Provide G dir}"
PREV_H="${7:?ERROR: Provide H dir}"
PREV_I="${8:?ERROR: Provide I dir}"

for d in "$PREV_A" "$PREV_B" "$PREV_D" "$PREV_E" "$PREV_F" "$PREV_G" "$PREV_H" "$PREV_I"; do
    if [ ! -f "$d/best_weights.json" ]; then
        echo "ERROR: $d/best_weights.json not found"
        exit 1
    fi
done

echo "============================================================"
echo "  Full Iterative Re-Tune (A→B→D→E→F→G→H→I)"
echo "  Time: $(date)"
echo "============================================================"
echo ""

# Helper: get best_weights path
w() { echo "$1/best_weights.json"; }

# --- Bucket A: seed from prev A, freeze B ---
echo "  [A] seed=$(w "$PREV_A")"
.venv/bin/python scripts/cma_tuner.py --bucket A --games 20 --max-gens 40 --workers 12 \
    --seed "$(w "$PREV_A")" \
    --freeze-b "$(w "$PREV_B")"
NEW_A=$(ls -td "$GAME_DIR"/tuner_results/A_2* 2>/dev/null | head -1)
echo "  -> A done: $NEW_A"
echo ""

# --- Bucket B: seed from prev B, freeze new A ---
echo "  [B] seed=$(w "$PREV_B")"
.venv/bin/python scripts/cma_tuner.py --bucket B --games 20 --max-gens 40 --workers 12 \
    --seed "$(w "$PREV_B")" \
    --freeze-a "$(w "$NEW_A")"
NEW_B=$(ls -td "$GAME_DIR"/tuner_results/B_2* 2>/dev/null | head -1)
echo "  -> B done: $NEW_B"
echo ""

# --- Bucket D: seed from prev D, freeze new A + new B ---
echo "  [D] seed=$(w "$PREV_D")"
.venv/bin/python scripts/cma_tuner.py --bucket D --games 20 --max-gens 40 --workers 12 \
    --seed "$(w "$PREV_D")" \
    --freeze-a "$(w "$NEW_A")" \
    --freeze-b "$(w "$NEW_B")"
NEW_D=$(ls -td "$GAME_DIR"/tuner_results/D_2* 2>/dev/null | head -1)
echo "  -> D done: $NEW_D"
echo ""

# --- Buckets E/F/G/H/I: seed from prev, freeze new A + B + D ---
for BUCKET in E F G H I; do
    eval "PREV=\$PREV_$BUCKET"
    echo "  [$BUCKET] seed=$(w "$PREV")"
    .venv/bin/python scripts/cma_tuner.py --bucket "$BUCKET" --games 20 --max-gens 40 --workers 12 \
        --seed "$(w "$PREV")" \
        --freeze-a "$(w "$NEW_A")" \
        --freeze-b "$(w "$NEW_B")" \
        --freeze-d "$(w "$NEW_D")"
    eval "NEW_$BUCKET=\$(ls -td \"$GAME_DIR\"/tuner_results/${BUCKET}_2* 2>/dev/null | head -1)"
    eval "echo \"  -> $BUCKET done: \$NEW_$BUCKET\""
    echo ""
done

echo "============================================================"
echo "  FULL ITERATIVE RE-TUNE COMPLETE — $(date)"
echo ""
echo "  Final results:"
echo "    A: $NEW_A"
echo "    B: $NEW_B"
echo "    D: $NEW_D"
echo "    E: $NEW_E"
echo "    F: $NEW_F"
echo "    G: $NEW_G"
echo "    H: $NEW_H"
echo "    I: $NEW_I"
echo "============================================================"
