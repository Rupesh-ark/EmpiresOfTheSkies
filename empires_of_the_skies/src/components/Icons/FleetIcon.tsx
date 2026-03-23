import { Tooltip, Box } from "@mui/material";
import { GiZeppelin } from "react-icons/gi";

const FleetIcon = (props: FleetIconProps) => {
  return (
    <Tooltip
      title={`Skyships: ${props.skyships}
Regiments: ${props.regiments}
Levies: ${props.levies}`}
    >
      <Box
        sx={{
          // Scale with tile size using container-relative units
          width: { xs: 16, sm: 18, md: 20 },
          height: { xs: 16, sm: 18, md: 20 },
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
          size={10}
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
};
export default FleetIcon;
