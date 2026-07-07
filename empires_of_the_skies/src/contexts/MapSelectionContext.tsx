import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";

/**
 * MapSelectionContext — "pick a tile on the main map" mode.
 *
 * Instead of opening a dialog with its own embedded map, an action starts a
 * selection: the main map highlights the valid tiles, MapOverlay shows a
 * banner with the prompt plus Confirm/Cancel, and clicking a highlighted
 * tile marks it selected. Confirm fires the caller's onConfirm with the
 * chosen coords.
 */

export type MapSelectionRequest = {
  /** Valid tiles as [x, y] pairs */
  tiles: number[][];
  /** Short instruction shown in the map banner, e.g. "Choose a colony to fortify" */
  prompt: string;
  confirmLabel?: string;
  onConfirm: (coords: number[]) => void;
  /** Omit to make the selection mandatory (no cancel button shown) */
  onCancel?: () => void;
  /** Extra text appended after the selected tile name in the banner, e.g. "(2g)" */
  getSelectionDetail?: (coords: number[]) => string;
};

type MapSelectionValue = {
  selection: MapSelectionRequest | null;
  selected: number[] | null;
  startSelection: (req: MapSelectionRequest) => void;
  selectTile: (coords: number[]) => void;
  confirmSelection: () => void;
  cancelSelection: () => void;
  /** Clears state without firing callbacks — for unmount cleanup */
  clearSelection: () => void;
};

const MapSelectionContext = createContext<MapSelectionValue | null>(null);

export const MapSelectionProvider = ({ children }: { children: ReactNode }) => {
  const [selection, setSelection] = useState<MapSelectionRequest | null>(null);
  const [selected, setSelected] = useState<number[] | null>(null);

  const startSelection = useCallback((req: MapSelectionRequest) => {
    setSelection(req);
    setSelected(null);
  }, []);

  const selectTile = useCallback((coords: number[]) => {
    setSelected([coords[0], coords[1]]);
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(null);
    setSelected(null);
  }, []);

  const confirmSelection = useCallback(() => {
    if (selection && selected) {
      selection.onConfirm(selected);
      clearSelection();
    }
  }, [selection, selected, clearSelection]);

  const cancelSelection = useCallback(() => {
    selection?.onCancel?.();
    clearSelection();
  }, [selection, clearSelection]);

  const value = useMemo(
    () => ({
      selection,
      selected,
      startSelection,
      selectTile,
      confirmSelection,
      cancelSelection,
      clearSelection,
    }),
    [selection, selected, startSelection, selectTile, confirmSelection, cancelSelection, clearSelection]
  );

  return (
    <MapSelectionContext.Provider value={value}>
      {children}
    </MapSelectionContext.Provider>
  );
};

/** No-op fallback so components render safely outside the provider (e.g. lobby). */
const NOOP_VALUE: MapSelectionValue = {
  selection: null,
  selected: null,
  startSelection: () => {},
  selectTile: () => {},
  confirmSelection: () => {},
  cancelSelection: () => {},
  clearSelection: () => {},
};

export const useMapSelection = (): MapSelectionValue =>
  useContext(MapSelectionContext) ?? NOOP_VALUE;
