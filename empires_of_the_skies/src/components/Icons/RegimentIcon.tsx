import { GiChessKnight } from "react-icons/gi";

const RegimentIcon = (props: RegimentIconProps) => {
  return <GiChessKnight style={{ color: props.colour, fontSize: "28px" }} />;
};

type RegimentIconProps = {
  colour: string;
};

export default RegimentIcon;
