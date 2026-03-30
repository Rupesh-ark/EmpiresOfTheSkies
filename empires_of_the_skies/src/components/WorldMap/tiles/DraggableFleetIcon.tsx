import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
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
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: CSS.Translate.toString(transform),
        cursor: isDragging ? "grabbing" : "grab",
        opacity: isDragging ? 0.3 : 1,
        touchAction: "none",
      }}
    >
      <FleetIcon
        colour={colour}
        skyships={skyships}
        regiments={regiments}
        levies={levies}
        compact={compact}
      />
    </div>
  );
};

export default DraggableFleetIcon;
