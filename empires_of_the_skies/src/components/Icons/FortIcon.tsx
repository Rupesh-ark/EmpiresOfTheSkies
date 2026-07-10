import { Box, Tooltip } from "@mui/material";
import { IconFort } from "@/theme";

const FortIcon = (props: FortProps) => {
  return (
    <Tooltip title="Fort">
      <Box
        sx={{
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          backgroundColor: props.colour,
          border: "1.5px solid rgba(255,255,255,0.9)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconFort size={11} color="#fff" />
      </Box>
    </Tooltip>
  );
};

type FortProps = {
  colour: string;
};

export default FortIcon;
