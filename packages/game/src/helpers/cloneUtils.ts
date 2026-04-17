import { PlayerInfo } from "../types";

export function clonePlayerInfo(player: PlayerInfo): PlayerInfo {
  return JSON.parse(JSON.stringify(player));
}