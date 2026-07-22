import { Box } from "@mui/material";
import { useDraggable } from "@dnd-kit/core";
import { tokens } from "@/theme";
import { IconSkyship, IconRegiment, IconElite, IconLevy } from "@/theme";
import type { TroopKind } from "./types";

function TroopIcon({ kind, size = 14 }: { kind: TroopKind; size?: number }) {
  const style = { color: tokens.ui.text };
  if (kind === "regiment") return <IconRegiment size={size} style={style} />;
  if (kind === "elite") return <IconElite size={size} style={style} />;
  return <IconLevy size={size} style={style} />;
}

export function SkyshipCard({ troop, overlay = false }: { troop: TroopKind | null; overlay?: boolean }) {
  return (
    <Box
      sx={{
        width: 60,
        height: 76,
        borderRadius: `${tokens.radius.md}px`,
        border: `2px solid ${tokens.ui.gold}`,
        backgroundColor: `${tokens.ui.gold}22`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0.5,
        cursor: "grab",
        boxShadow: overlay
          ? `0 8px 20px rgba(0,0,0,0.35), 0 0 10px ${tokens.ui.gold}40`
          : tokens.shadow.sm,
        transition: `box-shadow ${tokens.transition.fast}`,
        userSelect: "none",
      }}
    >
      <IconSkyship size={26} style={{ color: tokens.ui.gold }} />
      {troop && (
        <Box
          sx={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            backgroundColor: tokens.ui.surfaceRaised,
            border: `1px solid ${tokens.ui.borderMedium}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TroopIcon kind={troop} size={12} />
        </Box>
      )}
    </Box>
  );
}

interface DraggableSkyshipProps {
  id: string;
  troop: TroopKind | null;
  overlay?: boolean;
}

export function DraggableSkyship({ id, troop, overlay = false }: DraggableSkyshipProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      sx={{ opacity: isDragging ? 0.3 : 1, transition: `opacity ${tokens.transition.fast}` }}
    >
      <SkyshipCard troop={troop} overlay={overlay} />
    </Box>
  );
}

export function TroopChip({ kind, overlay = false }: { kind: TroopKind; overlay?: boolean }) {
  return (
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        border: `2px solid ${tokens.ui.borderMedium}`,
        backgroundColor: tokens.ui.surfaceRaised,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "grab",
        boxShadow: overlay
          ? `0 6px 16px rgba(0,0,0,0.30)`
          : tokens.shadow.sm,
        userSelect: "none",
      }}
    >
      <TroopIcon kind={kind} size={16} />
    </Box>
  );
}

interface DraggableTroopProps {
  id: string;
  kind: TroopKind;
  overlay?: boolean;
}

export function DraggableTroop({ id, kind, overlay = false }: DraggableTroopProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      sx={{ opacity: isDragging ? 0.3 : 1, transition: `opacity ${tokens.transition.fast}` }}
    >
      <TroopChip kind={kind} overlay={overlay} />
    </Box>
  );
}
