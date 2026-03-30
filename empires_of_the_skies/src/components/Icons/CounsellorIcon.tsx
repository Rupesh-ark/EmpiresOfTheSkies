import { BiSolidCylinder } from "react-icons/bi";

const CounsellorIcon = (props: CounsellorIconProps) => {
  return <BiSolidCylinder style={{ color: props.colour, fontSize: "28px" }} />;
};

type CounsellorIconProps = {
  colour: string;
};

export default CounsellorIcon;
