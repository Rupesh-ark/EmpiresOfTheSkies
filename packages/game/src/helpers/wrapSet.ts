import { MOVE_DEFINITIONS } from "../moveDefinitions.js";
import { wrapMove } from "./moveWrapper.js";

/**
 * Registers a set of moves from MOVE_DEFINITIONS — the single source of truth
 * for move implementations AND their validators (some definitions carry
 * stricter validate() wrappers than the raw move files; the server enforces
 * those too). Throws at load time on a typo'd name.
 */
export const wrapSet = (...names: string[]) =>
  Object.fromEntries(
    names.map((name) => {
      const def = MOVE_DEFINITIONS[name];
      if (!def) throw new Error(`wrapSet: unknown move "${name}" — not in MOVE_DEFINITIONS`);
      return [name, wrapMove(name, def)];
    })
  );
