import { Box, Tooltip } from "@mui/material";
import { IconColony } from "@/theme";

/**
 * ColonyIcon — map badge for colony buildings.
 *
 * Garrison counts shown via tooltip.
 */
const ColonyIcon = (props: ColonyIconProps) => {
  const totalGarrison = props.regiments + props.levies;

  return (
    <Tooltip
      title={`Regiments: ${props.regiments}
Levies: ${props.levies}`}
    >
      <Box
        sx={{
          position: "relative",
          width: "30px",
          height: "30px",
          borderRadius: "50%",
          backgroundColor: props.colour,
          border: "1.5px solid rgba(255,255,255,0.9)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconColony size={19} color="#fff" />
        {totalGarrison > 0 && (
          <Box
            sx={{
              position: "absolute",
              right: "-2px",
              bottom: "-2px",
              width: "13px",
              height: "13px",
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

interface ColonyIconProps {
  colour: string;
  regiments: number;
  levies: number;
}

export default ColonyIcon;
