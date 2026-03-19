import React from "react";
import { MyGameProps } from "@eots/game";
import { FOW_CARD_BACK as fortuneOfWarCardBack, SWORD_CARDS, SHIELD_CARDS, NO_EFFECT_CARD } from "@/assets/fortuneOfWarCards";

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
    if (card.flipped) {
      if (card.sword > 0) displayImage = SWORD_CARDS[card.sword];
      else if (card.shield > 0) displayImage = SHIELD_CARDS[card.shield];
      else displayImage = NO_EFFECT_CARD;
    } else {
      displayImage = defaultImage;
    }
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
