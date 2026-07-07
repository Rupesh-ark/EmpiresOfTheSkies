import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Box, Tooltip } from "@mui/material";
import FleetIcon from "../../Icons/FleetIcon";

interface DraggableFleetIconProps {
  draggableId: string;
  colour: string;
  skyships: number;
  regiments: number;
  levies: number;
  compact?: boolean;
}

export const DraggableFleetIcon: React.FC<DraggableFleetIconProps> = ({
  draggableId,
  colour,
  skyships,
  regiments,
  levies,
  compact,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
  });

  return (
    <Tooltip
      title="Drag onto the map to deploy — or use the Deploy button in your Fleets panel"
      placement="top"
      arrow
      enterDelay={400}
      disableHoverListener={isDragging}
    >
      <Box
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        sx={{
          transform: CSS.Translate.toString(transform),
          cursor: isDragging ? "grabbing" : "grab",
          opacity: isDragging ? 0.3 : 1,
          touchAction: "none",
          borderRadius: "50%",
          // Idle pulse so deployable fleets read as interactive
          ...(!isDragging && {
            "@keyframes deployablePulse": {
              "0%, 100%": { filter: "drop-shadow(0 0 2px rgba(255,224,102,0.5))" },
              "50%": { filter: "drop-shadow(0 0 7px rgba(255,224,102,0.95))" },
            },
            animation: "deployablePulse 2.2s ease-in-out infinite",
            "&:hover": {
              animation: "none",
              filter: "drop-shadow(0 0 8px rgba(255,224,102,1))",
            },
          }),
        }}
      >
        <FleetIcon
          colour={colour}
          skyships={skyships}
          regiments={regiments}
          levies={levies}
          compact={compact}
        />
      </Box>
    </Tooltip>
  );
};

export default DraggableFleetIcon;
