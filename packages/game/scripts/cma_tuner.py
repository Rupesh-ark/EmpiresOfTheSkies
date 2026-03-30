#!/usr/bin/env python3
"""
CMA-ES weight tuner for Empires of the Skies bot AI.

Uses pycma to optimize evaluation weights across three buckets:
  Bucket A: StateEvaluator weights (MCTS leaf-node scoring, 20 params)
  Bucket B: V2_CONFIG.baseQuality (move preferences, 24 params)
  Bucket D: V2_CONFIG guardrails (penalties & thresholds, 12 params)

Usage:
  cd packages/game
  source .venv/bin/activate  # or use .venv/bin/python directly

  # Dry run — verify pipeline works (~2 min)
  python scripts/cma_tuner.py --bucket A --dry-run

  # Quick test — see if improvement happens (~15 min)
  python scripts/cma_tuner.py --bucket A --quick-test

  # Full tuning run
  python scripts/cma_tuner.py --bucket A --games 20 --max-gens 80

  # With frozen prior results
  python scripts/cma_tuner.py --bucket B --games 20 --max-gens 80 \\
    --freeze-a tuner_results/A_latest/best_weights.json

  python scripts/cma_tuner.py --bucket D --games 20 --max-gens 80 \\
    --freeze-a tuner_results/A_latest/best_weights.json \\
    --freeze-b tuner_results/B_latest/best_weights.json
"""

import os
import sys
import json
import math
import time
import shutil
import argparse
import tempfile
import subprocess
from datetime import datetime, timedelta
# ProcessPoolExecutor removed — using subprocess.Popen directly for reliability

try:
    import cma
except ImportError:
    print("ERROR: pycma is not installed. Run: pip install cma")
    sys.exit(1)

# ── Parameter definitions ──────────────────────────────────────────────────────

# Each entry: param_name -> (default, lower_bound, upper_bound)

BUCKET_A = {
    "vp":                 (1.0,  0.5,   2.0),
    "colony":             (0.8,  0.1,   3.0),
    "outpost":            (0.4,  0.05,  2.0),
    "route":              (0.5,  0.05,  2.0),
    "engagedFactory":     (0.3,  0.05,  2.0),
    "cathedral":          (0.3,  0.01,  2.0),
    "palace":             (0.2,  0.01,  1.5),
    "shipyard":           (0.2,  0.01,  1.5),
    "fort":               (0.1,  0.01,  1.0),
    "skyship":            (0.05, 0.001, 0.5),
    "regiment":           (0.02, 0.001, 0.3),
    "eliteRegiment":      (0.03, 0.001, 0.3),
    "levy":               (0.01, 0.001, 0.2),
    "gold":               (0.02, 0.001, 0.3),
    "counsellor":         (0.1,  0.01,  0.5),
    "militaryStrength":   (0.01, 0.001, 0.2),
    "heresyVP":           (0.5,  0.05,  2.0),
    "debtPenalty":        (0.01, 0.001, 3.0),
    "dissenterPenalty":   (0.15, 0.01,  1.0),
    "unconnectedPenalty": (0.3,  0.01,  2.0),
}

BUCKET_B = {
    "deployFleet":          (0.50, 0.05, 0.80),
    "purchaseSkyships":     (0.50, 0.05, 0.80),
    "recruitCounsellors":   (0.50, 0.05, 0.80),
    "recruitRegiments":     (0.40, 0.05, 0.80),
    "foundBuildings":       (0.50, 0.05, 0.80),
    "foundFactory":         (0.55, 0.05, 0.80),
    "influencePrelates":    (0.40, 0.05, 0.80),
    "buildSkyships":        (0.40, 0.05, 0.80),
    "moveFleet":            (0.40, 0.05, 0.80),
    "punishDissenters":     (0.30, 0.05, 0.80),
    "alterPlayerOrder":     (0.20, 0.05, 0.80),
    "convertMonarch":       (0.15, 0.05, 0.80),
    "issueHolyDecree":      (0.35, 0.05, 0.80),
    "trainTroops":          (0.40, 0.05, 0.80),
    "conscriptLevies":      (0.30, 0.05, 0.80),
    "garrisonTransfer":     (0.35, 0.05, 0.80),
    "transferBetweenFleets":(0.30, 0.05, 0.80),
    "sendAgitators":        (0.30, 0.05, 0.80),
    "declareSmugglerGood":  (0.35, 0.05, 0.80),
    "checkAndPlaceFort":    (0.50, 0.05, 0.80),
    "transferOutpost":      (0.20, 0.05, 0.80),
    "sellSkyships":         (0.15, 0.05, 0.80),
    "sellBuilding":         (0.15, 0.05, 0.80),
    "discardFoWCard":       (0.50, 0.05, 0.80),
}

BUCKET_D = {
    "penaltyScale":               (0.3,  0.05, 1.0),
    "qualityThreshold":           (0.05, 0.01, 0.20),
    "goldPressure_0":             (0.35, 0.05, 0.60),
    "goldPressure_1":             (0.25, 0.05, 0.50),
    "goldPressure_2":             (0.15, 0.02, 0.40),
    "goldPressure_3":             (0.05, 0.01, 0.25),
    "diminishing_perUnit":        (0.06, 0.01, 0.20),
    "diminishing_hardCapPenalty": (0.3,  0.05, 0.60),
    "round_tooEarlyPenalty":      (0.15, 0.02, 0.40),
    "round_tooLatePenalty":       (0.15, 0.02, 0.40),
    "round_mildPenalty":          (0.08, 0.01, 0.25),
    "round_finalRoundBonus":      (0.05, 0.01, 0.30),
}

# Bucket E: Territorial bonuses (deploy, routes, map decisions)
BUCKET_E = {
    "unclaimedLand":        (0.10, 0.01, 0.40),
    "soleOccupier":         (0.10, 0.01, 0.40),
    "canConquer":           (0.05, 0.01, 0.30),
    "tradeRoutePotential":  (0.10, 0.01, 0.40),
    "noRoutesUrgency":      (0.08, 0.01, 0.30),
    "routeChainComplete":   (0.30, 0.05, 0.60),
    "routeChainExtend":     (0.15, 0.01, 0.40),
    "routeChainAdjacent":   (0.10, 0.01, 0.30),
    "noTroopsPenalty":      (0.05, 0.01, 0.30),
    "ownTerritory":         (0.05, 0.01, 0.30),
    "rivalTerritory":       (0.05, 0.01, 0.30),
    "legendTile":           (0.08, 0.01, 0.30),
    "targetNeedsTroops":    (0.10, 0.01, 0.40),
    "rivalsAtLocation":     (0.10, 0.01, 0.40),
    "givingColonyPenalty":  (0.15, 0.01, 0.40),
    "breakRoutePenalty":    (0.10, 0.01, 0.40),
    "colonyValue":          (0.05, 0.01, 0.30),
    "rivalsPresent":        (0.10, 0.01, 0.40),
}

# Bucket F: Economic bonuses (buildings, trade, prelates)
BUCKET_F = {
    "emptyGarrison":                  (0.10, 0.01, 0.40),
    "engagedFactory":                 (0.15, 0.01, 0.40),
    "unengagedFactoryPenalty":        (0.30, 0.05, 0.60),
    "unengagedFactoryBase":           (0.05, 0.01, 0.30),
    "cathedralVPBonus":               (0.05, 0.01, 0.30),
    "palaceVPBonus":                  (0.05, 0.01, 0.30),
    "shipyardBaseBonus":              (0.03, 0.01, 0.20),
    "noTerritoryFortPenalty":         (0.20, 0.01, 0.50),
    "highGoodPrice":                  (0.10, 0.01, 0.40),
    "decentGoodPrice":                (0.05, 0.01, 0.30),
    "noIncomeExpensiveBuildingPenalty":(0.25, 0.01, 0.50),
    "ownSlotBonus":                   (0.10, 0.01, 0.40),
    "republicSlotBonus":              (0.05, 0.01, 0.30),
    "rivalSlotHighPenalty":           (0.15, 0.01, 0.40),
    "rivalSlotLowPenalty":            (0.05, 0.01, 0.30),
    "brokePassBonus":                 (0.20, 0.01, 0.50),
    "debtPassBonus":                  (0.10, 0.01, 0.40),
}

# Bucket G: Military bonuses (troops, skyships, FoW cards, combat prep)
BUCKET_G = {
    "lowSkyships":             (0.15, 0.01, 0.40),
    "firstCounsellor":         (0.15, 0.01, 0.40),
    "extraCounsellor":         (0.08, 0.01, 0.30),
    "lowTroops":               (0.10, 0.01, 0.40),
    "lowFoWCards":              (0.10, 0.01, 0.40),
    "noFleetsOrSkyships":      (0.10, 0.01, 0.40),
    "strongCardBonus":         (0.15, 0.01, 0.40),
    "midCardBonus":            (0.08, 0.01, 0.30),
    "strongCardPenalty":       (0.20, 0.01, 0.50),
    "weakCardBonus":           (0.20, 0.01, 0.50),
    "fowHandFullPenalty":      (0.10, 0.01, 0.40),
    "fowHandLowBonus":         (0.10, 0.01, 0.40),
    "noActiveFleetsPenalty":   (0.05, 0.01, 0.30),
    "activeFleetTrainBonus":   (0.05, 0.01, 0.30),
    "lowSkyshipsBonus":        (0.10, 0.01, 0.40),
    "veryLowTroopsBonus":      (0.15, 0.01, 0.40),
    "lowTroopsBuildBonus":     (0.08, 0.01, 0.30),
    "cantAffordRegimentsBonus":(0.10, 0.01, 0.40),
    "selectiveRetrievalBonus": (0.05, 0.01, 0.30),
    "loadFleetFromGarrisonBonus":(0.05, 0.01, 0.30),
}

# Bucket H: Resolution decisions (combat, conquest, election, rebellion, invasion)
BUCKET_H = {
    "attackBase":              (0.40, 0.10, 0.70),
    "doNotAttackBase":         (0.40, 0.10, 0.70),
    "evadeBase":               (0.40, 0.10, 0.70),
    "retaliateBase":           (0.40, 0.10, 0.70),
    "drawCardBase":            (0.35, 0.10, 0.70),
    "passCardBase":            (0.30, 0.10, 0.70),
    "pickCardBase":            (0.40, 0.10, 0.70),
    "plunderBase":             (0.50, 0.10, 0.70),
    "doNotPlunderBase":        (0.30, 0.10, 0.70),
    "groundAttackBase":        (0.45, 0.10, 0.70),
    "doNotGroundAttackBase":   (0.40, 0.10, 0.70),
    "defendBase":              (0.45, 0.10, 0.70),
    "yieldBase":               (0.35, 0.10, 0.70),
    "garrisonNoneBase":        (0.30, 0.10, 0.70),
    "garrisonTroopsBase":      (0.50, 0.10, 0.70),
    "coloniseBase":            (0.55, 0.10, 0.70),
    "outpostBase":             (0.50, 0.10, 0.70),
    "skipConquestBase":        (0.25, 0.10, 0.70),
    "fallbackConquestBase":    (0.30, 0.10, 0.70),
    "conquestCardBase":        (0.40, 0.10, 0.70),
    "conquestCardPickBase":    (0.40, 0.10, 0.70),
    "electionBase":            (0.40, 0.10, 0.70),
    "relocateBase":            (0.40, 0.10, 0.70),
    "keepFleetsBase":          (0.45, 0.10, 0.70),
    "retrieveBase":            (0.35, 0.10, 0.70),
    "infidelFightBase":        (0.40, 0.10, 0.70),
    "infidelEvadeBase":        (0.40, 0.10, 0.70),
    "rebellionPassBase":       (0.30, 0.10, 0.70),
    "rebellionCommitBase":     (0.45, 0.10, 0.70),
    "rebellionSupportBase":    (0.40, 0.10, 0.70),
    "rebellionSupportNoTroopsBase": (0.35, 0.10, 0.70),
    "rebellionFallbackBase":   (0.30, 0.10, 0.70),
    "invasionPassBase":        (0.30, 0.10, 0.70),
    "invasionNominateBase":    (0.40, 0.10, 0.70),
    "invasionContributeBase":  (0.40, 0.10, 0.70),
    "invasionContributeNoneBase": (0.35, 0.10, 0.70),
    "invasionBuyoffBase":      (0.40, 0.10, 0.70),
    "invasionBuyoffNoneBase":  (0.35, 0.10, 0.70),
    "invasionFallbackBase":    (0.30, 0.10, 0.70),
    "deferredPassBase":        (0.30, 0.10, 0.70),
    "deferredDrawBase":        (0.35, 0.10, 0.70),
    "deferredCardBase":        (0.40, 0.10, 0.70),
    "fallbackBase":            (0.35, 0.10, 0.70),
    "fowCardsBonus":           (0.10, 0.01, 0.40),
    "routeKeepBonus":          (0.10, 0.01, 0.40),
    "placeAtBonus":            (0.30, 0.05, 0.60),
    "trailBonus":              (0.25, 0.05, 0.50),
    "trailDisconnectedBonus":  (0.15, 0.01, 0.40),
    "conquestNoRouteBonus":    (0.10, 0.01, 0.40),
    "conquestCardHighBonus":   (0.10, 0.01, 0.40),
    "conquestCardMidBonus":    (0.06, 0.01, 0.30),
    "deferredCardHighBonus":   (0.10, 0.01, 0.40),
}

# Bucket I: Free action bonuses (agitators, dissenters, conversion, smugglers)
BUCKET_I = {
    "targetLeaderBonus":          (0.08, 0.01, 0.30),
    "earlyAgitatorPenalty":       (0.10, 0.01, 0.40),
    "urgentDissenters":           (0.20, 0.01, 0.50),
    "someDissenters":             (0.10, 0.01, 0.40),
    "executeVPCost":              (0.10, 0.01, 0.40),
    "rivalDissentersBonus":       (0.10, 0.01, 0.40),
    "unpunishedDissentersPenalty":(0.05, 0.01, 0.30),
    "vpCostPenalty":              (0.10, 0.01, 0.40),
    "misalignedBonus":            (0.10, 0.01, 0.40),
    "cathedralConversionPenalty": (0.10, 0.01, 0.40),
    "dissenterConversionPenalty": (0.05, 0.01, 0.30),
    "deepDebtSellBonus":          (0.15, 0.01, 0.40),
    "mildDebtSellBonus":          (0.08, 0.01, 0.30),
    "lowSkyshipsSellPenalty":     (0.15, 0.01, 0.40),
}

# ── Helpers ───────────────────────────────────────────────────────────────────

# packages/game/ directory
PACKAGES_GAME_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def get_population_size(n_params: int) -> int:
    """Standard CMA-ES population formula: 4 + floor(3 * ln(n))."""
    return 4 + int(3 * math.log(n_params))


def format_duration(seconds: float) -> str:
    """Format seconds into a human-readable string."""
    if seconds < 60:
        return f"{seconds:.0f}s"
    elif seconds < 3600:
        return f"{seconds / 60:.1f}m"
    else:
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        return f"{h}h {m}m"


def log(msg: str) -> None:
    """Print a timestamped log message."""
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


# ── Batch evaluation ─────────────────────────────────────────────────────────
#
# Instead of spawning N vitest processes (one per candidate), we split the
# population into chunks and run each chunk as a BATCH inside one vitest
# process. This avoids ~3s vitest startup overhead per candidate.
#
# With 6 workers and 12 candidates: 2 candidates per batch, 6 batches in
# parallel. Each batch takes ~(2 × games × 8s). All batches run simultaneously.

def evaluate_batch(batch_candidates: list[dict], bucket: str, games: int,
                   freeze_a: str | None, freeze_b: str | None, freeze_d: str | None = None,
                   batch_id: int = 0) -> list[float]:
    """
    Evaluate a batch of candidates in a single vitest process.
    Returns list of -avgVP values (one per candidate).
    """
    batch_path = None
    output_path = None
    n = len(batch_candidates)
    tag = f"[Batch-{batch_id}]"

    try:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as bf:
            json.dump(batch_candidates, bf)
            batch_path = bf.name

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as of:
            output_path = of.name

        env = {
            **os.environ,
            "TUNER_BUCKET": bucket,
            "TUNER_BATCH": batch_path,
            "TUNER_GAMES": str(games),
            "TUNER_OUTPUT": output_path,
        }
        if freeze_a:
            env["TUNER_FREEZE_A"] = freeze_a
        if freeze_b:
            env["TUNER_FREEZE_B"] = freeze_b
        if freeze_d:
            env["TUNER_FREEZE_D"] = freeze_d

        log(f"  {tag} Starting: {n} candidates × {games} games")
        start = time.time()

        # Timeout: 30s per game is generous (normal game takes ~8s)
        # Minimum 60s to account for vitest startup
        timeout_s = max(60, n * games * 30)

        result = subprocess.run(
            ["node", "dist/cjs/ai/tuner/tunerRunner.js"],
            env=env,
            capture_output=True,
            text=True,
            timeout=timeout_s,
            cwd=PACKAGES_GAME_DIR,
        )

        elapsed = time.time() - start

        if result.returncode != 0:
            stderr_lines = (result.stderr or "").strip().split("\n")
            stdout_lines = (result.stdout or "").strip().split("\n")
            log(f"  {tag} FAILED (exit {result.returncode}) after {format_duration(elapsed)}")
            log(f"  {tag} stderr (last 5 lines):")
            for line in stderr_lines[-5:]:
                log(f"    {line}")
            log(f"  {tag} stdout (last 5 lines):")
            for line in stdout_lines[-5:]:
                log(f"    {line}")
            return [0.0] * n

        # Check output file exists and has content
        if not os.path.exists(output_path):
            log(f"  {tag} FAILED: output file not created after {format_duration(elapsed)}")
            return [0.0] * n

        output_size = os.path.getsize(output_path)
        if output_size == 0:
            log(f"  {tag} FAILED: output file is empty after {format_duration(elapsed)}")
            log(f"  {tag} stdout (last 5 lines):")
            for line in (result.stdout or "").strip().split("\n")[-5:]:
                log(f"    {line}")
            return [0.0] * n

        with open(output_path) as f:
            results = json.load(f)

        log(f"  {tag} OK in {format_duration(elapsed)} — "
            f"avgVPs: {[r['avgVP'] for r in results]}")

        return [-r["avgVP"] for r in results]

    except subprocess.TimeoutExpired:
        log(f"  {tag} TIMEOUT after {timeout_s}s")
        # Kill any leftover vitest processes from this batch
        subprocess.run(["pkill", "-f", f"tunerRunner.*{batch_path}"],
                       capture_output=True)
        return [0.0] * n
    except json.JSONDecodeError as e:
        log(f"  {tag} JSON parse error: {e}")
        if output_path and os.path.exists(output_path):
            with open(output_path) as f:
                log(f"  {tag} Raw output: {f.read()[:500]}")
        return [0.0] * n
    except Exception as e:
        log(f"  {tag} ERROR: {type(e).__name__}: {e}")
        return [0.0] * n
    finally:
        if batch_path and os.path.exists(batch_path):
            os.unlink(batch_path)
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)




def evaluate_population_ordered(
    population: list,
    param_names: list,
    bucket: str,
    games: int,
    freeze_a: str | None,
    freeze_b: str | None,
    freeze_d: str | None,
    workers: int,
) -> list[float]:
    """
    Evaluate all candidates by splitting into batches.
    Runs batches as parallel subprocesses using subprocess.Popen (no ProcessPoolExecutor).
    """
    n = len(population)

    all_candidates = [
        {name: float(val) for name, val in zip(param_names, vec)}
        for vec in population
    ]

    log(f"  Evaluating {n} candidates × {games} games each (workers={workers})")

    gen_start = time.time()
    fitnesses = [0.0] * n
    timeout_count = 0

    # One Node process per candidate (avoids boardgame.io state leaks).
    # Launch up to `workers` processes at a time for parallelism.
    # 10s per game is generous (normal ~7s, stalled aborts at 5000 iters ~5s)
    timeout_per_candidate = max(30, games * 10)

    # Process candidates in waves of `workers` size
    for wave_start in range(0, n, workers):
        wave_end = min(wave_start + workers, n)
        wave_size = wave_end - wave_start

        # Launch all processes in this wave
        procs: list[dict] = []
        for ci in range(wave_start, wave_end):
            wf = tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False)
            json.dump(all_candidates[ci], wf)
            wf.close()

            of = tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False)
            of.close()

            env_vars = {
                "TUNER_BUCKET": bucket,
                "TUNER_WEIGHTS": wf.name,
                "TUNER_GAMES": str(games),
                "TUNER_OUTPUT": of.name,
            }
            if freeze_a:
                env_vars["TUNER_FREEZE_A"] = freeze_a
            if freeze_b:
                env_vars["TUNER_FREEZE_B"] = freeze_b
            if freeze_d:
                env_vars["TUNER_FREEZE_D"] = freeze_d

            env_prefix = " ".join(f"{k}={v}" for k, v in env_vars.items())

            proc = subprocess.Popen(
                f"{env_prefix} node dist/cjs/ai/tuner/tunerRunner.js",
                shell=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                cwd=PACKAGES_GAME_DIR,
            )

            procs.append({
                "proc": proc,
                "ci": ci,
                "weights_path": wf.name,
                "output_path": of.name,
                "start_time": time.time(),
            })

        # Wait for all in this wave
        for p in procs:
            ci = p["ci"]
            tag = f"[{ci + 1}/{n}]"
            try:
                p["proc"].wait(timeout=timeout_per_candidate)
                elapsed = time.time() - p["start_time"]

                if os.path.exists(p["output_path"]) and os.path.getsize(p["output_path"]) > 0:
                    with open(p["output_path"]) as f:
                        result = json.load(f)
                    avg_vp = result["avgVP"]
                    fitnesses[ci] = -avg_vp
                    log(f"  {tag} avgVP={avg_vp:.1f} ({format_duration(elapsed)})")
                else:
                    log(f"  {tag} FAILED: no output ({format_duration(elapsed)})")

            except subprocess.TimeoutExpired:
                log(f"  {tag} TIMEOUT — killing")
                p["proc"].kill()
                p["proc"].wait()
                timeout_count += 1

            except Exception as e:
                log(f"  {tag} ERROR: {type(e).__name__}: {e}")

            finally:
                if os.path.exists(p["weights_path"]):
                    os.unlink(p["weights_path"])
                if os.path.exists(p["output_path"]):
                    os.unlink(p["output_path"])

        log(f"  Wave {wave_start // workers + 1} done ({wave_end}/{n} candidates)")

    gen_elapsed = time.time() - gen_start
    if timeout_count > 0:
        log(f"  Generation complete in {format_duration(gen_elapsed)} ({timeout_count} timeouts)")
    else:
        log(f"  Generation complete in {format_duration(gen_elapsed)} ✓ no timeouts")

    return fitnesses, timeout_count


# ── Main tuning loop ─────────────────────────────────────────────────────────

def run_tuning(args: argparse.Namespace) -> None:
    bucket_map = {"A": BUCKET_A, "B": BUCKET_B, "D": BUCKET_D,
                   "E": BUCKET_E, "F": BUCKET_F, "G": BUCKET_G, "H": BUCKET_H, "I": BUCKET_I}
    bucket_def = bucket_map[args.bucket]
    param_names = list(bucket_def.keys())
    defaults = [bucket_def[n][0] for n in param_names]
    lower_bounds = [bucket_def[n][1] for n in param_names]
    upper_bounds = [bucket_def[n][2] for n in param_names]

    n_params = len(param_names)
    popsize = get_population_size(n_params)

    # If --workers is explicitly set, use it directly. Otherwise auto-scale.
    if args.workers is not None:
        max_workers = args.workers
        workers = args.workers
    else:
        max_workers = 4
        workers = 1  # auto-scales to max_workers after 3 clean gens

    # Output directory
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M")
    if args.dry_run:
        prefix = "DRYRUN_"
    elif args.quick_test:
        prefix = "QUICKTEST_"
    else:
        prefix = ""

    run_dir = os.path.join(
        PACKAGES_GAME_DIR, "tuner_results", f"{args.bucket}_{prefix}{timestamp}"
    )
    os.makedirs(run_dir, exist_ok=True)

    # Save run config for provenance
    config = {
        "bucket": args.bucket,
        "params": param_names,
        "defaults": defaults,
        "bounds": {"lower": lower_bounds, "upper": upper_bounds},
        "games_per_eval": args.games,
        "max_generations": args.max_gens,
        "sigma0": 0.1,
        "popsize": popsize,
        "workers": workers,
        "freeze_a": args.freeze_a,
        "freeze_b": args.freeze_b,
        "freeze_d": args.freeze_d,
    }
    with open(os.path.join(run_dir, "config.json"), "w") as f:
        json.dump(config, f, indent=2)

    # Copy frozen weights for provenance
    if args.freeze_a:
        shutil.copy2(args.freeze_a, os.path.join(run_dir, "frozen_A.json"))
    if args.freeze_b:
        shutil.copy2(args.freeze_b, os.path.join(run_dir, "frozen_B.json"))
    if args.freeze_d:
        shutil.copy2(args.freeze_d, os.path.join(run_dir, "frozen_D.json"))

    # CMA-ES options
    opts = cma.CMAOptions()
    opts["bounds"] = [lower_bounds, upper_bounds]
    opts["popsize"] = popsize
    opts["maxiter"] = args.max_gens
    opts["tolx"] = 1e-6
    opts["verb_disp"] = 0   # we do our own logging
    opts["verb_log"] = 0

    # Resume support
    all_generations: list = []
    best_avgVP: float = 0.0
    best_weights: dict = dict(zip(param_names, defaults))
    no_improvement_count: int = 0
    consecutive_clean_gens: int = 0  # gens with zero timeouts
    gen: int = 0
    starting_defaults = list(defaults)
    tuning_start = time.time()

    if args.resume:
        resume_dir = args.resume
        log(f"Resuming from: {resume_dir}")
        with open(os.path.join(resume_dir, "config.json")) as f:
            _prev_config = json.load(f)
        with open(os.path.join(resume_dir, "all_generations.json")) as f:
            all_generations = json.load(f)
        with open(os.path.join(resume_dir, "best_weights.json")) as f:
            best_weights = json.load(f)

        gen = len(all_generations)
        best_avgVP = max(g.get("alltime_best_avgVP", g.get("best_avgVP", 0)) for g in all_generations)
        run_dir = resume_dir

        starting_defaults = [best_weights.get(n, bucket_def[n][0]) for n in param_names]
        opts["maxiter"] = args.max_gens

    if args.seed and not args.resume:
        with open(args.seed) as f:
            seed_weights = json.load(f)
        starting_defaults = [seed_weights.get(n, bucket_def[n][0]) for n in param_names]
        log(f"Seeded x0 from: {args.seed}")

    sigma0 = 0.05 if (args.resume or args.seed) else 0.1
    es = cma.CMAEvolutionStrategy(starting_defaults, sigma0, opts)

    # Convergence log
    convergence_path = os.path.join(run_dir, "convergence.csv")
    write_mode = "a" if args.resume else "w"
    with open(convergence_path, write_mode) as f:
        if not args.resume:
            f.write("generation,gen_avg_vp,gen_best_vp,alltime_best_vp,sigma,elapsed_s\n")

    print(f"\n{'='*60}")
    print(f"  EotS CMA-ES Tuner")
    print(f"  Bucket: {args.bucket}  |  Params: {n_params}  |  Popsize: {popsize}")
    print(f"  Games/eval: {args.games}  |  Max gens: {args.max_gens}  |  Workers: {workers}")
    print(f"  Output: {run_dir}")
    if args.freeze_a:
        print(f"  Frozen A: {args.freeze_a}")
    if args.freeze_b:
        print(f"  Frozen B: {args.freeze_b}")
    if args.freeze_d:
        print(f"  Frozen D: {args.freeze_d}")
    print(f"{'='*60}\n", flush=True)

    while not es.stop():
        gen += 1

        population = es.ask()

        # Clamp to bounds
        clamped = []
        for candidate in population:
            c = [
                max(lb, min(ub, v))
                for v, lb, ub in zip(candidate, lower_bounds, upper_bounds)
            ]
            clamped.append(c)

        # ETA calculation
        if gen > 1:
            elapsed_so_far = time.time() - tuning_start
            avg_gen_time = elapsed_so_far / (gen - 1)
            remaining_gens = args.max_gens - gen
            eta = format_duration(avg_gen_time * remaining_gens)
        else:
            eta = "calculating..."

        print(f"\n{'─'*60}")
        log(f"Generation {gen}/{args.max_gens}  |  "
            f"Best: {best_avgVP:.1f} avgVP  |  "
            f"ETA: {eta}")
        print(f"{'─'*60}", flush=True)

        # Brief pause between generations to let OS reclaim resources from prior batch
        if gen > 1:
            time.sleep(2)

        fitnesses, gen_timeouts = evaluate_population_ordered(
            clamped, param_names, args.bucket, args.games,
            args.freeze_a, args.freeze_b, args.freeze_d, workers,
        )

        es.tell(clamped, fitnesses)

        # Auto-scale workers: after 3 consecutive clean gens, go parallel
        if gen_timeouts == 0:
            consecutive_clean_gens += 1
            if consecutive_clean_gens >= 3 and workers < max_workers:
                workers = max_workers
                log(f"  ⚡ 3 clean generations — scaling to {workers} parallel workers")
        else:
            consecutive_clean_gens = 0
            if workers > 1:
                workers = 1
                log(f"  ↓ Timeouts detected — back to sequential")

        # Track best
        gen_best_idx = fitnesses.index(min(fitnesses))
        gen_best_avgVP = -fitnesses[gen_best_idx]
        gen_avg_vp = -sum(fitnesses) / len(fitnesses)
        gen_worst_vp = -max(fitnesses)

        if gen_best_avgVP > best_avgVP:
            best_avgVP = gen_best_avgVP
            best_weights = {
                name: round(float(val), 6)
                for name, val in zip(param_names, clamped[gen_best_idx])
            }
            no_improvement_count = 0
            with open(os.path.join(run_dir, "best_weights.json"), "w") as f:
                json.dump(best_weights, f, indent=2)
            log(f"  ★ NEW BEST: {best_avgVP:.2f} avgVP — saved best_weights.json")
        else:
            no_improvement_count += 1
            log(f"  No improvement ({no_improvement_count}/10 towards early stop)")

        # Summary line
        log(f"  Gen {gen} summary: best={gen_best_avgVP:.1f}  "
            f"avg={gen_avg_vp:.1f}  worst={gen_worst_vp:.1f}  "
            f"sigma={es.sigma:.4f}  workers={workers}")

        # Append convergence row
        elapsed_total = time.time() - tuning_start
        with open(convergence_path, "a") as f:
            f.write(
                f"{gen},{gen_avg_vp:.4f},{gen_best_avgVP:.4f},"
                f"{best_avgVP:.4f},{es.sigma:.6f},{elapsed_total:.0f}\n"
            )

        # Save full generation data
        gen_data = {
            "generation": gen,
            "candidates": [
                {
                    "weights": dict(zip(param_names, [round(float(v), 6) for v in c])),
                    "avgVP": round(-float(fi), 2),
                }
                for c, fi in zip(clamped, fitnesses)
            ],
            "gen_best_avgVP": round(gen_best_avgVP, 2),
            "gen_avg_vp": round(gen_avg_vp, 2),
            "alltime_best_avgVP": round(best_avgVP, 2),
            "sigma": round(float(es.sigma), 6),
            "elapsed_s": round(elapsed_total, 0),
        }
        all_generations.append(gen_data)

        with open(os.path.join(run_dir, "all_generations.json"), "w") as f:
            json.dump(all_generations, f, indent=2)

        # Early stopping
        if no_improvement_count >= 10:
            log(f"Early stopping: no improvement for 10 consecutive generations")
            break

    # ── Final report ──────────────────────────────────────────────────────────

    total_elapsed = time.time() - tuning_start
    first_gen_avg = None
    if all_generations:
        first_gen_avg = sum(
            c["avgVP"] for c in all_generations[0]["candidates"]
        ) / len(all_generations[0]["candidates"])

    report = {
        "bucket": args.bucket,
        "generations_run": gen,
        "default_avgVP": round(first_gen_avg, 2) if first_gen_avg else None,
        "best_avgVP": round(best_avgVP, 2),
        "best_weights": best_weights,
        "improvement": round(best_avgVP - first_gen_avg, 2) if first_gen_avg else None,
        "early_stopped": no_improvement_count >= 10,
        "total_time_s": round(total_elapsed, 0),
        "total_time_human": format_duration(total_elapsed),
    }

    with open(os.path.join(run_dir, "final_report.json"), "w") as f:
        json.dump(report, f, indent=2)

    print(f"\n{'='*60}")
    print(f"  TUNING COMPLETE — Bucket {args.bucket}")
    print(f"  Generations: {gen}")
    print(f"  Total time: {format_duration(total_elapsed)}")
    print(f"  Best avgVP: {best_avgVP:.2f}")
    if report["improvement"] is not None:
        sign = "+" if report["improvement"] >= 0 else ""
        print(f"  Improvement: {sign}{report['improvement']:.2f} VP")
    print(f"  Results: {run_dir}/")
    print(f"{'='*60}\n")


# ── CLI ────────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="CMA-ES weight tuner for EotS bots",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--bucket", choices=["A", "B", "D", "E", "F", "G", "H", "I"], required=True,
        help="Which parameter bucket to optimise",
    )
    parser.add_argument(
        "--games", type=int, default=20,
        help="Games per candidate evaluation (default: 20)",
    )
    parser.add_argument(
        "--max-gens", type=int, default=80,
        help="Maximum CMA-ES generations (default: 80)",
    )
    parser.add_argument(
        "--workers", type=int, default=None,
        help="Parallel vitest processes (default: 6, matches P-core count)",
    )
    parser.add_argument(
        "--freeze-a", type=str, default=None,
        help="Path to frozen Bucket A best_weights.json",
    )
    parser.add_argument(
        "--freeze-b", type=str, default=None,
        help="Path to frozen Bucket B best_weights.json",
    )
    parser.add_argument(
        "--freeze-d", type=str, default=None,
        help="Path to frozen Bucket D best_weights.json",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="2 gens, 3 games — verify pipeline works (~2 min)",
    )
    parser.add_argument(
        "--quick-test", action="store_true",
        help="10 gens, 10 games — see if improvement happens (~15 min)",
    )
    parser.add_argument(
        "--resume", type=str, default=None,
        help="Path to a previous run directory to resume from",
    )
    parser.add_argument(
        "--seed", type=str, default=None,
        help="Path to a best_weights.json to use as initial x0 (creates fresh output dir)",
    )

    args = parser.parse_args()

    if args.dry_run:
        args.games = 3
        args.max_gens = 2
    elif args.quick_test:
        args.games = 10
        args.max_gens = 10

    return args


if __name__ == "__main__":
    run_tuning(parse_args())
