set -e

GAME_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$GAME_DIR"

ROUNDS="${1:-2}"
PREV_A="${2:?ERROR: Provide round 1 Bucket A dir as arg 2}"
PREV_B="${3:?ERROR: Provide round 1 Bucket B dir as arg 3}"
PREV_D="${4:?ERROR: Provide round 1 Bucket D dir as arg 4}"

for d in "$PREV_A" "$PREV_B" "$PREV_D"; do
    if [ ! -f "$d/best_weights.json" ]; then
        echo "ERROR: $d/best_weights.json not found"
        exit 1
    fi
done

echo "============================================================"
echo "  Iterative CMA-ES Tuning"
echo "  Rounds: $ROUNDS"
echo "  Seeding from:"
echo "    A: $PREV_A"
echo "    B: $PREV_B"
echo "    D: $PREV_D"
echo "  Time: $(date)"
echo "============================================================"
echo ""

for ROUND in $(seq 1 "$ROUNDS"); do
    echo ""
    echo "############################################################"
    echo "  ROUND $ROUND / $ROUNDS — $(date)"
    echo "############################################################"
    echo ""

    # Bucket A: re-tune seeded from previous best, freeze B
    echo "  [A] seed=$PREV_A  freeze-b=$PREV_B"
    .venv/bin/python scripts/cma_tuner.py --bucket A --games 20 --max-gens 40 --workers 12 \
        --seed "$PREV_A/best_weights.json" \
        --freeze-b "$PREV_B/best_weights.json"
    NEW_A=$(ls -td tuner_results/A_2* 2>/dev/null | head -1)
    if [ ! -f "$NEW_A/best_weights.json" ]; then echo "ERROR: A failed"; exit 1; fi
    echo "  → A done: $NEW_A"
    echo ""

    # Bucket B: re-tune seeded from previous best, freeze new A
    echo "  [B] seed=$PREV_B  freeze-a=$NEW_A"
    .venv/bin/python scripts/cma_tuner.py --bucket B --games 20 --max-gens 40 --workers 12 \
        --seed "$PREV_B/best_weights.json" \
        --freeze-a "$NEW_A/best_weights.json"
    NEW_B=$(ls -td tuner_results/B_2* 2>/dev/null | head -1)
    if [ ! -f "$NEW_B/best_weights.json" ]; then echo "ERROR: B failed"; exit 1; fi
    echo "  → B done: $NEW_B"
    echo ""

    # Bucket D: re-tune seeded from previous best, freeze new A + new B
    echo "  [D] seed=$PREV_D  freeze-a=$NEW_A  freeze-b=$NEW_B"
    .venv/bin/python scripts/cma_tuner.py --bucket D --games 20 --max-gens 40 --workers 12 \
        --seed "$PREV_D/best_weights.json" \
        --freeze-a "$NEW_A/best_weights.json" \
        --freeze-b "$NEW_B/best_weights.json"
    NEW_D=$(ls -td tuner_results/D_2* 2>/dev/null | head -1)
    if [ ! -f "$NEW_D/best_weights.json" ]; then echo "ERROR: D failed"; exit 1; fi
    echo "  → D done: $NEW_D"

    PREV_A="$NEW_A"
    PREV_B="$NEW_B"
    PREV_D="$NEW_D"

    echo ""
    echo "  Round $ROUND complete: A=$NEW_A  B=$NEW_B  D=$NEW_D"
done

echo ""
echo "============================================================"
echo "  ITERATIVE TUNING COMPLETE — $(date)"
echo "  Final: A=$PREV_A  B=$PREV_B  D=$PREV_D"
echo "============================================================"
