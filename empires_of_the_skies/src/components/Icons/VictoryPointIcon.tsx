import { GiStarMedal } from "react-icons/gi";

const VictoryPointIcon = (props: VictoryPointIconProps) => {
  return <GiStarMedal style={{ color: props.colour, fontSize: "28px" }} />;
};

type VictoryPointIconProps = {
  colour: string;
};

export default VictoryPointIcon;