import { GiAirBalloon } from "react-icons/gi";

const SkyshipIcon = (props: SkyshipIconProps) => {
  return <GiAirBalloon style={{ color: props.colour, fontSize: "28px" }} />;
};

type SkyshipIconProps = {
  colour: string;
};

export default SkyshipIcon;
