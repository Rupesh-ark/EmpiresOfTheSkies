import { TileInfoProps } from "@eots/game";

type LocationPresentation = {
  name: string;
  reference: string;
  fullLabel: string;
};

const formatBoardReference = (location: number[]): string => {
  const [x, y] = location;
  return `${String.fromCharCode(65 + x)}${4 - y}`;
};

const humanizeTileName = (rawName: string): string =>
  rawName
    .replace(/\d+$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();

const getTileDisplayName = (tile: TileInfoProps): string => {
  if (tile.type === "home") {
    return "Home Waters";
  }

  if (tile.type === "ocean") {
    return "Open Ocean";
  }

  if (tile.type === "infidel_empire") {
    return "Infidel Empire";
  }

  return humanizeTileName(tile.name);
};

export const getLocationPresentation = (
  tileMap: TileInfoProps[][],
  location: number[]
): LocationPresentation => {
  const reference = formatBoardReference(location);
  const tile = tileMap[location[1]]?.[location[0]];

  if (!tile) {
    return {
      name: "Unknown Waters",
      reference,
      fullLabel: `Unknown Waters (${reference})`,
    };
  }

  const name = getTileDisplayName(tile);

  return {
    name,
    reference,
    fullLabel: `${name} (${reference})`,
  };
};
