import { PlayerInfo } from "../types.js";

export function clonePlayerInfo(player: PlayerInfo): PlayerInfo {
  return JSON.parse(JSON.stringify(player));
}