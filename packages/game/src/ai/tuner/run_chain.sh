#!/bin/bash
set -e

cd "$(dirname "$0")/../../.."
GAMES=20
GENS=80
WORKERS=12

echo "=== Bucket D (guardrails) ==="
python src/ai/tuner/cma_tuner.py --bucket D --games $GAMES --max-gens $GENS --workers $WORKERS

D_BEST=$(ls -td tuner_results/D_* | head -1)/best_weights.json
echo "D best: $D_BEST"

echo "=== Bucket E (territorial) ==="
python src/ai/tuner/cma_tuner.py --bucket E --games $GAMES --max-gens $GENS --workers $WORKERS --freeze-d "$D_BEST"

echo "=== Bucket F (economic) ==="
python src/ai/tuner/cma_tuner.py --bucket F --games $GAMES --max-gens $GENS --workers $WORKERS --freeze-d "$D_BEST"

echo "=== Bucket G (military) ==="
python src/ai/tuner/cma_tuner.py --bucket G --games $GAMES --max-gens $GENS --workers $WORKERS --freeze-d "$D_BEST"

echo "=== Bucket H (resolution) ==="
python src/ai/tuner/cma_tuner.py --bucket H --games $GAMES --max-gens $GENS --workers $WORKERS --freeze-d "$D_BEST"

echo "=== Bucket I (free actions) ==="
python src/ai/tuner/cma_tuner.py --bucket I --games $GAMES --max-gens $GENS --workers $WORKERS --freeze-d "$D_BEST"

echo "=== ALL DONE ==="
echo "Results in tuner_results/"
