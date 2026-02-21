import React from "react";
import { MyGameProps } from "@eots/game";
import fortuneOfWarCardBack from "../../boards_and_assets/fortunes_of_war_card_back.svg";
import svgNameToElementMap from "../WorldMap/nameToElementMap";

const FortuneOfWarCardDisplay = (props: FortuneOfWarCardDisplayProps) => {
  const defaultImage = fortuneOfWarCardBack;
  let displayImage;
  let card;
  let opacity = 0.5;
  if (props.playerID) {
    card =
      props.G.playerInfo[props.playerID].resources.fortuneCards[props.value];
  }
  if (card) {
    opacity = 1;
    displayImage = card.flipped ? svgNameToElementMap[card.name] : defaultImage;
  } else {
    displayImage = defaultImage;
  }

  return (
    <svg
      key={props.value}
      style={{
        backgroundImage: `url(${displayImage})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "contain",
        opacity: opacity,
        width: "137px",
        height: "250px",
        margin: "5px",
      }}
    ></svg>
  );
};

interface FortuneOfWarCardDisplayProps extends MyGameProps {
  value: number;
}
export default FortuneOfWarCardDisplay;
