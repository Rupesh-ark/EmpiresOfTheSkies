import { Box, Tooltip } from "@mui/material";
import { IconOutpost } from "@/theme";

/**
 * OutpostIcon — map badge for outpost buildings.
 *
 * Garrison counts shown via tooltip.
 */
const OutpostIcon = (props: OutpostIconProps) => {
  const totalGarrison = props.regiments + props.levies;

  return (
    <Tooltip
      title={`Regiments: ${props.regiments}
Levies: ${props.levies}`}
    >
      <Box
        sx={{
          position: "relative",
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          backgroundColor: props.colour,
          border: "1.5px solid rgba(255,255,255,0.9)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconOutpost size={14} color="#fff" />
        {totalGarrison > 0 && (
          <Box
            sx={{
              position: "absolute",
              right: "-2px",
              bottom: "-2px",
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: "rgba(0,0,0,0.75)",
              border: "1px solid rgba(255,255,255,0.8)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "8px",
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            {totalGarrison}
          </Box>
        )}
      </Box>
    </Tooltip>
  );
};

interface OutpostIconProps {
  colour: string;
  regiments: number;
  levies: number;
}

export default OutpostIcon;
