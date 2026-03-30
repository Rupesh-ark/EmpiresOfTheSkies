import { GiChessPawn } from "react-icons/gi";

const LevyIcon = (props: LevyIconProps) => {
  return <GiChessPawn style={{ color: props.colour, fontSize: "28px" }} />;
};

type LevyIconProps = {
  colour: string;
};

export default LevyIcon;