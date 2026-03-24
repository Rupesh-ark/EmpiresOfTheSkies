import { Tooltip, Box } from "@mui/material";
import { GiZeppelin } from "react-icons/gi";

const FleetIcon = (props: FleetIconProps) => {
  const compact = props.compact ?? false;
  const size = compact
    ? { xs: 16, sm: 18, md: 20 }
    : { xs: 32, sm: 36, md: 40 };
  const iconSize = compact ? 10 : 22;

  return (
    <Tooltip
      title={`Skyships: ${props.skyships}
Regiments: ${props.regiments}
Levies: ${props.levies}`}
    >
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: props.colour,
          border: "2px solid rgba(255,255,255,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
        }}
      >
        <GiZeppelin
          size={iconSize}
          style={{ color: "#fff" }}
        />
      </Box>
    </Tooltip>
  );
};

type FleetIconProps = {
  colour: string;
  skyships: number;
  regiments: number;
  levies: number;
  /** Use smaller size for crowded tiles like the home kingdom */
  compact?: boolean;
};
export default FleetIcon;
